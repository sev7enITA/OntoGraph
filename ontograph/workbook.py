"""Reversible Excel editing format for an OntoGraph JSON release."""

import io
import json
import math
import posixpath
import re
from urllib.parse import quote, unquote
from xml.etree import ElementTree as ET
from zipfile import ZIP_DEFLATED, ZIP_STORED, BadZipFile, ZipFile
from zlib import error as CompressionError

from .model import Rejected, require

SHEET_NAME = "OntoGraph Release"
HEADERS = ("Path", "Type", "Value")
FORMAT_ERROR = "Expected an OntoGraph Release workbook. Legacy PolicyAsCode workbooks use a different schema."
SHEET_NS = "http://schemas.openxmlformats.org/spreadsheetml/2006/main"
REL_NS = "http://schemas.openxmlformats.org/officeDocument/2006/relationships"
PACKAGE_NS = "http://schemas.openxmlformats.org/package/2006/relationships"
CONTENT_NS = "http://schemas.openxmlformats.org/package/2006/content-types"
MAX_ZIP_BYTES = 12_000_000
MAX_XML_BYTES = 24_000_000
MAX_ARCHIVE_BYTES = 40_000_000
MAX_ROWS = 40_000
MAX_DEPTH = 64
MAX_PATH = 4096
MAX_CELL = 32767
JSON_TYPES = {dict: "object", list: "array", str: "string", bool: "boolean", int: "number",
              float: "number", type(None): "null"}
REFERENCE = re.compile(r"([ABC])([1-9][0-9]{0,5})\Z")
INDEX = re.compile(r"0|[1-9][0-9]{0,5}\Z")
EXCEL_ESCAPE = re.compile(r"_x([0-9a-fA-F]{4})_")
CONTROL_TEXT = re.compile(r"[\x00-\x08\x0b-\x0d\x0e-\x1f\ufffe\uffff]")
XML_ESCAPE = re.compile(rf"_x[0-9a-fA-F]{{4}}_|{CONTROL_TEXT.pattern}")


def _tag(name, namespace=SHEET_NS):
    return f"{{{namespace}}}{name}"


def _path_part(part):
    return part.replace("~", "~0").replace("/", "~1")


def _parse_path(path):
    require(len(path) <= MAX_PATH, "Workbook JSON pointer is too long")
    if path.startswith("#"):
        require(not re.search(r"%(?![0-9a-fA-F]{2})", path), "Invalid workbook JSON pointer")
        try:
            path = unquote(path[1:], errors="strict")
        except UnicodeError as error:
            raise Rejected("Invalid workbook JSON pointer") from error
    if not path:
        return ()
    require(path.startswith("/") and not re.search(r"~(?![01])", path),
            "Invalid workbook JSON pointer")
    parts = tuple(part.replace("~1", "/").replace("~0", "~") for part in path[1:].split("/"))
    require(len(parts) <= MAX_DEPTH, "Workbook nesting is too deep")
    return parts


def _check_text(value):
    try:
        length = len(value.encode("utf-16-le")) // 2
    except UnicodeEncodeError as error:
        raise Rejected("Workbook contains invalid Unicode") from error
    require(length <= MAX_CELL, "Workbook cell is too long for Excel")


def _encode_text(value):
    _check_text(value)
    return XML_ESCAPE.sub(lambda match: ("_x005F_" + match[0][1:]) if len(match[0]) > 1
                          else f"_x{ord(match[0]):04X}_", value)


def _decode_text(value):
    decoded = EXCEL_ESCAPE.sub(lambda match: chr(int(match[1], 16)), value)
    try:
        # Excel can spell astral characters as two escaped UTF-16 code units.
        decoded = decoded.encode("utf-16-le", errors="surrogatepass").decode("utf-16-le")
    except UnicodeError as error:
        raise Rejected("Workbook contains invalid Unicode") from error
    _check_text(decoded)
    return decoded


def _flatten(value, path, depth, rows):
    kind = JSON_TYPES.get(type(value))
    require(kind is not None and len(path) <= MAX_PATH and depth <= MAX_DEPTH,
            "Workbook requires JSON values and bounded paths")
    require(len(rows) < MAX_ROWS, "Workbook has too many rows")
    if kind in {"object", "array", "null"}:
        cell = ""
    elif kind == "string":
        _check_text(value)
        if CONTROL_TEXT.search(value):
            kind, cell = "json-string", json.dumps(value)
        else:
            cell = value
    else:
        try:
            cell = json.dumps(value, allow_nan=False)
        except ValueError as error:
            raise Rejected("Workbook requires finite JSON numbers") from error
    _check_text(path)
    pointer = f"#{quote(path, safe='/~')}" if CONTROL_TEXT.search(path) else path
    require(len(pointer) <= MAX_PATH, "Workbook JSON pointer is too long")
    rows.append((pointer, kind, cell))
    if kind == "object":
        for key, child in value.items():
            require(type(key) is str, "Workbook object keys must be strings")
            _flatten(child, f"{path}/{_path_part(key)}", depth + 1, rows)
    if kind == "array":
        for position, child in enumerate(value):
            _flatten(child, f"{path}/{position}", depth + 1, rows)


def _sheet(rows):
    worksheet = ET.Element("worksheet", xmlns=SHEET_NS)
    views = ET.SubElement(worksheet, "sheetViews")
    view = ET.SubElement(views, "sheetView", workbookViewId="0")
    ET.SubElement(view, "pane", ySplit="1", topLeftCell="A2", activePane="bottomLeft", state="frozen")
    cols = ET.SubElement(worksheet, "cols")
    for index, width in enumerate((55, 14, 80), 1):
        ET.SubElement(cols, "col", min=str(index), max=str(index), width=str(width), customWidth="1")
    data = ET.SubElement(worksheet, "sheetData")
    text_size = 0
    for index, values in enumerate(rows, 1):
        row = ET.SubElement(data, "row", r=str(index))
        for column, value in zip("ABC", values):
            cell = ET.SubElement(row, "c", r=f"{column}{index}", t="inlineStr", s="1")
            inline = ET.SubElement(cell, "is")
            content = ET.SubElement(inline, "t", {"{http://www.w3.org/XML/1998/namespace}space": "preserve"})
            content.text = _encode_text(value)
            text_size += len(content.text.encode())
            require(text_size <= MAX_XML_BYTES, "Workbook cell data is too large")
    return _xml(worksheet)


def _xml(root):
    return ET.tostring(root, encoding="utf-8", xml_declaration=True)


def _styles():
    styles = ET.Element("styleSheet", xmlns=SHEET_NS)
    ET.SubElement(ET.SubElement(styles, "fonts", count="1"), "font")
    fills = ET.SubElement(styles, "fills", count="2")
    for pattern in ("none", "gray125"):
        ET.SubElement(ET.SubElement(fills, "fill"), "patternFill", patternType=pattern)
    ET.SubElement(ET.SubElement(styles, "borders", count="1"), "border")
    base = {"fontId": "0", "fillId": "0", "borderId": "0"}
    ET.SubElement(ET.SubElement(styles, "cellStyleXfs", count="1"), "xf", numFmtId="0", **base)
    cell_formats = ET.SubElement(styles, "cellXfs", count="2")
    ET.SubElement(cell_formats, "xf", numFmtId="0", xfId="0", **base)
    ET.SubElement(cell_formats, "xf", numFmtId="49", applyNumberFormat="1", xfId="0", **base)
    ET.SubElement(ET.SubElement(styles, "cellStyles", count="1"), "cellStyle",
                  name="Normal", xfId="0", builtinId="0")
    return _xml(styles)


def write_xlsx(document):
    """Store JSON numbers and strings as Excel text to preserve lexical precision."""
    require(type(document) is dict, "Workbook release must be a JSON object")
    rows = [HEADERS]
    _flatten(document, "", 0, rows)
    workbook = ET.Element("workbook", {"xmlns": SHEET_NS, "xmlns:r": REL_NS})
    ET.SubElement(ET.SubElement(workbook, "bookViews"), "workbookView")
    ET.SubElement(ET.SubElement(workbook, "sheets"), "sheet", {
        "name": SHEET_NAME, "sheetId": "1", "r:id": "rId1"})
    package_rels = ET.Element("Relationships", xmlns=PACKAGE_NS)
    ET.SubElement(package_rels, "Relationship", Id="rId1", Target="xl/workbook.xml",
                  Type=f"{REL_NS}/officeDocument")
    workbook_rels = ET.Element("Relationships", xmlns=PACKAGE_NS)
    ET.SubElement(workbook_rels, "Relationship", Id="rId1", Target="worksheets/sheet1.xml",
                  Type=f"{REL_NS}/worksheet")
    ET.SubElement(workbook_rels, "Relationship", Id="rId2", Target="styles.xml", Type=f"{REL_NS}/styles")
    types = ET.Element("Types", xmlns=CONTENT_NS)
    ET.SubElement(types, "Default", Extension="rels",
                  ContentType="application/vnd.openxmlformats-package.relationships+xml")
    ET.SubElement(types, "Default", Extension="xml", ContentType="application/xml")
    for part, content in (("workbook", "sheet.main"), ("worksheets/sheet1", "worksheet"), ("styles", "styles")):
        ET.SubElement(types, "Override", PartName=f"/xl/{part}.xml",
                      ContentType=f"application/vnd.openxmlformats-officedocument.spreadsheetml.{content}+xml")
    sheet = _sheet(rows)
    require(len(sheet) <= MAX_XML_BYTES, "Workbook worksheet is too large")
    output = io.BytesIO()
    with ZipFile(output, "w", compression=ZIP_DEFLATED) as archive:
        archive.writestr("[Content_Types].xml", _xml(types))
        archive.writestr("_rels/.rels", _xml(package_rels))
        archive.writestr("xl/workbook.xml", _xml(workbook))
        archive.writestr("xl/_rels/workbook.xml.rels", _xml(workbook_rels))
        archive.writestr("xl/styles.xml", _styles())
        archive.writestr("xl/worksheets/sheet1.xml", sheet)
    result = output.getvalue()
    require(len(result) <= MAX_ZIP_BYTES, "Workbook file is too large")
    return result


def _archive_parts(archive):
    entries = archive.infolist()
    require(len(entries) <= 200 and sum(entry.file_size for entry in entries) <= MAX_ARCHIVE_BYTES,
            "Workbook archive exceeds safety limits")
    paths = set()
    for entry in entries:
        path = entry.filename.rstrip("/")
        require(path == entry.orig_filename.rstrip("/") and _safe_path(path)
                and path.casefold() not in paths and entry.file_size <= MAX_XML_BYTES
                and not entry.flag_bits & 1 and entry.compress_type in {ZIP_STORED, ZIP_DEFLATED},
                "Workbook archive contains an unsafe or duplicate entry")
        require(not path.casefold().endswith("vbaproject.bin") and not path.startswith("xl/externalLinks/"),
                "Workbook macros and external workbook links are unsupported")
        paths.add(path.casefold())


def _safe_path(path):
    return bool(path) and not re.search(r"[\\:\x00-\x1f?#%]", path) and all(
        part not in {"", ".", ".."} for part in path.split("/"))


def _read_xml(archive, name, tag):
    try:
        with archive.open(name) as source:
            data = source.read(MAX_XML_BYTES + 1)
        require(len(data) <= MAX_XML_BYTES, "Workbook XML is too large")
        content = data.decode("utf-8-sig")
        require("<!DOCTYPE" not in content.upper() and "<!ENTITY" not in content.upper(),
                "Workbook XML declarations may not define entities")
        element = ET.fromstring(content)
    except (ET.ParseError, KeyError, UnicodeError) as error:
        raise Rejected(FORMAT_ERROR) from error
    require(element.tag == tag, FORMAT_ERROR)
    return element


def _relationship_target(relationship):
    require(relationship.get("TargetMode", "Internal") == "Internal", "Workbook relationship must be internal")
    target = relationship.get("Target", "")
    path = target[1:] if target.startswith("/") else f"xl/{target}"
    require(_safe_path(path) and posixpath.dirname(path) in {"xl", "xl/worksheets"},
            "Unsafe workbook relationship target")
    return path


def _worksheet_parts(archive):
    workbook = _read_xml(archive, "xl/workbook.xml", _tag("workbook"))
    sheet_groups = workbook.findall(_tag("sheets"))
    require(len(sheet_groups) == 1, FORMAT_ERROR)
    sheets = list(sheet_groups[0])
    require(len(sheets) == 1 and sheets[0].tag == _tag("sheet") and sheets[0].get("name") == SHEET_NAME
            and sheets[0].get("state", "visible") == "visible", FORMAT_ERROR)
    rels = _read_xml(archive, "xl/_rels/workbook.xml.rels", _tag("Relationships", PACKAGE_NS))
    sheet_id = sheets[0].get(_tag("id", REL_NS))
    matching = [item for item in rels if item.get("Id") == sheet_id]
    require(sheet_id and len(matching) == 1 and matching[0].get("Type") == f"{REL_NS}/worksheet", FORMAT_ERROR)
    shared = [item for item in rels if item.get("Type") == f"{REL_NS}/sharedStrings"]
    require(len(shared) <= 1, "Workbook has multiple shared string tables")
    return _relationship_target(matching[0]), _relationship_target(shared[0]) if shared else None


def _rich_string(element):
    texts = element.findall(_tag("t"))
    runs = element.findall(_tag("r"))
    require(len(texts) <= 1 and not (texts and runs), "Workbook string has conflicting values")
    if runs:
        for run in runs:
            parts = run.findall(_tag("t"))
            require(len(parts) == 1, "Invalid workbook rich-text run")
            texts.extend(parts)
    require(not any(len(text) for text in texts), "Invalid workbook string content")
    return _decode_text("".join(text.text or "" for text in texts))


def _cell(cell, shared):
    kind = cell.get("t", "n")
    children = list(cell)
    require(len(children) <= 1, "Workbook cell has duplicate or unsupported values")
    if not children:
        return "", "blank"
    field = children[0]
    if kind == "inlineStr":
        require(field.tag == _tag("is"), "Invalid inline workbook string")
        return _rich_string(field), "text"
    require(field.tag == _tag("v") and not len(field) and kind in {"s", "n", "b"},
            "Workbook cell type is unsupported")
    content = field.text or ""
    if kind == "s":
        require(INDEX.fullmatch(content) and int(content) < len(shared), "Invalid workbook shared string index")
        return shared[int(content)], "text"
    if kind == "b":
        require(content in {"0", "1"}, "Invalid Excel boolean cell")
        return ("true" if content == "1" else "false"), "boolean"
    _check_text(content)
    return (content, "number") if content else ("", "blank")


def _data_rows(worksheet, shared):
    require(next(worksheet.iter(_tag("f")), None) is None, "Workbook formulas are not allowed")
    groups = worksheet.findall(_tag("sheetData"))
    require(len(groups) == 1, FORMAT_ERROR)
    seen = set()
    for row in groups[0]:
        index = row.get("r", "")
        require(row.tag == _tag("row") and INDEX.fullmatch(index) and 0 < int(index) <= MAX_ROWS
                and index not in seen, "Invalid or duplicate workbook row")
        seen.add(index)
        cells = {}
        for item in row:
            match = REFERENCE.fullmatch(item.get("r", ""))
            require(item.tag == _tag("c") and match and match[2] == index and match[1] not in cells,
                    "Unexpected or duplicate workbook cell")
            cells[match[1]] = _cell(item, shared)
        yield int(index), [cells.get(column, ("", "blank")) for column in "ABC"]


def _scalar(kind, value, representation):
    if kind in {"object", "array", "null"}:
        require(not value, "Workbook container or null must have an empty Value")
        return {"object": {}, "array": [], "null": None}[kind]
    if kind in {"string", "json-string"}:
        require(representation in {"text", "blank"}, "Set workbook string values to Text in Excel")
        if kind == "json-string":
            try:
                value = json.loads(value)
            except ValueError as error:
                raise Rejected("Invalid JSON-escaped workbook string") from error
            require(type(value) is str, "Invalid JSON-escaped workbook string")
            _check_text(value)
        return value
    if kind == "boolean":
        require(representation in {"text", "boolean"} and value in {"true", "false"},
                "Workbook boolean must be true or false")
        return value == "true"
    require(kind == "number" and representation in {"text", "number"}, "Invalid workbook JSON type")
    try:
        parsed = json.loads(value)
    except ValueError as error:
        raise Rejected("Invalid workbook JSON number") from error
    require(type(parsed) in {int, float} and (type(parsed) is int or math.isfinite(parsed)),
            "Workbook requires finite JSON numbers")
    return parsed


def _rebuild(worksheet, shared):
    entries = {}
    header_found = False
    text_size = 0
    for index, cells in _data_rows(worksheet, shared):
        (path, path_kind), (kind, type_kind), (value, value_kind) = cells
        if index == 1:
            require(tuple(cell[0] for cell in cells) == HEADERS and all(cell[1] == "text" for cell in cells),
                    FORMAT_ERROR)
            header_found = True
            continue
        if all(cell[0] == "" for cell in cells):
            continue
        text_size += sum(len(text.encode()) for text, _representation in cells)
        require(text_size <= MAX_XML_BYTES, "Workbook cell data is too large")
        require(path_kind in {"text", "blank"} and type_kind == "text", "Invalid workbook path or type cell")
        parts = _parse_path(path)
        require(parts not in entries, "Duplicate workbook JSON field")
        entries[parts] = _scalar(kind, value, value_kind)
    require(header_found and type(entries.get(())) is dict, FORMAT_ERROR)
    array_items = {}
    for path, value in entries.items():
        if not path:
            continue
        parent = entries.get(path[:-1])
        key = path[-1]
        if type(parent) is dict:
            parent[key] = value
        else:
            require(type(parent) is list and INDEX.fullmatch(key) and int(key) < MAX_ROWS,
                    "Workbook JSON path has an invalid or missing parent")
            array_items.setdefault(path[:-1], {})[int(key)] = value
    for path, items in array_items.items():
        require(len(items) == max(items) + 1, "Workbook JSON arrays must not be sparse")
        entries[path].extend(items[index] for index in range(len(items)))
    return entries[()]


def read_xlsx(data):
    """Read an explicitly edited OntoGraph workbook into an unvalidated release draft."""
    require(type(data) is bytes and 0 < len(data) <= MAX_ZIP_BYTES, "Invalid workbook file size")
    try:
        with ZipFile(io.BytesIO(data)) as archive:
            _archive_parts(archive)
            sheet_path, shared_path = _worksheet_parts(archive)
            shared = []
            if shared_path:
                strings = _read_xml(archive, shared_path, _tag("sst"))
                require(len(strings) <= MAX_ROWS * 3 and all(item.tag == _tag("si") for item in strings),
                        "Invalid or oversized workbook shared string table")
                shared = [_rich_string(item) for item in strings]
            return _rebuild(_read_xml(archive, sheet_path, _tag("worksheet")), shared)
    except (BadZipFile, CompressionError, RuntimeError, OSError, NotImplementedError) as error:
        raise Rejected(FORMAT_ERROR) from error

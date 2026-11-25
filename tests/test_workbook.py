import io
import json
import unittest
from pathlib import Path
from unittest.mock import patch
from xml.etree import ElementTree as ET
from zipfile import ZipFile

from ontograph.model import Rejected
from ontograph.workbook import REL_NS, SHEET_NS, read_xlsx, write_xlsx


SHEET = "xl/worksheets/sheet1.xml"
RELS = "xl/_rels/workbook.xml.rels"


def replace_parts(data, replacements):
    output = io.BytesIO()
    with ZipFile(io.BytesIO(data)) as source, ZipFile(output, "w") as target:
        for name in source.namelist():
            content = replacements.pop(name, None)
            target.writestr(name, source.read(name) if content is None else content)
        for name, content in replacements.items():
            target.writestr(name, content)
    return output.getvalue()


def read_part(data, name):
    with ZipFile(io.BytesIO(data)) as archive:
        return archive.read(name)


def xml_tag(name):
    return f"{{{SHEET_NS}}}{name}"


class WorkbookTest(unittest.TestCase):
    def test_release_round_trip(self):
        release = json.loads((Path(__file__).parents[1] / "examples" / "aurora-21.json").read_text())
        self.assertEqual(read_xlsx(write_xlsx(release)), release)

    def test_shapes_unicode_and_numbers_round_trip_without_formulas(self):
        release = {"": None, "nested/~": [{}, [], False, "", "à 🤝", "000012", 123456789012345678901],
                   "line\r": "one\r\ntwo\tthree\u0001", "literal": "_x0041_", "formula": '=HYPERLINK("test")',
                   "zero": -0.0, "float": 2.0, "boolean": True}
        data = write_xlsx(release)
        worksheet = ET.fromstring(read_part(data, SHEET))
        self.assertFalse(list(worksheet.iter(xml_tag("f"))))
        restored = read_xlsx(data)
        self.assertEqual(restored, release)
        self.assertEqual(json.dumps(restored), json.dumps(release))

    def test_excel_shared_strings_and_numeric_edits(self):
        data = write_xlsx({"label": "draft", "number": 9, "approved": False})
        sheet = ET.fromstring(read_part(data, SHEET))
        cells = {cell.attrib["r"]: cell for cell in sheet.iter(xml_tag("c"))}
        shared = ET.Element(xml_tag("sst"))
        rich = ET.SubElement(shared, xml_tag("si"))
        for part in ("ré", "visé"):
            ET.SubElement(ET.SubElement(rich, xml_tag("r")), xml_tag("t")).text = part
        for name, category, value in (("C3", "s", "0"), ("C4", "n", "-2.5e+1"), ("C5", "b", "1")):
            cell = cells[name]
            cell.remove(cell[0])
            cell.set("t", category)
            ET.SubElement(cell, xml_tag("v")).text = value
        relationships = read_part(data, RELS).replace(
            b"</Relationships>",
            f'<Relationship Id="rId3" Target="sharedStrings.xml" Type="{REL_NS}/sharedStrings" />'
            "</Relationships>".encode(),
        )
        edited = replace_parts(data, {SHEET: ET.tostring(sheet), RELS: relationships,
                                      "xl/sharedStrings.xml": ET.tostring(shared)})
        self.assertEqual(read_xlsx(edited), {"label": "révisé", "number": -25.0, "approved": True})

    def test_formulas_duplicate_fields_and_sparse_arrays_are_rejected(self):
        data = write_xlsx({"items": ["a", "b"]})
        sheet = read_part(data, SHEET)
        variants = (
            (sheet.replace(b'<c r="C4" t="inlineStr" s="1">', b'<c r="C4" t="inlineStr" s="1"><f>1+1</f>'),
             "formulas"),
            (sheet.replace(b"/items/1", b"/items/0"), "Duplicate workbook JSON field"),
            (sheet.replace(b"/items/1", b"#/items/%30"), "Duplicate workbook JSON field"),
            (sheet.replace(b"/items/1", b"/items/2"), "must not be sparse"),
            (sheet.replace(b"/items/1", b"/items/01"), "invalid or missing parent"),
            (sheet.replace(b"/items/1", b"/missing/1"), "invalid or missing parent"),
            (sheet.replace(b"/items/1", b"/items/~2"), "Invalid workbook JSON pointer"),
        )
        for altered, expected in variants:
            with self.subTest(expected=expected), self.assertRaisesRegex(Rejected, expected):
                read_xlsx(replace_parts(data, {SHEET: altered}))

    def test_non_ontograph_and_unsafe_archives_are_rejected(self):
        data = write_xlsx({})
        workbook = read_part(data, "xl/workbook.xml")
        altered = replace_parts(data, {"xl/workbook.xml": workbook.replace(b"OntoGraph Release", b"PolicyAsCode")})
        with self.assertRaisesRegex(Rejected, "Legacy PolicyAsCode"):
            read_xlsx(altered)
        with self.assertRaisesRegex(Rejected, "unsafe or duplicate"):
            read_xlsx(replace_parts(data, {"../wrong.xml": b"x"}))
        with patch("ontograph.workbook.MAX_ARCHIVE_BYTES", 100):
            with self.assertRaisesRegex(Rejected, "archive exceeds safety limits"):
                read_xlsx(data)
        sheet = read_part(data, SHEET)
        altered = replace_parts(data, {SHEET: b'<!DOCTYPE worksheet [<!ENTITY x "bad">]>' + sheet})
        with self.assertRaisesRegex(Rejected, "may not define entities"):
            read_xlsx(altered)

    def test_writer_requires_finite_json_and_excel_length(self):
        with self.assertRaisesRegex(Rejected, "finite JSON"):
            write_xlsx({"value": float("inf")})
        with self.assertRaisesRegex(Rejected, "too long"):
            write_xlsx({"value": "a" * 32768})


if __name__ == "__main__":
    unittest.main()

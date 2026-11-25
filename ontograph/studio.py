"""Loopback-only Studio, backed by the reference model and optional local registry."""

import io
import json
import re
import sqlite3
from functools import lru_cache
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit
from zipfile import ZIP_DEFLATED, ZipFile

from .aurora import example, run
from .model import (
    DECISIONS, KINDS, RELATIONS, Rejected, canonical, digest, equal, evaluate, impact,
    indexed, jsonld, require, validate, verify_discrimination,
)
from .report import render_report
from .store import Registry

WEB = Path(__file__).resolve().parent / "web"
PROCESS = WEB / "process"
BRAND = WEB.parent.parent / "assets" / "brand" / "ontograph-avatar.png"
ASSETS = {
    "/governance": (WEB / "index.html", "text/html; charset=utf-8"),
    "/index.html": (WEB / "index.html", "text/html; charset=utf-8"),
    "/processi/": (PROCESS / "index.html", "text/html; charset=utf-8"),
    "/processi/process.css": (PROCESS / "process.css", "text/css; charset=utf-8"),
    "/studio.css": (WEB / "studio.css", "text/css; charset=utf-8"),
    "/studio.js": (WEB / "studio.js", "text/javascript; charset=utf-8"),
    "/graph.js": (WEB / "graph.js", "text/javascript; charset=utf-8"),
    "/inspector.js": (WEB / "inspector.js", "text/javascript; charset=utf-8"),
    "/brand.png": (BRAND, "image/png"),
}
ASSETS.update({
    "/processi/" + name: (PROCESS / name, "text/javascript; charset=utf-8")
    for name in ("process-studio.js", "boot.js", "seed.js", "functional-editor.js",
                 "functional-graph.js", "census.js", "evaluator.js", "vendor/xlsx.full.min.js",
                 "vendor/mermaid.min.js", "vendor/jszip.min.js")
})
REGISTRY_ACTIONS = frozenset(("status", "propose", "review", "publish", "withdraw", "export", "events"))
MAX_REQUEST = 8_000_000
MISSING = object()


def parse_json(data):
    def unique(pairs):
        result = {}
        for key, value in pairs:
            require(key not in result, f"Duplicate JSON key: {key}")
            result[key] = value
        return result

    return json.loads(data, object_pairs_hook=unique)


def changes(before, after, limit=150):
    """Deterministic JSON leaf changes. Domain collections align by stable ID."""
    rows = []
    total = 0

    def walk(left, right, path):
        nonlocal total
        if left is MISSING or right is MISSING:
            total += 1
            if len(rows) < limit:
                rows.append({
                    "path": path, "op": "add" if left is MISSING else "remove",
                    **({"before": left} if left is not MISSING else {}),
                    **({"after": right} if right is not MISSING else {}),
                })
        elif type(left) is dict and type(right) is dict:
            for key in sorted(left.keys() | right.keys()):
                walk(left.get(key, MISSING), right.get(key, MISSING), [*path, key])
        elif type(left) is list and type(right) is list:
            if len(path) == 1 and path[0] in {"nodes", "evidence", "rules", "probes", "edges"}:
                def by_key(items):
                    if path[0] == "edges":
                        return {f"{item['source']} {item['predicate']} {item['target']}": item for item in items}
                    return indexed(items, path[0])

                old, new = by_key(left), by_key(right)
                for key in sorted(old.keys() | new.keys()):
                    walk(old.get(key, MISSING), new.get(key, MISSING), [*path, key])
            else:
                for i in range(max(len(left), len(right))):
                    walk(left[i] if i < len(left) else MISSING,
                         right[i] if i < len(right) else MISSING, [*path, i])
        elif not equal(left, right):
            total += 1
            if len(rows) < limit:
                rows.append({"path": path, "op": "replace", "before": left, "after": right})

    walk(before, after, [])
    return {"items": rows, "total": total}


def inspect(payload):
    require(type(payload) is dict and set(payload) <= {"model", "base"} and "model" in payload,
            "Expected a model and optional comparison base")
    draft = validate(payload["model"])
    base = payload.get("base")
    if base is not None:
        validate(base)
    rules = indexed(draft["rules"], "rule")
    probes = [{"id": probe["id"], "rule": probe["rule"], "application": probe["application"],
               "expected": probe["expected"], "result": evaluate(rules[probe["rule"]], probe["facts"])}
              for probe in draft["probes"]]
    blockers = []
    if any(item["status"] != "confirmed" for item in draft["evidence"]):
        blockers.append("Evidence contains disputed or insufficient records")
    if base is not None:
        try:
            verify_discrimination(base, draft)
        except Rejected as error:
            blockers.append(str(error))
    return {"digest": digest(draft), "probes": probes, "blockers": blockers,
            "impact": impact(base, draft), "diff": changes(base, draft) if base else {"items": [], "total": 0}}


def diagram(document, style):
    nodes = {node["id"]: (f"n{i}", re.sub(r'[^\w .,:()/+-]', " ", node["label"]).strip()[:96])
             for i, node in enumerate(document["nodes"])}
    if style == "mermaid":
        lines = ["flowchart LR"]
        lines.extend(f'  {index}["{label}"]' for index, label in nodes.values())
        lines.extend(f"  {nodes[e['source']][0]} -->|{e['predicate']}| {nodes[e['target']][0]}"
                     for e in document["edges"])
    else:
        lines = ["@startuml", "left to right direction"]
        lines.extend(f'rectangle "{label}" as {index}' for index, label in nodes.values())
        lines.extend(f"{nodes[e['source']][0]} --> {nodes[e['target']][0]} : {e['predicate']}"
                     for e in document["edges"])
        lines.append("@enduml")
    return "\n".join(lines) + "\n"


def create_export(payload):
    require(type(payload) is dict and set(payload) == {"model", "format"}, "Expected export model and format")
    model, format_name = validate(payload["model"]), payload["format"]
    require(format_name in {"json", "jsonld", "xlsx", "zip", "mermaid", "plantuml"}, "Unsupported export format")
    model_data = (canonical(model) + "\n").encode()
    if format_name == "json":
        return model_data, "application/json", "model.json"
    if format_name == "jsonld":
        graph = jsonld(model, model["domain"], digest(model))
        return (canonical(graph) + "\n").encode(), "application/ld+json", "graph.jsonld"
    if format_name in {"mermaid", "plantuml"}:
        return diagram(model, format_name).encode(), "text/plain; charset=utf-8", (
            "graph.mmd" if format_name == "mermaid" else "graph.puml"
        )

    from .workbook import write_xlsx

    workbook = write_xlsx(model)
    if format_name == "xlsx":
        return workbook, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "model.xlsx"
    output = io.BytesIO()
    with ZipFile(output, "w", ZIP_DEFLATED) as archive:
        archive.writestr("model.json", model_data)
        archive.writestr("graph.jsonld", canonical(jsonld(model, model["domain"], digest(model))) + "\n")
        archive.writestr("graph.mmd", diagram(model, "mermaid"))
        archive.writestr("graph.puml", diagram(model, "plantuml"))
        archive.writestr("model.xlsx", workbook)
    return output.getvalue(), "application/zip", "ontograph-model.zip"


@lru_cache(maxsize=1)
def demo_data():
    return run()


class StudioServer(ThreadingHTTPServer):
    def __init__(self, port=8765, document=None, registry=None):
        super().__init__(("127.0.0.1", port), StudioHandler)
        self.document = validate(document) if document is not None else example()
        self.start_page = "/governance" if document is not None else "/processi/"
        self.registry = Registry(registry) if registry is not None else None
        self.host = f"127.0.0.1:{self.server_port}"

    @property
    def url(self):
        return "http://" + self.host


class StudioHandler(BaseHTTPRequestHandler):
    def log_message(self, *_):
        pass

    def _send(self, content, media, status=HTTPStatus.OK, filename=None):
        self.send_response(status)
        self.send_header("Content-Type", media)
        self.send_header("Content-Length", str(len(content)))
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Referrer-Policy", "no-referrer")
        self.send_header("Content-Security-Policy", "default-src 'none'; script-src 'self'; "
                         "style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self'; "
                         "base-uri 'none'; form-action 'self'; frame-ancestors 'none'")
        if filename:
            self.send_header("Content-Disposition", f'attachment; filename="{filename}"')
        self.end_headers()
        self.wfile.write(content)

    def _json(self, result, status=HTTPStatus.OK):
        self._send(canonical(result).encode(), "application/json; charset=utf-8", status)

    def _host_ok(self):
        if self.headers.get("Host") != self.server.host:
            self._json({"error": "Open Studio on its loopback URL"}, HTTPStatus.FORBIDDEN)
            return False
        return True

    def do_GET(self):
        if not self._host_ok():
            return
        path = urlsplit(self.path).path
        if path in {"/", "/processi"}:
            self.send_response(HTTPStatus.SEE_OTHER)
            self.send_header("Location", self.server.start_page if path == "/" else "/processi/")
            self.send_header("Content-Length", "0")
            self.end_headers()
        elif path in ASSETS:
            asset, media = ASSETS[path]
            try:
                data = asset.read_bytes()
            except FileNotFoundError:
                self._json({"error": "Asset not found"}, HTTPStatus.NOT_FOUND)
                return
            self._send(data, media)
        elif path == "/api/bootstrap":
            model = self.server.document
            base = example(1) if equal(model, example()) else model
            self._json({"model": model, "base": base, "kinds": sorted(KINDS), "relations": sorted(RELATIONS),
                        "decisions": sorted(DECISIONS), "registry": self.server.registry is not None})
        elif path == "/api/demo":
            self._json(demo_data())
        elif path == "/evidence-report":
            self._send(render_report(demo_data()).encode(), "text/html; charset=utf-8")
        else:
            self._json({"error": "Not found"}, HTTPStatus.NOT_FOUND)

    def do_POST(self):
        if not self._host_ok():
            return
        origin = self.headers.get("Origin")
        if ((origin is not None and origin != self.server.url)
                or self.headers.get("Sec-Fetch-Site") == "cross-site"):
            self._json({"error": "Cross-origin request rejected"}, HTTPStatus.FORBIDDEN)
            return
        self.connection.settimeout(10)
        path = urlsplit(self.path).path
        try:
            length = int(self.headers.get("Content-Length", "0"))
            require(0 < length <= MAX_REQUEST, "Missing or oversized request body")
            data = self.rfile.read(length)
            require(len(data) == length, "Incomplete request body")
            mime = self.headers.get_content_type()
            if path == "/api/import-workbook":
                require(mime == "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                        "Expected an OntoGraph XLSX workbook")
                from .workbook import read_xlsx

                self._json({"model": validate(read_xlsx(data))})
                return
            require(mime == "application/json", "Expected application/json")
            payload = parse_json(data)
            if path == "/api/validate":
                self._json(inspect(payload))
            elif path == "/api/export":
                content, media, filename = create_export(payload)
                self._send(content, media, filename=filename)
            elif path == "/api/registry":
                self._registry(payload)
            else:
                self._json({"error": "Not found"}, HTTPStatus.NOT_FOUND)
        except (ValueError, TypeError, KeyError, AttributeError, RecursionError, OverflowError, OSError, sqlite3.Error) as error:
            self._json({"error": str(error)[:800]}, HTTPStatus.BAD_REQUEST)

    def _registry(self, payload):
        require(self.server.registry is not None, "Start Studio with --registry to connect a local registry")
        require(type(payload) is dict and set(payload) == {"action", "arguments"}
                and type(payload["arguments"]) is dict
                and payload["action"] in REGISTRY_ACTIONS, "Unsupported registry action")
        scheme, _, credential = self.headers.get("Authorization", "").partition(" ")
        require(scheme == "Bearer" and credential, "Enter the token for your registry role")
        result = getattr(self.server.registry, payload["action"])(credential, **payload["arguments"])
        self._json({"result": result})


def serve(port=8765, model=None, registry=None):
    document = parse_json(model.read_bytes()) if model else None
    require(registry is None or registry.is_file(), "Registry file does not exist. Initialize it with the CLI.")
    with StudioServer(port, document, registry) as server:
        print(f"OntoGraph Studio · {server.url}", flush=True)
        try:
            server.serve_forever()
        except KeyboardInterrupt:
            pass

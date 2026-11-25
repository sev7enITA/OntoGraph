"""Command line for the offline registry and demonstration."""

import argparse
import json
import os
import sqlite3
import sys
from pathlib import Path

from . import __version__
from .aurora import example, run, summary
from .exchange import policywatcher_evidence, verify_release
from .model import Rejected, digest, require, validate
from .report import render_report
from .store import Registry, verify_events

OPERATIONS = {
    "add-principal": "add_principal", "disable-principal": "disable_principal", "propose": "propose",
    "review": "review", "publish": "publish", "withdraw": "withdraw", "acknowledge": "acknowledge",
    "observe": "observe", "status": "status", "consumer-release": "consumer_release",
    "export": "export", "events": "events",
}


def load(stream):
    def unique(pairs):
        result = {}
        for key, value in pairs:
            require(key not in result, "Duplicate JSON field")
            result[key] = value
        return result

    return json.load(stream, object_pairs_hook=unique)


def display(data, stream=sys.stdout):
    json.dump(data, stream, ensure_ascii=False, allow_nan=False, indent=2)
    stream.write("\n")


def main():
    parser = argparse.ArgumentParser(prog="python3 -m ontograph")
    parser.add_argument("--version", action="version", version=__version__)
    subs = parser.add_subparsers(dest="command", required=True)
    demo = subs.add_parser("demo", help="run the isolated synthetic scenario")
    demo.add_argument("--report", type=Path, help="write the full machine-readable evidence report")
    demo.add_argument("--html", type=Path, help="write a self-contained HTML report")
    studio = subs.add_parser("studio", help="launch the local visual workspace")
    studio.add_argument("--port", type=int, default=8765)
    studio.add_argument("--model", type=Path, help="use a valid release JSON as the initial draft")
    studio.add_argument("--registry", type=Path, help="connect an initialized local governance registry")
    specimen = subs.add_parser("example", help="print a validated synthetic release document")
    specimen.add_argument("--variant", type=int, choices=(1, 2), default=2)
    intake = subs.add_parser("policywatcher-draft", help="prepare a local evidence record requiring human review")
    intake.add_argument("packet", type=Path)
    intake.add_argument("excerpt", type=Path)
    for command in ("validate", "verify-ledger", "verify-release"):
        sub = subs.add_parser(command)
        sub.add_argument("file", type=Path)
        if command == "verify-ledger":
            sub.add_argument("--tip", help="expected hash from an independently retained checkpoint")
        if command == "verify-release":
            sub.add_argument("--release", help="expected release digest from an independent source")
    init = subs.add_parser("init")
    init.add_argument("database", type=Path)
    init.add_argument("workspace")
    init.add_argument("admin")
    call = subs.add_parser("call", help="invoke a registry operation with a JSON object on stdin")
    call.add_argument("database", type=Path)
    call.add_argument("operation", choices=OPERATIONS)
    args = parser.parse_args()
    try:
        if args.command == "demo":
            report = run()
            if args.report:
                with args.report.open("x", encoding="utf-8") as file:
                    display(report, file)
            if args.html:
                with args.html.open("x", encoding="utf-8") as file:
                    file.write(render_report(report))
            display(summary(report))
        elif args.command == "studio":
            from .studio import serve

            serve(args.port, args.model, args.registry)
        elif args.command == "example":
            display(validate(example(args.variant)))
        elif args.command == "validate":
            with args.file.open(encoding="utf-8") as file:
                document = validate(load(file))
            display({"valid": True, "payload_sha256": digest(document)})
        elif args.command == "policywatcher-draft":
            with args.packet.open(encoding="utf-8") as file:
                packet = load(file)
            display(policywatcher_evidence(packet, args.excerpt.read_text(encoding="utf-8")))
        elif args.command == "verify-release":
            with args.file.open(encoding="utf-8") as file:
                display({"release": verify_release(load(file), args.release)})
        elif args.command == "verify-ledger":
            with args.file.open(encoding="utf-8") as file:
                ledger = load(file)
            display({"tip": verify_events(ledger, args.tip)})
        elif args.command == "init":
            os.umask(0o077)
            display({"credential": Registry(args.database).initialize(args.workspace, args.admin)})
        else:
            require(args.database.is_file(), "Registry does not exist")
            token = os.environ.get("ONTOGRAPH_TOKEN")
            require(token, "Set ONTOGRAPH_TOKEN for this operation")
            data = load(sys.stdin)
            require(type(data) is dict, "Command input must be a JSON object")
            result = getattr(Registry(args.database), OPERATIONS[args.operation])(token, **data)
            display(result)
    except (Rejected, OSError, ValueError, TypeError, KeyError, sqlite3.Error) as error:
        print(f"OntoGraph: {error}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

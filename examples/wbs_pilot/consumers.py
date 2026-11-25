"""Local business adapters for Beancount/Beanquery and LibreOffice Calc."""
import csv
import hashlib
import io
import json
import os
import shutil
import subprocess
from pathlib import Path
from xml.sax.saxutils import quoteattr

HERE = Path(__file__).resolve().parent
APPS = ("finance", "pmo")
CASES = {"qualified", "legacy", "unknown"}


def executable(name, mac=None):
    binary = shutil.which(name)
    if binary:
        return binary
    if mac and Path(mac).is_file():
        return mac
    raise FileNotFoundError(f"Install {name} and make it available on PATH.")


def tools():
    return executable("bean-query"), executable("soffice", "/Applications/LibreOffice.app/Contents/MacOS/soffice")


def run_cli(args, timeout=60):
    env = {**os.environ, "LC_ALL": "C", "TZ": "UTC"}
    return subprocess.run(args, check=True, capture_output=True, timeout=timeout, env=env).stdout


def fingerprint(data):
    return hashlib.sha256(data).hexdigest()


class Consumer:
    def __init__(self, folder, name):
        self.folder = folder / name
        self.folder.mkdir()
        self.name = name

    def install(self, delivery, keep_old_rules=False):
        rule = None
        acknowledged = None
        if delivery["phase"] == "activate":
            package = delivery["payload"]
            if package["application"] != self.name or len(package["rules"]) != 1:
                raise ValueError("Unexpected delivery")
            rule = package["rules"][0]
            if (rule["id"] != "admit-row" or rule["applies"] or rule["requires"] not in
                    ({"known": True}, {"known": True, "qualified": True})):
                raise ValueError("Adapter cannot translate this decision contract")
            acknowledged = delivery["delivery_sha256"]
        elif delivery["phase"] != "withdraw":
            raise ValueError("Unexpected delivery phase")
        if not keep_old_rules:
            self.configure(rule)
        # This is the receiving application's declaration, distinct from native execution.
        (self.folder / "receipt.json").write_text(json.dumps(acknowledged))
        return acknowledged

    def readback(self):
        declared = json.loads((self.folder / "receipt.json").read_text())
        output, files = self.execute()
        if (len(output) != len(CASES) or {row["case_id"] for row in output} != CASES
                or any(row["amount"] <= 0 or row["eligible"] not in (0, row["amount"]) for row in output)):
            raise ValueError("Invalid native business output")
        return {"declared_delivery": declared, "rows": sorted(output, key=lambda row: row["case_id"]),
                "files": {p.name: fingerprint(p.read_bytes()) for p in files}}


class Finance(Consumer):
    """Native Beanquery filters ledger postings to form the close eligibility report."""
    def __init__(self, folder, binary):
        super().__init__(folder, "finance")
        self.binary = binary
        self.journal = self.folder / "close.bean"
        self.query = self.folder / "close.bql"
        shutil.copyfile(HERE / "finance.bean", self.journal)

    def configure(self, rule):
        criteria = " AND 1 = 0" if rule is None else " AND meta('wbs') = '0017'"
        if rule and rule["requires"].get("qualified"):
            criteria += " AND meta('context') = 'Finance'"
        self.query.write_text("SELECT narration AS case_id, number AS amount WHERE account = 'Expenses:Close'" + criteria)

    def execute(self):
        active = run_cli([self.binary, "-f", "csv", str(self.journal), self.query.read_text()])
        gross = run_cli([self.binary, "-f", "csv", str(self.journal),
                         "SELECT narration AS case_id, number AS amount WHERE account = 'Expenses:Close'"])
        (self.folder / "eligible.csv").write_bytes(active)
        (self.folder / "inventory.csv").write_bytes(gross)
        def amounts(data):
            rows = list(csv.DictReader(io.StringIO(data.decode())))
            result = {r["case_id"]: int(r["amount"]) for r in rows}
            if len(result) != len(rows):
                raise ValueError("Duplicate ledger item")
            return result
        balances, eligible = amounts(gross), amounts(active)
        if not eligible.keys() <= balances.keys():
            raise ValueError("Unknown posting in close report")
        output = [{"case_id": key, "amount": amount, "eligible": eligible.get(key, 0)}
                  for key, amount in balances.items()]
        return output, (self.journal, self.query, self.folder / "eligible.csv", self.folder / "inventory.csv")


class Pmo(Consumer):
    """Calc recalculates native OpenDocument formulas and exports budget commitments."""
    def __init__(self, folder, binary):
        super().__init__(folder, "pmo")
        self.binary = binary
        self.source = self.folder / "commitments.fods"
        self.profile = (self.folder / "profile").resolve().as_uri()

    def configure(self, rule):
        sheet = (HERE / "commitments.fods").read_text()
        formula = 'of:=0' if rule is None else 'of:=IF([.B{r}]="0017";[.D{r}];0)'
        if rule and rule["requires"].get("qualified"):
            formula = 'of:=IF(AND([.B{r}]="0017";[.C{r}]="PMO");[.D{r}];0)'
        for row in (2, 3, 4):
            sheet = sheet.replace(f'"FORMULA_{row}"', quoteattr(formula.format(r=row)))
        self.source.write_text(sheet)

    def execute(self):
        csv_path = self.folder / "commitments.csv"
        if not self.source.is_file():
            raise FileNotFoundError("Work-package workbook unavailable")
        csv_path.unlink(missing_ok=True)  # A stale export cannot stand in for a new observation.
        run_cli([self.binary, "-env:UserInstallation=" + self.profile, "--headless", "--convert-to",
                 "csv:Text - txt - csv (StarCalc):44,34,76,1,,1033,false,true,true,false,false,0,false,false",
                 "--outdir", str(self.folder), str(self.source)])
        with csv_path.open(encoding="utf-8-sig", newline="") as f:
            rows = [{"case_id": r["case_id"], "amount": int(r["budget"]), "eligible": int(r["eligible"])}
                    for r in csv.DictReader(f)]
        return rows, (self.source, csv_path)

[OnToGraPh Wiki](README.md)

# Aurora 21

**Synthetic scenario.** A due diligence rule adds an inspection report to the documents required for a building dossier. Individual property units remain outside the new requirement. The CRM and PMS receive application-specific packages.

| Step | CRM | PMS |
| --- | --- | --- |
| Baseline | Passes the probes | Passes the probes |
| New release | Holds a dossier missing the inspection report | Declares the expected digest and clears the same dossier |
| Withdrawal requested | Withdrawal verified | Unreachable. Withdrawal remains unproven |
| Reconciliation | Withdrawal verified | An explicit observation confirms inactivity |
| Recovery | Passes the probes on the newly approved candidate | Passes the probes on the newly approved candidate |

The distinguishing case is a building dossier that would have passed under the old rule. A positive case and an out-of-scope case check for indiscriminate blocking.

## Reproduce the verification

From the repository root with Python 3.10 or later:

```sh
mkdir -p out
python3 -m ontograph demo --report out/aurora.json --html out/aurora.html
python3 -m unittest discover -s tests -v
```

Open `out/aurora.html` to inspect results and digests. Choose fresh output paths, since the command protects existing files. Recent [GitHub Actions runs](https://github.com/sev7enITA/OntoGraph/actions/workflows/verify.yml) provide HTML and JSON under **Artifacts**.

The report identifies the simulated releases and packages, shows the cases observed and keeps uncertainty visible when a timeout occurs. An operational deployment requires qualified observers and adapters for the customer's applications.

[Open the public report](https://www.fabriziodegni.com/OnToGraPh/demo/) · [Full protocol](../PROTOCOL.md) · [Pilot criteria](MARKET-AND-STANDARDS.md#how-to-decide-whether-to-pay)

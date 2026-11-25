# Import the governed signal into PALO

Complete the [pilot setup and registry run](README.md) from the OnToGraPh repository root. The receiver uses the Assessment Path page, its JavaScript and the native evidence validator from PALO commit `8cce101a653572cc9ec7f888a2422806536a93d1`. The PALO checkout supplies Playwright and its browser for this optional integration test. [Pinned Assessment Path](https://github.com/sev7enITA/PALOframework/blob/8cce101a653572cc9ec7f888a2422806536a93d1/PALO_AssessmentPath.html) · [Native validator](https://github.com/sev7enITA/PALOframework/blob/8cce101a653572cc9ec7f888a2422806536a93d1/scripts/evidence-validate.mjs)

```sh
PLAYWRIGHT_MODULE="$pilot_dir/palo/node_modules/playwright" \
  python3 -m examples.hub_pilot.palo \
    --palo-root "$pilot_dir/palo" \
    --release "$pilot_dir/run/release.json" \
    --status "$pilot_dir/run/status.json" \
    --observation "$pilot_dir/run/probe-matched.json" \
    --signal "$pilot_dir/run/resolved-signal.json" \
    --output "$pilot_dir/run/palo"
```

Choose a fresh output directory for each run. PALO stamps its own case updates and validation receipts. Repeating the same admission can therefore produce a new case digest.

## What to inspect

1. **Which release admitted this signal?** The bridge verifies the frozen release, resolves the signal fields through its dictionary and compares them with both the registered probe facts and the observed values. It checks the scoped receipt, activation, decision, SHA-256 of the archived observation bytes and the canonical digest of the complete signal. This catches edits to descriptive text even when all routing fields match. These checks describe the release at the time in the registry status. The pilot treats the local registry export as the trusted source of that status.
2. **What did PALO do?** Chromium imports the case through the Assessment Path file input and imports the original signal through its monitoring input. The native client reopens Measure and Prove, records a pending human review and persists the release graph, rule, source and observations. Compare `case-input.json` with `case-reopened.json` and open `board-pack.md` for the reviewer’s decision record.
3. **What was rejected?** The browser submits a copy of the signal claiming production approval. The native PALO importer rejects it. The harness checks the prior case after rejection and after a page reload. `result.json` records both outcomes.
4. **What does the receipt attest?** PALO's native validator reads the reopened case from disk and validates its schema. The harness checks that `receipt.json` carries that exact case’s digest. A human reviewer still decides applicability and any operational response.

The run uses an isolated browser profile. The harness serves the pinned page and scripts from disk and blocks other browser requests. No case or review decision is sent to a production PALO instance.

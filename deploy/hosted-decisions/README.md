# Authenticated relationship evidence workspace

Open Studio, sign in, and select **Relationship evidence** in the portal navigation. Direct route: `/OntoGraph/decisions/`. Use the language link for Simplified Chinese. Each signed-in account can use named private drafts, import and export a portable release, inspect weighted paths, add attributed assertions and record a resolution. **Apply to draft** changes the current working copy. **Save draft** persists it under that account using a revision check. A legacy assessment is preserved on conversion. Each source has a date, excerpt and checksum. Registry publication and authenticated reviewer approval use the release workflow.

Install the Python package under a private directory outside the document root, alongside `service.py`, `route.php`, `index.html`, `style.css`, `decisions.js` and the synthetic Finance model as `finance-close.json`. The shared visual form is in `ontograph/web/assertions.js`. The PHP adapter authenticates every request against the existing gateway's session endpoint, authorizes writes by role and validates its CSRF token. Drafts reside in private SQLite storage one directory above the versioned code. Configure a Python 3.11 executable in the adapter for the target host. The interpreter path in this distribution matches the project's shared hosting. The private configuration and database are deployment inputs.

Back up the gateway first. Run `integrate_gateway.py CURRENT_GATEWAY REVIEWED_GATEWAY`, review the prepared diff, PHP-lint both files and activate the private bundle before switching the gateway. The integration script refuses unexpected gateway layouts. Check anonymous HTML redirects to sign-in, anonymous APIs return 401, a valid session can save and reload, stale revisions return 409, and the normal project navigation remains available. Restore the original gateway to roll back the entry point.

## Guided case drafts

A guided case opens a fixed named workspace. The gateway carries the allowlisted case and locale through the standard sign-in. The bootstrap response presents the corresponding validated starter. Studio prepares it once through an authenticated request protected by the existing CSRF checks. The per-account draft insert is conditional. Existing edits and concurrent saves take precedence. Viewers can inspect the starter without creating a saved draft.

Install `journey.php` beside the adapter. Place the four public JSON files below in the private `case-models/` directory beside `service.py`:

| Private filename | Public model source |
| --- | --- |
| `journey-personal-library.json` | `site/guide/personal-library.json` |
| `journey-department-wbs.json` | `site/wbs/unresolved.json` |
| `journey-copilot-glossary.json` | `site/guide/department-wbs.json` |
| `journey-policy-change.json` | `site/journey/models/policy-change.json` |

Back up and patch the already integrated gateway with `python3 deploy/hosted-decisions/integrate_journey.py CURRENT_GATEWAY REVIEWED_GATEWAY`. Verify that the deployed login template still uses the standard successful-login destination, then verify guided login in both locales.

## Guided checklists

Install `checklist.py` and `checklist.js` beside the existing workspace assets. The worker stores the checklist separately from the model under the account, guided workspace and saved draft revision. A new model revision opens a fresh checklist. Writes check both the model revision and checklist version. Viewers can run the reference checks without saving progress.

The check runner evaluates the saved draft against the starter's fixed inputs and expected decisions. Its readout is a simulation. The observation selector and note are an account holder's record of what they saw in a replay or application.

## Personal app proposals

Deploy `case-review.js` beside `decisions.js`. Publish the case generator and the two Hidden Risks pages on the same origin as Studio. The browser carries the proposed release across sign-in using a per-tab key and an opaque `case-<UUIDv4>` workspace ID. The URL carries only the ID and locale. The authenticated workspace validates the release and uses the ordinary account-scoped, revision-checked draft save. A saved revision takes precedence when reopening the workspace. Generation uses bilingual rules and candidate terms from the brief. It marks the brief as insufficient evidence pending review.

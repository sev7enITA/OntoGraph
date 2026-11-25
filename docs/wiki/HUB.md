[OnToGraPh Wiki](README.md)

# One governance hub, three frameworks

OnToGraPh is a standalone product anyone can adopt with their own model and evidence. It starts locally with Python and SQLite. A spin-off of PolicyWatcher and PALO Framework, it provides the reusable ontology layer in their shared architecture: dictionaries, taxonomies, typed graph relations, physical fields and versioned controls. It builds on PolicyWatcher’s source evidence and PALO’s governance lifecycle. Its versioned rules, release receipts and observations can inform both frameworks in turn. The Process Modeler is a native OnToGraPh module.

| Starting point | Role in the hub | Inputs and outputs |
| --- | --- | --- |
| **PALO Framework · Top down** | Define the mandate, applicability, owner, reviewer and powers to approve or withdraw. | PALO supplies the governance questions and gates. A release manifest and the observed effects can inform the next PALO decision. [PALO Platform Map](https://paloframework.org/PALO_PlatformMap.html) |
| **PolicyWatcher · Bottom up** | Detect and document a change in a monitored public policy. | A published evidence packet and an authorized excerpt can enter the OnToGraPh draft. The affected rules and observed decisions can inform follow-up on that change. [PolicyWatcher](https://policywatcher.online/) |
| **OnToGraPh · Semantic change and verification engine** | Link the source, field, control, release, application and observed result. | A reviewer confirms applicability. The registry freezes the release, serves each application its scoped bundle and preserves receipts, observations and withdrawal status. [Release protocol](../PROTOCOL.md) |

## Start with your own model

Open OnToGraPh Studio and edit the included model or import your own release JSON or OnToGraPh workbook. Build dictionaries and taxonomies, map fields and processes to controls, and define expectations for the applications you own. Start the local registry when you need role-bound review and release operations. The two optional hub workflows below use the same independent engine and data model. [Studio quick start](STUDIO.md)

## Start from a governance decision

1. Define scope, ownership, permitted effects and the evidence required in PALO.
2. Model the process, fields and controls in OnToGraPh. Bind each case to a consuming application and version. Review and approve the candidate before publishing.
3. Inspect each receipt and separate observation. Return the release digest, case results and any unresolved withdrawal to the accountable reviewer.

## Start from a policy change

1. Find the PolicyWatcher change and inspect its source. In **Structure → Import PolicyWatcher evidence**, supply the published packet, an authorized excerpt and the draft’s UTC effective time.
2. OnToGraPh creates a source record pending human review. A steward confirms the applicable passage, scope and effective date before linking the evidence to a rule.
3. Review the change and verify its effects in dependent applications. The proof can inform a PALO decision or PolicyWatcher follow-up.

## Current handoffs and pilot results

- **PALO ↔ PolicyWatcher.** The existing PALO signal workflow and Assessment Path use a non-authoritative monitoring signal. Human review remains part of that workflow. [Signal operations](https://github.com/sev7enITA/PALOframework/blob/main/docs/palo-policywatcher-signal-operations.md)
- **PolicyWatcher → OnToGraPh.** The Studio and CLI accept a locally supplied evidence packet and excerpt. This uses the PolicyWatcher evidence packet format. [Intake protocol](../PROTOCOL.md#inputs-and-optional-adapters)
- **OnToGraPh → PALO.** An optional pilot adapter admitted a source-bound signal and imported its release evidence into PALO’s local Assessment Path. PALO reopened Measure and Prove and kept the decision pending human review. A signal carrying a different change ID was held.
- **OnToGraPh → PolicyWatcher.** The pilot resolved a frozen rule’s upstream change through PolicyWatcher’s public read-only endpoint. Writing an observation or a decision into a production PolicyWatcher record remains outside the tested path. [Pilot method and results](https://github.com/sev7enITA/OntoGraph/tree/main/examples/hub_pilot)

[Governance hub](https://openontograph.org/#ecosystem) · [Open the Studio](STUDIO.md) · [Synthetic Aurora 21](AURORA-21.md)

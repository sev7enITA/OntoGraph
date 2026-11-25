[OnToGraPh Wiki](README.md)

# Why OnToGraPh exists

A team approves a new definition of a complete dossier. The catalog shows the updated definition, Git contains the new rule and CI reports a successful deployment. The CRM asks for the additional document. The PMS still clears the dossier. Both applications report the same version.

OnToGraPh helps the person accountable for the change establish what each application did before closing the work. It preserves the links between evidence, meaning, control, release and observed results. Verification stays open when evidence is missing or expired.

## Questions it answers

| Question | Evidence available in OnToGraPh | Who uses it |
| --- | --- | --- |
| **What changed, where did it come from and when does it apply?** | Source excerpt, observation time, effective date and the rationale for applicability. | Data steward or policy owner |
| **Which controls, contracts and apps might be affected?** | Differences and dependencies in the workspace graph. Coverage follows the declared relationships. | Steward or integration lead |
| **Who authorized this exact version?** | A frozen manifest with its digest, assigned reviewers, rationales and quorum. An open objection blocks release. | Publisher or auditor |
| **Which version does each app claim to use?** | The consumer receipt, linked to the package delivered to that app. | Application owner |
| **Did the revised rule change the decision?** | A comparison of expected and observed outcomes, including a case that distinguishes the prior rule from the new one when existing logic changes. Results apply to the observed cases and time window. | Observer or governance owner |
| **Is a withdrawn version still in use?** | Per-consumer status, with observed inactivity or an open verification when the app is unreachable or evidence has expired. | Supervisor or Operational Risk |
| **Can the decision be reconstructed later?** | Exportable releases, events and observation references. An auditor can check integrity against an independently retained digest. | Audit and assurance |

## Where the need arises

A first pilot fits a control shared by at least two applications with different owners. The change must produce distinct, observable outcomes on real cases or agreed fixtures. Examples include adding a required document, distinguishing a building from an individual unit in master data, and changing a rule with an exception.

A data governance or operational risk owner can commission the pilot. Stewards and application owners prepare mappings and test cases. The reviewer decides applicability (**human in the loop**). The owner monitors adoption and divergence (**human on the loop**). A supervisor can withdraw the version and check the effect (**human over the loop**).

The registry records **approval, declared adoption, observed effect and business outcome** separately. A digest identifies the package. An observation establishes the result for the tested scope. Assessing the business outcome requires additional evidence.

[Explore Aurora 21](AURORA-21.md) · [Read the framework](../FRAMEWORK.md)

## Which decisions depend on a disputed definition?

A reviewer can follow a change in meaning into dependent processes and see the evidence behind each assessed relationship. Missing grades and disputed sources remain visible. [Interactive case](https://openontograph.org/weights/)

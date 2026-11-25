# OnToGraPh market proposal

## Why it exists

A catalog can show an approved change and CI can report a successful deployment while two applications keep making different decisions. Someone must then recover the source, work out who is still exposed to the prior behavior and verify that a withdrawal took effect. [Questions OnToGraPh answers](wiki/WHY-ONTOGRAPH.md)

## A verifiable promise

**When a shared definition or policy changes, verify what each affected application does.**

A data governance or AI governance owner can reconstruct who approved the change, the source that supports it, which applications declared the new package and how they responded on the agreed cases. If a supervisor withdraws the release, the registry records the request and the per-consumer evidence as separate events.

### First market

The first customer is a team with two or more independently owned applications. A policy change, eligibility rule or data contract crosses department boundaries. A plausible buyer is the Head of Data Governance or Operational Risk. Stewards, application owners and integration teams do the day-to-day work. A first pilot covers one source, one control, one contract, two consumers and an owner for each application.

### Design influences

| Reference | Principle reused | Integration and scope |
| --- | --- | --- |
| PALO and PolicyWatcher | Decision lifecycle, authorization and evidence of effect, change provenance | Six mapped gates and an offline evidence packet adapter. Live capture requires customer qualification. |
| NVIDIA Auto Ontology and Databricks Genie | Discovery from data and usage, proposals, learned and curated context | Potential proposal sources. An NVIDIA adapter would map Ossie concepts, preserve IDs and let a steward verify granularity and join conditions. |
| VocBench, TopBraid EDG and OntoBricks | Curation, review and semantic versions | A local workflow reviews a frozen candidate. Customers using these platforms can keep authoring there and evaluate OnToGraPh for application-level evidence. |
| Stardog, GraphDB, Jena and RDF4J | Queryable graphs, validation and interchange | The JSON-LD projection uses SKOS, OWL and PROV-O vocabulary. A connected engine can provide federation, reasoning and SPARQL. |
| Git and CI | Repeatable tests, change control and audit | The baseline for comparison. The OnToGraPh model links sources to controls and applications and records observations by release and consumer. |

[PALO](https://paloframework.org/) · [PolicyWatcher](https://github.com/sev7enITA/policywatcher) · [NVIDIA](https://github.com/NVIDIA/auto-ontology) · [Genie](https://docs.databricks.com/aws/en/genie/genie-ontology/) · [TopBraid](https://docs.topquadrant.com/classic/latest/user_guide/workflows/index.html) · [OntoBricks](https://www.ontobricks.org/documentation/features.html) · [VocBench](https://vocbench.uniroma2.it/doc/user/history_and_validation.jsf) · [Stardog](https://docs.stardog.com/virtual-graphs/) · [GraphDB](https://graphwise.ai/components/graphdb/) · [Jena](https://jena.apache.org/documentation/shacl/) · [RDF4J](https://rdf4j.org/documentation/programming/shacl/)

### Market hypothesis

A governance owner may pay to verify the effect of a semantic change across applications the team already owns, while keeping its catalog and engines. The buying criterion is independent evidence of exceptions, missed adoption and withdrawal. The synthetic case demonstrates the mechanism. A customer comparison must establish a lower cost or shorter time to obtain equivalent evidence, or find a material divergence the current process misses. [Platforms and standards](wiki/MARKET-AND-STANDARDS.md)

### Pilot decision criteria

1. Agree on fixtures, expected decisions and the starting release with two application owners. Record integration and configuration hours, time spent in review and evidence produced.
2. Give both Git/CI and OnToGraPh the same requirement, cases and topology. Include an old decision behind a matching receipt, an exception and an unreachable consumer.
3. Confirm that the tests distinguish the releases and that a reviewer can recover the source. Measure time to discovery, supervisor response and verified withdrawal. Record timeouts as unproven.
4. Measure the cost of the first and second adapters and willingness to pay. A comparable result with comparable effort leaves the advantage unproven. If ontology editing is the main need, compare dedicated authoring tools.

Aurora 21 follows a source and rule change, two applications declaring v2, a PMS returning the v1 result, withdrawal and a later check of recovery. All case data is synthetic. Other projects use the OntoGraph name, so confirm name availability before a commercial launch.

## Weighted relationships in the market

Weighted graph algorithms and governed link properties are established capabilities. The adoption hypothesis concerns how much work it takes to recover an assessment, review the affected decision and verify behavior after the change. [Interactive case](https://openontograph.org/weights/) · [Research and practitioner evidence](https://github.com/sev7enITA/OntoGraph/blob/main/docs/WEIGHTED-RELATIONSHIPS-MARKET.md)

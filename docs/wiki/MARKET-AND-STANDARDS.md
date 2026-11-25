[OnToGraPh Wiki](README.md)

# Market position and standards

**OnToGraPh verifies decisions after semantic changes across applications and teams that may use different tools.** Customers can retain their catalogs, engines and pipelines. For each application, OnToGraPh addresses three questions.

1. Which version does the application declare?
2. How does it respond to a case that distinguishes the new rule from the old one?
3. After withdrawal, what evidence shows that the disputed version has stopped taking effect?

The commercial hypothesis concerns the work and accountability shared among teams. It is most relevant where someone currently has to combine evidence from a catalog, tickets, a pipeline and each application. The pilot measures willingness to pay and adapter costs.

## How it fits with existing platforms

| Primary question | Platform to consider | Where OnToGraPh fits |
| --- | --- | --- |
| Which meanings and joins emerge from data? | **NVIDIA Auto Ontology** compiles semantics from schemas and usage and documents verification after publication and rollback. | OnToGraPh checks the decision of each application that depends on that meaning. An Ossie import remains a potential integration. [Architecture](https://github.com/NVIDIA/auto-ontology/blob/main/docs/architecture.md) · [Publication](https://github.com/NVIDIA/auto-ontology/blob/main/skills/nvidia-ontology-management/references/publication.md) |
| How can analysts and agents apply business definitions? | **Databricks Genie Ontology** combines definitions curated in Unity Catalog with learned context. | A team can use Genie for analytics and record behavioral checks for its consuming applications in OnToGraPh. [Genie Ontology](https://docs.databricks.com/aws/en/genie/genie-ontology/) |
| How do we curate and release an ontology? | **OntoBricks** and **TopBraid EDG** cover modeling, versions and review workflows. | An OnToGraPh pilot measures post-release observation across stacks, including withdrawal. The comparison includes the workflows the customer already configured. [OntoBricks](https://www.ontobricks.org/documentation/user-guide.html) · [TopBraid](https://docs.topquadrant.com/classic/latest/user_guide/workflows/index.html) |
| How do we query connected data sources? | **Stardog** provides virtual graphs and federation. **GraphDB** provides an RDF/SPARQL engine with inference. | The OnToGraPh graph identifies processes, controls and consumers for verification. An RDF engine can continue serving the customer's graph queries. [Stardog](https://docs.stardog.com/virtual-graphs/) · [GraphDB](https://graphwise.ai/components/graphdb/) |
| Can we use tickets, Git and CI? | An existing pipeline can cover the workflow through independent review, records and application-level tests. | This is the primary buying comparison. Measure what it costs to trace an observation back to its source, reuse cases across apps and verify withdrawal. |

## Standards and interoperability

| Technology | Role in the project |
| --- | --- |
| **JSON-LD and RDF** | Independent tools can read the graph projection. The release JSON package also carries rules and expected cases. [JSON-LD](https://www.w3.org/TR/json-ld11/) |
| **SKOS, RDFS and OWL** | SKOS represents concepts, alternate labels and taxonomy. The projection uses a subset of OWL/RDFS for classes and subclasses. Connected engines can provide reasoning and formal authoring. [SKOS](https://www.w3.org/TR/skos-reference/) · [OWL](https://www.w3.org/TR/owl2-overview/) |
| **PROV-O** | Links a release to the evidence it derives from. An applicability decision has a recorded rationale and author. [PROV-O](https://www.w3.org/TR/prov-o/) |
| **SHACL** | Validates RDF graph structure in a compatible engine. OnToGraPh 0.1 uses native declarative checks and verifies consumer behavior after deployment. [SHACL](https://www.w3.org/TR/shacl/) |
| **Ossie and PALO** | Ossie provides an interchange format for analytical semantics and is a potential future input. PALO informs roles, gates and the distinction between authorization and verified effects. [Apache Ossie](https://ossie.apache.org/) · [PALO](https://paloframework.org/docs/palo-v3.1-governance-control-plane.html) |

## How to decide whether to pay

1. Choose one rule, one exception and two applications with distinct owners. Prepare expected cases with those owners.
2. Run the same change with the existing process and OnToGraPh. Include a consumer that returns an old decision behind a matching receipt and a phase where an application is unreachable.
3. Measure time to recover the source, discrepancies detected, time to verify inactivity, integration hours and steward effort. Record the cost of the second adapter and any evidenced buying commitment.

If the current process answers the same questions with comparable effort, keep it. The synthetic case demonstrates the mechanism. The market position remains a hypothesis until a customer comparison is complete.

[Market proposal and pilot criteria](../MARKET.md)

[Wiki OntoGraph](README.md)

# L’oceano blu di OntoGraph

**Verifica delle decisioni dopo un cambiamento semantico, tra applicazioni e team che usano strumenti diversi.** Il cliente può mantenere il proprio catalogo, i propri motori e la propria pipeline. OntoGraph offre un luogo in cui rispondere, per ciascuna app, a tre domande concrete.

1. **Quale versione dichiara di usare?**
2. **Come risponde a un caso che distingue la regola nuova dalla precedente?**
3. **Dopo il ritiro, quale prova mostra che la versione contestata ha smesso di produrre effetti?**

La tesi commerciale riguarda lavoro e responsabilità tra team. È plausibile quando oggi una persona deve ricomporre evidenze da catalogo, ticket, pipeline e singole app. La disponibilità a pagare e il costo degli adattatori vanno misurati.

## Rispetto alle piattaforme esistenti

| Se la domanda primaria è… | Soluzione da considerare | Dove entra OntoGraph |
| --- | --- | --- |
| «Quali significati e join emergono dai dati?» | **NVIDIA Auto Ontology** compila semantica da schemi e uso e documenta verifica dopo pubblicazione e ripristino. | La verifica è sulla decisione di ciascuna applicazione che dipende da quel significato. L’uso di Ossie da NVIDIA come input è un’opzione da qualificare. [Architettura](https://github.com/NVIDIA/auto-ontology/blob/main/docs/architecture.md) · [Pubblicazione](https://github.com/NVIDIA/auto-ontology/blob/main/skills/nvidia-ontology-management/references/publication.md) |
| «Come possono analisti e agenti usare le definizioni aziendali?» | **Databricks Genie Ontology** combina definizioni curate in Unity Catalog e contesto appreso. | Un team può usare Genie per analytics e registrare a parte la verifica del comportamento dei propri consumatori. [Genie Ontology](https://docs.databricks.com/aws/en/genie/genie-ontology/) |
| «Come curiamo e rilasciamo il modello ontologico?» | **OntoBricks** e **TopBraid EDG** coprono modellazione, versioni e workflow di revisione. | Il perimetro del pilota OntoGraph è l’osservazione dopo il rilascio su più stack, incluso il ritiro. Il confronto deve riconoscere ciò che il cliente ottiene già configurando i propri strumenti. [OntoBricks](https://www.ontobricks.org/documentation/user-guide.html) · [TopBraid](https://docs.topquadrant.com/classic/latest/user_guide/workflows/index.html) |
| «Come interroghiamo più fonti collegate?» | **Stardog** offre grafi virtuali e federazione. **GraphDB** offre un motore RDF/SPARQL con inferenza. | Il grafo di OntoGraph esplicita a quali processi, controlli e consumatori assegnare verifiche. Un motore RDF può servire le query del cliente. [Stardog](https://docs.stardog.com/virtual-graphs/) · [GraphDB](https://graphwise.ai/components/graphdb/) |
| «Posso farlo con ticket, Git e CI?» | Una pipeline con revisioni indipendenti, registri e test verso le app può coprire lo stesso flusso. | È il confronto d’acquisto principale. Si misura quanto costa tracciare ogni osservazione fino alla fonte, riusarla tra app e verificare il ritiro. |

## Rispetto agli standard

| Strumento | Ruolo nel prodotto |
| --- | --- |
| **JSON-LD e RDF** | La proiezione del grafo si può leggere con strumenti indipendenti. Il pacchetto JSON di release conserva anche regole e casi attesi. [JSON-LD](https://www.w3.org/TR/json-ld11/) |
| **SKOS, RDFS e OWL** | SKOS rappresenta concetti, sinonimi e tassonomia. La proiezione usa un sottoinsieme di OWL/RDFS per classi e sottoclassi. Reasoning e authoring formale esteso si valutano nei motori collegati. [SKOS](https://www.w3.org/TR/skos-reference/) · [OWL](https://www.w3.org/TR/owl2-overview/) |
| **PROV-O** | Collega la release alle evidenze da cui deriva. La decisione di applicabilità resta documentata e attribuita. [PROV-O](https://www.w3.org/TR/prov-o/) |
| **SHACL** | Valida la struttura di un grafo RDF in un motore compatibile. OntoGraph 0.1 usa controlli dichiarativi nativi. Qui la prova è anche sul comportamento del consumatore dopo il deploy. [SHACL](https://www.w3.org/TR/shacl/) |
| **Ossie e PALO** | Ossie offre scambio per semantica analitica ed è un possibile ingresso futuro. PALO informa i ruoli, i gate e la distinzione tra autorizzazione ed effetto. [Apache Ossie](https://ossie.apache.org/) · [PALO](https://paloframework.org/docs/palo-v3.1-governance-control-plane.html) |

## Come si decide se vale la spesa

1. Prendere una regola, un’eccezione e due applicazioni con owner distinti. Preparare i casi attesi con i responsabili.
2. Eseguire lo stesso cambiamento con il processo esistente e con OntoGraph. Inserire una app con versione obsoleta dietro un digest dichiarato corretto e una fase in cui il consumatore è irraggiungibile.
3. Misurare tempo per ricostruire la fonte, divergenze rilevate, tempo fino al ritiro provato, ore di integrazione e di lavoro dello steward. Concludere con il costo del secondo adattatore e un impegno d’acquisto verificabile.

Se il processo esistente dà le stesse risposte con impegno comparabile, la scelta ragionevole è mantenerlo. La demo sintetica prova il meccanismo. L’oceano blu rimane una tesi commerciale fino al confronto con un cliente.

[Proposta di mercato e criteri di pilota](../MARKET.md)

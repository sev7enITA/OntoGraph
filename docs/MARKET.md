# OntoGraph | Proposta di mercato

## Perché esiste

Una modifica può risultare approvata nel catalogo e pubblicata in CI mentre due applicazioni continuano a prendere decisioni diverse. Il costo emerge quando qualcuno deve ricostruire la fonte, capire chi è ancora esposto al vecchio comportamento e provare che il ritiro abbia avuto effetto. [Le domande a cui risponde OntoGraph](wiki/PERCHE-ONTOGRAPH.md)

## Una promessa verificabile

**Quando cambia una definizione o una policy, OntoGraph verifica come reagiscono le applicazioni coinvolte.**

Un responsabile Data Governance o AI Governance può ricostruire chi ha approvato il cambiamento, su quale fonte, quali applicazioni hanno dichiarato il nuovo pacchetto e come si sono comportate sui casi concordati. Se il supervisore lo ritira, il sistema distingue la richiesta di ritiro dalla prova sul singolo consumatore.

### Primo mercato

Team con due o più applicazioni a responsabilità distinte. Il primo problema commerciale è un cambio di policy, di criterio di ammissione o di contratto dati che attraversa reparti. L'acquirente plausibile è il responsabile Data Governance o Operational Risk. Il lavoro quotidiano è di data steward, owner e team di integrazione. Un primo pilot copre una fonte, un controllo, un contratto, due consumatori e un owner per app.

### Le scelte best of breed

| Riferimento | Principio riusato | Integrazione e limite |
| --- | --- | --- |
| PALO e PolicyWatcher | Ciclo decisionale, distinzione tra autorizzazione ed effetto provato, provenienza del cambiamento | Mappatura dei sei gate e adattatore offline per pacchetti di evidenza. Il canale di acquisizione live si qualifica in un cliente. |
| NVIDIA Auto Ontology e Databricks Genie | Discovery da dati e uso, proposte, distinzione tra contesto appreso e semantica curata | Fonti facoltative di proposte future. Il primo adattatore NVIDIA deve tradurre mapping e concetti da Ossie, preservare gli ID e far validare granularità e condizioni di join dallo steward. |
| VocBench, TopBraid EDG e OntoBricks | Curatela, revisione e versioni semantiche | Workflow locale su candidato congelato. Un cliente con queste piattaforme può continuare a usarle per l'authoring e valutare OntoGraph per la prova applicativa. |
| Stardog, GraphDB, Jena e RDF4J | Knowledge graph interrogabile, validazione e interoperabilità | Proiezione JSON-LD del dominio con termini SKOS, OWL e PROV-O. Federation, reasoning e query SPARQL native appartengono agli eventuali motori collegati. |
| Git e CI | Test ripetibili, change control e audit | Baseline del confronto. OntoGraph aggiunge un modello sorgente → controllo → app e raccoglie osservazioni indipendenti per release e consumatore. |

Fonti: [PALO](https://paloframework.org/) · [PolicyWatcher](https://github.com/sev7enITA/policywatcher) · [NVIDIA](https://github.com/NVIDIA/auto-ontology) · [Genie](https://docs.databricks.com/aws/en/genie/genie-ontology/) · [TopBraid](https://docs.topquadrant.com/classic/latest/user_guide/workflows/index.html) · [OntoBricks](https://www.ontobricks.org/documentation/features.html) · [VocBench](https://vocbench.uniroma2.it/doc/user/history_and_validation.jsf) · [Stardog](https://docs.stardog.com/virtual-graphs/) · [GraphDB](https://graphwise.ai/components/graphdb/) · [Jena](https://jena.apache.org/documentation/shacl/) · [RDF4J](https://rdf4j.org/documentation/programming/shacl/)

### L'ipotesi di oceano blu

Automatizzare la discovery è già un mercato affollato. L'ipotesi è che un responsabile paghi per **verificare l'effetto di un cambiamento semantico tra app che possiede già**, mantenendo il catalogo e i motori utilizzati oggi. La verifica indipendente delle eccezioni, della mancata adozione e del ritiro è il criterio di acquisto. Un cambio sintetico prova la fattibilità del meccanismo. Il confronto con il processo del cliente deve mostrare un costo o un tempo inferiore per ottenere la stessa prova, oppure una divergenza importante che oggi rimane invisibile. [Confronto con piattaforme e standard](wiki/OCEANO-BLU.md)

### Pilota con diritto di smentita

1. Concordare fixture, decisioni attese e versione di partenza con due owner. Misurare ore di integrazione e configurazione, tempo per revisione e documenti prodotti.
2. Fornire a Git/CI e OntoGraph lo stesso requisito, le stesse prove e la medesima topologia. Simulare una versione obsoleta dietro un digest corretto, un'eccezione e un consumatore irraggiungibile.
3. Verificare che il test distingua le versioni e che la fonte della decisione si possa ritrovare. Rilevare tempi fino a scoperta, risposta del supervisore e ritiro provato. Nessun timeout deve apparire come ritiro verificato.
4. Verificare costo del primo e del secondo adattatore e disponibilità a pagare. Se la baseline produce le stesse evidenze con lavoro comparabile, il prodotto non ha ancora un vantaggio dimostrato. Se l'acquirente chiede soprattutto un editor ontologico, TopBraid, OntoBricks o VocBench sono comparatori più adatti.

La demo racconta Aurora 21 in meno di cinque minuti: fonte e regola cambiano, due app dichiarano v2, il PMS restituisce l'esito v1 nel caso discriminante, il supervisore ritira e un secondo controllo verifica il recupero. I dati sono sintetici. Prima della presentazione pubblica serve un controllo sul nome OntoGraph, il cui uso da parte di altri progetti è documentabile.

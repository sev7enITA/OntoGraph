# Cross-check di progettazione

25 novembre 2026. I modelli hanno ricevuto lo scenario sintetico e le invarianti tecniche. Il registro e la demo si eseguono senza modelli. I giudizi sono stati verificati rispetto ai requisiti e ai test locali.

| Modello e ambiente | Contributo | Decisione e verifica |
| --- | --- | --- |
| Gemini 4 Neon **High**, Antigravity | Coerenza transazionale del quorum e base, tre prove di interoperabilità, costo del primo adattatore | Manifest congelato con digest per app, CAS concorrente, export e verifica offline. La canonicalizzazione descritta è interna al progetto. Verifica indipendente con RDFLib su 83 triple, proiezione SKOS/PROV-O e SPARQL. Jena/Oxigraph e la canonicalizzazione RDF restano ulteriori prove. |
| **GLM-5.4 Max**, ZCode | Caso che distingue la vecchia versione, durata limitata delle osservazioni, dissenso che sopravvive alla disattivazione, distanza tra sospensione e ritiro | Test richiesto su ciascuna app per regole cambiate, finestra con scadenza, test su obiezioni, timeout e controllo a valle. Le osservazioni sono limitate al campione. |
| **Qwen 3.8 27B Uncensored**, LM Studio | Distinguere parità di hash e comportamento, misurare esiti divergenti, verificare recupero offline | La demo confronta le risposte reali dei simulatori. Il rollback automatico suggerito è stato scartato. Il ritiro conserva lo stato non provato quando il consumer è irraggiungibile. |
| **Inkling 2 Mini Uncensored**, LM Studio | Due verifiche, la seconda sul caso di una nuova dichiarazione con lo stesso digest e osservazioni precedenti ancora fresche | Il registro associa la valutazione all'ultima ricevuta. Le osservazioni devono avere sequenza successiva e tempo di cattura non anteriore. Il test dimostra `verified → unproven → verified` dopo un nuovo caricamento e una nuova prova. La corrispondenza con l'istanza runtime richiede un adattatore qualificato. |

Il controllo del report offline ha rilevato che il primo testo attribuiva l'esito alla regola precedente senza dimostrarlo con i dati mostrati. Il report ora espone i due digest e il confronto tra esito osservato e atteso. Un secondo controllo Chromium ha verificato navigazione da tastiera, dimensioni da 320 a 1440 px e assenza di dipendenze di rete.

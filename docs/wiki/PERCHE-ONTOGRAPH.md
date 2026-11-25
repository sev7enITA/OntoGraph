[Wiki OntoGraph](README.md)

# Perché esiste OntoGraph

Un team approva una nuova definizione di «dossier completo». Il catalogo riporta la definizione aggiornata, Git contiene la regola e il deploy è verde. Il CRM chiede il nuovo documento, mentre il PMS concede ancora il via libera. Entrambe le app riportano la stessa versione.

OntoGraph esiste per dare al responsabile della modifica una risposta verificabile prima di chiudere il lavoro. Il prodotto conserva il collegamento tra evidenza, significato, controllo, release e risultati osservati. Quando le prove mancano o scadono, la verifica rimane aperta.

## Le domande a cui risponde

| Domanda | Risposta che OntoGraph rende disponibile | Chi la usa |
| --- | --- | --- |
| **Che cosa è cambiato, da quale fonte e da quando vale?** | Passaggio di evidenza, data di osservazione e data di efficacia, motivazione dell’applicabilità. | Data steward o policy owner |
| **Quali controlli, contratti e app possono essere interessati?** | Differenze e dipendenze tracciate nel grafo del workspace. La copertura segue le relazioni dichiarate. | Steward e integration lead |
| **Chi ha autorizzato esattamente questa versione?** | Manifest congelato con digest, revisori assegnati, motivazioni e quorum. Le obiezioni aperte bloccano il rilascio. | Publisher e auditor |
| **Quale versione dice di avere ogni app?** | Ricevuta del consumatore, legata al pacchetto consegnato a quell’app. | Application owner |
| **La regola nuova ha cambiato davvero la decisione?** | Confronto tra risultati attesi e osservati, compreso un caso che distingue la regola precedente da quella nuova quando cambia la logica di una regola esistente. I risultati valgono per i casi e la finestra osservati. | Osservatore, responsabile Data Governance |
| **Chi usa ancora una versione ritirata?** | Stato per consumatore, con conferma di inattività oppure verifica aperta se l’app non risponde o la prova è scaduta. | Supervisore, Operational Risk |
| **Posso ricostruire la decisione a distanza di tempo?** | Release, eventi e riferimenti alle osservazioni esportabili. L’auditor può controllare l’integrità rispetto a un digest conservato indipendentemente. | Audit e assurance |

## Dove nasce l’esigenza

Il primo caso adatto è un controllo condiviso fra **almeno due applicazioni con owner distinti**. La modifica deve avere esiti diversi osservabili su casi reali o su fixture concordate. Esempi sono l’introduzione di un documento obbligatorio, il cambio di granularità di un’anagrafica tra edificio e unità e la modifica di un criterio interno con eccezioni.

Il responsabile Data Governance o Operational Risk può commissionare il pilota. Steward e owner applicativi preparano mapping e casi di prova. Il revisore decide se la regola è applicabile (*human in the loop*), l’owner segue adozione e divergenze (*on the loop*), il supervisore dispone il ritiro e ne controlla l’esito (*over the loop*).

Il registro tratta **approvazione, adozione dichiarata, effetto osservato e risultato di business** come fatti distinti. Un digest identifica il pacchetto. Un’osservazione prova un esito nel perimetro testato. La correttezza dell’esito di business richiede evidenze ulteriori.

[Guarda il caso Aurora 21](AURORA-21.md) · [Leggi il framework](../FRAMEWORK.md)

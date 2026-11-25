[Wiki OntoGraph](README.md)

# Studio visuale OntoGraph

Avvia dalla radice del repository:

```sh
python3 -m ontograph studio
```

Apri [OntoGraph Studio](http://127.0.0.1:8765/). Il server è locale. Non richiede installazione di modelli, accesso al portale riservato o servizi cloud. I dati iniziali sono sintetici.

## Il Modellatore processi è la base

La prima schermata riprende codice, struttura e flusso del workbench PolicyAsCode nell’edizione OntoGraph. Ritrovi il censimento, le viste a blocchi, sequenza ed entità, il canvas editabile, la palette, le proprietà live, il pannello sorgente e gli export. Le modifiche e le coordinate sono salvate nel browser. Scarica l’Excel del modellatore per trasferire la bozza, inclusi nodi e collegamenti, e ricaricalo con il comando di importazione.

[Anteprima del Modellatore processi](../../assets/studio/modellatore-processi.png)

## Dal processo al controllo

1. Apri **Studio semantico** dal Modellatore processi.
2. In **Struttura** scegli il processo e il controllo che gli vuoi associare. La proiezione crea un riferimento esplicito alla bozza di governance. Il censimento dettagliato e il layout continuano a essere editabili nel Modellatore.
3. Nel **Grafo** seleziona un oggetto o un arco. I collegamenti portano al riferimento e l’ispettore apre oggetti, liste e valori annidati indicandone il percorso. Modifica un valore con il controllo del suo tipo. Il sorgente JSON tratta lo stesso documento.
4. Usa **Valida** per eseguire i controlli del motore. **Salva versione** archivia una copia di lavoro con una nota in questo browser. In **Versioni** confronta proprietà e ID interessati rispetto a una baseline o a una versione precedente.
5. In **Evidenze** ripercorri il caso Aurora 21. Il report riguarda i due simulatori integrati. L’analisi della tua bozza è accessibile dalla validazione del modello.

Il collegamento tra i due ambienti è una proiezione dichiarata del processo. Il rilascio semantico e il file di censimento hanno formati distinti. Per modificarli usa il rispettivo editor.

[Anteprima del grafo e delle proprietà](../../assets/studio/studio-semantico.png)

## Formati e registro locale

| Ambiente | Import ed export |
| --- | --- |
| Modellatore processi | Excel PolicyAsCode/OntoGraph dal template del modellatore. Sorgenti JSON, Mermaid, PlantUML, SVG e ZIP. |
| Studio semantico | JSON di release e workbook `OntoGraph Release` con percorsi atomici, tipi e valori. Export JSON-LD, XLSX, Mermaid, PlantUML, SVG e ZIP. |

Nel workbook semantico mantieni la struttura delle colonne **Path**, **Type** e **Value**. Modifica le celle dei valori mantenendo il tipo dichiarato. L’import passa dalla stessa validazione del modello JSON.

Per usare un tuo documento semantico come bozza iniziale:

```sh
python3 -m ontograph studio --model examples/aurora-21.json
```

Per governare una release reale di un registro **locale già inizializzato**:

```sh
python3 -m ontograph studio --registry percorso/al/registro.sqlite
```

In **Evidenze**, il pannello **Registro locale** usa il token del ruolo per preparare una candidata, registrare un voto, pubblicare, ritirare e consultare l’audit. L’identità, il quorum e la validità delle operazioni sono controllati dal registro. I token sono inseriti nella pagina al momento dell’uso. Il pannello resta disponibile solo sul server locale configurato.

[Protocollo di rilascio](../PROTOCOL.md) · [Aurora 21](AURORA-21.md)

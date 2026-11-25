[Wiki OntoGraph](README.md)

# Aurora 21

**Scenario sintetico.** Una regola di due diligence aggiunge il rapporto di ispezione tra i documenti necessari per un edificio. Il requisito riserva un trattamento distinto alle unità immobiliari. CRM e PMS ricevono pacchetti dedicati.

| Passaggio | CRM | PMS |
| --- | --- | --- |
| Regola di partenza | Supera i casi di prova | Supera i casi di prova |
| Nuova release | Sospende il dossier senza rapporto | Dichiara il digest atteso e autorizza lo stesso dossier |
| Ritiro richiesto | Ritiro verificato | Irraggiungibile. Ritiro non provato |
| Riconciliazione | Ritiro verificato | Un’osservazione esplicita conferma l’inattività |
| Ripristino | Supera i casi sulla nuova candidata approvata | Supera i casi sulla nuova candidata approvata |

Il caso discriminante è il dossier di un edificio che sarebbe passato con la regola precedente. Un caso positivo e un caso fuori ambito aiutano a distinguere un controllo coerente da un blocco indiscriminato.

## Riproduci la verifica

Dalla radice del repository, con Python 3.10 o successivo:

```sh
mkdir -p out
python3 -m ontograph demo --report out/aurora.json --html out/aurora.html
python3 -m unittest discover -s tests -v
```

Apri `out/aurora.html` per leggere gli esiti e i digest. Gli output sono creati senza sovrascrivere file esistenti. In [GitHub Actions](https://github.com/sev7enITA/OntoGraph/actions/workflows/verify.yml), la sezione **Artifacts** delle esecuzioni recenti offre HTML e JSON.

Il report identifica la release e i pacchetti simulati, mostra i casi osservati e preserva lo stato incerto in caso di timeout. L’esito operativo reale richiede osservatori e adattatori qualificati sulle applicazioni del cliente.

[Protocollo completo](../PROTOCOL.md) · [Criteri per il pilota](OCEANO-BLU.md#come-si-decide-se-vale-la-spesa)

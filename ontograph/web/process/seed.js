// Scenario Aurora 21 interamente sintetico del pilot OntoGraph.
const SEED = {
  "model": {
    "meta": {
      "project": "RE-DEMO",
      "domain": "Real estate: scenario sintetico Aurora 21",
      "model_version": "1.0.0",
      "interview_date": "2026-11-25"
    },
    "systems": {
      "CRM": {
        "label": "Deal & leasing CRM",
        "role": "Opportunità, offerte e relazioni",
        "kind": "app",
        "adoption": "full",
        "scope": "in",
        "access": "Sistema logico dimostrativo; nessuna connessione attiva"
      },
      "DMS": {
        "label": "Document room",
        "role": "Dossier, contratti ed evidenze",
        "kind": "app",
        "adoption": "full",
        "scope": "in",
        "access": "Sistema logico dimostrativo; nessuna connessione attiva"
      },
      "BI": {
        "label": "Investment analytics",
        "role": "Valutazioni, scenari e performance",
        "kind": "app",
        "adoption": "full",
        "scope": "in",
        "access": "Sistema logico dimostrativo; nessuna connessione attiva"
      },
      "ERP": {
        "label": "Finance ledger",
        "role": "Budget, coperture e contabilità",
        "kind": "app",
        "adoption": "full",
        "scope": "in",
        "access": "Sistema logico dimostrativo; nessuna connessione attiva"
      },
      "PMS": {
        "label": "Property management",
        "role": "Anagrafica asset, locazioni e servizi",
        "kind": "app",
        "adoption": "full",
        "scope": "in",
        "access": "Sistema logico dimostrativo; nessuna connessione attiva"
      },
      "BIM": {
        "label": "Technical asset register",
        "role": "Documentazione tecnica e interventi",
        "kind": "app",
        "adoption": "full",
        "scope": "in",
        "access": "Sistema logico dimostrativo; nessuna connessione attiva"
      },
      "CMMS": {
        "label": "Works & maintenance",
        "role": "Lavori, collaudi e manutenzioni",
        "kind": "app",
        "adoption": "full",
        "scope": "in",
        "access": "Sistema logico dimostrativo; nessuna connessione attiva"
      }
    },
    "owners": {
      "INV": {
        "area": "Investment",
        "responsible": "Responsabile investimenti",
        "operatives": []
      },
      "LEG": {
        "area": "Legal & contracts",
        "responsible": "Responsabile legale",
        "operatives": []
      },
      "TEC": {
        "area": "Technical & ESG",
        "responsible": "Responsabile tecnico",
        "operatives": []
      },
      "FIN": {
        "area": "Finance",
        "responsible": "Responsabile finanziario",
        "operatives": []
      },
      "AM": {
        "area": "Asset management",
        "responsible": "Asset manager",
        "operatives": []
      },
      "PM": {
        "area": "Property operations",
        "responsible": "Property manager",
        "operatives": []
      },
      "COM": {
        "area": "Investment committee",
        "responsible": "Comitato investimenti",
        "operatives": []
      }
    },
    "glossary": [
      {
        "canonical": "Opportunità immobiliare",
        "status": "approved",
        "aliases": []
      },
      {
        "canonical": "Valutazione preliminare",
        "status": "approved",
        "aliases": []
      },
      {
        "canonical": "Dossier due diligence",
        "status": "approved",
        "aliases": []
      },
      {
        "canonical": "Esito due diligence",
        "status": "approved",
        "aliases": []
      },
      {
        "canonical": "Delibera investimento",
        "status": "approved",
        "aliases": []
      },
      {
        "canonical": "Piano finanziario",
        "status": "approved",
        "aliases": []
      },
      {
        "canonical": "Atto acquisizione",
        "status": "approved",
        "aliases": []
      },
      {
        "canonical": "Anagrafica asset",
        "status": "approved",
        "aliases": []
      },
      {
        "canonical": "Piano valorizzazione",
        "status": "approved",
        "aliases": []
      },
      {
        "canonical": "Verbale accettazione lavori",
        "status": "approved",
        "aliases": []
      },
      {
        "canonical": "Profilo conduttore",
        "status": "approved",
        "aliases": []
      },
      {
        "canonical": "Contratto locazione",
        "status": "approved",
        "aliases": []
      },
      {
        "canonical": "Verbale consegna",
        "status": "approved",
        "aliases": []
      },
      {
        "canonical": "Rendiconto gestione",
        "status": "approved",
        "aliases": []
      },
      {
        "canonical": "Rapporto performance",
        "status": "approved",
        "aliases": []
      },
      {
        "canonical": "Piano dismissione",
        "status": "approved",
        "aliases": []
      },
      {
        "canonical": "Dossier trasferimento",
        "status": "approved",
        "aliases": []
      },
      {
        "canonical": "Report chiusura asset",
        "status": "approved",
        "aliases": []
      }
    ],
    "open_points": [
      {
        "id": "OP-01",
        "title": "Completare evidenze tecniche del dossier",
        "detail": "Punto dimostrativo: il referente tecnico deve completare la documentazione di esempio prima del riesame.",
        "owner": "TEC",
        "status": "open",
        "next_step": "Integrare il dossier e registrare il riesame."
      },
      {
        "id": "OP-02",
        "title": "Confermare criteri di selezione del conduttore",
        "detail": "Punto dimostrativo: allineare i criteri fra Asset management e Legal. Nessuna persona reale è censita.",
        "owner": "AM",
        "status": "open",
        "next_step": "Confermare i criteri e aggiornare il passo 1.11."
      }
    ],
    "processes": [
      {
        "id": "P1",
        "name": "Aurora 21: ciclo immobiliare end to end",
        "subtitle": "Acquisizione → valorizzazione → locazione → gestione → dismissione. Tutti i dati sono sintetici.",
        "area": "AM",
        "systems": [
          "CRM",
          "DMS",
          "BI",
          "ERP",
          "PMS",
          "BIM",
          "CMMS"
        ],
        "verified": false,
        "external": false,
        "subprocesses": [
          {
            "id": "1.1",
            "name": "Censisci opportunità e mandato",
            "type": "C",
            "trigger": "Nuova opportunità segnalata",
            "systems": [
              "CRM"
            ],
            "master": [
              {
                "system": "CRM",
                "role": "record"
              }
            ],
            "data_owner": "INV",
            "entities_in": [],
            "entities_out": [
              {
                "name": "Opportunità immobiliare",
                "canonical": "Opportunità immobiliare",
                "system": "CRM"
              }
            ],
            "flows": [],
            "criticality": {
              "open": false,
              "text": ""
            },
            "open_points": [],
            "extra_system_steps": [],
            "verified": true,
            "controls": [
              "Definire asset, obiettivi e responsabile"
            ],
            "rules": [
              "Confrontare la proposta con il mandato di investimento."
            ],
            "volumes": "Scenario sintetico: un asset, nessuna operazione reale."
          },
          {
            "id": "1.2",
            "name": "Valuta mercato e scenario economico",
            "type": "C",
            "trigger": "Opportunità censita",
            "systems": [
              "BI",
              "CRM"
            ],
            "master": [
              {
                "system": "BI",
                "role": "record"
              }
            ],
            "data_owner": "INV",
            "entities_in": [
              {
                "name": "Opportunità immobiliare",
                "source": "CRM"
              }
            ],
            "entities_out": [
              {
                "name": "Valutazione preliminare",
                "canonical": "Valutazione preliminare",
                "system": "BI"
              }
            ],
            "flows": [
              {
                "from": "CRM",
                "to": "BI",
                "payload": "Opportunità immobiliare"
              }
            ],
            "criticality": {
              "open": false,
              "text": ""
            },
            "open_points": [],
            "extra_system_steps": [],
            "verified": true,
            "controls": [
              "Registrare ipotesi, fonti e sensitività"
            ],
            "rules": [
              "Il caso economico è una simulazione, da confermare sul caso reale."
            ],
            "volumes": "Scenario sintetico: un asset, nessuna operazione reale."
          },
          {
            "id": "1.3",
            "name": "Costruisci la document room",
            "type": "C",
            "trigger": "Screening preliminare positivo",
            "systems": [
              "DMS",
              "BI"
            ],
            "master": [
              {
                "system": "DMS",
                "role": "record"
              }
            ],
            "data_owner": "LEG",
            "entities_in": [
              {
                "name": "Valutazione preliminare",
                "source": "BI"
              }
            ],
            "entities_out": [
              {
                "name": "Dossier due diligence",
                "canonical": "Dossier due diligence",
                "system": "DMS"
              }
            ],
            "flows": [
              {
                "from": "BI",
                "to": "DMS",
                "payload": "Valutazione preliminare"
              }
            ],
            "criticality": {
              "open": false,
              "text": ""
            },
            "open_points": [],
            "extra_system_steps": [],
            "verified": true,
            "controls": [
              "Censire documenti presenti, mancanti e relativa provenienza"
            ],
            "rules": [
              "La completezza del dossier richiede una revisione nominativa."
            ],
            "volumes": "Scenario sintetico: un asset, nessuna operazione reale."
          },
          {
            "id": "1.4",
            "name": "Consolida due diligence e rischi",
            "type": "C",
            "trigger": "Dossier pronto per analisi multidisciplinare",
            "systems": [
              "BIM",
              "DMS"
            ],
            "master": [
              {
                "system": "BIM",
                "role": "record"
              }
            ],
            "data_owner": "TEC",
            "entities_in": [
              {
                "name": "Dossier due diligence",
                "source": "DMS"
              }
            ],
            "entities_out": [
              {
                "name": "Esito due diligence",
                "canonical": "Esito due diligence",
                "system": "BIM"
              }
            ],
            "flows": [
              {
                "from": "DMS",
                "to": "BIM",
                "payload": "Dossier due diligence"
              }
            ],
            "criticality": {
              "open": false,
              "text": ""
            },
            "open_points": [
              "OP-01"
            ],
            "extra_system_steps": [],
            "verified": false,
            "controls": [
              "Raccogliere esiti tecnici, contrattuali ed ESG dai referenti"
            ],
            "rules": [
              "Questioni aperte ritornano alla raccolta delle evidenze."
            ],
            "volumes": "Scenario sintetico: un asset, nessuna operazione reale."
          },
          {
            "id": "1.5",
            "name": "Delibera il piano di investimento",
            "type": "C",
            "trigger": "Esiti della due diligence disponibili",
            "systems": [
              "DMS",
              "BIM"
            ],
            "master": [
              {
                "system": "DMS",
                "role": "record"
              }
            ],
            "data_owner": "COM",
            "entities_in": [
              {
                "name": "Esito due diligence",
                "source": "BIM"
              }
            ],
            "entities_out": [
              {
                "name": "Delibera investimento",
                "canonical": "Delibera investimento",
                "system": "DMS"
              }
            ],
            "flows": [
              {
                "from": "BIM",
                "to": "DMS",
                "payload": "Esito due diligence"
              }
            ],
            "criticality": {
              "open": false,
              "text": ""
            },
            "open_points": [],
            "extra_system_steps": [],
            "verified": true,
            "controls": [
              "Documentare motivazione, condizioni e budget proposto"
            ],
            "rules": [
              "La decisione umana resta distinta dagli esiti delle policy."
            ],
            "volumes": "Scenario sintetico: un asset, nessuna operazione reale."
          },
          {
            "id": "1.6",
            "name": "Negozia condizioni e finanziamento",
            "type": "C",
            "trigger": "Mandato negoziale definito",
            "systems": [
              "ERP",
              "DMS"
            ],
            "master": [
              {
                "system": "ERP",
                "role": "record"
              }
            ],
            "data_owner": "FIN",
            "entities_in": [
              {
                "name": "Delibera investimento",
                "source": "DMS"
              }
            ],
            "entities_out": [
              {
                "name": "Piano finanziario",
                "canonical": "Piano finanziario",
                "system": "ERP"
              }
            ],
            "flows": [
              {
                "from": "DMS",
                "to": "ERP",
                "payload": "Delibera investimento"
              }
            ],
            "criticality": {
              "open": false,
              "text": ""
            },
            "open_points": [],
            "extra_system_steps": [],
            "verified": true,
            "controls": [
              "Riconciliare offerta, risorse disponibili e condizioni"
            ],
            "rules": [
              "La copertura economica è un dato da attestare, non una previsione automatica."
            ],
            "volumes": "Scenario sintetico: un asset, nessuna operazione reale."
          },
          {
            "id": "1.7",
            "name": "Formalizza acquisizione e closing",
            "type": "C",
            "trigger": "Condizioni e autorizzazioni confermate",
            "systems": [
              "DMS",
              "ERP"
            ],
            "master": [
              {
                "system": "DMS",
                "role": "record"
              }
            ],
            "data_owner": "LEG",
            "entities_in": [
              {
                "name": "Piano finanziario",
                "source": "ERP"
              }
            ],
            "entities_out": [
              {
                "name": "Atto acquisizione",
                "canonical": "Atto acquisizione",
                "system": "DMS"
              }
            ],
            "flows": [
              {
                "from": "ERP",
                "to": "DMS",
                "payload": "Piano finanziario"
              }
            ],
            "criticality": {
              "open": false,
              "text": ""
            },
            "open_points": [],
            "extra_system_steps": [],
            "verified": true,
            "controls": [
              "Associare documenti firmati e verbale di completamento"
            ],
            "rules": [
              "I professionisti competenti verificano il caso concreto."
            ],
            "volumes": "Scenario sintetico: un asset, nessuna operazione reale."
          },
          {
            "id": "1.8",
            "name": "Attiva anagrafica e responsabilità asset",
            "type": "C",
            "trigger": "Acquisizione formalizzata",
            "systems": [
              "PMS",
              "DMS"
            ],
            "master": [
              {
                "system": "PMS",
                "role": "record"
              }
            ],
            "data_owner": "AM",
            "entities_in": [
              {
                "name": "Atto acquisizione",
                "source": "DMS"
              }
            ],
            "entities_out": [
              {
                "name": "Anagrafica asset",
                "canonical": "Anagrafica asset",
                "system": "PMS"
              }
            ],
            "flows": [
              {
                "from": "DMS",
                "to": "PMS",
                "payload": "Atto acquisizione"
              }
            ],
            "criticality": {
              "open": false,
              "text": ""
            },
            "open_points": [],
            "extra_system_steps": [],
            "verified": true,
            "controls": [
              "Assegnare ID asset, owner, scadenze e sistemi di riferimento"
            ],
            "rules": [
              "Aurora 21 è un asset fittizio creato soltanto per la dimostrazione."
            ],
            "volumes": "Scenario sintetico: un asset, nessuna operazione reale."
          },
          {
            "id": "1.9",
            "name": "Pianifica interventi e valorizzazione",
            "type": "C",
            "trigger": "Intervento richiesto dalla strategia asset",
            "systems": [
              "BIM",
              "PMS"
            ],
            "master": [
              {
                "system": "BIM",
                "role": "record"
              }
            ],
            "data_owner": "TEC",
            "entities_in": [
              {
                "name": "Anagrafica asset",
                "source": "PMS"
              }
            ],
            "entities_out": [
              {
                "name": "Piano valorizzazione",
                "canonical": "Piano valorizzazione",
                "system": "BIM"
              }
            ],
            "flows": [
              {
                "from": "PMS",
                "to": "BIM",
                "payload": "Anagrafica asset"
              }
            ],
            "criticality": {
              "open": false,
              "text": ""
            },
            "open_points": [],
            "extra_system_steps": [],
            "verified": true,
            "controls": [
              "Definire ambito, budget, tempi e criteri di accettazione"
            ],
            "rules": [
              "Un piano approvato rende tracciabili le successive variazioni."
            ],
            "volumes": "Scenario sintetico: un asset, nessuna operazione reale."
          },
          {
            "id": "1.10",
            "name": "Gestisci lavori e accettazione",
            "type": "C",
            "trigger": "Piano di valorizzazione disponibile",
            "systems": [
              "CMMS",
              "BIM"
            ],
            "master": [
              {
                "system": "CMMS",
                "role": "record"
              }
            ],
            "data_owner": "TEC",
            "entities_in": [
              {
                "name": "Piano valorizzazione",
                "source": "BIM"
              }
            ],
            "entities_out": [
              {
                "name": "Verbale accettazione lavori",
                "canonical": "Verbale accettazione lavori",
                "system": "CMMS"
              }
            ],
            "flows": [
              {
                "from": "BIM",
                "to": "CMMS",
                "payload": "Piano valorizzazione"
              }
            ],
            "criticality": {
              "open": false,
              "text": ""
            },
            "open_points": [],
            "extra_system_steps": [],
            "verified": true,
            "controls": [
              "Registrare avanzamento, evidenze di controllo e scostamenti"
            ],
            "rules": [
              "Un esito non accettato ritorna alla pianificazione degli interventi."
            ],
            "volumes": "Scenario sintetico: un asset, nessuna operazione reale."
          },
          {
            "id": "1.11",
            "name": "Seleziona il conduttore",
            "type": "C",
            "trigger": "Immobile pronto per commercializzazione",
            "systems": [
              "CRM",
              "CMMS"
            ],
            "master": [
              {
                "system": "CRM",
                "role": "record"
              }
            ],
            "data_owner": "AM",
            "entities_in": [
              {
                "name": "Verbale accettazione lavori",
                "source": "CMMS"
              }
            ],
            "entities_out": [
              {
                "name": "Profilo conduttore",
                "canonical": "Profilo conduttore",
                "system": "CRM"
              }
            ],
            "flows": [
              {
                "from": "CMMS",
                "to": "CRM",
                "payload": "Verbale accettazione lavori"
              }
            ],
            "criticality": {
              "open": false,
              "text": ""
            },
            "open_points": [
              "OP-02"
            ],
            "extra_system_steps": [],
            "verified": false,
            "controls": [
              "Registrare criteri, proposta e verifiche documentali"
            ],
            "rules": [
              "La valutazione è svolta dai referenti; nessun scoring personale automatico."
            ],
            "volumes": "Scenario sintetico: un asset, nessuna operazione reale."
          },
          {
            "id": "1.12",
            "name": "Formalizza locazione e garanzie",
            "type": "C",
            "trigger": "Proposta selezionata e verificata",
            "systems": [
              "DMS",
              "CRM"
            ],
            "master": [
              {
                "system": "DMS",
                "role": "record"
              }
            ],
            "data_owner": "LEG",
            "entities_in": [
              {
                "name": "Profilo conduttore",
                "source": "CRM"
              }
            ],
            "entities_out": [
              {
                "name": "Contratto locazione",
                "canonical": "Contratto locazione",
                "system": "DMS"
              }
            ],
            "flows": [
              {
                "from": "CRM",
                "to": "DMS",
                "payload": "Profilo conduttore"
              }
            ],
            "criticality": {
              "open": false,
              "text": ""
            },
            "open_points": [],
            "extra_system_steps": [],
            "verified": true,
            "controls": [
              "Allineare termini concordati, garanzie e scadenze"
            ],
            "rules": [
              "Firma e verifiche contrattuali sono attività esterne documentate nel modello."
            ],
            "volumes": "Scenario sintetico: un asset, nessuna operazione reale."
          },
          {
            "id": "1.13",
            "name": "Consegna immobile e attiva servizi",
            "type": "C",
            "trigger": "Contratto formalizzato",
            "systems": [
              "PMS",
              "DMS"
            ],
            "master": [
              {
                "system": "PMS",
                "role": "record"
              }
            ],
            "data_owner": "PM",
            "entities_in": [
              {
                "name": "Contratto locazione",
                "source": "DMS"
              }
            ],
            "entities_out": [
              {
                "name": "Verbale consegna",
                "canonical": "Verbale consegna",
                "system": "PMS"
              }
            ],
            "flows": [
              {
                "from": "DMS",
                "to": "PMS",
                "payload": "Contratto locazione"
              }
            ],
            "criticality": {
              "open": false,
              "text": ""
            },
            "open_points": [],
            "extra_system_steps": [],
            "verified": true,
            "controls": [
              "Rilevare consistenza, contatori, accessi e responsabilità operative"
            ],
            "rules": [
              "Il verbale alimenta l’anagrafica operativa dell’asset."
            ],
            "volumes": "Scenario sintetico: un asset, nessuna operazione reale."
          },
          {
            "id": "1.14",
            "name": "Gestisci canoni, servizi e manutenzioni",
            "type": "C",
            "trigger": "Avvio gestione operativa",
            "systems": [
              "PMS"
            ],
            "master": [
              {
                "system": "PMS",
                "role": "record"
              }
            ],
            "data_owner": "PM",
            "entities_in": [
              {
                "name": "Verbale consegna",
                "source": "PMS"
              }
            ],
            "entities_out": [
              {
                "name": "Rendiconto gestione",
                "canonical": "Rendiconto gestione",
                "system": "PMS"
              }
            ],
            "flows": [],
            "criticality": {
              "open": false,
              "text": ""
            },
            "open_points": [],
            "extra_system_steps": [],
            "verified": true,
            "controls": [
              "Riconciliare incassi, ticket, interventi e registrazioni contabili"
            ],
            "rules": [
              "Le attività ricorrenti alimentano una versione periodica del rendiconto."
            ],
            "volumes": "Scenario sintetico: un asset, nessuna operazione reale."
          },
          {
            "id": "1.15",
            "name": "Riesamina performance e rischi",
            "type": "C",
            "trigger": "Chiusura del periodo di osservazione",
            "systems": [
              "BI",
              "PMS"
            ],
            "master": [
              {
                "system": "BI",
                "role": "record"
              }
            ],
            "data_owner": "AM",
            "entities_in": [
              {
                "name": "Rendiconto gestione",
                "source": "PMS"
              }
            ],
            "entities_out": [
              {
                "name": "Rapporto performance",
                "canonical": "Rapporto performance",
                "system": "BI"
              }
            ],
            "flows": [
              {
                "from": "PMS",
                "to": "BI",
                "payload": "Rendiconto gestione"
              }
            ],
            "criticality": {
              "open": false,
              "text": ""
            },
            "open_points": [],
            "extra_system_steps": [],
            "verified": true,
            "controls": [
              "Esporre scostamenti, criticità e ipotesi aggiornate"
            ],
            "rules": [
              "I KPI vanno letti insieme a fonti, periodo e limiti delle osservazioni."
            ],
            "volumes": "Scenario sintetico: un asset, nessuna operazione reale."
          },
          {
            "id": "1.16",
            "name": "Prepara strategia e dossier di exit",
            "type": "C",
            "trigger": "Decisione di procedere alla dismissione",
            "systems": [
              "BI"
            ],
            "master": [
              {
                "system": "BI",
                "role": "record"
              }
            ],
            "data_owner": "COM",
            "entities_in": [
              {
                "name": "Rapporto performance",
                "source": "BI"
              }
            ],
            "entities_out": [
              {
                "name": "Piano dismissione",
                "canonical": "Piano dismissione",
                "system": "BI"
              }
            ],
            "flows": [],
            "criticality": {
              "open": false,
              "text": ""
            },
            "open_points": [],
            "extra_system_steps": [],
            "verified": true,
            "controls": [
              "Motivare strategia, perimetro del dossier e condizioni obiettivo"
            ],
            "rules": [
              "Il comitato può scegliere mantenimento, rinnovo o vendita."
            ],
            "volumes": "Scenario sintetico: un asset, nessuna operazione reale."
          },
          {
            "id": "1.17",
            "name": "Esegui vendita e trasferimento",
            "type": "C",
            "trigger": "Dossier exit e mandato disponibili",
            "systems": [
              "DMS",
              "BI"
            ],
            "master": [
              {
                "system": "DMS",
                "role": "record"
              }
            ],
            "data_owner": "INV",
            "entities_in": [
              {
                "name": "Piano dismissione",
                "source": "BI"
              }
            ],
            "entities_out": [
              {
                "name": "Dossier trasferimento",
                "canonical": "Dossier trasferimento",
                "system": "DMS"
              }
            ],
            "flows": [
              {
                "from": "BI",
                "to": "DMS",
                "payload": "Piano dismissione"
              }
            ],
            "criticality": {
              "open": false,
              "text": ""
            },
            "open_points": [],
            "extra_system_steps": [],
            "verified": true,
            "controls": [
              "Tracciare negoziazione, documenti e consegne al subentrante"
            ],
            "rules": [
              "L’esito della vendita è registrato solo dopo conferma dei referenti."
            ],
            "volumes": "Scenario sintetico: un asset, nessuna operazione reale."
          },
          {
            "id": "1.18",
            "name": "Chiudi posizioni e archivia evidenze",
            "type": "C",
            "trigger": "Trasferimento formalizzato",
            "systems": [
              "ERP",
              "DMS"
            ],
            "master": [
              {
                "system": "ERP",
                "role": "record"
              }
            ],
            "data_owner": "FIN",
            "entities_in": [
              {
                "name": "Dossier trasferimento",
                "source": "DMS"
              }
            ],
            "entities_out": [
              {
                "name": "Report chiusura asset",
                "canonical": "Report chiusura asset",
                "system": "ERP"
              }
            ],
            "flows": [
              {
                "from": "DMS",
                "to": "ERP",
                "payload": "Dossier trasferimento"
              }
            ],
            "criticality": {
              "open": false,
              "text": ""
            },
            "open_points": [],
            "extra_system_steps": [],
            "verified": true,
            "controls": [
              "Riconciliare posizioni residue e conservazione del dossier"
            ],
            "rules": [
              "La chiusura preserva versioni, responsabilità e traccia delle decisioni."
            ],
            "volumes": "Scenario sintetico: un asset, nessuna operazione reale."
          }
        ],
        "functional_graph": {
          "version": 1,
          "nodes": [
            {
              "id": "start",
              "kind": "start",
              "label": "Nuova opportunità"
            },
            {
              "id": "t1",
              "kind": "task",
              "subprocess_id": "1.1"
            },
            {
              "id": "t2",
              "kind": "task",
              "subprocess_id": "1.2"
            },
            {
              "id": "t3",
              "kind": "task",
              "subprocess_id": "1.3"
            },
            {
              "id": "t4",
              "kind": "task",
              "subprocess_id": "1.4"
            },
            {
              "id": "t5",
              "kind": "task",
              "subprocess_id": "1.5"
            },
            {
              "id": "t6",
              "kind": "task",
              "subprocess_id": "1.6"
            },
            {
              "id": "t7",
              "kind": "task",
              "subprocess_id": "1.7"
            },
            {
              "id": "t8",
              "kind": "task",
              "subprocess_id": "1.8"
            },
            {
              "id": "t9",
              "kind": "task",
              "subprocess_id": "1.9"
            },
            {
              "id": "t10",
              "kind": "task",
              "subprocess_id": "1.10"
            },
            {
              "id": "t11",
              "kind": "task",
              "subprocess_id": "1.11"
            },
            {
              "id": "t12",
              "kind": "task",
              "subprocess_id": "1.12"
            },
            {
              "id": "t13",
              "kind": "task",
              "subprocess_id": "1.13"
            },
            {
              "id": "t14",
              "kind": "task",
              "subprocess_id": "1.14"
            },
            {
              "id": "t15",
              "kind": "task",
              "subprocess_id": "1.15"
            },
            {
              "id": "t16",
              "kind": "task",
              "subprocess_id": "1.16"
            },
            {
              "id": "t17",
              "kind": "task",
              "subprocess_id": "1.17"
            },
            {
              "id": "t18",
              "kind": "task",
              "subprocess_id": "1.18"
            },
            {
              "id": "screen",
              "kind": "decision",
              "label": "Coerente con il mandato?",
              "description": "Decisione sulla valutazione preliminare."
            },
            {
              "id": "diligence",
              "kind": "decision",
              "label": "Evidenze sufficienti?",
              "description": "Conferma multidisciplinare; eventuali integrazioni ritornano alla document room."
            },
            {
              "id": "invest",
              "kind": "decision",
              "label": "Acquisizione autorizzata?",
              "description": "Delibera, condizioni negoziali e copertura confermate dai referenti."
            },
            {
              "id": "works",
              "kind": "decision",
              "label": "Servono interventi?",
              "description": "Scelta del percorso di valorizzazione."
            },
            {
              "id": "accept",
              "kind": "decision",
              "label": "Lavori accettati?",
              "description": "Verifica delle evidenze di completamento."
            },
            {
              "id": "strategy",
              "kind": "decision",
              "label": "Quale strategia asset?",
              "description": "Mantenimento, nuova locazione o dismissione motivata."
            },
            {
              "id": "stop",
              "kind": "end",
              "label": "Opportunità archiviata"
            },
            {
              "id": "end",
              "kind": "end",
              "label": "Ciclo chiuso e tracciato"
            }
          ],
          "edges": [
            {
              "id": "e1",
              "from": "start",
              "to": "t1"
            },
            {
              "id": "e2",
              "from": "t1",
              "to": "t2"
            },
            {
              "id": "e3",
              "from": "t2",
              "to": "screen"
            },
            {
              "id": "e4",
              "from": "t3",
              "to": "t4"
            },
            {
              "id": "e5",
              "from": "t4",
              "to": "diligence"
            },
            {
              "id": "e6",
              "from": "t5",
              "to": "t6"
            },
            {
              "id": "e7",
              "from": "t6",
              "to": "invest"
            },
            {
              "id": "e8",
              "from": "t7",
              "to": "t8"
            },
            {
              "id": "e9",
              "from": "t8",
              "to": "works"
            },
            {
              "id": "e10",
              "from": "t9",
              "to": "t10"
            },
            {
              "id": "e11",
              "from": "t10",
              "to": "accept"
            },
            {
              "id": "e12",
              "from": "t11",
              "to": "t12"
            },
            {
              "id": "e13",
              "from": "t12",
              "to": "t13"
            },
            {
              "id": "e14",
              "from": "t13",
              "to": "t14"
            },
            {
              "id": "e15",
              "from": "t14",
              "to": "t15"
            },
            {
              "id": "e16",
              "from": "t15",
              "to": "strategy"
            },
            {
              "id": "e17",
              "from": "t16",
              "to": "t17"
            },
            {
              "id": "e18",
              "from": "t17",
              "to": "t18"
            },
            {
              "id": "e19",
              "from": "t18",
              "to": "end"
            },
            {
              "id": "e20",
              "from": "screen",
              "to": "t3",
              "label": "Sì",
              "condition": "Opportunità coerente con criteri e mandato"
            },
            {
              "id": "e21",
              "from": "screen",
              "to": "stop",
              "label": "No",
              "condition": "Motivare archiviazione"
            },
            {
              "id": "e22",
              "from": "diligence",
              "to": "t3",
              "label": "Integra",
              "condition": "Documenti o analisi da completare"
            },
            {
              "id": "e23",
              "from": "diligence",
              "to": "t5",
              "label": "Procedi",
              "condition": "Evidenze riesaminate dai referenti"
            },
            {
              "id": "e24",
              "from": "invest",
              "to": "t7",
              "label": "Sì",
              "condition": "Autorizzazione interna e condizioni confermate"
            },
            {
              "id": "e25",
              "from": "invest",
              "to": "stop",
              "label": "No",
              "condition": "Operazione non autorizzata"
            },
            {
              "id": "e26",
              "from": "works",
              "to": "t9",
              "label": "Sì",
              "condition": "Interventi previsti dalla strategia"
            },
            {
              "id": "e27",
              "from": "works",
              "to": "t11",
              "label": "No",
              "condition": "Asset pronto per la commercializzazione"
            },
            {
              "id": "e28",
              "from": "accept",
              "to": "t9",
              "label": "Rivedi",
              "condition": "Criteri di accettazione non soddisfatti"
            },
            {
              "id": "e29",
              "from": "accept",
              "to": "t11",
              "label": "Accetta",
              "condition": "Evidenze di completamento confermate"
            },
            {
              "id": "e30",
              "from": "strategy",
              "to": "t14",
              "label": "Mantieni",
              "condition": "Proseguire gestione corrente"
            },
            {
              "id": "e31",
              "from": "strategy",
              "to": "t11",
              "label": "Rinnova",
              "condition": "Avviare nuova commercializzazione"
            },
            {
              "id": "e32",
              "from": "strategy",
              "to": "t16",
              "label": "Dismetti",
              "condition": "Mandato di vendita deliberato"
            }
          ],
          "layout": {
            "positions": {
              "start": {
                "x": 80,
                "y": 80
              },
              "t1": {
                "x": 360,
                "y": 80
              },
              "t2": {
                "x": 640,
                "y": 80
              },
              "screen": {
                "x": 920,
                "y": 80
              },
              "stop": {
                "x": 1200,
                "y": 80
              },
              "t3": {
                "x": 80,
                "y": 300
              },
              "t4": {
                "x": 360,
                "y": 300
              },
              "diligence": {
                "x": 640,
                "y": 300
              },
              "t5": {
                "x": 920,
                "y": 300
              },
              "t6": {
                "x": 1200,
                "y": 300
              },
              "invest": {
                "x": 1480,
                "y": 300
              },
              "t7": {
                "x": 80,
                "y": 520
              },
              "t8": {
                "x": 360,
                "y": 520
              },
              "works": {
                "x": 640,
                "y": 520
              },
              "t9": {
                "x": 920,
                "y": 520
              },
              "t10": {
                "x": 1200,
                "y": 520
              },
              "accept": {
                "x": 1480,
                "y": 520
              },
              "t11": {
                "x": 80,
                "y": 740
              },
              "t12": {
                "x": 360,
                "y": 740
              },
              "t13": {
                "x": 640,
                "y": 740
              },
              "t14": {
                "x": 920,
                "y": 740
              },
              "t15": {
                "x": 1200,
                "y": 740
              },
              "strategy": {
                "x": 1480,
                "y": 740
              },
              "t16": {
                "x": 80,
                "y": 960
              },
              "t17": {
                "x": 360,
                "y": 960
              },
              "t18": {
                "x": 640,
                "y": 960
              },
              "end": {
                "x": 920,
                "y": 960
              }
            }
          }
        }
      }
    ]
  },
  "rules": {
    "DG-OWN-001": {
      "severity": "ERROR",
      "enforcement": "approve",
      "category": "ownership",
      "title": "Master candidato assente",
      "enabled": true
    },
    "DG-OWN-002": {
      "severity": "ERROR",
      "enforcement": "approve",
      "category": "ownership",
      "title": "Data Owner non attribuito",
      "enabled": true
    },
    "DG-OWN-003": {
      "severity": "WARNING",
      "enforcement": "advise",
      "category": "ownership",
      "title": "Multi-master senza ruolo distinto",
      "enabled": true
    },
    "DG-SEM-001": {
      "severity": "ERROR",
      "enforcement": "approve",
      "category": "semantics",
      "title": "Nodo [C] senza entità in output",
      "enabled": true
    },
    "DG-SEM-002": {
      "severity": "ERROR",
      "enforcement": "approve",
      "category": "semantics",
      "title": "Entità senza sistema di residenza",
      "enabled": true
    },
    "DG-SEM-003": {
      "severity": "INFO",
      "enforcement": "observe",
      "category": "semantics",
      "title": "Termine canonico provvisorio",
      "enabled": true
    },
    "DG-SEM-004": {
      "severity": "WARNING",
      "enforcement": "advise",
      "category": "semantics",
      "title": "Entità replicata su più sistemi",
      "enabled": true
    },
    "DG-MAP-001": {
      "severity": "CRITICAL",
      "enforcement": "block",
      "category": "mapping",
      "title": "Flusso verso sistema non catalogato",
      "enabled": true
    },
    "DG-MAP-002": {
      "severity": "ERROR",
      "enforcement": "approve",
      "category": "mapping",
      "title": "Flusso senza payload",
      "enabled": true
    },
    "DG-MAP-003": {
      "severity": "CRITICAL",
      "enforcement": "block",
      "category": "mapping",
      "title": "Master non tra i sistemi del nodo",
      "enabled": true
    },
    "DG-SYS-001": {
      "severity": "WARNING",
      "enforcement": "advise",
      "category": "systems",
      "title": "Sistema con adozione parziale",
      "enabled": true
    },
    "DG-SYS-002": {
      "severity": "WARNING",
      "enforcement": "advise",
      "category": "systems",
      "title": "Sistema in implementazione",
      "enabled": true
    },
    "DG-SCOPE-001": {
      "severity": "WARNING",
      "enforcement": "advise",
      "category": "scope",
      "title": "Perimetro non deciso",
      "enabled": true
    },
    "DG-ACT-001": {
      "severity": "WARNING",
      "enforcement": "advise",
      "category": "actions",
      "title": "Open point da chiudere",
      "enabled": true
    },
    "DG-ACT-002": {
      "severity": "WARNING",
      "enforcement": "advise",
      "category": "actions",
      "title": "Criticità non tracciata",
      "enabled": true
    },
    "DG-ACT-003": {
      "severity": "ERROR",
      "enforcement": "approve",
      "category": "actions",
      "title": "Non validato dal referente",
      "enabled": true
    },
    "DG-ACT-004": {
      "severity": "WARNING",
      "enforcement": "advise",
      "category": "actions",
      "title": "Step extra-sistema non approvato",
      "enabled": true
    }
  }
};

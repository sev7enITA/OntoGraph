// Synthetic Aurora 21 scenario for the OnToGraPh reference implementation.
const SEED = {
  "model": {
    "meta": {
      "project": "RE-DEMO",
      "domain": "Real estate: synthetic Aurora 21 scenario",
      "model_version": "1.0.0",
      "interview_date": "2026-11-25"
    },
    "systems": {
      "CRM": {
        "label": "Deal & leasing CRM",
        "role": "Opportunities, offers, and relationships",
        "kind": "app",
        "adoption": "full",
        "scope": "in",
        "access": "Demo system with no live connection"
      },
      "DMS": {
        "label": "Document room",
        "role": "Dossiers, contracts, and evidence",
        "kind": "app",
        "adoption": "full",
        "scope": "in",
        "access": "Demo system with no live connection"
      },
      "BI": {
        "label": "Investment analytics",
        "role": "Valuations, scenarios, and performance",
        "kind": "app",
        "adoption": "full",
        "scope": "in",
        "access": "Demo system with no live connection"
      },
      "ERP": {
        "label": "Finance ledger",
        "role": "Budgets, funding, and accounting",
        "kind": "app",
        "adoption": "full",
        "scope": "in",
        "access": "Demo system with no live connection"
      },
      "PMS": {
        "label": "Property management",
        "role": "Asset records, leases, and services",
        "kind": "app",
        "adoption": "full",
        "scope": "in",
        "access": "Demo system with no live connection"
      },
      "BIM": {
        "label": "Technical asset register",
        "role": "Technical documentation and works",
        "kind": "app",
        "adoption": "full",
        "scope": "in",
        "access": "Demo system with no live connection"
      },
      "CMMS": {
        "label": "Works & maintenance",
        "role": "Works, inspections, and maintenance",
        "kind": "app",
        "adoption": "full",
        "scope": "in",
        "access": "Demo system with no live connection"
      }
    },
    "owners": {
      "INV": {
        "area": "Investment",
        "responsible": "Investment lead",
        "operatives": []
      },
      "LEG": {
        "area": "Legal & contracts",
        "responsible": "Legal lead",
        "operatives": []
      },
      "TEC": {
        "area": "Technical & ESG",
        "responsible": "Technical lead",
        "operatives": []
      },
      "FIN": {
        "area": "Finance",
        "responsible": "Finance lead",
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
        "responsible": "Investment committee",
        "operatives": []
      }
    },
    "glossary": [
      {
        "canonical": "Property opportunity",
        "status": "approved",
        "aliases": []
      },
      {
        "canonical": "Preliminary assessment",
        "status": "approved",
        "aliases": []
      },
      {
        "canonical": "Due diligence dossier",
        "status": "approved",
        "aliases": []
      },
      {
        "canonical": "Due diligence outcome",
        "status": "approved",
        "aliases": []
      },
      {
        "canonical": "Investment decision",
        "status": "approved",
        "aliases": []
      },
      {
        "canonical": "Financial plan",
        "status": "approved",
        "aliases": []
      },
      {
        "canonical": "Acquisition deed",
        "status": "approved",
        "aliases": []
      },
      {
        "canonical": "Asset record",
        "status": "approved",
        "aliases": []
      },
      {
        "canonical": "Asset improvement plan",
        "status": "approved",
        "aliases": []
      },
      {
        "canonical": "Works acceptance record",
        "status": "approved",
        "aliases": []
      },
      {
        "canonical": "Tenant profile",
        "status": "approved",
        "aliases": []
      },
      {
        "canonical": "Lease agreement",
        "status": "approved",
        "aliases": []
      },
      {
        "canonical": "Handover record",
        "status": "approved",
        "aliases": []
      },
      {
        "canonical": "Operating statement",
        "status": "approved",
        "aliases": []
      },
      {
        "canonical": "Performance report",
        "status": "approved",
        "aliases": []
      },
      {
        "canonical": "Disposal plan",
        "status": "approved",
        "aliases": []
      },
      {
        "canonical": "Transfer dossier",
        "status": "approved",
        "aliases": []
      },
      {
        "canonical": "Asset closeout report",
        "status": "approved",
        "aliases": []
      }
    ],
    "open_points": [
      {
        "id": "OP-01",
        "title": "Complete the dossier's technical evidence",
        "detail": "Demo issue: the technical lead completes the example documentation before review.",
        "owner": "TEC",
        "status": "open",
        "next_step": "Complete the dossier and record the review."
      },
      {
        "id": "OP-02",
        "title": "Confirm tenant selection criteria",
        "detail": "Demo issue: align criteria between Asset Management and Legal. The inventory uses synthetic records.",
        "owner": "AM",
        "status": "open",
        "next_step": "Confirm the criteria and update step 1.11."
      }
    ],
    "processes": [
      {
        "id": "P1",
        "name": "Aurora 21 property lifecycle",
        "subtitle": "Acquisition, improvement, leasing, operations, and disposal. All data is synthetic.",
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
            "name": "Record opportunity and mandate",
            "type": "C",
            "trigger": "New opportunity reported",
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
                "name": "Property opportunity",
                "canonical": "Property opportunity",
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
              "Specify the asset, objectives, and owner"
            ],
            "rules": [
              "Check the proposal against the investment mandate."
            ],
            "volumes": "Synthetic scenario for one example asset."
          },
          {
            "id": "1.2",
            "name": "Assess the market and business case",
            "type": "C",
            "trigger": "Opportunity recorded",
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
                "name": "Property opportunity",
                "source": "CRM"
              }
            ],
            "entities_out": [
              {
                "name": "Preliminary assessment",
                "canonical": "Preliminary assessment",
                "system": "BI"
              }
            ],
            "flows": [
              {
                "from": "CRM",
                "to": "BI",
                "payload": "Property opportunity"
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
              "Record assumptions, sources, and sensitivities"
            ],
            "rules": [
              "The business case uses simulated data. Validate assumptions for a real case."
            ],
            "volumes": "Synthetic scenario for one example asset."
          },
          {
            "id": "1.3",
            "name": "Set up the document room",
            "type": "C",
            "trigger": "Preliminary screening passed",
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
                "name": "Preliminary assessment",
                "source": "BI"
              }
            ],
            "entities_out": [
              {
                "name": "Due diligence dossier",
                "canonical": "Due diligence dossier",
                "system": "DMS"
              }
            ],
            "flows": [
              {
                "from": "BI",
                "to": "DMS",
                "payload": "Preliminary assessment"
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
              "Record available documents, missing documents, and their sources"
            ],
            "rules": [
              "A named reviewer confirms the dossier is complete."
            ],
            "volumes": "Synthetic scenario for one example asset."
          },
          {
            "id": "1.4",
            "name": "Consolidate due diligence and risks",
            "type": "C",
            "trigger": "Dossier ready for cross-functional review",
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
                "name": "Due diligence dossier",
                "source": "DMS"
              }
            ],
            "entities_out": [
              {
                "name": "Due diligence outcome",
                "canonical": "Due diligence outcome",
                "system": "BIM"
              }
            ],
            "flows": [
              {
                "from": "DMS",
                "to": "BIM",
                "payload": "Due diligence dossier"
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
              "Gather technical, contractual, and ESG findings from the owners"
            ],
            "rules": [
              "Open issues return to evidence collection."
            ],
            "volumes": "Synthetic scenario for one example asset."
          },
          {
            "id": "1.5",
            "name": "Approve the investment plan",
            "type": "C",
            "trigger": "Due diligence outcomes available",
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
                "name": "Due diligence outcome",
                "source": "BIM"
              }
            ],
            "entities_out": [
              {
                "name": "Investment decision",
                "canonical": "Investment decision",
                "system": "DMS"
              }
            ],
            "flows": [
              {
                "from": "BIM",
                "to": "DMS",
                "payload": "Due diligence outcome"
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
              "Document the rationale, conditions, and proposed budget"
            ],
            "rules": [
              "Record the human decision separately from policy results."
            ],
            "volumes": "Synthetic scenario for one example asset."
          },
          {
            "id": "1.6",
            "name": "Negotiate terms and funding",
            "type": "C",
            "trigger": "Negotiation mandate agreed",
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
                "name": "Investment decision",
                "source": "DMS"
              }
            ],
            "entities_out": [
              {
                "name": "Financial plan",
                "canonical": "Financial plan",
                "system": "ERP"
              }
            ],
            "flows": [
              {
                "from": "DMS",
                "to": "ERP",
                "payload": "Investment decision"
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
              "Reconcile the offer, funding, and terms"
            ],
            "rules": [
              "Record evidence of available funding."
            ],
            "volumes": "Synthetic scenario for one example asset."
          },
          {
            "id": "1.7",
            "name": "Finalize acquisition and closing",
            "type": "C",
            "trigger": "Terms and approvals confirmed",
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
                "name": "Financial plan",
                "source": "ERP"
              }
            ],
            "entities_out": [
              {
                "name": "Acquisition deed",
                "canonical": "Acquisition deed",
                "system": "DMS"
              }
            ],
            "flows": [
              {
                "from": "ERP",
                "to": "DMS",
                "payload": "Financial plan"
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
              "Link the signed documents and closing record"
            ],
            "rules": [
              "Qualified personnel verify the case."
            ],
            "volumes": "Synthetic scenario for one example asset."
          },
          {
            "id": "1.8",
            "name": "Create the asset record and assign owners",
            "type": "C",
            "trigger": "Acquisition finalized",
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
                "name": "Acquisition deed",
                "source": "DMS"
              }
            ],
            "entities_out": [
              {
                "name": "Asset record",
                "canonical": "Asset record",
                "system": "PMS"
              }
            ],
            "flows": [
              {
                "from": "DMS",
                "to": "PMS",
                "payload": "Acquisition deed"
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
              "Assign the asset ID, owners, deadlines, and systems of record"
            ],
            "rules": [
              "Aurora 21 is a fictional asset created for this demo."
            ],
            "volumes": "Synthetic scenario for one example asset."
          },
          {
            "id": "1.9",
            "name": "Plan asset improvements",
            "type": "C",
            "trigger": "Asset strategy calls for improvements",
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
                "name": "Asset record",
                "source": "PMS"
              }
            ],
            "entities_out": [
              {
                "name": "Asset improvement plan",
                "canonical": "Asset improvement plan",
                "system": "BIM"
              }
            ],
            "flows": [
              {
                "from": "PMS",
                "to": "BIM",
                "payload": "Asset record"
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
              "Define scope, budget, schedule, and acceptance criteria"
            ],
            "rules": [
              "Track later changes against the approved plan."
            ],
            "volumes": "Synthetic scenario for one example asset."
          },
          {
            "id": "1.10",
            "name": "Manage works and acceptance",
            "type": "C",
            "trigger": "Asset improvement plan available",
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
                "name": "Asset improvement plan",
                "source": "BIM"
              }
            ],
            "entities_out": [
              {
                "name": "Works acceptance record",
                "canonical": "Works acceptance record",
                "system": "CMMS"
              }
            ],
            "flows": [
              {
                "from": "BIM",
                "to": "CMMS",
                "payload": "Asset improvement plan"
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
              "Record progress, inspection evidence, and deviations"
            ],
            "rules": [
              "Rejected works return to planning."
            ],
            "volumes": "Synthetic scenario for one example asset."
          },
          {
            "id": "1.11",
            "name": "Select a tenant",
            "type": "C",
            "trigger": "Property ready for marketing",
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
                "name": "Works acceptance record",
                "source": "CMMS"
              }
            ],
            "entities_out": [
              {
                "name": "Tenant profile",
                "canonical": "Tenant profile",
                "system": "CRM"
              }
            ],
            "flows": [
              {
                "from": "CMMS",
                "to": "CRM",
                "payload": "Works acceptance record"
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
              "Record criteria, the proposal, and document checks"
            ],
            "rules": [
              "Assigned reviewers carry out the assessment."
            ],
            "volumes": "Synthetic scenario for one example asset."
          },
          {
            "id": "1.12",
            "name": "Finalize lease and guarantees",
            "type": "C",
            "trigger": "Proposal selected and checked",
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
                "name": "Tenant profile",
                "source": "CRM"
              }
            ],
            "entities_out": [
              {
                "name": "Lease agreement",
                "canonical": "Lease agreement",
                "system": "DMS"
              }
            ],
            "flows": [
              {
                "from": "CRM",
                "to": "DMS",
                "payload": "Tenant profile"
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
              "Align agreed terms, guarantees, and deadlines"
            ],
            "rules": [
              "The model records external signing and contract checks."
            ],
            "volumes": "Synthetic scenario for one example asset."
          },
          {
            "id": "1.13",
            "name": "Hand over the property and activate services",
            "type": "C",
            "trigger": "Contract finalized",
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
                "name": "Lease agreement",
                "source": "DMS"
              }
            ],
            "entities_out": [
              {
                "name": "Handover record",
                "canonical": "Handover record",
                "system": "PMS"
              }
            ],
            "flows": [
              {
                "from": "DMS",
                "to": "PMS",
                "payload": "Lease agreement"
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
              "Record condition, meter readings, access, and operating responsibilities"
            ],
            "rules": [
              "The handover record feeds the asset's operational records."
            ],
            "volumes": "Synthetic scenario for one example asset."
          },
          {
            "id": "1.14",
            "name": "Manage rent, services, and maintenance",
            "type": "C",
            "trigger": "Operations started",
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
                "name": "Handover record",
                "source": "PMS"
              }
            ],
            "entities_out": [
              {
                "name": "Operating statement",
                "canonical": "Operating statement",
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
              "Reconcile payments, tickets, works, and accounting records"
            ],
            "rules": [
              "Recurring activities feed the periodic operating statement."
            ],
            "volumes": "Synthetic scenario for one example asset."
          },
          {
            "id": "1.15",
            "name": "Review performance and risks",
            "type": "C",
            "trigger": "Observation period ended",
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
                "name": "Operating statement",
                "source": "PMS"
              }
            ],
            "entities_out": [
              {
                "name": "Performance report",
                "canonical": "Performance report",
                "system": "BI"
              }
            ],
            "flows": [
              {
                "from": "PMS",
                "to": "BI",
                "payload": "Operating statement"
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
              "Report deviations, open issues, and updated assumptions"
            ],
            "rules": [
              "Interpret KPIs in light of their sources, dates, and observation limits."
            ],
            "volumes": "Synthetic scenario for one example asset."
          },
          {
            "id": "1.16",
            "name": "Prepare the exit strategy and dossier",
            "type": "C",
            "trigger": "Disposal decision made",
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
                "name": "Performance report",
                "source": "BI"
              }
            ],
            "entities_out": [
              {
                "name": "Disposal plan",
                "canonical": "Disposal plan",
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
              "Document the strategy, dossier scope, and target terms"
            ],
            "rules": [
              "The committee may choose to retain, re-lease, or sell the asset."
            ],
            "volumes": "Synthetic scenario for one example asset."
          },
          {
            "id": "1.17",
            "name": "Complete the sale and transfer",
            "type": "C",
            "trigger": "Exit dossier and mandate available",
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
                "name": "Disposal plan",
                "source": "BI"
              }
            ],
            "entities_out": [
              {
                "name": "Transfer dossier",
                "canonical": "Transfer dossier",
                "system": "DMS"
              }
            ],
            "flows": [
              {
                "from": "BI",
                "to": "DMS",
                "payload": "Disposal plan"
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
              "Track negotiation, documents, and handover to the successor"
            ],
            "rules": [
              "Record the sale outcome after the owners confirm it."
            ],
            "volumes": "Synthetic scenario for one example asset."
          },
          {
            "id": "1.18",
            "name": "Close accounts and archive evidence",
            "type": "C",
            "trigger": "Transfer finalized",
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
                "name": "Transfer dossier",
                "source": "DMS"
              }
            ],
            "entities_out": [
              {
                "name": "Asset closeout report",
                "canonical": "Asset closeout report",
                "system": "ERP"
              }
            ],
            "flows": [
              {
                "from": "DMS",
                "to": "ERP",
                "payload": "Transfer dossier"
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
              "Reconcile remaining accounts and confirm dossier retention"
            ],
            "rules": [
              "Closeout retains versions, ownership, and the decision record."
            ],
            "volumes": "Synthetic scenario for one example asset."
          }
        ],
        "functional_graph": {
          "version": 1,
          "nodes": [
            {
              "id": "start",
              "kind": "start",
              "label": "New opportunity"
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
              "label": "Mandate fit?",
              "description": "Decision on the preliminary assessment."
            },
            {
              "id": "diligence",
              "kind": "decision",
              "label": "Sufficient evidence?",
              "description": "Review across disciplines. Send any requests for additions back to the document room."
            },
            {
              "id": "invest",
              "kind": "decision",
              "label": "Acquisition authorized?",
              "description": "Owners confirm the approval, negotiated terms, and funding."
            },
            {
              "id": "works",
              "kind": "decision",
              "label": "Improvements needed?",
              "description": "Choose how to improve the asset."
            },
            {
              "id": "accept",
              "kind": "decision",
              "label": "Works accepted?",
              "description": "Verify completion evidence."
            },
            {
              "id": "strategy",
              "kind": "decision",
              "label": "Asset strategy?",
              "description": "Document why the asset will be retained, re-leased, or sold."
            },
            {
              "id": "stop",
              "kind": "end",
              "label": "Opportunity archived"
            },
            {
              "id": "end",
              "kind": "end",
              "label": "Lifecycle closed and recorded"
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
              "label": "Yes",
              "condition": "Opportunity meets the criteria and mandate"
            },
            {
              "id": "e21",
              "from": "screen",
              "to": "stop",
              "label": "No",
              "condition": "Record the reason for archiving"
            },
            {
              "id": "e22",
              "from": "diligence",
              "to": "t3",
              "label": "Supplement",
              "condition": "Documents or analysis incomplete"
            },
            {
              "id": "e23",
              "from": "diligence",
              "to": "t5",
              "label": "Proceed",
              "condition": "Owners reviewed the evidence"
            },
            {
              "id": "e24",
              "from": "invest",
              "to": "t7",
              "label": "Yes",
              "condition": "Internal approval and terms confirmed"
            },
            {
              "id": "e25",
              "from": "invest",
              "to": "stop",
              "label": "No",
              "condition": "Transaction not authorized"
            },
            {
              "id": "e26",
              "from": "works",
              "to": "t9",
              "label": "Yes",
              "condition": "Strategy includes improvements"
            },
            {
              "id": "e27",
              "from": "works",
              "to": "t11",
              "label": "No",
              "condition": "Asset ready for marketing"
            },
            {
              "id": "e28",
              "from": "accept",
              "to": "t9",
              "label": "Revise",
              "condition": "Acceptance criteria unmet"
            },
            {
              "id": "e29",
              "from": "accept",
              "to": "t11",
              "label": "Accept",
              "condition": "Completion evidence confirmed"
            },
            {
              "id": "e30",
              "from": "strategy",
              "to": "t14",
              "label": "Retain",
              "condition": "Continue current operations"
            },
            {
              "id": "e31",
              "from": "strategy",
              "to": "t11",
              "label": "Re-lease",
              "condition": "Launch new marketing"
            },
            {
              "id": "e32",
              "from": "strategy",
              "to": "t16",
              "label": "Sell",
              "condition": "Sale mandate approved"
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
      "title": "Missing lead system candidate",
      "enabled": true
    },
    "DG-OWN-002": {
      "severity": "ERROR",
      "enforcement": "approve",
      "category": "ownership",
      "title": "Missing data owner",
      "enabled": true
    },
    "DG-OWN-003": {
      "severity": "WARNING",
      "enforcement": "advise",
      "category": "ownership",
      "title": "Overlapping lead system roles",
      "enabled": true
    },
    "DG-SEM-001": {
      "severity": "ERROR",
      "enforcement": "approve",
      "category": "semantics",
      "title": "Create step without output entity",
      "enabled": true
    },
    "DG-SEM-002": {
      "severity": "ERROR",
      "enforcement": "approve",
      "category": "semantics",
      "title": "Entity without host system",
      "enabled": true
    },
    "DG-SEM-003": {
      "severity": "INFO",
      "enforcement": "observe",
      "category": "semantics",
      "title": "Provisional canonical term",
      "enabled": true
    },
    "DG-SEM-004": {
      "severity": "WARNING",
      "enforcement": "advise",
      "category": "semantics",
      "title": "Entity replicated across systems",
      "enabled": true
    },
    "DG-MAP-001": {
      "severity": "CRITICAL",
      "enforcement": "block",
      "category": "mapping",
      "title": "Flow references unrecorded system",
      "enabled": true
    },
    "DG-MAP-002": {
      "severity": "ERROR",
      "enforcement": "approve",
      "category": "mapping",
      "title": "Flow without payload",
      "enabled": true
    },
    "DG-MAP-003": {
      "severity": "CRITICAL",
      "enforcement": "block",
      "category": "mapping",
      "title": "Lead system missing from the step",
      "enabled": true
    },
    "DG-SYS-001": {
      "severity": "WARNING",
      "enforcement": "advise",
      "category": "systems",
      "title": "Partial system adoption",
      "enabled": true
    },
    "DG-SYS-002": {
      "severity": "WARNING",
      "enforcement": "advise",
      "category": "systems",
      "title": "System implementation underway",
      "enabled": true
    },
    "DG-SCOPE-001": {
      "severity": "WARNING",
      "enforcement": "advise",
      "category": "scope",
      "title": "Scope undecided",
      "enabled": true
    },
    "DG-ACT-001": {
      "severity": "WARNING",
      "enforcement": "advise",
      "category": "actions",
      "title": "Open issue to resolve",
      "enabled": true
    },
    "DG-ACT-002": {
      "severity": "WARNING",
      "enforcement": "advise",
      "category": "actions",
      "title": "Critical issue untracked",
      "enabled": true
    },
    "DG-ACT-003": {
      "severity": "ERROR",
      "enforcement": "approve",
      "category": "actions",
      "title": "Pending process owner validation",
      "enabled": true
    },
    "DG-ACT-004": {
      "severity": "WARNING",
      "enforcement": "advise",
      "category": "actions",
      "title": "External step awaiting approval",
      "enabled": true
    }
  }
};

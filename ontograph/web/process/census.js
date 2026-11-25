/*
 * census.js: il censimento Excel letto, validato e trasformato in modello, fatti e diagrammi
 * direttamente nel browser (e in Node per i test di parità). Specchio di:
 *   tools/import_excel.py  → parseWorkbook(sheets)      sheets = { NomeFoglio: [[riga1],[riga2],...] }
 *   tools/export_excel.py  → modelToSheets(model, rules)
 *   tools/generate.py      → buildFacts(model)
 *   tools/uml.py           → sequenceMermaid / swimlaneMermaid / classMermaid / sequencePlantUML
 * La fonte di verità resta Python in pipeline: tools/parity_census.mjs confronta i due output.
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory(require("./functional-graph.js"));
  else root.DGCensus = factory(root.DGFunctionalGraph);
})(typeof self !== "undefined" ? self : this, function (FG) {
  const SHEETS = {
    Meta: ["Chiave", "Valore"],
    Sistemi: ["Codice", "Nome", "Ruolo", "Tipo", "Adozione", "Nota adozione", "Perimetro", "Accesso", "Deck di riferimento"],
    Referenti: ["Chiave", "Area", "Responsabile", "Operativi"],
    Processi: ["ID", "Nome", "Sottotitolo", "Area", "Sistemi", "Verificato", "Esterno"],
    SottoProcessi: ["ID", "Processo", "Nome", "Tipo", "Sistemi", "Trigger", "Master", "Data Owner", "Criticità aperta", "Criticità", "Open point", "Verificato", "Volumi", "Controlli", "Regole business", "Step extra-sistema"],
    Flussi: ["SottoProcesso", "Da", "A", "Payload"],
    Entita: ["SottoProcesso", "Direzione", "Nome", "Sistema", "Canonico"],
    OpenPoint: ["ID", "Titolo", "Dettaglio", "Owner", "Stato", "Next step"],
    Glossario: ["Canonico", "Stato", "Alias"],
    Regole: ["Codice", "Titolo", "Categoria", "Severità", "Enforcement", "Attiva"],
  };
  Object.assign(SHEETS, FG.GRAPH_SHEETS);
  const ENUMS = {
    "Sistemi.Adozione": ["full", "wide", "partial", "implementing", "on_demand"],
    "Sistemi.Perimetro": ["in", "open", "support", "external", "downstream"],
    "Processi.Verificato": ["SI", "NO"], "Processi.Esterno": ["SI", "NO"],
    "SottoProcessi.Tipo": ["C", "T", "R"], "SottoProcessi.Criticità aperta": ["SI", "NO"], "SottoProcessi.Verificato": ["SI", "NO"],
    "Entita.Direzione": ["IN", "OUT"], "OpenPoint.Stato": ["open", "in_progress", "closed"],
    "Glossario.Stato": ["provisional", "approved", "deprecated"],
    "Regole.Severità": ["INFO", "WARNING", "ERROR", "CRITICAL"], "Regole.Enforcement": ["observe", "advise", "approve", "block"], "Regole.Attiva": ["SI", "NO"],
  };
  const COLUMN_HELP = {
    Sistemi: "Un sistema per riga. Il Codice è l'identificativo usato in tutti gli altri fogli (MAIUSCOLO_CON_UNDERSCORE).",
    Referenti: "Candidati Data Owner per area. La Chiave è usata in Processi.Area e SottoProcessi.Data Owner.",
    Processi: "Un processo per riga (P1, P2, …). Sistemi separati da ';'.",
    SottoProcessi: "Una riga per ogni riga delle tabelle Process & Entity Mapping. Master: CODICE:ruolo; … . Open point: OP-01; OP-02.",
    Flussi: "Un flusso tra sistemi per riga, con il payload trasferito (entità o documento).",
    Entita: "Entità in ingresso (IN, Sistema = sorgente) e in uscita (OUT, Sistema = dove risiede). Canonico = termine del Glossario.",
    OpenPoint: "Punti aperti del SAL. Finché aperti, i sotto-processi collegati restano in attesa.",
    Glossario: "Termini canonici. Alias: termine@SISTEMA; … (es. opportunità@CRM; dossier@DMS).",
    Regole: "Catalogo regole della policy: severità ed enforcement massimo sono decisi qui, non nel codice. Attiva=NO disattiva la regola.",
    Meta: "",
  };
  Object.assign(COLUMN_HELP, FG.GRAPH_HELP);
  const BOOL = { SI: true, "SÌ": true, YES: true, TRUE: true, "1": true, NO: false, FALSE: false, "0": false, "": false };
  const str = (v) => (v === null || v === undefined ? "" : String(v).trim());
  const splitList = (s) => str(s).replace(/\n/g, ";").split(";").map((x) => x.trim()).filter(Boolean);
  const splitPairs = (s, sep = ":") => splitList(s).map((it) => { const i = it.indexOf(sep); return i >= 0 ? [it.slice(0, i).trim(), it.slice(i + 1).trim()] : [it.trim(), ""]; });
  const joinList = (xs) => xs.join("; ");
  const joinPairs = (pairs, sep = ":") => pairs.map(([k, v]) => (v ? `${k}${sep}${v}` : k)).join("; ");
  const toBool = (v) => BOOL[str(v).toUpperCase()] ?? false;
  const fromBool = (b) => (b ? "SI" : "NO");

  // ------------------------------------------------------------ parse -------
  function readSheet(sheets, name, rep) {
    const rows = sheets[name];
    if (!rows) { rep.errors.push(`${name}!0: foglio mancante`); return []; }
    const header = (rows[1] || []).map(str);
    const expected = SHEETS[name];
    const missing = expected.filter((c) => !header.includes(c));
    if (new Set(header.filter(Boolean)).size !== header.filter(Boolean).length) { rep.errors.push(`${name}!2: intestazioni duplicate`); return []; }
    if (missing.length) { rep.errors.push(`${name}!2: colonne mancanti: ${missing.join(", ")}`); return []; }
    const out = [];
    for (let i = 2; i < rows.length; i++) {
      const r = rows[i] || [];
      const rec = Object.create(null); header.forEach((h, j) => { if (h) rec[h] = FG.GRAPH_SHEETS[name] && ["Etichetta","Descrizione","Condizione"].includes(h) ? String(r[j] ?? "") : str(r[j]); });
      if (!expected.some((c) => rec[c])) continue;
      rec._row = i + 1;
      for (const c of expected) {
        const en = ENUMS[`${name}.${c}`];
        if (en && rec[c] && !en.includes(rec[c])) rep.errors.push(`${name}!${i + 1}: ${c}='${rec[c]}' non ammesso (valori: ${en.join(", ")})`);
      }
      out.push(rec);
    }
    return out;
  }

  function parseWorkbook(sheets) {
    const rep = { errors: [], warnings: [] };
    const R = (n) => readSheet(sheets, n, rep);
    const metaRows = R("Meta"), sysRows = R("Sistemi"), refRows = R("Referenti"), procRows = R("Processi"), spRows = R("SottoProcessi"),
      flowRows = R("Flussi"), entRows = R("Entita"), opRows = R("OpenPoint"), glRows = R("Glossario"), ruleRows = R("Regole");
    const meta = Object.create(null);
    for (const r of metaRows) {
      if (!r.Chiave || Object.hasOwn(meta, r.Chiave)) rep.errors.push(`Meta!${r._row}: chiave mancante o duplicata`);
      meta[r.Chiave] = r.Valore;
    }
    for (const k of ["project", "domain", "model_version"]) if (!meta[k]) rep.errors.push(`Meta!0: chiave '${k}' mancante`);

    const systems = Object.create(null);
    for (const r of sysRows) {
      const code = r.Codice;
      if (!/^[A-Z][A-Z0-9_]*$/.test(code)) rep.errors.push(`Sistemi!${r._row}: Codice '${code}' deve essere MAIUSCOLO_CON_UNDERSCORE`);
      if (systems[code]) rep.errors.push(`Sistemi!${r._row}: Codice duplicato ${code}`);
      const s = { label: r.Nome, role: r.Ruolo, kind: r.Tipo, adoption: r.Adozione || "full", scope: r.Perimetro || "in" };
      if (r["Nota adozione"]) s.adoption_note = r["Nota adozione"];
      if (r.Accesso) s.access = r.Accesso;
      if (r["Deck di riferimento"]) s.external_deck = r["Deck di riferimento"];
      if (!r.Nome) rep.errors.push(`Sistemi!${r._row}: ${code}: Nome mancante`);
      systems[code] = s;
    }
    const owners = Object.create(null);
    for (const r of refRows) {
      if (!r.Chiave) rep.errors.push(`Referenti!${r._row}: Chiave mancante`);
      if (Object.hasOwn(owners, r.Chiave)) rep.errors.push(`Referenti!${r._row}: chiave duplicata ${r.Chiave}`);
      if (!r.Responsabile) rep.warnings.push(`Referenti!${r._row}: ${r.Chiave}: Responsabile mancante: i sotto-processi di quest'area risulteranno senza Data Owner`);
      owners[r.Chiave] = { area: r.Area, responsible: r.Responsabile, operatives: splitList(r.Operativi) };
    }
    const open_points = [], opIds = new Set();
    for (const r of opRows) {
      if (!r.ID.startsWith("OP-")) rep.errors.push(`OpenPoint!${r._row}: ID '${r.ID}' deve iniziare con OP-`);
      if (opIds.has(r.ID)) rep.errors.push(`OpenPoint!${r._row}: ID duplicato ${r.ID}`);
      opIds.add(r.ID);
      open_points.push({ id: r.ID, title: r.Titolo, detail: r.Dettaglio, owner: r.Owner, status: r.Stato || "open", next_step: r["Next step"] });
    }
    const glossary = [], canon = new Set();
    for (const r of glRows) {
      if (!r.Canonico || canon.has(r.Canonico)) rep.errors.push(`Glossario!${r._row}: termine mancante o duplicato`);
      canon.add(r.Canonico);
      const aliases = [];
      for (const [term, sysc] of splitPairs(r.Alias, "@")) {
        if (sysc && !systems[sysc]) rep.errors.push(`Glossario!${r._row}: alias '${term}' riferisce il sistema '${sysc}' non censito`);
        aliases.push({ term, system: sysc });
      }
      glossary.push({ canonical: r.Canonico, aliases, status: r.Stato || "provisional" });
    }
    const flowsBySp = Object.create(null), entsBySp = Object.create(null);
    for (const r of flowRows) {
      for (const s of [r.Da, r.A]) if (!systems[s]) rep.errors.push(`Flussi!${r._row}: sistema '${s}' non censito nel foglio Sistemi`);
      if (!r.Payload) rep.warnings.push(`Flussi!${r._row}: ${r.SottoProcesso} ${r.Da}→${r.A}: Payload vuoto (la policy lo segnalerà come DG-MAP-002)`);
      (flowsBySp[r.SottoProcesso] ||= []).push({ from: r.Da, to: r.A, payload: r.Payload });
    }
    for (const r of entRows) {
      const d = (entsBySp[r.SottoProcesso] ||= { in: [], out: [] });
      if (r.Direzione === "IN") d.in.push({ name: r.Nome, source: r.Sistema });
      else {
        const e = { name: r.Nome, system: r.Sistema };
        if (r.Sistema && !systems[r.Sistema]) rep.errors.push(`Entita!${r._row}: entità '${r.Nome}': sistema '${r.Sistema}' non censito`);
        if (r.Canonico) { if (!canon.has(r.Canonico)) rep.errors.push(`Entita!${r._row}: termine canonico '${r.Canonico}' non presente nel Glossario`); e.canonical = r.Canonico; }
        d.out.push(e);
      }
    }
    const procs = Object.create(null), spSeen = new Set();
    for (const r of procRows) {
      if (!r.ID || Object.hasOwn(procs, r.ID)) rep.errors.push(`Processi!${r._row}: ID mancante o duplicato`);
      if (!owners[r.Area]) rep.errors.push(`Processi!${r._row}: ${r.ID}: Area '${r.Area}' non presente in Referenti`);
      for (const s of splitList(r.Sistemi)) if (!systems[s]) rep.errors.push(`Processi!${r._row}: ${r.ID}: sistema '${s}' non censito`);
      const p = { id: r.ID, name: r.Nome, subtitle: r.Sottotitolo, area: r.Area, systems: splitList(r.Sistemi), verified: toBool(r.Verificato), subprocesses: [] };
      if (toBool(r.Esterno)) p.external = true;
      procs[r.ID] = p;
    }
    for (const r of spRows) {
      const sid = r.ID;
      if (!sid) rep.errors.push(`SottoProcessi!${r._row}: ID mancante`);
      if (spSeen.has(sid)) rep.errors.push(`SottoProcessi!${r._row}: ID duplicato ${sid}`);
      spSeen.add(sid);
      if (!procs[r.Processo]) { rep.errors.push(`SottoProcessi!${r._row}: ${sid}: Processo '${r.Processo}' non presente nel foglio Processi`); continue; }
      const spSystems = splitList(r.Sistemi);
      for (const s of spSystems) if (!systems[s]) rep.errors.push(`SottoProcessi!${r._row}: ${sid}: sistema '${s}' non censito`);
      const master = [];
      for (const [sysc, role] of splitPairs(r.Master)) { if (!systems[sysc]) rep.errors.push(`SottoProcessi!${r._row}: ${sid}: master '${sysc}' non censito`); master.push({ system: sysc, role }); }
      if (!master.length) rep.warnings.push(`SottoProcessi!${r._row}: ${sid}: nessun master candidato (la policy lo segnalerà come DG-OWN-001)`);
      if (r["Data Owner"] && !owners[r["Data Owner"]]) rep.errors.push(`SottoProcessi!${r._row}: ${sid}: Data Owner '${r["Data Owner"]}' non presente in Referenti`);
      if (!r["Data Owner"]) rep.warnings.push(`SottoProcessi!${r._row}: ${sid}: Data Owner vuoto (la policy lo segnalerà come DG-OWN-002)`);
      const ops = splitList(r["Open point"]);
      for (const o of ops) if (!opIds.has(o)) rep.errors.push(`SottoProcessi!${r._row}: ${sid}: open point '${o}' non presente nel foglio OpenPoint`);
      const ents = entsBySp[sid] || { in: [], out: [] };
      if (r.Tipo === "C" && !ents.out.length) rep.warnings.push(`SottoProcessi!${r._row}: ${sid}: tipo [C] senza entità OUT nel foglio Entita`);
      const sp = { id: sid, name: r.Nome, systems: spSystems, flows: flowsBySp[sid] || [], type: r.Tipo, trigger: r.Trigger, entities_in: ents.in, entities_out: ents.out, master,
        data_owner: r["Data Owner"], criticality: { open: toBool(r["Criticità aperta"]), text: r["Criticità"] }, open_points: ops,
        extra_system_steps: splitPairs(r["Step extra-sistema"]).map(([n, v]) => ({ name: n, approved: toBool(v) })), verified: toBool(r.Verificato) };
      if (r.Volumi) sp.volumes = r.Volumi;
      if (r.Controlli) sp.controls = r.Controlli.split("|").map((x) => x.trim()).filter(Boolean);
      if (r["Regole business"]) sp.rules = r["Regole business"].split("|").map((x) => x.trim()).filter(Boolean);
      procs[r.Processo].subprocesses.push(sp);
    }
    for (const sid of [...Object.keys(flowsBySp), ...Object.keys(entsBySp)]) if (!spSeen.has(sid)) rep.errors.push(`Flussi/Entita!0: righe riferite al sotto-processo '${sid}' che non esiste`);
    const rules = Object.create(null);
    for (const r of ruleRows) {
      if (!r.Codice.startsWith("DG-")) rep.errors.push(`Regole!${r._row}: Codice '${r.Codice}' deve iniziare con DG-`);
      if (Object.hasOwn(rules, r.Codice)) rep.errors.push(`Regole!${r._row}: codice duplicato ${r.Codice}`);
      rules[r.Codice] = { severity: r["Severità"] || "WARNING", enforcement: r.Enforcement || "advise", category: r.Categoria, title: r.Titolo, enabled: toBool(r.Attiva || "SI") };
    }
    const model = { meta, systems, owners, glossary, open_points, processes: Object.values(procs) };
    if (Object.keys(FG.GRAPH_SHEETS).some(n=>Object.hasOwn(sheets,n))) {
      const graphRows=Object.fromEntries(Object.keys(FG.GRAPH_SHEETS).map(n=>[n,R(n)]));
      const graphReport=FG.applyGraphRows(model,graphRows);
      rep.errors.push(...graphReport.errors);rep.warnings.push(...graphReport.warnings);
    }
    return { model, rules, errors: rep.errors, warnings: rep.warnings };
  }

  // ----------------------------------------------------------- export -------
  function modelToSheets(model, rules) {
    const S = {};
    const put = (name, rows) => { S[name] = [[COLUMN_HELP[name] || ""], SHEETS[name], ...rows.map((r) => SHEETS[name].map((c) => r[c] ?? ""))]; };
    put("Meta", Object.entries(model.meta).map(([k, v]) => ({ Chiave: k, Valore: v })));
    put("Sistemi", Object.entries(model.systems).map(([k, s]) => ({ Codice: k, Nome: s.label, Ruolo: s.role || "", Tipo: s.kind || "", Adozione: s.adoption || "", "Nota adozione": s.adoption_note || "", Perimetro: s.scope || "", Accesso: s.access || "", "Deck di riferimento": s.external_deck || "" })));
    put("Referenti", Object.entries(model.owners).map(([k, o]) => ({ Chiave: k, Area: o.area, Responsabile: o.responsible, Operativi: joinList(o.operatives || []) })));
    put("Processi", model.processes.map((p) => ({ ID: p.id, Nome: p.name, Sottotitolo: p.subtitle || "", Area: p.area, Sistemi: joinList(p.systems), Verificato: fromBool(p.verified), Esterno: fromBool(p.external) })));
    const sp = [], fl = [], en = [];
    for (const p of model.processes) for (const s of p.subprocesses) {
      const crit = s.criticality || {};
      sp.push({ ID: s.id, Processo: p.id, Nome: s.name, Tipo: s.type || "", Sistemi: joinList(s.systems), Trigger: s.trigger || "", Master: joinPairs((s.master || []).map((m) => [m.system, m.role || ""])),
        "Data Owner": s.data_owner || "", "Criticità aperta": fromBool(crit.open), "Criticità": crit.text || "", "Open point": joinList(s.open_points || []), Verificato: fromBool(s.verified ?? p.verified),
        Volumi: s.volumes || "", Controlli: (s.controls || []).join(" | "), "Regole business": (s.rules || []).join(" | "), "Step extra-sistema": joinPairs((s.extra_system_steps || []).map((x) => [x.name, fromBool(x.approved)])) });
      for (const f of s.flows || []) fl.push({ SottoProcesso: s.id, Da: f.from, A: f.to, Payload: f.payload || "" });
      for (const e of s.entities_in || []) en.push({ SottoProcesso: s.id, Direzione: "IN", Nome: e.name, Sistema: e.source || "", Canonico: "" });
      for (const e of s.entities_out || []) en.push({ SottoProcesso: s.id, Direzione: "OUT", Nome: e.name, Sistema: e.system || "", Canonico: e.canonical || "" });
    }
    put("SottoProcessi", sp); put("Flussi", fl); put("Entita", en);
    put("OpenPoint", (model.open_points || []).map((o) => ({ ID: o.id, Titolo: o.title, Dettaglio: o.detail || "", Owner: o.owner, Stato: o.status, "Next step": o.next_step || "" })));
    put("Glossario", (model.glossary || []).map((g) => ({ Canonico: g.canonical, Stato: g.status, Alias: g.aliases.map((a) => `${a.term}@${a.system}`).join("; ") })));
    put("Regole", Object.entries(rules || {}).map(([c, r]) => ({ Codice: c, Titolo: r.title, Categoria: r.category, "Severità": r.severity, Enforcement: r.enforcement, Attiva: fromBool(r.enabled !== false) })));
    const graphRows=FG.graphRows(model);
    if(graphRows.Schemi.length)for(const [name,rows] of Object.entries(graphRows))put(name,rows);
    return S;
  }

  // ------------------------------------------------------------ facts -------
  function buildFacts(model) {
    const ops = Object.create(null); for (const o of model.open_points || []) ops[o.id] = o;
    const facts = Object.create(null);
    for (const p of model.processes) for (const sp of p.subprocesses) {
      const ok = sp.data_owner || "";
      const owner = ok && model.owners[ok] ? { ...model.owners[ok], key: ok } : "";
      facts[sp.id] = { node: { id: sp.id, process: p.id, process_name: p.name, name: sp.name, type: sp.type || "", systems: sp.systems || [], flows: sp.flows || [], trigger: sp.trigger || "",
        entities_in: sp.entities_in || [], entities_out: sp.entities_out || [], master: sp.master || [], data_owner: owner, criticality: sp.criticality || { open: false, text: "" },
        open_points: (sp.open_points || []).map((i) => ops[i]).filter(Boolean), extra_system_steps: sp.extra_system_steps || [], verified: sp.verified ?? p.verified ?? false,
        controls: sp.controls || [], rules: sp.rules || [], volumes: sp.volumes || "" } };
    }
    return facts;
  }

  // -------------------------------------------------------------- uml -------
  const STATUS_IT = { not_evaluated: "Non valutato", approved: "Pronto (policy)", pending_open_point: "In attesa", ownership_review: "Revisione ownership", semantic_review: "Revisione semantica", mapping_review: "Revisione mapping", blocked: "Bloccato" };
  const RGB = { not_evaluated: [26, 44, 64], approved: [18, 53, 47], pending_open_point: [54, 46, 34], ownership_review: [58, 34, 44], semantic_review: [37, 43, 69], mapping_review: [58, 34, 44], blocked: [58, 34, 44] };
  const HEX = Object.fromEntries(Object.entries(RGB).map(([k, [r, g, b]]) => [k, "#" + [r, g, b].map((x) => x.toString(16).padStart(2, "0")).join("")]));
  const STROKE = { not_evaluated: "#8fa6bb", approved: "#8cdebe", pending_open_point: "#f1c177", ownership_review: "#f59fa5", semantic_review: "#b5c1ff", mapping_review: "#f59fa5", blocked: "#f59fa5" };
  const HUMAN = { manuale: "Utente", cantiere: "Cantiere", fornitore: "Fornitore", bidding: "Bidding" };
  const mm = (s) => String(s).replace(/&/g, "#38;").replace(/</g, "#60;").replace(/>/g, "#62;").replace(/[\r\n]+/g, " ").replace(/"/g, "#quot;").replace(/\(/g, "#40;").replace(/\)/g, "#41;").replace(/:/g, "#58;");
  const seqLabel = (s) => String(s).replace(/:/g, "-").replace(/;/g, ",");
  const lbl = (systems, k) => (systems[k] ? systems[k].label : k);
  // Stable injective identifiers: punctuation and nonnumeric model IDs never collide.
  const diagramId = (value, prefix = "N") => prefix + Array.from(String(value ?? "")).map(c => c.codePointAt(0).toString(16)).join("_");
  const mainOf = (sp) => (sp.master?.[0]?.system || sp.systems?.[0] || "UNASSIGNED");
  const wrapLabel = (text, width = 38) => {
    const lines = []; let line = "";
    for (const word of String(text ?? "").split(/\s+/)) {
      if (line && line.length + word.length + 1 > width) { lines.push(mm(line)); line = ""; }
      line += (line ? " " : "") + word;
    }
    if (line) lines.push(mm(line));
    return lines.join("<br/>");
  };

  function participants(proc) {
    const seen = new Map(), humans = new Map();
    for (const sp of proc.subprocesses) {
      for (const s of sp.systems || []) seen.set(s, true);
      seen.set(mainOf(sp), true);
      for (const f of sp.flows || []) { seen.set(f.from, true); seen.set(f.to, true); }
    }
    for (const sp of proc.subprocesses) for (const e of sp.entities_in || []) if (HUMAN[e.source]) humans.set(e.source, HUMAN[e.source]);
    return [[...seen.keys()], humans];
  }
  const statusOf = (decisions, id) => Object.hasOwn(RGB, decisions?.[id]?.status) ? decisions[id].status : "not_evaluated";

  function sequenceMermaid(proc, systems, decisions) {
    const [syss, humans] = participants(proc);
    const L = ["%%{init: {'theme':'neutral'}}%%", "sequenceDiagram", "  autonumber"];
    for (const [k, name] of humans) L.push(`  actor H_${k} as ${name}`);
    for (const s of syss) L.push(`  participant ${s} as ${seqLabel(lbl(systems, s))}`);
    for (const sp of proc.subprocesses) {
      const st = statusOf(decisions, sp.id); const [r, g, b] = RGB[st];
      L.push(`  rect rgb(${r}, ${g}, ${b})`);
      L.push(`  Note over ${syss[0]},${syss[syss.length - 1]}: ${seqLabel(sp.id + " " + sp.name)}: ${STATUS_IT[st]}`);
      const main = mainOf(sp);
      for (const e of sp.entities_in || []) if (humans.has(e.source)) L.push(`  H_${e.source}->>${main}: ${seqLabel(e.name)}`);
      for (const f of sp.flows || []) L.push(`  ${f.from}->>${f.to}: ${seqLabel(f.payload || "")}`);
      if (!(sp.flows || []).length) { const outs = (sp.entities_out || []).slice(0, 2).map((e) => e.name).join("; ") || sp.name; L.push(`  ${main}->>${main}: ${seqLabel(outs).slice(0, 70)}`); }
      L.push("  end");
    }
    return L.join("\n");
  }
  function sequencePlantUML(proc, systems, decisions) {
    const [syss, humans] = participants(proc);
    const L = ["@startuml", "skinparam shadowing false", "skinparam sequenceMessageAlign center", `title ${proc.id} · ${proc.name}`];
    for (const [k, name] of humans) L.push(`actor "${name}" as H_${k}`);
    for (const s of syss) L.push(`participant "${lbl(systems, s)}" as ${s}`);
    for (const sp of proc.subprocesses) {
      const st = statusOf(decisions, sp.id); const main = mainOf(sp);
      L.push(`group ${HEX[st]} ${sp.id} ${sp.name} [${STATUS_IT[st]}]`);
      for (const e of sp.entities_in || []) if (humans.has(e.source)) L.push(`H_${e.source} -> ${main}: ${e.name}`);
      for (const f of sp.flows || []) L.push(`${f.from} -> ${f.to}: ${f.payload || ""}`);
      if (!(sp.flows || []).length) { const outs = (sp.entities_out || []).slice(0, 2).map((e) => e.name).join("; ") || sp.name; L.push(`${main} -> ${main}: ${outs.slice(0, 70)}`); }
      L.push("end");
    }
    L.push("@enduml");
    return L.join("\n");
  }
  function swimlaneMermaid(proc, systems, decisions) {
    const lanes = new Map();
    for (const sp of proc.subprocesses) { const m = mainOf(sp); if (!lanes.has(m)) lanes.set(m, []); lanes.get(m).push(sp); }
    const L = ["%%{init: {'theme':'neutral','flowchart':{'curve':'linear','nodeSpacing':40,'rankSpacing':64}}}%%", "flowchart LR"];
    for (const [s, sps] of lanes) {
      L.push(`  subgraph L_${s}["${mm(lbl(systems, s))}"]`, "    direction TB");
      for (const sp of sps) {
        const nid = diagramId(sp.id); const st = statusOf(decisions, sp.id);
        const outs = (sp.entities_out || []).map((e) => wrapLabel(e.name)).join("<br/>");
        L.push(`    ${nid}["<b>${wrapLabel(sp.id + " · " + sp.name)}</b><br/>${STATUS_IT[st]}${outs ? "<br/><small>" + outs + "</small>" : ""}"]:::${st}`);
      }
      L.push("  end");
    }
    let prev = null;
    for (const sp of proc.subprocesses) { const nid = diagramId(sp.id); if (prev) L.push(`  ${prev} --> ${nid}`); prev = nid; }
    const laneKeys = new Set(lanes.keys()); const extDeclared = new Set();
    for (const sp of proc.subprocesses) {
      const nid = diagramId(sp.id); const main = mainOf(sp);
      for (const f of sp.flows || []) {
        const other = f.to === main ? f.from : f.from === main ? f.to : null;
        if (!other) {
          for (const endpoint of [f.from, f.to]) if (!laneKeys.has(endpoint) && !extDeclared.has(endpoint)) { L.push(`  X_${endpoint}(["${mm(lbl(systems, endpoint))}"]):::ext`); extDeclared.add(endpoint); }
          const from = laneKeys.has(f.from) ? `L_${f.from}` : `X_${f.from}`, to = laneKeys.has(f.to) ? `L_${f.to}` : `X_${f.to}`;
          L.push(`  ${from} -. "${wrapLabel(sp.id + ": " + (f.payload || ""))}" .-> ${to}`);
          continue;
        }
        let tgt;
        if (laneKeys.has(other)) tgt = `L_${other}`;
        else { if (!extDeclared.has(other)) { L.push(`  X_${other}(["${mm(lbl(systems, other))}"]):::ext`); extDeclared.add(other); } tgt = `X_${other}`; }
        const pl = wrapLabel(f.payload || "");
        L.push(f.from === main ? `  ${nid} -. "${pl}" .-> ${tgt}` : `  ${tgt} -. "${pl}" .-> ${nid}`);
      }
    }
    for (const st of Object.keys(STROKE)) L.push(`  classDef ${st} fill:${HEX[st]},stroke:${STROKE[st]},stroke-width:2px,color:#e7f1fa;`);
    L.push("  classDef ext fill:#1a2c40,stroke:#8fa6bb,stroke-dasharray:4 3,color:#aabfd2;");
    return L.join("\n");
  }
  function classMermaid(model) {
    const systems = model.systems; const L = ["%%{init: {'theme':'neutral'}}%%", "classDiagram"];
    const residence = Object.create(null), idOf = (c) => diagramId(c, "C"), systemId = (s) => diagramId(s, "S");
    for (const p of model.processes) for (const sp of p.subprocesses) for (const e of sp.entities_out || []) if (e.canonical) (residence[e.canonical] ||= new Set()).add(e.system);
    for (const g of model.glossary || []) {
      L.push(`  class ${idOf(g.canonical)}["${mm(g.canonical)}"] {`, `    <<${g.status}>>`);
      for (const a of g.aliases) L.push(`    +${a.term} : ${lbl(systems, a.system)}`);
      L.push("  }");
    }
    const allSys = [...new Set(Object.values(residence).flatMap((s) => [...s]))].sort();
    for (const s of allSys) L.push(`  class ${systemId(s)}["${mm(lbl(systems, s))}"] {\n    <<sistema>>\n  }`);
    for (const [c, syss] of Object.entries(residence)) for (const s of [...syss].sort()) L.push(`  ${idOf(c)} --> ${systemId(s)} : risiede in`);
    for (const p of model.processes) for (const sp of p.subprocesses) {
      const cs = [...new Set((sp.entities_out || []).map((e) => e.canonical).filter(Boolean))].sort();
      const ins = [...new Set((sp.entities_in || []).map((e) => e.canonical).filter(Boolean))].sort();
      for (const a of ins) for (const b of cs) if (a !== b) L.push(`  ${idOf(a)} ..> ${idOf(b)} : ${sp.id}`);
    }
    return L.join("\n");
  }

  // ------------------------------------------------------------- yaml -------
  // Emettitore YAML compatibile con PyYAML safe_dump(sort_keys=False, allow_unicode=True, width=∞):
  // stesse regole di quoting, sequenze "indentless", così il file generato nel browser coincide
  // byte per byte con quello della pipeline (verificato da tools/parity_census.mjs).
  const RE_INT = /^[-+]?(0|[1-9][0-9_]*)$|^0o?[0-7_]+$|^0x[0-9a-fA-F_]+$|^0b[01_]+$|^[-+]?[0-9][0-9_]*(:[0-5]?[0-9])+$/;
  const RE_FLOAT = /^[-+]?(\.[0-9]+|[0-9][0-9_]*(\.[0-9_]*)?)([eE][-+]?[0-9]+)?$|^[-+]?[0-9][0-9_]*(:[0-5]?[0-9])+\.[0-9_]*$|^[-+]?\.(inf|Inf|INF)$|^\.(nan|NaN|NAN)$/;
  const RE_BOOL = /^(yes|Yes|YES|no|No|NO|true|True|TRUE|false|False|FALSE|on|On|ON|off|Off|OFF)$/;
  const RE_NULL = /^(null|Null|NULL|~|)$/;
  const RE_TS = /^[0-9]{4}-[0-9]{2}-[0-9]{2}$|^[0-9]{4}-[0-9]{1,2}-[0-9]{1,2}([Tt]|[ \t]+)[0-9]{1,2}:[0-9]{2}:[0-9]{2}(\.[0-9]*)?(([ \t]*)Z|[-+][0-9]{1,2}(:[0-9]{2})?)?$/;
  function yamlScalar(v) {
    if (v === null || v === undefined) return "null";
    if (typeof v === "boolean") return v ? "true" : "false";
    if (typeof v === "number") {
      if (v !== 0 && Math.abs(v) < 0.0001) {
        const [mantissa, exponent] = v.toExponential().split("e");
        return (mantissa.includes(".") ? mantissa : mantissa + ".0") + "e" + (Number(exponent) < 0 ? "-" : "+") + String(Math.abs(Number(exponent))).padStart(2,"0");
      }
      return String(v);
    }
    const s = String(v);
    if (s === "") return "''";
    // analisi "plain allowed" secondo PyYAML (contesto block)
    let plain = true, special = false;
    if (/^[-?:,\[\]{}#&*!|>'"%@`]/.test(s)) {
      // '-' '?' ':' sono indicatori solo se seguiti da spazio o fine
      const c = s[0];
      if (!("-?:".includes(c)) || s.length === 1 || /\s/.test(s[1])) plain = false;
    }
    if (/: |\s#|:$/.test(s) || /^\s|\s$/.test(s) || /[\n\r\u0085]/.test(s) || s.includes("\u2028") || s.includes("\u2029")) plain = false;
    if (/^---|^\.\.\./.test(s)) plain = false;
    for (const ch of s) { const code = ch.codePointAt(0); if (!(ch === "\n" || ch === "\t" || (code >= 0x20 && code <= 0x7e) || code === 0x85 || (code >= 0xa0 && code <= 0xd7ff) || (code >= 0xe000 && code <= 0xfffd) || code > 0xffff)) special = true; }
    if (RE_INT.test(s) || RE_FLOAT.test(s) || RE_BOOL.test(s) || RE_NULL.test(s) || RE_TS.test(s)) plain = false;
    if (plain) return s;
    if (!special && !/[\n\r]/.test(s)) return "'" + s.replace(/'/g, "''") + "'";
    return JSON.stringify(s);
  }
  function toYaml(value, indent = 0) {
    const pad = " ".repeat(indent);
    if (Array.isArray(value)) {
      if (!value.length) return "[]";
      return value.map((item) => {
        if (item && typeof item === "object" && !Array.isArray(item)) {
          const keys = Object.keys(item); if (!keys.length) return pad + "- {}";
          const first = keys[0]; const lines = [];
          lines.push(pad + "- " + yamlEntry(first, item[first], indent + 2).trimStart());
          for (const k of keys.slice(1)) lines.push(yamlEntry(k, item[k], indent + 2));
          return lines.join("\n");
        }
        if (Array.isArray(item)) return item.length ? pad + "-\n" + toYaml(item, indent + 2) : pad + "- []";
        return pad + "- " + yamlScalar(item);
      }).join("\n");
    }
    if (value && typeof value === "object") {
      const keys = Object.keys(value); if (!keys.length) return "{}";
      return keys.map((k) => yamlEntry(k, value[k], indent)).join("\n");
    }
    return yamlScalar(value);
  }
  function yamlEntry(k, v, indent) {
    const pad = " ".repeat(indent); const key = yamlScalar(k);
    if (Array.isArray(v)) return v.length ? `${pad}${key}:\n${toYaml(v, indent)}` : `${pad}${key}: []`;
    if (v && typeof v === "object") return Object.keys(v).length ? `${pad}${key}:\n${toYaml(v, indent + 2)}` : `${pad}${key}: {}`;
    return `${pad}${key}: ${yamlScalar(v)}`;
  }
  const modelToYaml = (model, sourceName) => `# GENERATO da tools/import_excel.py a partire da ${sourceName || "OntoGraph-Aurora21.xlsx"}\n# Non modificare a mano: aggiornare l'Excel di censimento e rilanciare l'import.\n` + toYaml(model) + "\n";
  const rulesToJson = (rules) => JSON.stringify(rules, null, 2) + "\n";

  function swimlanePlantUML(proc, systems, decisions) {
    const first = proc.subprocesses[0]; if (!first) return "@startuml\n@enduml";
    const L = ["@startuml", "skinparam shadowing false", `title ${proc.id} · ${proc.name}`, `|${lbl(systems, mainOf(first))}|`, "start"];
    for (const sp of proc.subprocesses) {
      const st = statusOf(decisions, sp.id);
      L.push(`|${lbl(systems, mainOf(sp))}|`);
      L.push(`${HEX[st]}:${sp.id} ${sp.name}\n${STATUS_IT[st]};`);
      for (const f of sp.flows || []) L.push(`note right: ${lbl(systems, f.from)} → ${lbl(systems, f.to)}: ${f.payload || ""}`);
    }
    L.push("stop", "@enduml");
    return L.join("\n");
  }

  // Tutto il codice generato dal censimento, come lo scrive la pipeline (percorso → contenuto)
  function generatedCode(model, rules, decisions, sourceName) {
    const files = { "model/landscape.yaml": modelToYaml(model, sourceName), "data/rules.json": rulesToJson(rules) };
    for (const p of model.processes) {
      files[`diagrams/uml/${p.id}_sequence.mmd`] = sequenceMermaid(p, model.systems, decisions);
      files[`diagrams/uml/${p.id}_sequence.puml`] = sequencePlantUML(p, model.systems, decisions);
      files[`diagrams/uml/${p.id}_swimlane.mmd`] = swimlaneMermaid(p, model.systems, decisions);
      files[`diagrams/uml/${p.id}_swimlane.puml`] = swimlanePlantUML(p, model.systems, decisions);
    }
    files["diagrams/uml/entities_class.mmd"] = classMermaid(model);
    Object.assign(files,FG.generatedFiles(model));
    return files;
  }

  return { SHEETS, ENUMS, parseWorkbook, modelToSheets, buildFacts, sequenceMermaid, sequencePlantUML, swimlaneMermaid, swimlanePlantUML, classMermaid, diagramId, STATUS_IT, splitList, joinList, toYaml, modelToYaml, rulesToJson, generatedCode };
});

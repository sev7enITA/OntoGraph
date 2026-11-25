// Keep legacy sheet and column names compatible with existing inventories.
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
    Sistemi: "One system per row. Other sheets reference the Codice identifier (UPPERCASE_WITH_UNDERSCORES).",
    Referenti: "Candidate data owners by area. Processi.Area and SottoProcessi.Data Owner use the Chiave identifier.",
    Processi: "One process per row (P1, P2, …). Separate systems with a semicolon.",
    SottoProcessi: "One process or entity mapping step per row. Master: CODE:role; … . Open point: OP-01; OP-02.",
    Flussi: "One flow per row, with its transferred entity or document.",
    Entita: "For inputs (IN), Sistema is the source. For outputs (OUT), Sistema is the host. Canonico names a term in Glossario.",
    OpenPoint: "Linked steps remain pending until these issues are closed.",
    Glossario: "Canonical terms. Aliases: term@SYSTEM; … (e.g., opportunity@CRM; dossier@DMS).",
    Regole: "Policy catalog. Set severity and maximum enforcement here. Attiva=NO disables the rule.",
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
    if (!rows) { rep.errors.push(`${name}!0: missing sheet`); return []; }
    const header = (rows[1] || []).map(str);
    const expected = SHEETS[name];
    const missing = expected.filter((c) => !header.includes(c));
    if (new Set(header.filter(Boolean)).size !== header.filter(Boolean).length) { rep.errors.push(`${name}!2: duplicate headers`); return []; }
    if (missing.length) { rep.errors.push(`${name}!2: missing columns: ${missing.join(", ")}`); return []; }
    const out = [];
    for (let i = 2; i < rows.length; i++) {
      const r = rows[i] || [];
      const rec = Object.create(null); header.forEach((h, j) => { if (h) rec[h] = FG.GRAPH_SHEETS[name] && ["Etichetta","Descrizione","Condizione"].includes(h) ? String(r[j] ?? "") : str(r[j]); });
      if (!expected.some((c) => rec[c])) continue;
      rec._row = i + 1;
      for (const c of expected) {
        const en = ENUMS[`${name}.${c}`];
        if (en && rec[c] && !en.includes(rec[c])) rep.errors.push(`${name}!${i + 1}: ${c}='${rec[c]}' is invalid (allowed values: ${en.join(", ")})`);
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
      if (!r.Chiave || Object.hasOwn(meta, r.Chiave)) rep.errors.push(`Meta!${r._row}: missing or duplicate key`);
      meta[r.Chiave] = r.Valore;
    }
    for (const k of ["project", "domain", "model_version"]) if (!meta[k]) rep.errors.push(`Meta!0: missing key '${k}'`);

    const systems = Object.create(null);
    for (const r of sysRows) {
      const code = r.Codice;
      if (!/^[A-Z][A-Z0-9_]*$/.test(code)) rep.errors.push(`Sistemi!${r._row}: code '${code}' must be UPPERCASE_WITH_UNDERSCORES`);
      if (systems[code]) rep.errors.push(`Sistemi!${r._row}: duplicate code ${code}`);
      const s = { label: r.Nome, role: r.Ruolo, kind: r.Tipo, adoption: r.Adozione || "full", scope: r.Perimetro || "in" };
      if (r["Nota adozione"]) s.adoption_note = r["Nota adozione"];
      if (r.Accesso) s.access = r.Accesso;
      if (r["Deck di riferimento"]) s.external_deck = r["Deck di riferimento"];
      if (!r.Nome) rep.errors.push(`Sistemi!${r._row}: ${code}: missing name`);
      systems[code] = s;
    }
    const owners = Object.create(null);
    for (const r of refRows) {
      if (!r.Chiave) rep.errors.push(`Referenti!${r._row}: missing key`);
      if (Object.hasOwn(owners, r.Chiave)) rep.errors.push(`Referenti!${r._row}: duplicate key ${r.Chiave}`);
      if (!r.Responsabile) rep.warnings.push(`Referenti!${r._row}: ${r.Chiave}: responsible person missing. Steps in this area have no data owner.`);
      owners[r.Chiave] = { area: r.Area, responsible: r.Responsabile, operatives: splitList(r.Operativi) };
    }
    const open_points = [], opIds = new Set();
    for (const r of opRows) {
      if (!r.ID.startsWith("OP-")) rep.errors.push(`OpenPoint!${r._row}: ID '${r.ID}' must start with OP-`);
      if (opIds.has(r.ID)) rep.errors.push(`OpenPoint!${r._row}: duplicate ID ${r.ID}`);
      opIds.add(r.ID);
      open_points.push({ id: r.ID, title: r.Titolo, detail: r.Dettaglio, owner: r.Owner, status: r.Stato || "open", next_step: r["Next step"] });
    }
    const glossary = [], canon = new Set();
    for (const r of glRows) {
      if (!r.Canonico || canon.has(r.Canonico)) rep.errors.push(`Glossario!${r._row}: missing or duplicate term`);
      canon.add(r.Canonico);
      const aliases = [];
      for (const [term, sysc] of splitPairs(r.Alias, "@")) {
        if (sysc && !systems[sysc]) rep.errors.push(`Glossario!${r._row}: alias '${term}' references system '${sysc}' has no inventory entry`);
        aliases.push({ term, system: sysc });
      }
      glossary.push({ canonical: r.Canonico, aliases, status: r.Stato || "provisional" });
    }
    const flowsBySp = Object.create(null), entsBySp = Object.create(null);
    for (const r of flowRows) {
      for (const s of [r.Da, r.A]) if (!systems[s]) rep.errors.push(`Flussi!${r._row}: system '${s}' is missing from Sistemi`);
      if (!r.Payload) rep.warnings.push(`Flussi!${r._row}: ${r.SottoProcesso} ${r.Da}→${r.A}: empty payload (policy DG-MAP-002)`);
      (flowsBySp[r.SottoProcesso] ||= []).push({ from: r.Da, to: r.A, payload: r.Payload });
    }
    for (const r of entRows) {
      const d = (entsBySp[r.SottoProcesso] ||= { in: [], out: [] });
      if (r.Direzione === "IN") d.in.push({ name: r.Nome, source: r.Sistema });
      else {
        const e = { name: r.Nome, system: r.Sistema };
        if (r.Sistema && !systems[r.Sistema]) rep.errors.push(`Entita!${r._row}: entity '${r.Nome}': system '${r.Sistema}' has no inventory entry`);
        if (r.Canonico) { if (!canon.has(r.Canonico)) rep.errors.push(`Entita!${r._row}: canonical term '${r.Canonico}' is missing from Glossario`); e.canonical = r.Canonico; }
        d.out.push(e);
      }
    }
    const procs = Object.create(null), spSeen = new Set();
    for (const r of procRows) {
      if (!r.ID || Object.hasOwn(procs, r.ID)) rep.errors.push(`Processi!${r._row}: missing or duplicate ID`);
      if (!owners[r.Area]) rep.errors.push(`Processi!${r._row}: ${r.ID}: area '${r.Area}' is missing from Referenti`);
      for (const s of splitList(r.Sistemi)) if (!systems[s]) rep.errors.push(`Processi!${r._row}: ${r.ID}: system '${s}' has no inventory entry`);
      const p = { id: r.ID, name: r.Nome, subtitle: r.Sottotitolo, area: r.Area, systems: splitList(r.Sistemi), verified: toBool(r.Verificato), subprocesses: [] };
      if (toBool(r.Esterno)) p.external = true;
      procs[r.ID] = p;
    }
    for (const r of spRows) {
      const sid = r.ID;
      if (!sid) rep.errors.push(`SottoProcessi!${r._row}: missing ID`);
      if (spSeen.has(sid)) rep.errors.push(`SottoProcessi!${r._row}: duplicate ID ${sid}`);
      spSeen.add(sid);
      if (!procs[r.Processo]) { rep.errors.push(`SottoProcessi!${r._row}: ${sid}: process '${r.Processo}' is missing from Processi`); continue; }
      const spSystems = splitList(r.Sistemi);
      for (const s of spSystems) if (!systems[s]) rep.errors.push(`SottoProcessi!${r._row}: ${sid}: system '${s}' has no inventory entry`);
      const master = [];
      for (const [sysc, role] of splitPairs(r.Master)) { if (!systems[sysc]) rep.errors.push(`SottoProcessi!${r._row}: ${sid}: lead system '${sysc}' has no inventory entry`); master.push({ system: sysc, role }); }
      if (!master.length) rep.warnings.push(`SottoProcessi!${r._row}: ${sid}: no lead system candidate (policy DG-OWN-001)`);
      if (r["Data Owner"] && !owners[r["Data Owner"]]) rep.errors.push(`SottoProcessi!${r._row}: ${sid}: Data Owner '${r["Data Owner"]}' is missing from Referenti`);
      if (!r["Data Owner"]) rep.warnings.push(`SottoProcessi!${r._row}: ${sid}: missing data owner (policy DG-OWN-002)`);
      const ops = splitList(r["Open point"]);
      for (const o of ops) if (!opIds.has(o)) rep.errors.push(`SottoProcessi!${r._row}: ${sid}: open point '${o}' is missing from OpenPoint`);
      const ents = entsBySp[sid] || { in: [], out: [] };
      if (r.Tipo === "C" && !ents.out.length) rep.warnings.push(`SottoProcessi!${r._row}: ${sid}: type [C] has no output entity in Entita`);
      const sp = { id: sid, name: r.Nome, systems: spSystems, flows: flowsBySp[sid] || [], type: r.Tipo, trigger: r.Trigger, entities_in: ents.in, entities_out: ents.out, master,
        data_owner: r["Data Owner"], criticality: { open: toBool(r["Criticità aperta"]), text: r["Criticità"] }, open_points: ops,
        extra_system_steps: splitPairs(r["Step extra-sistema"]).map(([n, v]) => ({ name: n, approved: toBool(v) })), verified: toBool(r.Verificato) };
      if (r.Volumi) sp.volumes = r.Volumi;
      if (r.Controlli) sp.controls = r.Controlli.split("|").map((x) => x.trim()).filter(Boolean);
      if (r["Regole business"]) sp.rules = r["Regole business"].split("|").map((x) => x.trim()).filter(Boolean);
      procs[r.Processo].subprocesses.push(sp);
    }
    for (const sid of [...Object.keys(flowsBySp), ...Object.keys(entsBySp)]) if (!spSeen.has(sid)) rep.errors.push(`Flussi/Entita!0: rows reference unknown step '${sid}'`);
    const rules = Object.create(null);
    for (const r of ruleRows) {
      if (!r.Codice.startsWith("DG-")) rep.errors.push(`Regole!${r._row}: Codice '${r.Codice}' must start with DG-`);
      if (Object.hasOwn(rules, r.Codice)) rep.errors.push(`Regole!${r._row}: duplicate code ${r.Codice}`);
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
  const STATUS_LABELS = { not_evaluated: "Unevaluated", approved: "Ready (policy)", pending_open_point: "Pending", ownership_review: "Ownership review", semantic_review: "Semantic review", mapping_review: "Mapping review", blocked: "Blocked" };
  const RGB = { not_evaluated: [26, 44, 64], approved: [18, 53, 47], pending_open_point: [54, 46, 34], ownership_review: [58, 34, 44], semantic_review: [37, 43, 69], mapping_review: [58, 34, 44], blocked: [58, 34, 44] };
  const HEX = Object.fromEntries(Object.entries(RGB).map(([k, [r, g, b]]) => [k, "#" + [r, g, b].map((x) => x.toString(16).padStart(2, "0")).join("")]));
  const STROKE = { not_evaluated: "#8fa6bb", approved: "#8cdebe", pending_open_point: "#f1c177", ownership_review: "#f59fa5", semantic_review: "#b5c1ff", mapping_review: "#f59fa5", blocked: "#f59fa5" };
  const HUMAN = { manuale: "User", cantiere: "Worksite", fornitore: "Supplier", bidding: "Bidding" };
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
      L.push(`  Note over ${syss[0]},${syss[syss.length - 1]}: ${seqLabel(sp.id + " " + sp.name)}: ${STATUS_LABELS[st]}`);
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
      L.push(`group ${HEX[st]} ${sp.id} ${sp.name} [${STATUS_LABELS[st]}]`);
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
        L.push(`    ${nid}["<b>${wrapLabel(sp.id + " · " + sp.name)}</b><br/>${STATUS_LABELS[st]}${outs ? "<br/><small>" + outs + "</small>" : ""}"]:::${st}`);
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
    for (const s of allSys) L.push(`  class ${systemId(s)}["${mm(lbl(systems, s))}"] {\n    <<system>>\n  }`);
    for (const [c, syss] of Object.entries(residence)) for (const s of [...syss].sort()) L.push(`  ${idOf(c)} --> ${systemId(s)} : resides in`);
    for (const p of model.processes) for (const sp of p.subprocesses) {
      const cs = [...new Set((sp.entities_out || []).map((e) => e.canonical).filter(Boolean))].sort();
      const ins = [...new Set((sp.entities_in || []).map((e) => e.canonical).filter(Boolean))].sort();
      for (const a of ins) for (const b of cs) if (a !== b) L.push(`  ${idOf(a)} ..> ${idOf(b)} : ${sp.id}`);
    }
    return L.join("\n");
  }

  // ------------------------------------------------------------- yaml -------
  // Emit YAML with PyYAML-compatible quoting and indentation.
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
  const modelToYaml = (model, sourceName) => `# Generated from ${sourceName || "OntoGraph-Aurora21.xlsx"}\n# Edit the process inventory workbook and import it again to regenerate this model.\n` + toYaml(model) + "\n";
  const rulesToJson = (rules) => JSON.stringify(rules, null, 2) + "\n";

  function swimlanePlantUML(proc, systems, decisions) {
    const first = proc.subprocesses[0]; if (!first) return "@startuml\n@enduml";
    const L = ["@startuml", "skinparam shadowing false", `title ${proc.id} · ${proc.name}`, `|${lbl(systems, mainOf(first))}|`, "start"];
    for (const sp of proc.subprocesses) {
      const st = statusOf(decisions, sp.id);
      L.push(`|${lbl(systems, mainOf(sp))}|`);
      L.push(`${HEX[st]}:${sp.id} ${sp.name}\n${STATUS_LABELS[st]};`);
      for (const f of sp.flows || []) L.push(`note right: ${lbl(systems, f.from)} → ${lbl(systems, f.to)}: ${f.payload || ""}`);
    }
    L.push("stop", "@enduml");
    return L.join("\n");
  }

  // Generate model artifacts from the inventory, keyed by path.
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

  return { SHEETS, ENUMS, parseWorkbook, modelToSheets, buildFacts, sequenceMermaid, sequencePlantUML, swimlaneMermaid, swimlanePlantUML, classMermaid, diagramId, STATUS_LABELS, splitList, joinList, toYaml, modelToYaml, rulesToJson, generatedCode };
});

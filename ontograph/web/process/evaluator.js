/*
 * evaluator.js: mirror JavaScript di policies/landscape/decision.rego.
 *
 * Serve SOLO alla valutazione live nel browser (simulatore dell'artifact).
 * La fonte di verità resta Rego: tools/parity.mjs verifica in CI che, per ogni
 * nodo del modello, JS e OPA producano la stessa decisione (status, enforcement,
 * insiemi di codici). Se la parità fallisce, la pipeline fallisce.
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.DGPolicy = factory();
})(typeof self !== "undefined" ? self : this, function () {
  const LEVEL_RANK = { observe: 0, advise: 1, approve: 2, block: 3 };
  const nonEmpty = (v) =>
    (typeof v === "string" && v.trim() !== "") ||
    (v && typeof v === "object" && !Array.isArray(v) && Object.keys(v).length > 0);
  const get = (o, k, d) => (o && o[k] !== undefined && o[k] !== null ? o[k] : d);

  function evaluateNode(node, data) {
    const violations = [], warnings = [], actions = [];
    const systems = data.systems || {}, glossary = data.glossary || [], rules = data.rules || {};
    const master = get(node, "master", []);
    const flows = get(node, "flows", []);
    const outs = get(node, "entities_out", []);
    const nodeSystems = get(node, "systems", []);

    // ---- ownership
    if (master.length === 0)
      violations.push({ code: "DG-OWN-001", field: "node.master", message: "Nessun sistema master candidato identificato per il sotto-processo." });
    if (!nonEmpty(get(node, "data_owner", "")))
      violations.push({ code: "DG-OWN-002", field: "node.data_owner", message: "Data Owner (referente business) non attribuito." });
    if (master.length > 1) {
      const roles = new Set(master.map((m) => (get(m, "role", "") || "").trim()));
      if (roles.size < master.length)
        violations.push({ code: "DG-OWN-003", field: "node.master", message: `Più sistemi master (${master.map((m) => m.system).join(", ")}) senza ruolo distinto: ambiguità di ownership.` });
    }

    // ---- semantics
    if (node.type === "C" && outs.length === 0)
      violations.push({ code: "DG-SEM-001", field: "node.entities_out", message: "Sotto-processo di tipo [C] (crea/origina) senza alcuna entità in output." });
    for (const e of outs)
      if (!nonEmpty(get(e, "system", "")))
        violations.push({ code: "DG-SEM-002", field: `node.entities_out[${e.name}].system`, message: `L'entità '${e.name}' non dichiara il sistema in cui risiede.` });
    const canonicals = [...new Set(outs.map((e) => get(e, "canonical", "")).filter((c) => c !== ""))];
    for (const c of canonicals) {
      if (glossary.some((g) => g.canonical === c && g.status !== "approved"))
        warnings.push({ code: "DG-SEM-003", field: `glossary.${c}`, message: `Il termine canonico '${c}' è ancora provvisorio nel glossario.` });
      const sys = [...new Set(outs.filter((e) => get(e, "canonical", "") === c).map((e) => e.system))].sort();
      if (sys.length > 1)
        warnings.push({ code: "DG-SEM-004", field: `glossary.${c}`, message: `L'entità canonica '${c}' è replicata in più sistemi (${sys.join(", ")}): verificare unicità del nome canonico e regole di sincronizzazione.` });
    }

    // ---- mapping
    for (const f of flows) {
      for (const s of [f.from, f.to])
        if (!systems[s])
          violations.push({ code: "DG-MAP-001", field: "node.flows", message: `Il flusso ${f.from} → ${f.to} riferisce un sistema non presente nel catalogo.` });
      if (!nonEmpty(get(f, "payload", "")))
        violations.push({ code: "DG-MAP-002", field: "node.flows", message: `Il flusso ${f.from} → ${f.to} non dichiara l'entità o il payload trasferito.` });
    }
    for (const m of master)
      if (!nodeSystems.includes(m.system))
        violations.push({ code: "DG-MAP-003", field: "node.master", message: `Il sistema master '${m.system}' non compare tra i sistemi del sotto-processo.` });

    // ---- systems / scope
    for (const s of nodeSystems) {
      const sys = systems[s];
      if (!sys) continue;
      if (sys.adoption === "partial")
        warnings.push({ code: "DG-SYS-001", field: "node.systems", message: `Il sistema ${sys.label} ha adozione parziale (${get(sys, "adoption_note", "")}): il processo può seguire percorsi alternativi non mappati.` });
      if (sys.adoption === "implementing")
        warnings.push({ code: "DG-SYS-002", field: "node.systems", message: `Il sistema ${sys.label} è in implementazione: il mapping è provvisorio.` });
      if (sys.scope === "open")
        warnings.push({ code: "DG-SCOPE-001", field: "node.systems", message: `L'inclusione di ${sys.label} nel perimetro di analisi non è ancora decisa.` });
    }

    // ---- actions
    const ops = get(node, "open_points", []);
    for (const op of ops)
      if (op.status !== "closed")
        actions.push({ code: "DG-ACT-001", field: "node.open_points", action: `Chiudere il punto aperto ${op.id}: ${op.title} (owner: ${op.owner}).` });
    const crit = get(node, "criticality", {});
    if (get(crit, "open", false) === true && ops.length === 0)
      actions.push({ code: "DG-ACT-002", field: "node.criticality", action: `Tracciare come open point la criticità aperta: "${crit.text}"` });
    if (get(node, "verified", false) === false)
      actions.push({ code: "DG-ACT-003", field: "node.verified", action: "Validare il sotto-processo con il referente funzionale." });
    for (const step of get(node, "extra_system_steps", []))
      if (get(step, "approved", false) === false)
        actions.push({ code: "DG-ACT-004", field: "node.extra_system_steps", action: `Approvare o ricondurre a sistema lo step extra-sistema: ${step.name}.` });

    // ---- dedupe (Rego sets) + sort
    const uniq = (arr) => {
      const seen = new Set();
      return arr.filter((x) => { const k = JSON.stringify(x); if (seen.has(k)) return false; seen.add(k); return true; });
    };
    const enabled = (x) => get(rules[x.code] || {}, "enabled", true) !== false;
    const V = uniq(violations).filter(enabled), W = uniq(warnings).filter(enabled), A = uniq(actions).filter(enabled);
    const allow = V.length === 0 && A.length === 0;
    const has = (p) => V.some((v) => v.code.startsWith(p));
    let status;
    if (allow) status = "approved";
    else if (has("DG-OWN")) status = "ownership_review";
    else if (has("DG-SEM")) status = "semantic_review";
    else if (has("DG-MAP")) status = "mapping_review";
    else if (V.length === 0) status = "pending_open_point";
    else status = "blocked";
    const codes = new Set([...V, ...W, ...A].map((x) => x.code));
    let rank = 0;
    for (const c of codes) rank = Math.max(rank, LEVEL_RANK[get(rules[c] || {}, "enforcement", "observe")] ?? 0);
    const enforcement = codes.size === 0 ? "observe" : Object.keys(LEVEL_RANK).find((k) => LEVEL_RANK[k] === rank);
    return { node: node.id, process: node.process, allow, status, enforcement, violations: V, warnings: W, required_actions: A };
  }

  return { evaluateNode, LEVEL_RANK };
});

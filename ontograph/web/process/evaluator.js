// Deterministic policy evaluation for the local process modeler.
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
      violations.push({ code: "DG-OWN-001", field: "node.master", message: "No lead system candidate was identified for this step." });
    if (!nonEmpty(get(node, "data_owner", "")))
      violations.push({ code: "DG-OWN-002", field: "node.data_owner", message: "Assign a business data owner." });
    if (master.length > 1) {
      const roles = new Set(master.map((m) => (get(m, "role", "") || "").trim()));
      if (roles.size < master.length)
        violations.push({ code: "DG-OWN-003", field: "node.master", message: `Multiple lead systems (${master.map((m) => m.system).join(", ")}) have overlapping roles. Clarify ownership.` });
    }

    // ---- semantics
    if (node.type === "C" && outs.length === 0)
      violations.push({ code: "DG-SEM-001", field: "node.entities_out", message: "A create step [C] must declare an output entity." });
    for (const e of outs)
      if (!nonEmpty(get(e, "system", "")))
        violations.push({ code: "DG-SEM-002", field: `node.entities_out[${e.name}].system`, message: `Entity '${e.name}' has no recorded host system.` });
    const canonicals = [...new Set(outs.map((e) => get(e, "canonical", "")).filter((c) => c !== ""))];
    for (const c of canonicals) {
      if (glossary.some((g) => g.canonical === c && g.status !== "approved"))
        warnings.push({ code: "DG-SEM-003", field: `glossary.${c}`, message: `Canonical term '${c}' is still provisional in the glossary.` });
      const sys = [...new Set(outs.filter((e) => get(e, "canonical", "") === c).map((e) => e.system))].sort();
      if (sys.length > 1)
        warnings.push({ code: "DG-SEM-004", field: `glossary.${c}`, message: `Canonical entity '${c}' is replicated across systems (${sys.join(", ")}). Verify name uniqueness and synchronization rules.` });
    }

    // ---- mapping
    for (const f of flows) {
      for (const s of [f.from, f.to])
        if (!systems[s])
          violations.push({ code: "DG-MAP-001", field: "node.flows", message: `Flow ${f.from} → ${f.to} references a system absent from the catalog.` });
      if (!nonEmpty(get(f, "payload", "")))
        violations.push({ code: "DG-MAP-002", field: "node.flows", message: `Flow ${f.from} → ${f.to} has no recorded entity or transferred payload.` });
    }
    for (const m of master)
      if (!nodeSystems.includes(m.system))
        violations.push({ code: "DG-MAP-003", field: "node.master", message: `Lead system '${m.system}' is missing from the step's systems.` });

    // ---- systems / scope
    for (const s of nodeSystems) {
      const sys = systems[s];
      if (!sys) continue;
      if (sys.adoption === "partial")
        warnings.push({ code: "DG-SYS-001", field: "node.systems", message: `System ${sys.label} is partially adopted (${get(sys, "adoption_note", "")}). Map any alternative process paths.` });
      if (sys.adoption === "implementing")
        warnings.push({ code: "DG-SYS-002", field: "node.systems", message: `System ${sys.label} is being implemented. The mapping is provisional.` });
      if (sys.scope === "open")
        warnings.push({ code: "DG-SCOPE-001", field: "node.systems", message: `The scope of ${sys.label} is still open.` });
    }

    // ---- actions
    const ops = get(node, "open_points", []);
    for (const op of ops)
      if (op.status !== "closed")
        actions.push({ code: "DG-ACT-001", field: "node.open_points", action: `Resolve open issue ${op.id}: ${op.title} (owner: ${op.owner}).` });
    const crit = get(node, "criticality", {});
    if (get(crit, "open", false) === true && ops.length === 0)
      actions.push({ code: "DG-ACT-002", field: "node.criticality", action: `Record this critical item as an open issue: "${crit.text}"` });
    if (get(node, "verified", false) === false)
      actions.push({ code: "DG-ACT-003", field: "node.verified", action: "Validate the step with the process owner." });
    for (const step of get(node, "extra_system_steps", []))
      if (get(step, "approved", false) === false)
        actions.push({ code: "DG-ACT-004", field: "node.extra_system_steps", action: `Approve the external step or assign it to a system: ${step.name}.` });

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

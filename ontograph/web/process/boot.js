let draft = null;
try { draft = JSON.parse(localStorage.getItem(PROCESS_DRAFT_KEY) || "null"); } catch (_) {}
if (draft && Array.isArray(draft.model?.processes) && draft.rules && draft.model.systems && draft.model.owners) {
  load(draft.model, draft.rules, { errors: [], warnings: [] });
  toast("Ripreso il tuo censimento in bozza");
} else {
  load(SEED.model, SEED.rules, { errors: [], warnings: [] });
}
DGFunctionalEditor.setVisible(true);
$("#open-governance").addEventListener("click", event => {
  if (!DGFunctionalEditor.confirmLeave()) { event.preventDefault(); return; }
  save();
});

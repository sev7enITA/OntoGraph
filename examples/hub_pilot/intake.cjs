// Local consumer of the pilot's scoped rule and dictionary. PALO owns signal import.
const fs = require("node:fs");
const crypto = require("node:crypto");
const vm = require("node:vm");
const { isDeepStrictEqual } = require("node:util");

async function main() {
  const input = JSON.parse(fs.readFileSync(0, "utf8"));
  const { delivery, model, signal_json: signalJson } = input;
  const signal = JSON.parse(signalJson);
  if (delivery.phase !== "activate" || delivery.payload.application !== "review-intake"
      || delivery.payload.rules.length !== 1) throw Error("Unexpected delivery");
  // This pilot's scoped payload contains only string keys, string values and arrays.
  const ordered = value => Array.isArray(value) ? value.map(ordered)
    : value && typeof value === "object"
      ? Object.fromEntries(Object.keys(value).sort().map(k => [k, ordered(value[k])])) : value;
  const hash = bytes => crypto.createHash("sha256").update(bytes).digest("hex");
  const digest = hash(JSON.stringify(ordered(delivery.payload)));
  if (digest !== delivery.delivery_sha256) throw Error("Delivery integrity mismatch");
  if (hash(JSON.stringify(ordered(model))) !== delivery.payload_sha256) throw Error("Dictionary integrity mismatch");
  const fields = model.nodes.filter(node => node.kind === "field");
  const source = fs.readFileSync(process.argv[2]);
  if (hash(source) !== "a982a75b7278d9b3943d14845b0a8046fc6ac6d251cce20a9aa77693ef057428")
    throw Error("Unexpected PALO client revision");
  const window = {};
  vm.runInNewContext(source.toString("utf8"), { window, URL });
  const palo = window.PALOPolicyWatcherSignal;
  const facts = {};
  for (const field of fields) {
    const pointer = field.aliases[0];
    if (!/^([/][a-zA-Z0-9_-]+)+$/.test(pointer)) throw Error("Invalid dictionary path");
    let value = signal;
    for (const part of pointer.slice(1).split("/")) {
      value = value && Object.hasOwn(value, part) ? value[part] : undefined;
    }
    if (value !== undefined) facts[field.id] = value;
  }
  const rule = delivery.payload.rules[0];
  const matches = entries => Object.entries(entries).every(([key, value]) => isDeepStrictEqual(facts[key], value));
  let outcome = "hold";
  let review = null;
  const nativeValid = palo.validate(signal).valid;
  if (Object.keys(rule.applies).every(key => Object.hasOwn(facts, key))) {
    if (!matches(rule.applies)) outcome = "out_of_scope";
    else if (matches(rule.requires) && nativeValid) {
      const imported = await palo.import(signal);
      const patch = palo.casePatch(imported);
      review = patch.context.policyWatcherReview;
      if (review.reviewStatus === "pending-human-review" && review.reopenedGates.includes(input.gate))
        outcome = "allow";
    }
  }
  process.stdout.write(JSON.stringify({
    activation: delivery.activation, release: delivery.release, delivery_sha256: digest,
    facts, outcome, signal_sha256: hash(signalJson), native_valid: nativeValid, review_status: review?.reviewStatus ?? null,
    reopened_gates: review?.reopenedGates ?? [], signal_id: signal.signalId
  }));
}

main().catch(error => { console.error(error.message); process.exitCode = 1; });

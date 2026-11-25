// Exercise the unmodified Assessment Path file inputs in an isolated Chromium profile.
const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const { readFile, writeFile } = require("node:fs/promises");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");

const [paloRoot, signalPath, output] = process.argv.slice(2);
const readJson = async file => JSON.parse(await readFile(file, "utf8"));
const writeJson = (file, value) => writeFile(path.join(output, file), JSON.stringify(value, null, 2) + "\n");

async function run() {
  const pageFile = "PALO_AssessmentPath.html";
  const assets = new Set([pageFile, "assets/palo-v21.css", "assets/palo-icons.css", "assets/palo-icons.js",
    "assets/palo-v21.js", "assets/palo-case-file.js", "assets/palo-assessment-path.js",
    "assets/palo-policywatcher-signal.js"]);
  const mime = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript" };
  const origin = "http://127.0.0.1";
  const inputPath = path.join(output, "case-input.json");
  const input = await readJson(inputPath);
  const signal = await readJson(signalPath);
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.route("**/*", async route => {
      const url = new URL(route.request().url());
      const item = url.pathname.slice(1);
      if (url.origin !== origin || !assets.has(item)) return route.abort();
      await route.fulfill({ path: path.join(paloRoot, item), contentType: mime[path.extname(item)] });
    });
    await page.goto(origin + "/" + pageFile);
    await page.locator("#assessment-import").setInputFiles(inputPath);
    await page.waitForSelector('[data-assessment-import="pass"]');
    await page.locator("#policywatcher-signal-import").setInputFiles(signalPath);
    await page.waitForSelector('[data-policywatcher-import="pass"][data-policywatcher-review="pending-human-review"]');
    const saved = () => window.PALOCaseFile.load();
    const merged = await page.evaluate(saved);
    assert.equal(merged.caseId, input.caseId);
    assert.equal(merged.status, "reopened");
    assert.deepEqual(merged.evidence.find(item => item.evidenceId === input.evidence[0].evidenceId), input.evidence[0]);
    const review = merged.context.policyWatcherReview;
    assert.equal(review.signalId, signal.signalId);
    assert.equal(review.reviewStatus, "pending-human-review");
    assert.equal(review.authorityStatus, "non-authoritative-monitoring-signal");
    assert.ok(["measure", "prove"].every(gate => review.reopenedGates.includes(gate)));
    const incident = merged.incidents.find(item => item.incidentId === "review-" + signal.signalId);
    assert.deepEqual(incident.reopenGates, review.reopenedGates);
    const board = await page.evaluate(() => window.PALOCaseFile.boardPack(window.PALOCaseFile.load()));
    assert.ok(board.includes("reopen " + review.reopenedGates.join(", ")));
    await writeJson("case-reopened.json", merged);
    await writeFile(path.join(output, "board-pack.md"), board);

    const changed = structuredClone(signal);
    changed.authority.status = "approved-for-production";
    await page.locator("#policywatcher-signal-import").setInputFiles({
      name: "invalid-authority.json", mimeType: "application/json", buffer: Buffer.from(JSON.stringify(changed))
    });
    await page.waitForSelector('[data-policywatcher-import="fail"]');
    const rejection = await page.locator("#policywatcher-import-status").innerText();
    assert.match(rejection, /authority/i);
    assert.deepEqual(await page.evaluate(saved), merged);
    await page.reload();
    await page.waitForSelector('[data-policywatcher-review="pending-human-review"]');
    assert.deepEqual(await page.evaluate(saved), merged);
    assert.deepEqual(errors, []);

    const validator = path.join(paloRoot, "scripts/evidence-validate.mjs");
    const casePath = path.join(output, "case-reopened.json");
    const receipt = JSON.parse(execFileSync(process.execPath, [validator, casePath], { encoding: "utf8" }));
    const core = await import(pathToFileURL(path.join(paloRoot, "scripts/evidence-pack-core.mjs")));
    assert.equal(receipt.artifactDigest, "sha256:" + core.sha256(merged));
    assert.equal(receipt.caseId, merged.caseId);
    assert.equal(receipt.result, "valid");
    await writeJson("receipt.json", receipt);
    await writeJson("result.json", {
      release: input.evidence[0].content.release, signalId: review.signalId, caseId: merged.caseId,
      status: merged.status, reviewStatus: review.reviewStatus, gates: review.reopenedGates,
      nativeReceipt: receipt.artifactDigest, ontologyEvidenceRetained: true, persistedAcrossReload: true,
      invalidAuthorityRejected: rejection, savedCaseUnchangedOnRejection: true, chromium: browser.version(),
      nativeScope: "Local case import, monitoring review, board pack and case-schema receipt. Human decision pending."
    });
  } finally {
    await browser.close();
  }
}
run().catch(error => { console.error(error.message); process.exitCode = 1; });

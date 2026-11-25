"""Validate compiled policy and package it for OPA on a CI runner."""

import argparse
import hashlib
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

from .model import Rejected, canonical, require
from .policy import verify_bundle

RECEIPT_FORMAT = "ontograph.ci-receipt/1"
VALIDATION_FIELDS = {"release", "bundle_sha256", "artifact_sha256", "opa_version", "test_count"}
RECEIPT_FIELDS = VALIDATION_FIELDS | {"format", "provider", "repository", "commit", "run_url", "run_attempt"}
GITHUB_REPOSITORY = r"https://github\.com/[A-Za-z0-9_-]+/(?!\.{1,2}$)[A-Za-z0-9_.-]+"
AZURE_SEGMENT = r"[A-Za-z0-9_-](?:[A-Za-z0-9_.-]|%20)*"
AZURE_ORGANIZATION = r"https://dev\.azure\.com/[A-Za-z0-9_-]+"
AZURE_REPOSITORY = AZURE_ORGANIZATION + "/" + AZURE_SEGMENT + "/_git/" + AZURE_SEGMENT
AZURE_PROJECT_ID = r"[0-9a-fA-F]{8}(?:-[0-9a-fA-F]{4}){3}-[0-9a-fA-F]{12}"
PACKAGED_PROBES = "{id: decision | some id, probe in input; decision := data.ontograph.decision with input as probe}"


def _matches(pattern, value):
    return isinstance(value, str) and re.fullmatch(pattern, value) is not None


def _json_bytes(value):
    return (canonical(value) + "\n").encode()


def _run(argv, **kwargs):
    try:
        process = subprocess.run(argv, check=False, capture_output=True, timeout=180, **kwargs)
    except subprocess.TimeoutExpired as error:
        raise Rejected(f"{Path(argv[0]).name} timed out") from error
    if process.returncode:
        detail = (process.stderr or process.stdout).decode(errors="replace").strip()
        raise Rejected(f"{Path(argv[0]).name} {argv[1]} failed: {detail[:1000]}")
    return process.stdout


def _opa_version(opa):
    value = re.search(rb"^Version: (\d+\.\d+\.\d+)\s*$", _run([opa, "version"]), re.M)
    require(value is not None, "Expected a stable version of OPA")
    return value[1].decode()


def _policy_inputs(bundle):
    release = json.loads(bundle["files"]["release.json"])
    return release["payload"]["probes"]


def run_checks(bundle, opa, output, *, expected_release=None):
    """Verify the release, run its checks, and write a scoped deployable OPA bundle."""
    bundle_hash = verify_bundle(bundle, expected_release)
    output = Path(output)
    require(not output.exists() and not output.is_symlink(), "Choose a new policy output directory")
    opa = os.fspath(opa)
    if Path(opa).is_file():
        opa = os.fspath(Path(opa).resolve())
    version = _opa_version(opa)
    files = bundle["files"]
    probes = _policy_inputs(bundle)
    with tempfile.TemporaryDirectory(prefix="ontograph-policy-", dir=output.parent) as scratch:
        work = Path(scratch).resolve()
        source = work / "production"
        source.mkdir()
        for name in ("policy.rego", "data.json"):
            (source / name).write_text(files[name], encoding="utf-8")
        (source / ".manifest").write_bytes(_json_bytes({
            "revision": bundle_hash, "roots": ["ontograph", "ontograph_bundle"],
        }))
        tests = work / "policy_test.rego"
        tests.write_text(files[tests.name], encoding="utf-8")
        inputs = ["production/policy.rego", "production/data.json", "policy_test.rego"]
        _run([opa, "check", "--strict", *inputs], cwd=work)
        results = json.loads(_run([opa, "test", "--format=json", *inputs], cwd=work))
        test_names = re.findall(r"^(test_[a-z0-9_]+) if \{", files[tests.name], re.M)
        require(type(results) is list and len(test_names) == len(results) >= len(probes) > 0
                and all(type(case) is dict and isinstance(case.get("name"), str)
                        and not any(case.get(key) for key in ("fail", "skip", "error")) for case in results)
                and sorted(case["name"] for case in results) == sorted(test_names),
                "OPA did not pass all generated release tests")
        artifact = work / "bundle.tar.gz"
        _run([opa, "build", "--bundle", "--output", artifact.name, source.name], cwd=work)

        packaged_inputs = {case["id"]: {k: case[k] for k in ("application", "rule", "facts")} for case in probes}
        expected = {case["id"]: case["expected"] for case in probes}
        actual = _run([opa, "eval", "--bundle", artifact.name, "--stdin-input",
                       "--format=json", "--fail", PACKAGED_PROBES], cwd=work, input=_json_bytes(packaged_inputs))
        outcomes = json.loads(actual)["result"][0]["expressions"][0]["value"]
        require(outcomes == expected, "Packaged OPA decisions do not match the release probes")
        validation = {"release": bundle["release"], "bundle_sha256": bundle_hash,
                      "artifact_sha256": hashlib.sha256(artifact.read_bytes()).hexdigest(),
                      "opa_version": version, "test_count": len(results)}
        output.mkdir(mode=0o700)
        try:
            shutil.copyfile(artifact, output / artifact.name)
            (output / "validation.json").write_bytes(_json_bytes(validation))
        except OSError:
            shutil.rmtree(output)
            raise
    return validation


def validate_receipt(receipt, release_id, bundle_sha256):
    """Check receipt shape and bindings. This does not authenticate a CI provider."""
    require(type(receipt) is dict and set(receipt) == RECEIPT_FIELDS, "Invalid CI receipt fields")
    require(receipt["format"] == RECEIPT_FORMAT, "Unsupported CI receipt format")
    for field in ("release", "bundle_sha256", "artifact_sha256"):
        require(_matches(r"[0-9a-f]{64}", receipt[field]), f"Invalid CI receipt {field}")
    require(receipt["release"] == release_id and receipt["bundle_sha256"] == bundle_sha256,
            "CI receipt does not match the release and policy bundle")
    require(_matches(r"[0-9a-f]{40}", receipt["commit"]), "CI receipt requires a full commit SHA")
    require(_matches(r"\d+\.\d+\.\d+", receipt["opa_version"]), "Invalid CI receipt OPA version")
    for field in ("test_count", "run_attempt"):
        require(type(receipt[field]) is int and receipt[field] > 0, f"Invalid CI receipt {field}")
    repository, run_url = receipt["repository"], receipt["run_url"]
    if receipt["provider"] == "github-actions":
        require(_matches(GITHUB_REPOSITORY, repository)
                and _matches(re.escape(repository) + r"/actions/runs/[1-9]\d*", run_url),
                "Invalid GitHub Actions repository or run URL")
    elif receipt["provider"] == "azure-pipelines":
        require((_matches(AZURE_REPOSITORY, repository) or _matches(GITHUB_REPOSITORY, repository))
                and _matches(AZURE_ORGANIZATION + "/" + AZURE_PROJECT_ID + r"/_build/results\?buildId=[1-9]\d*", run_url),
                "Invalid Azure Pipelines repository or run URL")
        if repository.startswith("https://dev.azure.com/"):
            require(run_url.split("/", 4)[3].lower() == repository.split("/", 4)[3].lower(),
                    "Azure repository and run must belong to the same organization")
    else:
        raise Rejected("Unsupported CI provider")
    return receipt


def ci_receipt(validation):
    """Construct the receipt from a checked-out commit and CI environment values."""
    require(type(validation) is dict and set(validation) == VALIDATION_FIELDS, "Invalid CI validation fields")
    env = os.environ
    commit = _run(["git", "rev-parse", "HEAD"]).decode().strip()
    if env.get("GITHUB_ACTIONS") == "true":
        require(env.get("GITHUB_SERVER_URL") == "https://github.com", "Expected GitHub.com Actions")
        require(commit == env.get("GITHUB_SHA"), "Git checkout does not match the Actions commit")
        provider = "github-actions"
        repository = "https://github.com/" + env.get("GITHUB_REPOSITORY", "")
        run_url = repository + "/actions/runs/" + env.get("GITHUB_RUN_ID", "")
        attempt = env.get("GITHUB_RUN_ATTEMPT")
    elif env.get("TF_BUILD", "").lower() == "true":
        require(commit == env.get("BUILD_SOURCEVERSION"), "Git checkout does not match the Azure commit")
        provider = "azure-pipelines"
        repository = env.get("BUILD_REPOSITORY_URI", "")
        if repository.startswith("https://github.com/"):
            repository = repository.removesuffix(".git")
        collection = env.get("SYSTEM_TEAMFOUNDATIONCOLLECTIONURI", "").rstrip("/")
        run_url = (collection + "/" + env.get("SYSTEM_TEAMPROJECTID", "")
                   + "/_build/results?buildId=" + env.get("BUILD_BUILDID", ""))
        attempt = env.get("SYSTEM_JOBATTEMPT")
    else:
        raise Rejected("CI receipts require a GitHub Actions or Azure Pipelines environment")
    require(_matches(r"[1-9]\d*", attempt), "CI run attempt is required")
    receipt = {**validation, "format": RECEIPT_FORMAT, "provider": provider, "repository": repository,
               "commit": commit, "run_url": run_url, "run_attempt": int(attempt)}
    return validate_receipt(receipt, validation["release"], validation["bundle_sha256"])


def _require_committed(path, contents):
    root = Path(_run(["git", "rev-parse", "--show-toplevel"]).decode().strip())
    try:
        relative = path.resolve().relative_to(root).as_posix()
    except ValueError as error:
        raise Rejected("CI policy source must be in the checked-out repository") from error
    committed = _run(["git", "show", "HEAD:" + relative])
    require(committed == contents, "Policy bundle bytes do not match the checked-out commit")


def _unique(pairs):
    result = {}
    for key, value in pairs:
        require(key not in result, "Duplicate JSON field")
        result[key] = value
    return result


def main():
    parser = argparse.ArgumentParser(description="Validate a frozen OnToGraPh policy with OPA")
    parser.add_argument("bundle", type=Path)
    parser.add_argument("output", type=Path, help="new output directory")
    parser.add_argument("--opa", default="opa")
    parser.add_argument("--expected-release", help="reviewed release digest from an independent channel")
    parser.add_argument("--tracked", action="store_true", help="require bundle bytes committed at HEAD")
    parser.add_argument("--receipt", action="store_true", help="write a receipt using the CI environment")
    args = parser.parse_args()
    try:
        require(not args.receipt or args.expected_release is not None,
                "Set the expected release before recording a CI receipt")
        contents = args.bundle.read_bytes()
        bundle = json.loads(contents, object_pairs_hook=_unique)
        if args.tracked:
            _require_committed(args.bundle, contents)
        validation = run_checks(bundle, args.opa, args.output, expected_release=args.expected_release)
        if args.receipt:
            if args.tracked:
                _require_committed(args.bundle, contents)
            receipt = ci_receipt(validation)
            (args.output / "receipt.json").write_bytes(_json_bytes(receipt))
        print(canonical(validation))
    except (OSError, ValueError, TypeError, KeyError) as error:
        print(f"OntoGraph CI: {error}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

"""Read-only check of an OPA artifact and its receipt against GitHub Actions."""

import hashlib
import json
import os
import re
import subprocess
from pathlib import Path
from tempfile import TemporaryDirectory

from .model import Rejected, require
from .policy import generated_test_names, verify_bundle
from .policy_ci import validate_receipt


def github(*args):
    env = {**os.environ, "GH_HOST": "github.com", "GH_PROMPT_DISABLED": "1"}
    try:
        result = subprocess.run(["gh", *args], env=env, capture_output=True, timeout=60)
    except subprocess.TimeoutExpired as error:
        raise Rejected("GitHub Actions lookup timed out") from error
    require(result.returncode == 0, "GitHub Actions lookup failed. Check GitHub CLI access and artifact retention.")
    return result.stdout


def fetch_receipt(bundle, repository, run_id, attempt=1, branch="main"):
    """Fetch evidence from the permitted workflow and compare the hosted archive."""
    require(isinstance(repository, str) and re.fullmatch(r"[A-Za-z0-9_-]+/[A-Za-z0-9_.-]+", repository),
            "Expected a GitHub owner/repository")
    require(type(run_id) is int and run_id > 0 and type(attempt) is int and attempt > 0,
            "GitHub run and attempt must be positive integers")
    bundle_sha = verify_bundle(bundle)
    run = json.loads(github("api", "--hostname", "github.com",
                            f"repos/{repository}/actions/runs/{run_id}/attempts/{attempt}"))
    require(run.get("id") == run_id and run.get("run_attempt") == attempt
            and run.get("status") == "completed" and run.get("conclusion") == "success",
            "The selected GitHub run attempt has not completed successfully")
    require(run.get("event") in {"push", "workflow_dispatch"} and run.get("head_branch") == branch
            and run.get("path", "").split("@", 1)[0] == ".github/workflows/policy-pilot.yml"
            and (run.get("head_repository") or {}).get("full_name", "").casefold() == repository.casefold()
            and (run.get("repository") or {}).get("full_name", "").casefold() == repository.casefold(),
            "GitHub run is outside the expected repository, branch or workflow")
    with TemporaryDirectory(prefix="ontograph-policy-receipt-") as scratch:
        github("run", "download", str(run_id), "--repo", repository,
               "--name", f"ontograph-verified-policy-{attempt}", "--dir", scratch)
        folder = Path(scratch)
        receipt = json.loads((folder / "receipt.json").read_bytes())
        validate_receipt(receipt, bundle["release"], bundle_sha,
                         expected_test_count=len(generated_test_names(bundle)))
        require(receipt["provider"] == "github-actions"
                and receipt["repository"].casefold() == f"https://github.com/{repository}".casefold()
                and receipt["commit"] == run.get("head_sha")
                and receipt["run_attempt"] == attempt
                and receipt["run_url"].casefold() == f"https://github.com/{repository}/actions/runs/{run_id}".casefold(),
                "Artifact receipt does not match the actual GitHub run")
        artifact = folder / "bundle.tar.gz"
        require(hashlib.sha256(artifact.read_bytes()).hexdigest() == receipt["artifact_sha256"],
                "Hosted OPA artifact does not match the recorded SHA-256")
        return receipt

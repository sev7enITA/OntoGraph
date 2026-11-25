"""Build a reproducible OPA source bundle from a frozen release."""

import json
import re

from .exchange import verify_release
from .model import canonical, consumer_bundle, digest, record, require

FORMAT = "ontograph.opa-bundle/1"
FILES = ("policy.rego", "data.json", "policy_test.rego", "release.json")
POLICY = """package ontograph

import rego.v1

default decision := "hold"

decision := "out_of_scope" if {
    rule := scoped_rule
    keys := object.keys(input.facts)
    every key in object.keys(rule.applies) {
        key in keys
    }
    not fields_match(input.facts, rule.applies)
}

decision := "allow" if {
    rule := scoped_rule
    fields_match(input.facts, rule.applies)
    fields_match(input.facts, rule.requires)
}

scoped_rule := rule if {
    is_object(input)
    is_string(input.application)
    is_string(input.rule)
    is_object(input.facts)
    not invalid_number(input.facts)
    consumer := data.ontograph_bundle.applications[input.application]
    input.rule in consumer.rules
    rule := data.ontograph_bundle.rules[input.rule]
}

fields_match(facts, expected) if {
    keys := object.keys(facts)
    every key, value in expected {
        key in keys
        json_signature(json.marshal(facts[key])) == json_signature(json.marshal(value))
    }
}

# The Python evaluator compares canonical JSON, so Rego number equality is
# insufficient: it equates 1 with 1.0 and drops the sign of floating-point zero.
# OPA preserves the numeric token when marshalling. Go's float64 formatting
# groups alternate spellings that Python parses as the same finite float.
invalid_number(facts) if {
    walk(facts, [_, value])
    is_number(value)
    regex.match("[.eE]", json.marshal(value))
    startswith(sprintf("%g", [value]), "%!")
}

# Pass serialized values around caches keyed by Rego's numeric equality.
json_signature(encoded) := [containers, leaves] if {
    value := json.unmarshal(encoded)
    containers := {json.marshal(path): kind |
        walk(value, [path, node])
        kind := type_name(node)
        kind in {"array", "object"}
    }
    leaves := {json.marshal(path): leaf_signature(kind, json.marshal(node)) |
        walk(value, [path, node])
        kind := type_name(node)
        not kind in {"array", "object"}
    }
}

leaf_signature(kind, encoded) := ["float", sprintf("%g", [json.unmarshal(encoded)])] if {
    kind == "number"
    regex.match("[.eE]", encoded)
} else := ["number", "0"] if {
    kind == "number"
    encoded == "-0"
} else := [kind, encoded]
"""


def _decision_test(name, inputs, expected):
    return (f"{name} if {{\n"
            f"    data.ontograph.decision == {canonical(expected)} with input as {canonical(inputs)}\n"
            "}\n")


def generated_test_names(bundle):
    return re.findall(r"^(test_[a-z0-9_]+) if \{", bundle["files"]["policy_test.rego"], re.M)


def _test_source(payload):
    probes = sorted(payload["probes"], key=lambda item: item["id"])
    tests = ["package ontograph_test\n\nimport rego.v1\n"]
    for index, probe in enumerate(probes, 1):
        inputs = {key: probe[key] for key in ("application", "rule", "facts")}
        tests.append(f"# {probe['id']}\n" + _decision_test(f"test_probe_{index:04}", inputs, probe["expected"]))
    # Use real matching facts so these tests fail if the scope checks are removed.
    valid = next(probe for probe in probes if probe["expected"] == "allow")
    inputs = {key: valid[key] for key in ("application", "rule", "facts")}
    tests.extend(_decision_test(f"test_{name}", {**inputs, key: value}, "hold")
                 for name, key, value in (("unknown_application", "application", "__unknown__"),
                                          ("unknown_rule", "rule", "__unknown__"),
                                          ("invalid_facts", "facts", None)))
    return "\n".join(tests)


def build_bundle(exported):
    """Compile and hash source files. Release approval is checked by the registry."""
    release = verify_release(exported)
    payload, manifest = exported["payload"], exported["manifest"]
    applications = {app: {"rules": sorted(rule["id"] for rule in consumer_bundle(payload, app)["rules"]),
                          "delivery_sha256": checksum}
                    for app, checksum in manifest["deliveries"].items()}
    policy_data = {
        "ontograph_bundle": {
            "release": release,
            "applications": applications,
            "rules": {rule["id"]: rule for rule in payload["rules"]},
        },
    }
    files = {
        "policy.rego": POLICY,
        "data.json": canonical(policy_data) + "\n",
        "policy_test.rego": _test_source(payload),
        "release.json": canonical({key: exported[key] for key in ("release", "manifest", "payload", "graph")}) + "\n",
    }
    bundle = {"format": FORMAT, "release": release, "files": files}
    return {**bundle, "bundle_sha256": digest(bundle)}


def verify_bundle(bundle, expected_release=None):
    """Verify the original inputs, generated files and bundle identity."""
    record(bundle, ("format", "release", "files", "bundle_sha256"), "OPA source bundle")
    require(bundle["format"] == FORMAT, "Unsupported OPA source bundle format")
    files = bundle["files"]
    require(type(files) is dict and set(files) == set(FILES)
            and all(type(content) is str for content in files.values()), "Invalid OPA source files")
    require(expected_release is None or bundle["release"] == expected_release, "Unexpected release ID")
    regenerated = build_bundle(json.loads(files["release.json"]))
    require(bundle == regenerated, "OPA source bundle does not match the frozen release")
    return regenerated["bundle_sha256"]

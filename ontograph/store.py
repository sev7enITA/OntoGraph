"""Local registry for immutable releases and independent effect observations."""

import hmac
import json
import secrets
import sqlite3
from contextlib import closing, contextmanager

from .model import (
    DECISIONS, canonical, consumer_bundle, digest, identifier, impact, indexed, jsonld,
    nonempty, require, text_digest, timestamp, utcnow, validate, verify_discrimination,
)

ROLES = {"admin", "author", "reviewer", "publisher", "consumer", "observer", "supervisor", "auditor"}
SCHEMA = """
CREATE TABLE IF NOT EXISTS metadata (key TEXT PRIMARY KEY, value TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS principals (
  id TEXT PRIMARY KEY, token_hash TEXT NOT NULL UNIQUE, role TEXT NOT NULL, application TEXT,
  active INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE IF NOT EXISTS candidates (
  id TEXT PRIMARY KEY, base INTEGER NOT NULL, author TEXT NOT NULL REFERENCES principals(id),
  manifest TEXT NOT NULL, payload TEXT NOT NULL, created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS reviews (
  seq INTEGER PRIMARY KEY, candidate TEXT NOT NULL REFERENCES candidates(id),
  reviewer TEXT NOT NULL REFERENCES principals(id), choice TEXT NOT NULL, rationale TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS activations (
  seq INTEGER PRIMARY KEY, candidate TEXT NOT NULL UNIQUE REFERENCES candidates(id),
  activated_at TEXT NOT NULL, withdrawn_at TEXT
);
CREATE TABLE IF NOT EXISTS receipts (
  seq INTEGER PRIMARY KEY, activation INTEGER NOT NULL REFERENCES activations(seq),
  application TEXT NOT NULL, consumer TEXT NOT NULL REFERENCES principals(id),
  phase TEXT NOT NULL, actual_digest TEXT, observed_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS observations (
  seq INTEGER PRIMARY KEY, activation INTEGER NOT NULL REFERENCES activations(seq),
  application TEXT NOT NULL, observer TEXT NOT NULL REFERENCES principals(id),
  phase TEXT NOT NULL, probe TEXT NOT NULL, actual_digest TEXT, actual_outcome TEXT NOT NULL,
  captured_at TEXT NOT NULL, artifact_ref TEXT NOT NULL, artifact_sha256 TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS events (
  seq INTEGER PRIMARY KEY, actor TEXT NOT NULL, at TEXT NOT NULL, kind TEXT NOT NULL,
  payload TEXT NOT NULL, previous TEXT, hash TEXT NOT NULL UNIQUE
);
CREATE TRIGGER IF NOT EXISTS candidates_no_update BEFORE UPDATE ON candidates
BEGIN SELECT RAISE(ABORT, 'candidates are immutable'); END;
CREATE TRIGGER IF NOT EXISTS candidates_no_delete BEFORE DELETE ON candidates
BEGIN SELECT RAISE(ABORT, 'candidates are immutable'); END;
CREATE TRIGGER IF NOT EXISTS reviews_no_update BEFORE UPDATE ON reviews
BEGIN SELECT RAISE(ABORT, 'reviews are append-only'); END;
CREATE TRIGGER IF NOT EXISTS reviews_no_delete BEFORE DELETE ON reviews
BEGIN SELECT RAISE(ABORT, 'reviews are append-only'); END;
CREATE TRIGGER IF NOT EXISTS observations_no_update BEFORE UPDATE ON observations
BEGIN SELECT RAISE(ABORT, 'observations are append-only'); END;
CREATE TRIGGER IF NOT EXISTS observations_no_delete BEFORE DELETE ON observations
BEGIN SELECT RAISE(ABORT, 'observations are append-only'); END;
CREATE TRIGGER IF NOT EXISTS receipts_no_update BEFORE UPDATE ON receipts
BEGIN SELECT RAISE(ABORT, 'receipts are append-only'); END;
CREATE TRIGGER IF NOT EXISTS receipts_no_delete BEFORE DELETE ON receipts
BEGIN SELECT RAISE(ABORT, 'receipts are append-only'); END;
CREATE TRIGGER IF NOT EXISTS events_no_update BEFORE UPDATE ON events
BEGIN SELECT RAISE(ABORT, 'events are append-only'); END;
CREATE TRIGGER IF NOT EXISTS events_no_delete BEFORE DELETE ON events
BEGIN SELECT RAISE(ABORT, 'events are append-only'); END;
"""


class Registry:
    def __init__(self, path, clock=utcnow):
        self.path = path
        self.clock = clock

    @contextmanager
    def transaction(self, write=False):
        connection = sqlite3.connect(self.path, timeout=10, isolation_level=None)
        connection.row_factory = sqlite3.Row
        try:
            connection.execute("PRAGMA foreign_keys=ON")
            connection.execute("BEGIN IMMEDIATE" if write else "BEGIN")
            yield connection
            connection.commit()
        except BaseException:
            connection.rollback()
            raise
        finally:
            connection.close()

    def initialize(self, workspace, admin):
        identifier(workspace)
        identifier(admin)
        with closing(sqlite3.connect(self.path)) as db:
            db.executescript(SCHEMA)
        with self.transaction(write=True) as db:
            require(self._one(db, "SELECT value FROM metadata WHERE key='workspace'") is None,
                    "Registry is already initialized")
            db.execute("INSERT INTO metadata VALUES ('workspace', ?)", (workspace,))
            token = self._insert_principal(db, admin, "admin", None)
            self._event(db, admin, "registry.initialized", {"workspace": workspace})
            return token

    @staticmethod
    def _one(db, query, *params):
        return db.execute(query, params).fetchone()

    def _authenticate(self, db, token, allowed=None):
        require(isinstance(token, str) and len(token) <= 128, "Invalid credential")
        actor = self._one(db, "SELECT * FROM principals WHERE token_hash=? AND active=1", text_digest(token))
        require(actor is not None, "Invalid credential")
        require(allowed is None or actor["role"] in allowed, "Role not authorized")
        return actor

    def _insert_principal(self, db, principal, role, application):
        require(self._one(db, "SELECT id FROM principals WHERE id=?", principal) is None,
                "Principal already exists")
        token = secrets.token_urlsafe(32)
        db.execute("INSERT INTO principals(id,token_hash,role,application) VALUES (?,?,?,?)",
                   (principal, text_digest(token), role, application))
        return token

    def add_principal(self, token, principal, role, application=None):
        identifier(principal)
        require(role in ROLES, "Unknown principal role")
        require((role == "consumer") == (application is not None), "Consumers require one application binding")
        if application is not None:
            identifier(application)
        with self.transaction(write=True) as db:
            admin = self._authenticate(db, token, {"admin"})
            secret = self._insert_principal(db, principal, role, application)
            self._event(db, admin["id"], "principal.added",
                        {"id": principal, "role": role, "application": application})
            return secret

    def disable_principal(self, token, principal):
        with self.transaction(write=True) as db:
            actor = self._authenticate(db, token, {"admin"})
            require(actor["id"] != principal, "Administrator cannot disable own credential")
            changed = db.execute("UPDATE principals SET active=0 WHERE id=? AND active=1", (principal,))
            require(changed.rowcount == 1, "Active principal not found")
            self._event(db, actor["id"], "principal.disabled", {"id": principal})

    def _event(self, db, actor, kind, payload):
        prior = self._one(db, "SELECT seq,hash FROM events ORDER BY seq DESC LIMIT 1")
        seq = 1 if prior is None else prior["seq"] + 1
        prev = prior["hash"] if prior else None
        now = self.clock()
        entry = {"seq": seq, "actor": actor, "at": now, "kind": kind, "payload": payload, "previous": prev}
        db.execute("INSERT INTO events VALUES (?,?,?,?,?,?,?)",
                   (seq, actor, now, kind, canonical(payload), prev, digest(entry)))
        return seq

    def _workspace(self, db):
        return self._one(db, "SELECT value FROM metadata WHERE key='workspace'")["value"]

    @staticmethod
    def _head(db):
        return db.execute("SELECT * FROM activations ORDER BY seq DESC LIMIT 1").fetchone()

    def _candidate(self, db, release_id):
        row = self._one(db, "SELECT * FROM candidates WHERE id=?", release_id)
        require(row is not None, "Candidate not found")
        manifest, payload = json.loads(row["manifest"]), json.loads(row["payload"])
        require(hmac.compare_digest(digest(manifest), row["id"])
                and hmac.compare_digest(digest(payload), manifest["payload_sha256"]),
                "Candidate integrity mismatch")
        require(manifest["workspace"] == self._workspace(db) and manifest["base"] == row["base"]
                and manifest["author"] == row["author"] and manifest["created_at"] == row["created_at"],
                "Candidate record does not match manifest")
        return row, manifest, payload

    def propose(self, token, payload, base, reviewers, quorum, reason, observation_max_age_seconds=3600,
                ci_required=False):
        validate(payload)
        nonempty(reason, "change rationale")
        require(type(ci_required) is bool, "CI requirement must be a boolean")
        require(type(base) is int and base >= 0, "Invalid base activation")
        require(type(reviewers) is list and 1 <= len(reviewers) <= 20, "Invalid reviewer list")
        require(len({identifier(item) for item in reviewers}) == len(reviewers), "Duplicate reviewer")
        require(type(quorum) is int and 1 <= quorum <= len(reviewers), "Invalid quorum")
        require(type(observation_max_age_seconds) is int and 1 <= observation_max_age_seconds <= 604800,
                "Invalid observation freshness window")
        with self.transaction(write=True) as db:
            actor = self._authenticate(db, token, {"author"})
            head = self._head(db)
            require(base == (head["seq"] if head else 0), "Base activation changed")
            require(payload["domain"] == self._workspace(db), "Release domain does not match registry")
            prior = self._candidate(db, head["candidate"])[2] if head else None
            verify_discrimination(prior, payload)
            for reviewer in reviewers:
                person = self._one(db, "SELECT role,active FROM principals WHERE id=?", reviewer)
                require(person and person["role"] == "reviewer" and person["active"] and reviewer != actor["id"],
                        "Reviewer must be independent and active")
            now = self.clock()
            require(all(timestamp(item["observed_at"]) <= timestamp(now) for item in payload["evidence"]),
                    "Evidence timestamp is in the future")
            manifest = {"format": "ontograph.manifest/1", "workspace": self._workspace(db),
                        "base": base, "author": actor["id"], "created_at": now, "reason": reason,
                        "reviewers": sorted(reviewers), "quorum": quorum,
                        "observation_max_age_seconds": observation_max_age_seconds,
                        "payload_sha256": digest(payload), "impact": impact(prior, payload),
                        "deliveries": {node["id"]: digest(consumer_bundle(payload, node["id"]))
                                       for node in payload["nodes"] if node["kind"] == "application"}}
            if ci_required:
                manifest["ci_required"] = True
            release_id = digest(manifest)
            if self._one(db, "SELECT id FROM candidates WHERE id=?", release_id):
                return release_id
            db.execute("INSERT INTO candidates VALUES (?,?,?,?,?,?)",
                       (release_id, base, actor["id"], canonical(manifest), canonical(payload), now))
            self._event(db, actor["id"], "release.proposed",
                        {"release": release_id, "base": base, "impact": manifest["impact"]})
            return release_id

    def review(self, token, release_id, choice, rationale):
        require(choice in {"approve", "object"}, "Unknown review choice")
        nonempty(rationale, "review rationale")
        with self.transaction(write=True) as db:
            actor = self._authenticate(db, token, {"reviewer"})
            _, manifest, _ = self._candidate(db, release_id)
            require(actor["id"] in manifest["reviewers"], "Reviewer is not assigned")
            require(self._one(db, "SELECT seq FROM activations WHERE candidate=?", release_id) is None,
                    "Activated candidates are closed to review")
            seq = self._event(db, actor["id"], "release.reviewed",
                              {"release": release_id, "choice": choice, "rationale": rationale})
            db.execute("INSERT INTO reviews VALUES (?,?,?,?,?)", (seq, release_id, actor["id"], choice, rationale))

    @staticmethod
    def _require_approval(db, release_id, manifest, payload):
        require(all(item["status"] == "confirmed" for item in payload["evidence"]),
                "Disputed or insufficient evidence blocks publication")
        votes = db.execute("""SELECT r.reviewer,r.choice,p.active FROM reviews r
            JOIN principals p ON p.id=r.reviewer WHERE r.candidate=? AND r.seq IN (
              SELECT MAX(seq) FROM reviews WHERE candidate=? GROUP BY reviewer
            )""", (release_id, release_id)).fetchall()
        assigned = [vote for vote in votes if vote["reviewer"] in manifest["reviewers"]]
        require(not any(vote["choice"] == "object" for vote in assigned), "Unresolved reviewer objection")
        require(sum(vote["choice"] == "approve" and vote["active"] for vote in assigned) >= manifest["quorum"],
                "Approval quorum not met")

    @staticmethod
    def _release_export(release_id, manifest, payload):
        return {"release": release_id, "manifest": manifest, "payload": payload,
                "graph": jsonld(payload, manifest["workspace"], release_id)}

    def export_policy(self, token, release_id):
        """Build a deterministic, scoped OPA package after governance review."""
        from .policy import build_bundle

        with self.transaction() as db:
            self._authenticate(db, token, ROLES - {"consumer"})
            _, manifest, payload = self._candidate(db, release_id)
            if self._one(db, "SELECT seq FROM activations WHERE candidate=?", release_id) is None:
                self._require_approval(db, release_id, manifest, payload)
            return build_bundle(self._release_export(release_id, manifest, payload))

    @staticmethod
    def _ci_evidence(db, release_id):
        events = db.execute("""SELECT seq,actor,payload FROM events
                               WHERE kind='release.ci_recorded' ORDER BY seq DESC""")
        for row in events:
            data = json.loads(row["payload"])
            if data["release"] == release_id:
                yield {"event": row["seq"], "recorded_by": row["actor"], "receipt": data["receipt"]}

    @staticmethod
    def _activated_ci(db, activation):
        event = db.execute("SELECT payload FROM events WHERE seq=? AND kind='release.published'",
                           (activation,)).fetchone()
        return json.loads(event["payload"]).get("ci") if event else None

    def ci_status(self, token, release_id):
        with self.transaction() as db:
            self._authenticate(db, token, ROLES - {"consumer"})
            _, manifest, _ = self._candidate(db, release_id)
            activation = self._one(db, "SELECT seq FROM activations WHERE candidate=?", release_id)
            evidence = (self._activated_ci(db, activation["seq"]) if activation else
                        next(self._ci_evidence(db, release_id), None))
            return {"release": release_id, "required": manifest.get("ci_required", False),
                    "evidence": evidence}

    def record_ci(self, token, release_id, receipt):
        """An auditor records evidence checked against the actual provider run."""
        from .policy import build_bundle
        from .policy_ci import validate_receipt

        with self.transaction(write=True) as db:
            actor = self._authenticate(db, token, {"auditor"})
            _, manifest, payload = self._candidate(db, release_id)
            bundle = build_bundle(self._release_export(release_id, manifest, payload))
            validate_receipt(receipt, release_id, bundle["bundle_sha256"])
            for evidence in self._ci_evidence(db, release_id):
                prior = evidence["receipt"]
                if prior == receipt:
                    return evidence
                identity = ("provider", "repository", "run_url", "run_attempt")
                require(any(prior[key] != receipt[key] for key in identity),
                        "This run attempt already has different recorded evidence")
            require(self._one(db, "SELECT seq FROM activations WHERE candidate=?", release_id) is None,
                    "CI evidence must be recorded before activation")
            self._require_approval(db, release_id, manifest, payload)
            seq = self._event(db, actor["id"], "release.ci_recorded",
                              {"release": release_id, "receipt": receipt})
            return {"event": seq, "recorded_by": actor["id"], "receipt": receipt}

    def publish(self, token, release_id, expected_head):
        with self.transaction(write=True) as db:
            actor = self._authenticate(db, token, {"publisher"})
            _, manifest, payload = self._candidate(db, release_id)
            head = self._head(db)
            require(type(expected_head) is int and expected_head == manifest["base"]
                    and expected_head == (head["seq"] if head else 0), "Base activation changed")
            if head:
                require(head["withdrawn_at"] is not None, "Withdraw and reconcile the current activation first")
                previous = self._summary(db, head)
                require(all(app["state"] == "withdrawal_verified" for app in previous["applications"]),
                        "Current withdrawal requires independent verification for every application")
            require(timestamp(payload["effective_at"]) <= timestamp(self.clock()), "Release is not yet effective")
            self._require_approval(db, release_id, manifest, payload)
            ci = next(self._ci_evidence(db, release_id), None)
            require(not manifest.get("ci_required") or ci is not None,
                    "Approved CI evidence required before activation")
            publication = {"release": release_id, "base": expected_head}
            if ci:
                publication["ci"] = ci
            seq = self._event(db, actor["id"], "release.published", publication)
            db.execute("INSERT INTO activations VALUES (?,?,?,NULL)", (seq, release_id, self.clock()))
            return seq

    def withdraw(self, token, expected_head, reason):
        nonempty(reason, "withdrawal rationale")
        with self.transaction(write=True) as db:
            actor = self._authenticate(db, token, {"supervisor"})
            head = self._head(db)
            require(type(expected_head) is int and head and head["seq"] == expected_head, "Activation changed")
            require(head["withdrawn_at"] is None, "Activation is already withdrawn")
            at = self.clock()
            db.execute("UPDATE activations SET withdrawn_at=? WHERE seq=?", (at, expected_head))
            self._event(db, actor["id"], "release.withdrawn",
                        {"activation": expected_head, "release": head["candidate"], "reason": reason, "at": at})

    def _target(self, db, activation, application):
        identifier(application)
        require(type(activation) is int and activation > 0, "Invalid activation")
        row = self._head(db)
        require(row and row["seq"] == activation, "Activation changed")
        _, manifest, payload = self._candidate(db, row["candidate"])
        require(indexed(payload["nodes"], "node").get(application, {}).get("kind") == "application",
                "Application is not declared in activation")
        phase = "withdraw" if row["withdrawn_at"] else "activate"
        start = row["withdrawn_at"] or row["activated_at"]
        return row, manifest, payload, phase, start

    @staticmethod
    def _reported_digest(actual_digest):
        require(actual_digest is None or (isinstance(actual_digest, str) and len(actual_digest) == 64
                and all(char in "0123456789abcdef" for char in actual_digest)), "Invalid reported digest")

    def acknowledge(self, token, activation, phase, actual_digest):
        self._reported_digest(actual_digest)
        with self.transaction(write=True) as db:
            actor = self._authenticate(db, token, {"consumer"})
            _, _, _, current_phase, _ = self._target(db, activation, actor["application"])
            require(phase == current_phase, "Receipt phase changed")
            seq = self._event(db, actor["id"], "application.acknowledged",
                              {"activation": activation, "phase": phase, "application": actor["application"],
                               "actual_digest": actual_digest})
            db.execute("INSERT INTO receipts VALUES (?,?,?,?,?,?,?)",
                       (seq, activation, actor["application"], actor["id"], phase, actual_digest, self.clock()))
            return seq

    def observe(self, token, activation, application, phase, probe_id, actual_digest, actual_outcome,
                captured_at, artifact_ref, artifact_sha256):
        self._reported_digest(actual_digest)
        self._reported_digest(artifact_sha256)
        require(artifact_sha256 is not None, "Observation artifact digest required")
        nonempty(artifact_ref, "observation artifact reference")
        require(artifact_ref.startswith(("https://", "urn:")), "Observation reference must use HTTPS or URN")
        with self.transaction(write=True) as db:
            actor = self._authenticate(db, token, {"observer"})
            _, _, payload, current_phase, start = self._target(db, activation, application)
            require(phase == current_phase, "Observation phase changed")
            prior = self._one(db, """SELECT captured_at FROM observations WHERE activation=? AND phase=?
                              AND application=? AND probe=? ORDER BY seq DESC LIMIT 1""",
                              activation, phase, application, probe_id)
            require(timestamp(start) <= timestamp(captured_at) <= timestamp(self.clock())
                    and (prior is None or timestamp(prior["captured_at"]) <= timestamp(captured_at)),
                    "Observation is stale or in the future")
            if phase == "activate":
                test = indexed(payload["probes"], "probe").get(probe_id)
                require(test and test["application"] == application, "Probe is not bound to this application")
                require(actual_outcome in DECISIONS | {"unobservable"}, "Invalid observation result")
            else:
                require(probe_id == "withdrawal" and actual_outcome in {"inactive", "active", "unobservable"},
                        "Withdrawal requires an explicit execution check")
            event = {"activation": activation, "application": application, "phase": phase, "probe": probe_id,
                     "actual_digest": actual_digest, "actual_outcome": actual_outcome, "captured_at": captured_at,
                     "artifact_ref": artifact_ref, "artifact_sha256": artifact_sha256}
            seq = self._event(db, actor["id"], "application.observed", event)
            db.execute("INSERT INTO observations VALUES (?,?,?,?,?,?,?,?,?,?,?)",
                       (seq, activation, application, actor["id"], phase, probe_id, actual_digest, actual_outcome,
                        captured_at, artifact_ref, artifact_sha256))
            return seq

    def _summary(self, db, activation, phase=None):
        _, manifest, payload = self._candidate(db, activation["candidate"])
        phase = phase or ("withdraw" if activation["withdrawn_at"] else "activate")
        require(phase in {"activate", "withdraw"} and (phase != "withdraw" or activation["withdrawn_at"]),
                "Requested phase has not occurred")
        now = timestamp(self.clock())
        max_age = manifest["observation_max_age_seconds"]
        applications = []
        for node in payload["nodes"]:
            if node["kind"] != "application":
                continue
            app = node["id"]
            expected_digest = None if phase == "withdraw" else manifest["deliveries"][app]
            receipt = self._one(db, """SELECT actual_digest,seq,observed_at FROM receipts WHERE
                                activation=? AND phase=? AND application=? ORDER BY seq DESC LIMIT 1""",
                                activation["seq"], phase, app)
            expected = ({"withdrawal": "inactive"} if phase == "withdraw" else
                        {test["id"]: test["expected"] for test in payload["probes"] if test["application"] == app})
            probes = []
            for probe, outcome in sorted(expected.items()):
                observed = self._one(db, """SELECT * FROM observations WHERE activation=? AND phase=? AND
                                     application=? AND probe=? ORDER BY seq DESC LIMIT 1""",
                                     activation["seq"], phase, app, probe)
                if observed is None:
                    result = "missing"
                elif observed["actual_outcome"] == "unobservable":
                    result = "inconclusive"
                elif observed["actual_digest"] != expected_digest or observed["actual_outcome"] != outcome:
                    result = "mismatch"
                elif ((now - timestamp(observed["captured_at"])).total_seconds() > max_age
                      or (receipt and (observed["seq"] <= receipt["seq"]
                                      or timestamp(observed["captured_at"]) < timestamp(receipt["observed_at"])))):
                    result = "stale"
                else:
                    result = "verified"
                probes.append({"probe": probe, "expected": outcome, "result": result,
                               "observation": dict(observed) if observed else None})
            results = {probe["result"] for probe in probes}
            if "mismatch" in results or (receipt and receipt["actual_digest"] != expected_digest):
                state = "mismatch"
            elif (receipt is None or (now - timestamp(receipt["observed_at"])).total_seconds() > max_age
                  or results & {"missing", "inconclusive", "stale"}):
                state = "unproven"
            else:
                state = "withdrawal_verified" if phase == "withdraw" else "verified"
            applications.append({"application": app, "state": state, "phase": phase,
                                 "receipt": dict(receipt) if receipt else None, "probes": probes})
        result = {"activation": activation["seq"], "release": activation["candidate"], "phase": phase,
                  "manifest": manifest, "activation_state": "withdrawn" if phase == "withdraw" else "published",
                  "applications": applications, "as_of": self.clock(), "business_outcome": "not_assessed"}
        ci = self._activated_ci(db, activation["seq"])
        if ci:
            result["ci"] = ci
        return result

    def status(self, token, activation=None, phase=None):
        with self.transaction() as db:
            self._authenticate(db, token, ROLES - {"consumer"})
            row = (self._head(db) if activation is None else
                   self._one(db, "SELECT * FROM activations WHERE seq=?", activation))
            if row is None:
                require(activation is None, "Activation not found")
                return {"activation": 0, "activation_state": "empty", "applications": []}
            return self._summary(db, row, phase)

    def consumer_release(self, token):
        with self.transaction() as db:
            actor = self._authenticate(db, token, {"consumer"})
            head = self._head(db)
            if head is None:
                return {"activation": 0, "phase": "empty", "payload": None}
            _, manifest, payload = self._candidate(db, head["candidate"])
            app = actor["application"]
            if head["withdrawn_at"] or indexed(payload["nodes"], "node").get(app, {}).get("kind") != "application":
                return {"activation": head["seq"], "phase": "withdraw", "payload": None}
            delivery = consumer_bundle(payload, app)
            require(digest(delivery) == manifest["deliveries"][app], "Delivery integrity mismatch")
            result = {"activation": head["seq"], "phase": "activate", "release": head["candidate"],
                      "payload_sha256": manifest["payload_sha256"], "delivery_sha256": manifest["deliveries"][app],
                      "payload": delivery}
            ci = self._activated_ci(db, head["seq"])
            if ci:
                result["policy_artifact_sha256"] = ci["receipt"]["artifact_sha256"]
            return result

    def export(self, token, release_id):
        with self.transaction() as db:
            self._authenticate(db, token, ROLES - {"consumer"})
            _, manifest, payload = self._candidate(db, release_id)
            return self._release_export(release_id, manifest, payload)

    def events(self, token):
        with self.transaction() as db:
            self._authenticate(db, token, {"auditor", "admin", "supervisor"})
            events = [{**dict(row), "payload": json.loads(row["payload"])}
                      for row in db.execute("SELECT * FROM events ORDER BY seq")]
            verify_events(events)
            return events


def verify_events(events, expected_tip=None):
    previous = None
    for seq, entry in enumerate(events, 1):
        body = {key: value for key, value in entry.items() if key != "hash"}
        require(entry.get("seq") == seq and entry.get("previous") == previous
                and entry.get("hash") == digest(body), "Event chain integrity mismatch")
        previous = entry["hash"]
    if expected_tip is not None:
        require(previous == expected_tip, "Event chain tip does not match independently retained checkpoint")
    return previous

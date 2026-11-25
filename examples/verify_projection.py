"""Optional interoperability check with RDFLib, outside the core runtime."""

import json
from pathlib import Path
import sys

from rdflib import Graph, URIRef
from rdflib.compare import isomorphic


def main(report_file):
    report = json.loads(Path(report_file).read_text(encoding="utf-8"))
    release = report["releases"][1]
    original = Graph().parse(data=json.dumps(release["graph"]), format="json-ld")
    round_trip = Graph().parse(data=original.serialize(format="nt"), format="nt")
    if not isomorphic(original, round_trip):
        raise ValueError("JSON-LD to N-Triples round trip changed the graph")

    concepts = round_trip.query(
        """
        PREFIX skos: <http://www.w3.org/2004/02/skos/core#>
        SELECT ?concept WHERE {
          ?concept skos:broader <urn:ontograph:aurora-21:node:asset>
        }
        """
    )
    if {str(row[0]).split(":")[-1] for row in concepts} != {"building", "unit"}:
        raise ValueError("SPARQL taxonomy query did not return building and unit")

    release_iri = URIRef("urn:ontograph:aurora-21:release:" + release["release"])
    derived_from = URIRef("http://www.w3.org/ns/prov#wasDerivedFrom")
    if (release_iri, derived_from, None) not in original:
        raise ValueError("Release provenance edge missing")
    print(f"Passed JSON-LD round trip on {len(original)} triples, taxonomy query and PROV-O derivation")


if __name__ == "__main__":
    main(sys.argv[1])

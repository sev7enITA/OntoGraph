"""Patch the existing decision gateway's successful login destination for guided cases."""
import sys
from pathlib import Path


def integrate_journey(source):
    anchor = "if (str_starts_with($uri, '/OntoGraph/decisions/')) {"
    end = "http_response_code($status);echo $result;"
    if source.count(anchor) != 1 or source.count(end) != 1 or "studioJourneyLoginResponse(" in source:
        raise ValueError("Expected an integrated Studio gateway without the guided login patch.")
    helper = "require_once dirname(__DIR__, 2).'/.ontograph/decisions/journey.php';\n"
    response = """if ($status === 200 && $method === 'GET' && parse_url($uri, PHP_URL_PATH) === '/OntoGraph/login') {
    $result = studioJourneyLoginResponse($result, $_GET['journey'] ?? null, $_GET['lang'] ?? null);
}
"""
    return source.replace(anchor, helper + anchor).replace(end, response + end)


if __name__ == "__main__":
    Path(sys.argv[2]).write_text(integrate_journey(Path(sys.argv[1]).read_text()))

"""Add the authenticated decision workspace to an existing OnToGraPh PHP gateway."""
import sys
from pathlib import Path


def integrate(source):
    marker = "$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';"
    end = 'curl_close($curl);http_response_code($status);echo $result;'
    if source.count(marker) != 1 or source.count(end) != 1 or "'/OntoGraph/decisions/'" in source:
        raise ValueError("Unrecognized or previously integrated gateway. Review before deployment.")
    route = """
if (parse_url($uri, PHP_URL_PATH) === '/OntoGraph/decisions') {
    header('Location: /OntoGraph/decisions/'.(($_GET['lang'] ?? '') === 'zh-Hans' ? '?lang=zh-Hans' : ''), true, 303);
    exit;
}
if (str_starts_with($uri, '/OntoGraph/decisions/')) {
    require dirname(__DIR__, 2).'/.ontograph/decisions/route.php';
    exit;
}
"""
    nav = """
curl_close($curl);
if ($status===200 && $method==='GET' && in_array(parse_url($uri,PHP_URL_PATH),['/OntoGraph/','/OntoGraph/platform.html'],true)) {
    $lang=(($_GET['lang'] ?? '')==='zh-Hans')?'zh-Hans':'en';
    $link='<a href="/OntoGraph/decisions/?lang='.$lang.'" data-zh="关系证据">Relationship evidence</a>';
    $result=str_replace('<div class="portal-sections">','<div class="portal-sections">'.$link,$result);
}
http_response_code($status);echo $result;
"""
    return source.replace(marker, marker + route).replace(end, nav)


if __name__ == "__main__":
    Path(sys.argv[2]).write_text(integrate(Path(sys.argv[1]).read_text()))

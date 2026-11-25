"""Build the private reader payload from a bilingual collection outside the checkout."""
import argparse
import json
import os
import re
import subprocess
import tempfile
from html import escape
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlsplit


class ArticleHTML(HTMLParser):
    """Keep ordinary article structure and safe hyperlinks, dropping active content."""

    tags = set("p h1 h2 h3 h4 h5 h6 ul ol li a strong em table thead tbody tr th td pre code "
               "blockquote hr br dl dt dd sup sub s".split())

    def __init__(self):
        super().__init__()
        self.parts = []

    def handle_starttag(self, tag, attrs):
        if tag not in self.tags:
            return
        attrs = dict(attrs)
        href = attrs.get("href", "")
        suffix = ""
        if tag == "a" and (urlsplit(href).scheme in {"https", "http"} or href.startswith("#")):
            suffix = ' href="' + escape(href, quote=True) + '" rel="noreferrer noopener"'
        if tag in {"h1", "h2", "h3", "h4", "h5", "h6"} and attrs.get("id"):
            suffix = ' id="' + escape(attrs["id"], quote=True) + '"'
        self.parts.append("<" + tag + suffix + ">")

    def handle_endtag(self, tag):
        if tag in self.tags and tag not in {"br", "hr"}:
            self.parts.append("</" + tag + ">")

    def handle_data(self, data):
        self.parts.append(escape(data))


def render(path):
    result = subprocess.run(["pandoc", "--from=gfm-raw_html", "--to=html5", "--wrap=none", str(path)],
                            capture_output=True, text=True, check=True)
    clean = ArticleHTML()
    clean.feed(result.stdout)
    clean.close()
    return "".join(clean.parts)


def build(source, output):
    source = source.resolve()
    root = Path(__file__).resolve().parents[1]
    if source.is_relative_to(root) or output.resolve().is_relative_to(root):
        raise ValueError("Keep private source and output outside the public checkout.")
    archive = []
    ids = set()
    for item in json.loads((source / "manifest.json").read_text()):
        doc = {k: item[k] for k in ("id", "title", "zhTitle", "summary", "zhSummary", "category", "date")}
        doc["zhCategory"] = item["zhCategory"]
        name = doc["id"]
        if not re.fullmatch(r"[a-z][a-z0-9-]{0,63}", name) or name in ids:
            raise ValueError(f"Invalid or duplicate document identifier {name!r}")
        ids.add(name)
        doc["html"] = render(source / f"{name}.en.md")
        doc["zhHtml"] = render(source / f"{name}.zh.md")
        archive.append(doc)
    if not archive:
        raise ValueError("Empty archive")
    with tempfile.NamedTemporaryFile(dir=output.parent, delete=False, mode="w", encoding="utf-8") as f:
        json.dump(archive, f, ensure_ascii=False)
    os.replace(f.name, output)
    return len(archive)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source", type=Path)
    parser.add_argument("output", type=Path)
    args = parser.parse_args()
    print(f"Built {build(args.source, args.output)} bilingual documents.")

#!/usr/bin/env python3
"""Regenerate development-reading-list.html from teaching/development-reading-list.md.

Keeps the live page head and sidebar, including the KaiTi-styled Chinese name
(span.name-zh), and writes the table of contents, citation lists, DOI links,
and a right-aligned back-to-top link at the end of each section.
"""

from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MARKDOWN = ROOT / "teaching" / "development-reading-list.md"
HTML = ROOT / "development-reading-list.html"

DOI_RE = re.compile(r"https://doi\.org/\S+")
ITALIC_RE = re.compile(r"\*([^*]+)\*")

BACK_TO_TOP_CSS = """
    h2#top {
      scroll-margin-top: 20px;
    }

    p.back-to-top {
      text-align: right;
      margin: -10px 0 24px;
      line-height: 1;
    }

    p.back-to-top a {
      color: #777;
      font-size: 15px;
    }

    p.back-to-top a:hover {
      color: #39c;
    }
"""


def slugify(text: str) -> str:
    text = text.lower()
    text = re.sub(r"[^\w\s-]", "", text, flags=re.UNICODE)
    text = re.sub(r"[\s_]+", "-", text)
    text = re.sub(r"-{2,}", "-", text)
    return text.strip("-")


def escape(text: str) -> str:
    return text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def render_inline(text: str) -> str:
    parts: list[tuple[str, str]] = []
    pos = 0
    for match in ITALIC_RE.finditer(text):
        if match.start() > pos:
            parts.append(("text", text[pos : match.start()]))
        parts.append(("em", match.group(1)))
        pos = match.end()
    if pos < len(text):
        parts.append(("text", text[pos:]))

    rendered: list[str] = []
    for kind, chunk in parts:
        with_links = DOI_RE.sub(
            lambda match: (
                f'<a href="{escape(match.group(0))}" title="{escape(match.group(0))}" '
                'target="_blank" rel="noopener noreferrer">DOI</a>'
            ),
            chunk,
        )
        pieces: list[str] = []
        for segment in re.split(r"(<a href=.*?</a>)", with_links):
            if segment.startswith("<a href="):
                pieces.append(segment)
            else:
                pieces.append(escape(segment))
        piece = "".join(pieces)
        rendered.append(f"<em>{piece}</em>" if kind == "em" else piece)
    return "".join(rendered)


def parse_markdown(markdown: str) -> tuple[str, str, list[tuple[str, list[tuple[bool, str]]]]]:
    title = None
    updated = None
    sections: list[tuple[str, list[tuple[bool, str]]]] = []
    current: tuple[str, list[tuple[bool, str]]] | None = None

    for line in markdown.splitlines():
        if not line.strip():
            continue
        if line.startswith("# ") and not line.startswith("## "):
            title = line[2:].strip()
            continue
        if line.startswith("## "):
            current = (line[3:].strip(), [])
            sections.append(current)
            continue
        if line.startswith("**Last updated:**"):
            updated = line.split("**Last updated:**", 1)[1].strip()
            continue
        if current is None:
            raise SystemExit(f"citation before any section: {line[:80]}")
        core = False
        body = line
        if body.startswith("*") and not body.startswith("**") and len(body) > 1 and body[1] not in "* \t":
            core = True
            body = body[1:]
        current[1].append((core, body))

    if not title or not updated or not sections:
        raise SystemExit("markdown is missing a title, last-updated line, or sections")
    return title, updated, sections


def render_section_body(title: str, updated: str, sections: list[tuple[str, list[tuple[bool, str]]]]) -> str:
    lines = [
        f'      <h2 id="top">{escape(title)}</h2>',
        f"      <p>Last updated: {escape(updated)}</p>",
        "      <p>* indicates core readings</p>",
        '      <nav aria-label="Contents">',
        "        <p><strong>Contents</strong></p>",
        "        <ol>",
    ]
    for heading, _entries in sections:
        lines.append(f'          <li><a href="#{slugify(heading)}">{escape(heading)}</a></li>')
    lines.extend(["        </ol>", "      </nav>"])

    for heading, entries in sections:
        lines.append(f'      <h3 id="{slugify(heading)}">{escape(heading)}</h3>')
        lines.append("      <ul>")
        for core, text in entries:
            inner = render_inline(text)
            if core:
                lines.append(f'        <li class="core">* {inner}</li>')
            else:
                lines.append(f"        <li>{inner}</li>")
        lines.append("      </ul>")
        lines.append('      <p class="back-to-top"><a href="#top" title="Back to top">↑</a></p>')
    return "\n".join(lines)


def ensure_back_to_top_css(prefix: str) -> str:
    if "p.back-to-top" in prefix:
        return prefix
    marker = "  </style>"
    if marker not in prefix:
        raise SystemExit("reading-list page is missing its <style> block")
    return prefix.replace(marker, BACK_TO_TOP_CSS + marker, 1)


def split_shell(html: str) -> tuple[str, str]:
    start = html.find("    <section>\n")
    end = html.find("    </section>\n")
    if start < 0 or end < 0 or end < start:
        raise SystemExit("could not find the reading-list <section> in the HTML shell")
    prefix = html[: start + len("    <section>\n")]
    suffix = html[end:]
    return prefix, suffix


def main() -> None:
    markdown = MARKDOWN.read_text()
    title, updated, sections = parse_markdown(markdown)
    prefix, suffix = split_shell(HTML.read_text())
    if 'class="name-zh"' not in prefix or "许志成" not in prefix:
        raise SystemExit("reading-list sidebar is missing the KaiTi Chinese name (.name-zh)")
    prefix = ensure_back_to_top_css(prefix)
    body = render_section_body(title, updated, sections)
    HTML.write_text(prefix + body + "\n" + suffix)

    entries = sum(len(items) for _heading, items in sections)
    doi_links = body.count(">DOI</a>")
    arrows = body.count('<a href="#top"')
    print(f"sections {len(sections)}")
    print(f"entries {entries}")
    print(f"doi_links {doi_links}")
    print(f"arrow_links {arrows}")
    print(f"updated {updated}")
    if arrows != len(sections):
        raise SystemExit("arrow link count does not match the section count")


if __name__ == "__main__":
    sys.exit(main())

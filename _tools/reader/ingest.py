#!/usr/bin/env python3
"""Compile a reader source document (constrained LaTeX subset) to canonical JSON.

Usage:
    python3 _tools/reader/ingest.py _tools/reader/docs/feynman-kac.tex

Writes assets/reader/<doc-id>/doc.json, where <doc-id> is the source basename.

Supported subset (see docs/feynman-kac.tex for a live example):
    \\section{...}
    \\begin{theorem|definition|lemma|proposition|remark|example|proof}[Optional title]
    inline $...$ and display \\[...\\] math (kept verbatim for MathJax)
    \\concept{display text}{concept-id}   -> clickable concept span
    \\emph, \\textbf, accents (\\^o \\"o \\'e), ``quotes'', --- and -- dashes

Math must not contain literal <, > or & characters (use \\le, \\ge, \\mid).

Each block gets a stable 4-character tag derived from a hash of its content,
so notes and cards anchored to a block survive edits elsewhere in the document.

Concept auto-linking: the registry at assets/reader/concepts/index.json lists
every concept with its aliases. After conversion, the first occurrence of any
alias in each block (outside math, outside tags, outside existing concept
spans) is wrapped in a concept span automatically — so every mention of, say,
Brownian motion links to the same card without manual \\concept markup. The
macro remains as an explicit override.
"""

import hashlib
import json
import re
import sys
from pathlib import Path

ENVS = ("theorem", "definition", "lemma", "proposition", "remark", "example", "proof")

ACCENTS = {
    r"\^o": "ô", r"\^e": "ê", r"\^a": "â",
    r'\"o': "ö", r'\"a': "ä", r'\"u': "ü",
    r"\'e": "é", r"\'a": "á", r"\'o": "ó",
    r"\`e": "è", r"\`a": "à",
}


def convert_inline(tex: str) -> str:
    """Convert inline LaTeX to HTML, leaving math delimiters for MathJax."""
    s = tex
    s = s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
    for k, v in ACCENTS.items():
        s = s.replace(k, v)
    s = re.sub(r"``(.*?)''", r"“\1”", s, flags=re.S)
    s = s.replace("---", "—").replace("--", "–")
    s = re.sub(
        r"\\concept\{([^{}]*)\}\{([^{}]*)\}",
        r'<span class="concept" data-concept="\2" role="button" tabindex="0">\1</span>',
        s,
    )
    s = re.sub(r"\\emph\{([^{}]*)\}", r"<em>\1</em>", s)
    s = re.sub(r"\\textit\{([^{}]*)\}", r"<em>\1</em>", s)
    s = re.sub(r"\\textbf\{([^{}]*)\}", r"<strong>\1</strong>", s)
    return s.strip()


def to_paragraphs(body: str) -> str:
    """Split on blank lines and wrap each paragraph in <p>."""
    paras = [p.strip() for p in re.split(r"\n\s*\n", body) if p.strip()]
    return "".join(f"<p>{convert_inline(p)}</p>" for p in paras)


REGISTRY_PATH = Path("assets/reader/concepts/index.json")


def load_matchers():
    """Alias matchers from the concept registry, longest alias first."""
    if not REGISTRY_PATH.exists():
        return []
    registry = json.loads(REGISTRY_PATH.read_text(encoding="utf-8"))
    matchers = []
    for c in registry.get("concepts", []):
        aliases = set(c.get("aliases", [])) | {c["title"]}
        for alias in aliases:
            # All-caps aliases (SDE) must match case exactly; others are
            # case-insensitive so sentence-initial capitals still link.
            flags = 0 if alias.isupper() else re.IGNORECASE
            pat = re.compile(
                rf"(?<![\w–-]){re.escape(alias)}(?![\w–-])", flags
            )
            avoid = [
                re.compile(rf"(?:^|\W){re.escape(p)}\s+$", re.IGNORECASE)
                for p in c.get("avoidPrefixes", [])
            ]
            matchers.append({"id": c["id"], "len": len(alias), "pat": pat, "avoid": avoid})
    matchers.sort(key=lambda m: -m["len"])
    return matchers


# Regions where auto-linking must never happen: math (kept verbatim for
# MathJax) and HTML tags produced by convert_inline.
PROTECTED_RE = re.compile(r"\$[^$]*\$|\\\[.*?\\\]|<[^>]+>", re.S)


def autolink(html: str, matchers) -> str:
    """Wrap the first eligible occurrence of each concept alias per block.

    Once per block per concept keeps the text calm while guaranteeing every
    part of the page links each concept to the same card. Text already inside
    a concept span (from the \\concept macro) is skipped, and concepts the
    block already links by hand are not linked again.
    """
    if not matchers:
        return html
    linked = set(re.findall(r'data-concept="([^"]+)"', html))
    out = []
    pos = 0
    in_concept_span = False
    segments = []  # (is_text, chunk)
    for m in PROTECTED_RE.finditer(html):
        segments.append((True, html[pos:m.start()]))
        segments.append((False, m.group(0)))
        pos = m.end()
    segments.append((True, html[pos:]))

    for is_text, chunk in segments:
        if not is_text:
            if chunk.startswith("<span") and 'class="concept"' in chunk:
                in_concept_span = True
            elif chunk == "</span>" and in_concept_span:
                in_concept_span = False
            out.append(chunk)
            continue
        if in_concept_span:
            out.append(chunk)
            continue
        out.append(link_segment(chunk, matchers, linked))
    return "".join(out)


def link_segment(text: str, matchers, linked) -> str:
    result = []
    while True:
        best = None
        for m in matchers:
            if m["id"] in linked:
                continue
            match = m["pat"].search(text)
            while match and any(a.search(text[: match.start()]) for a in m["avoid"]):
                match = m["pat"].search(text, match.end())
            if match and (best is None or match.start() < best[0].start()):
                best = (match, m)
        if best is None:
            result.append(text)
            return "".join(result)
        match, m = best
        linked.add(m["id"])
        result.append(text[: match.start()])
        result.append(
            f'<span class="concept" data-concept="{m["id"]}" role="button" '
            f'tabindex="0">{match.group(0)}</span>'
        )
        text = text[match.end():]


def make_tagger(doc_id: str):
    seen = set()

    def tag(kind: str, raw: str) -> str:
        salt = 0
        while True:
            digest = hashlib.sha1(f"{doc_id}|{kind}|{raw}|{salt}".encode()).hexdigest()
            n = int(digest[:12], 16)
            alphabet = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ"
            t = ""
            for _ in range(4):
                t += alphabet[n % 36]
                n //= 36
            if t not in seen:
                seen.add(t)
                return t
            salt += 1

    return tag


def parse(tex: str, doc_id: str) -> dict:
    title_m = re.search(r"\\title\{([^{}]*)\}", tex)
    title = convert_inline(title_m.group(1)) if title_m else doc_id

    body_m = re.search(r"\\begin\{document\}(.*)\\end\{document\}", tex, re.S)
    if not body_m:
        sys.exit("error: no \\begin{document}...\\end{document} found")
    body = body_m.group(1)
    body = "\n".join(ln for ln in body.splitlines() if not ln.lstrip().startswith("%"))

    tag = make_tagger(doc_id)
    blocks = []
    concepts = set()

    env_names = "|".join(ENVS)
    token_re = re.compile(
        rf"\\section\{{(?P<sec>[^{{}}]*)\}}"
        rf"|\\begin\{{(?P<env>{env_names})\}}(?:\[(?P<envtitle>[^\[\]]*)\])?"
        rf"(?P<envbody>.*?)\\end\{{(?P=env)\}}",
        re.S,
    )

    def emit_paragraphs(text: str):
        for para in re.split(r"\n\s*\n", text):
            if not para.strip():
                continue
            blocks.append({
                "tag": tag("para", para.strip()),
                "type": "para",
                "html": convert_inline(para),
            })

    pos = 0
    for m in token_re.finditer(body):
        emit_paragraphs(body[pos:m.start()])
        pos = m.end()
        if m.group("sec") is not None:
            heading = m.group("sec")
            blocks.append({
                "tag": tag("section", heading),
                "type": "section",
                "html": convert_inline(heading),
            })
        else:
            env, envtitle, envbody = m.group("env"), m.group("envtitle"), m.group("envbody")
            block = {
                "tag": tag(env, envbody.strip()),
                "type": env,
                "html": to_paragraphs(envbody),
            }
            if envtitle:
                block["title"] = convert_inline(envtitle)
            blocks.append(block)
    emit_paragraphs(body[pos:])

    matchers = load_matchers()
    for b in blocks:
        if b["type"] != "section":
            b["html"] = autolink(b["html"], matchers)

    for b in blocks:
        concepts.update(re.findall(r'data-concept="([^"]+)"', b["html"]))

    return {
        "id": doc_id,
        "title": title,
        "source": f"_tools/reader/docs/{doc_id}.tex",
        "concepts": sorted(concepts),
        "blocks": blocks,
    }


def main():
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    src = Path(sys.argv[1])
    doc_id = src.stem
    doc = parse(src.read_text(encoding="utf-8"), doc_id)
    out = Path("assets/reader") / doc_id / "doc.json"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(doc, ensure_ascii=False, indent=1), encoding="utf-8")
    kinds = {}
    for b in doc["blocks"]:
        kinds[b["type"]] = kinds.get(b["type"], 0) + 1
    print(f"{out}: {len(doc['blocks'])} blocks {kinds}, concepts: {', '.join(doc['concepts'])}")


if __name__ == "__main__":
    main()

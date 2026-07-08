// Concept registry — the single database of concepts shared by every
// document. It supplies titles, one-line math TL;DRs (tooltips + card
// headers), alias patterns for client-side auto-linking inside panes, and
// the concept index. doc.json arrives pre-linked by the ingest pipeline;
// this module applies the same linking rules to runtime-rendered content
// (cards, AI answers stay untouched) so every mention of a concept points
// at the same card.

let concepts = [];
const byId = new Map();
let matchers = [];

export async function loadRegistry(url) {
  try {
    const res = await fetch(url);
    if (!res.ok) return;
    concepts = (await res.json()).concepts || [];
  } catch {
    return; // registry is an enhancement; the reader degrades gracefully
  }
  for (const c of concepts) byId.set(c.id, c);
  matchers = [];
  for (const c of concepts) {
    const aliases = new Set([c.title, ...(c.aliases || [])]);
    for (const alias of aliases) {
      matchers.push({
        id: c.id,
        len: alias.length,
        re: new RegExp(
          `(?<![\\p{L}\\p{N}_–-])${escapeRe(alias)}(?![\\p{L}\\p{N}_–-])`,
          alias === alias.toUpperCase() ? 'gu' : 'giu',
        ),
        avoid: (c.avoidPrefixes || []).map(
          (p) => new RegExp(`(?:^|\\P{L})${escapeRe(p)}\\s+$`, 'iu'),
        ),
      });
    }
  }
  matchers.sort((a, b) => b.len - a.len);
}

function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function getConcept(id) {
  return byId.get(id) || null;
}

export function conceptTitle(id) {
  return byId.get(id)?.title || id.replace(/-/g, ' ');
}

export function allConcepts() {
  return concepts;
}

// --- Client-side auto-linking -------------------------------------------

const MATH_RE = /\$[^$]*\$|\\\[[\s\S]*?\\\]/g;

// Wraps the first occurrence of each concept alias inside `root` in a
// concept span (same markup the ingest pipeline emits). Skips math, existing
// concept spans, and interactive elements. `exclude` prevents a card from
// linking to itself.
export function linkify(root, { exclude } = {}) {
  if (matchers.length === 0) return;
  const linked = new Set(exclude ? [exclude] : []);
  for (const el of root.querySelectorAll('.concept')) linked.add(el.dataset.concept);

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(n) {
      if (!n.data.trim()) return NodeFilter.FILTER_REJECT;
      if (n.parentElement?.closest('.concept, mjx-container, button, a, input, textarea, script, style')) {
        return NodeFilter.FILTER_REJECT;
      }
      return NodeFilter.FILTER_ACCEPT;
    },
  });
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  for (let node of nodes) {
    while (node) node = linkNode(node, linked);
  }
}

// Links the earliest eligible alias in a text node; returns the remainder
// text node (to keep scanning) or null when nothing more matches.
function linkNode(node, linked) {
  const text = node.data;
  const mask = [];
  for (const m of text.matchAll(MATH_RE)) mask.push([m.index, m.index + m[0].length]);

  let best = null;
  for (const m of matchers) {
    if (linked.has(m.id)) continue;
    m.re.lastIndex = 0;
    let match;
    while ((match = m.re.exec(text))) {
      const [s, e] = [match.index, match.index + match[0].length];
      if (mask.some(([a, b]) => s < b && e > a)) continue;
      if (m.avoid.some((a) => a.test(text.slice(0, s)))) continue;
      break;
    }
    if (!match) continue;
    if (!best || match.index < best.start || (match.index === best.start && match[0].length > best.len)) {
      best = { start: match.index, len: match[0].length, id: m.id };
    }
  }
  if (!best) return null;

  linked.add(best.id);
  const target = node.splitText(best.start);
  const rest = target.splitText(best.len);
  const span = document.createElement('span');
  span.className = 'concept';
  span.dataset.concept = best.id;
  span.setAttribute('role', 'button');
  span.tabIndex = 0;
  target.parentNode.replaceChild(span, target);
  span.appendChild(target);
  return rest;
}

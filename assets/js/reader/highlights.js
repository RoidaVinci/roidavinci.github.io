// Highlights — locally stored, quote-anchored (hypothes.is style).
// Each highlight stores its block tag plus the exact quote and surrounding
// context, so it survives typesetting and re-renders and detaches only if
// its own passage changes. Highlights never cross math or block boundaries;
// the selection toolbar only offers highlighting when the anchor is sound.

const STORAGE = 'reader.highlights';
const CONTEXT = 32;

function load() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE)) || {};
  } catch {
    return {};
  }
}

function save(all) {
  localStorage.setItem(STORAGE, JSON.stringify(all));
  document.dispatchEvent(new CustomEvent('reader:annotations-changed'));
}

export function listHighlights(docId) {
  return load()[docId] || [];
}

// Text nodes that count as "visible prose" for anchoring. Math is excluded:
// MathJax renders characters via CSS, so its text content is unstable.
function proseNodes(root) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(n) {
      if (n.parentElement?.closest('mjx-container, .rblock-tools, button, script, style')) {
        return NodeFilter.FILTER_REJECT;
      }
      return NodeFilter.FILTER_ACCEPT;
    },
  });
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  return nodes;
}

function offsetOf(nodes, container, offset) {
  let total = 0;
  for (const n of nodes) {
    if (n === container) return total + offset;
    total += n.data.length;
  }
  return -1;
}

// True if the range can be highlighted: inside a single block, not touching
// rendered math.
export function canHighlight(range, blockEl) {
  if (!blockEl) return false;
  if (!blockEl.contains(range.startContainer) || !blockEl.contains(range.endContainer)) return false;
  const frag = range.cloneContents();
  return !frag.querySelector('mjx-container');
}

export function addHighlight(docId, tag, blockEl, range) {
  const nodes = proseNodes(blockEl);
  const start = offsetOf(nodes, range.startContainer, range.startOffset);
  const end = offsetOf(nodes, range.endContainer, range.endOffset);
  if (start === -1 || end === -1 || end <= start) return null;

  const text = nodes.map((n) => n.data).join('');
  const hl = {
    id: `hl-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    tag,
    quote: text.slice(start, end),
    prefix: text.slice(Math.max(0, start - CONTEXT), start),
    suffix: text.slice(end, end + CONTEXT),
    created: Date.now(),
  };
  if (!hl.quote.trim()) return null;

  const all = load();
  all[docId] = all[docId] || [];
  all[docId].push(hl);
  save(all);
  paint(blockEl, hl, start, end);
  return hl;
}

export function removeHighlight(docId, id) {
  const all = load();
  all[docId] = (all[docId] || []).filter((h) => h.id !== id);
  save(all);
  for (const mark of document.querySelectorAll(`mark.reader-hl[data-hl="${id}"]`)) {
    const parent = mark.parentNode;
    mark.replaceWith(...mark.childNodes);
    parent.normalize();
  }
}

// Re-anchors and paints every stored highlight. Call after MathJax has
// typeset the document (anchoring text must match its final state).
export function applyHighlights(docId, container) {
  let orphans = 0;
  for (const hl of listHighlights(docId)) {
    const blockEl = container.querySelector(`.rblock[data-tag="${hl.tag}"]`);
    if (!blockEl || !anchor(blockEl, hl)) orphans += 1;
  }
  return orphans;
}

function anchor(blockEl, hl) {
  const nodes = proseNodes(blockEl);
  const text = nodes.map((n) => n.data).join('');
  const candidates = [];
  let i = text.indexOf(hl.quote);
  while (i !== -1) {
    candidates.push(i);
    i = text.indexOf(hl.quote, i + 1);
  }
  if (candidates.length === 0) return false;

  // Prefer the occurrence whose neighbourhood best matches the stored context.
  const score = (s) => {
    const e = s + hl.quote.length;
    let sc = 0;
    if (text.slice(Math.max(0, s - CONTEXT), s) === hl.prefix) sc += 2;
    if (text.slice(e, e + CONTEXT) === hl.suffix) sc += 2;
    return sc;
  };
  candidates.sort((a, b) => score(b) - score(a));
  const start = candidates[0];
  paint(blockEl, hl, start, start + hl.quote.length);
  return true;
}

function paint(blockEl, hl, start, end) {
  const nodes = proseNodes(blockEl);
  let pos = 0;
  for (const node of nodes) {
    const len = node.data.length;
    const s = Math.max(start - pos, 0);
    const e = Math.min(end - pos, len);
    pos += len;
    if (e <= 0 || s >= len || s >= e) continue;
    let target = node;
    if (s > 0) target = target.splitText(s);
    if (e - s < target.data.length) target.splitText(e - s);
    const mark = document.createElement('mark');
    mark.className = 'reader-hl';
    mark.dataset.hl = hl.id;
    target.parentNode.replaceChild(mark, target);
    mark.appendChild(target);
  }
}

// Click a highlight -> small popover offering removal.
export function wireHighlightActions(docId, container) {
  let pop = null;
  const dismiss = () => {
    pop?.remove();
    pop = null;
  };
  container.addEventListener('click', (e) => {
    const mark = e.target.closest('mark.reader-hl');
    if (!mark) {
      dismiss();
      return;
    }
    dismiss();
    pop = document.createElement('div');
    pop.className = 'reader-hl-pop';
    const btn = document.createElement('button');
    btn.textContent = 'Remove highlight';
    btn.addEventListener('click', () => {
      removeHighlight(docId, mark.dataset.hl);
      dismiss();
    });
    pop.appendChild(btn);
    const rect = mark.getBoundingClientRect();
    pop.style.left = `${window.scrollX + rect.left}px`;
    pop.style.top = `${window.scrollY + rect.bottom + 6}px`;
    document.body.appendChild(pop);
  });
  window.addEventListener('scroll', dismiss, { passive: true });
}

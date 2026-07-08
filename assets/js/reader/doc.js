// Canonical-layer renderer: turns doc.json blocks into DOM, wires block
// tools (note, permalink), concept interactions (click + hover preview),
// and the selection toolbar (highlight / ask). The canonical text itself is
// never touched by AI at runtime.

import { openConcept, pushAsk } from './cards.js';
import { pushNote } from './notes-pane.js';
import { aiEnabled } from './ask.js';
import { hasNote } from './notes.js';
import { getConcept } from './registry.js';
import { typeset } from './panes.js';
import { canHighlight, addHighlight } from './highlights.js';

const ENV_LABELS = {
  theorem: 'Theorem',
  definition: 'Definition',
  lemma: 'Lemma',
  proposition: 'Proposition',
  remark: 'Remark',
  example: 'Example',
};

const ICONS = {
  note: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"/></svg>',
  link: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>',
};

export function renderDoc(doc, container) {
  const counters = {};
  let sectionNum = 0;
  for (const block of doc.blocks) {
    const wrap = document.createElement('div');
    wrap.className = 'rblock';
    wrap.dataset.tag = block.tag;

    if (block.type === 'section') {
      sectionNum += 1;
      const h = document.createElement('h2');
      h.className = 'reader-section';
      h.id = `sec-${sectionNum}`;
      h.innerHTML = `<span class="reader-section-num">${sectionNum}</span><span class="reader-section-text">${block.html}</span>`;
      wrap.appendChild(h);
    } else if (block.type === 'para') {
      const p = document.createElement('p');
      p.innerHTML = block.html;
      wrap.appendChild(p);
    } else if (block.type === 'proof') {
      const div = document.createElement('div');
      div.className = 'proof';
      let html = block.html.replace('<p>', '<p><em>Proof.</em> ');
      const lastClose = html.lastIndexOf('</p>');
      if (lastClose !== -1) {
        html = `${html.slice(0, lastClose)} <span class="qed">∎</span></p>`;
      }
      div.innerHTML = html;
      wrap.appendChild(div);
    } else {
      const label = ENV_LABELS[block.type] || block.type;
      counters[block.type] = (counters[block.type] || 0) + 1;
      const name = block.title ? `<span class="env-name">· ${block.title}</span>` : '';
      const div = document.createElement('div');
      div.className = block.type;
      div.innerHTML = `<span class="env-label">${label} ${counters[block.type]}${name}</span>${block.html}`;
      wrap.appendChild(div);
    }

    if (block.type !== 'section') {
      wrap.appendChild(blockTools(doc, block, wrap));
      if (hasNote(doc.id, block.tag)) wrap.classList.add('has-note');
    }

    container.appendChild(wrap);
  }

  wireSelectionToolbar(container);
}

function blockTools(doc, block, wrap) {
  const tools = document.createElement('div');
  tools.className = 'rblock-tools';

  const noteBtn = document.createElement('button');
  noteBtn.className = 'rblock-tool rblock-note-btn';
  noteBtn.innerHTML = ICONS.note;
  noteBtn.title = 'Add a note to this block';
  noteBtn.setAttribute('aria-label', 'Add or edit note for this block');
  noteBtn.addEventListener('click', () => pushNote(doc, block, wrap));
  tools.appendChild(noteBtn);

  const linkBtn = document.createElement('button');
  linkBtn.className = 'rblock-tool';
  linkBtn.innerHTML = ICONS.link;
  linkBtn.title = `Copy link to this block [${block.tag}]`;
  linkBtn.setAttribute('aria-label', 'Copy link to this block');
  linkBtn.addEventListener('click', async () => {
    const url = `${location.origin}${location.pathname}#b/${block.tag}`;
    try {
      await navigator.clipboard.writeText(url);
      flashTool(linkBtn, '✓');
    } catch {
      prompt('Link to this block:', url); // eslint-disable-line no-alert
    }
  });
  tools.appendChild(linkBtn);

  return tools;
}

function flashTool(btn, glyph) {
  const prev = btn.innerHTML;
  btn.innerHTML = `<span class="rblock-tool-flash">${glyph}</span>`;
  setTimeout(() => {
    btn.innerHTML = prev;
  }, 1200);
}

export function scrollToTag(tag) {
  const el = document.querySelector(`.rblock[data-tag="${tag}"]`);
  if (!el) return false;
  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  el.classList.remove('is-flash');
  requestAnimationFrame(() => el.classList.add('is-flash'));
  setTimeout(() => el.classList.remove('is-flash'), 1600);
  return true;
}

function blockContext(el) {
  const block = el.closest('.rblock, .reader-pane');
  const text = (block?.textContent || '').replace(/\s+/g, ' ').trim();
  return text.length > 1500 ? `${text.slice(0, 1500)}…` : text;
}

/* --- Concept interactions: click + keyboard + hover preview --------------
   Wired at document level so concept links behave identically in the main
   text, in cards, and in any future pane. */

export function wireConceptInteractions() {
  const activate = (span) => {
    hideTip();
    openConcept(span.dataset.concept, span.textContent, blockContext(span));
  };
  document.addEventListener('click', (e) => {
    const span = e.target.closest('.concept');
    if (span) activate(span);
  });
  document.addEventListener('keydown', (e) => {
    if ((e.key === 'Enter' || e.key === ' ') && e.target.classList?.contains('concept')) {
      e.preventDefault();
      activate(e.target);
    }
  });
  wireTooltip();
}

let tip = null;
let tipTimer = null;

function hideTip() {
  clearTimeout(tipTimer);
  tipTimer = null;
  tip?.remove();
  tip = null;
}

function showTip(span) {
  const concept = getConcept(span.dataset.concept);
  if (!concept?.tldr) return;
  hideTip();
  tip = document.createElement('div');
  tip.className = 'reader-tip';
  tip.setAttribute('role', 'tooltip');
  tip.innerHTML = `<p class="reader-tip-title">${concept.title}</p>
    <p class="reader-tip-tldr">${concept.tldr}</p>
    <p class="reader-tip-hint">Click to open the card</p>`;
  document.body.appendChild(tip);
  typeset(tip);

  const rect = span.getBoundingClientRect();
  const tw = tip.offsetWidth;
  const th = tip.offsetHeight;
  const left = Math.max(8, Math.min(rect.left, window.innerWidth - tw - 8));
  const below = rect.bottom + 8 + th < window.innerHeight;
  tip.style.left = `${left}px`;
  tip.style.top = `${below ? rect.bottom + 8 : Math.max(8, rect.top - th - 8)}px`;
}

function wireTooltip() {
  document.addEventListener('mouseover', (e) => {
    const span = e.target.closest('.concept');
    if (!span) return;
    clearTimeout(tipTimer);
    tipTimer = setTimeout(() => showTip(span), 240);
  });
  document.addEventListener('mouseout', (e) => {
    if (e.target.closest?.('.concept')) hideTip();
  });
  document.addEventListener('focusin', (e) => {
    if (e.target.classList?.contains('concept')) showTip(e.target);
  });
  document.addEventListener('focusout', (e) => {
    if (e.target.classList?.contains('concept')) hideTip();
  });
  window.addEventListener('scroll', hideTip, { passive: true });
}

/* --- Selection toolbar: highlight + ask ---------------------------------- */

let currentDoc = null;

export function setCurrentDoc(doc) {
  currentDoc = doc;
}

function wireSelectionToolbar(container) {
  let bar = null;
  const removeBar = () => {
    bar?.remove();
    bar = null;
  };

  document.addEventListener('selectionchange', () => {
    // Defer so a click on the toolbar itself wins before the selection collapses.
    setTimeout(() => {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed) {
        removeBar();
        return;
      }
      const range = sel.getRangeAt(0);
      if (!container.contains(range.commonAncestorContainer)) {
        removeBar();
        return;
      }
      const text = sel.toString().trim();
      if (text.length < 3) {
        removeBar();
        return;
      }

      const blockEl = (range.commonAncestorContainer.nodeType === 1
        ? range.commonAncestorContainer
        : range.commonAncestorContainer.parentElement
      )?.closest('.rblock');
      const highlightable = blockEl && canHighlight(range, blockEl) && currentDoc;
      const askable = aiEnabled();
      if (!highlightable && !askable) {
        removeBar();
        return;
      }

      removeBar();
      bar = document.createElement('div');
      bar.className = 'reader-selbar';

      if (highlightable) {
        const hlBtn = document.createElement('button');
        hlBtn.innerHTML = '<span class="reader-selbar-swatch"></span>Highlight';
        hlBtn.addEventListener('click', () => {
          addHighlight(currentDoc.id, blockEl.dataset.tag, blockEl, range);
          removeBar();
          window.getSelection()?.removeAllRanges();
        });
        bar.appendChild(hlBtn);
      }

      if (askable) {
        const askBtn = document.createElement('button');
        askBtn.textContent = 'Ask about this';
        askBtn.addEventListener('click', () => {
          const context = blockContext(
            range.commonAncestorContainer.nodeType === 1
              ? range.commonAncestorContainer
              : range.commonAncestorContainer.parentElement,
          );
          removeBar();
          window.getSelection()?.removeAllRanges();
          pushAsk('Selection', context, `In this passage, explain: “${text}”`);
        });
        bar.appendChild(askBtn);
      }

      const rect = range.getBoundingClientRect();
      document.body.appendChild(bar);
      const left = Math.max(8, Math.min(window.scrollX + rect.left, window.scrollX + window.innerWidth - bar.offsetWidth - 8));
      bar.style.left = `${left}px`;
      bar.style.top = `${window.scrollY + rect.bottom + 6}px`;
    }, 10);
  });
}

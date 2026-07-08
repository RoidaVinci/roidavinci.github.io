// Canonical-layer renderer: turns doc.json blocks into DOM, wires concept
// spans, per-block note buttons, and the select-to-ask affordance. The
// canonical text itself is never touched by AI at runtime.

import { openConcept, pushAsk } from './cards.js';
import { pushNote } from './notes-pane.js';
import { aiEnabled } from './ask.js';
import { hasNote } from './notes.js';

const ENV_LABELS = {
  theorem: 'Theorem',
  definition: 'Definition',
  lemma: 'Lemma',
  proposition: 'Proposition',
  remark: 'Remark',
  example: 'Example',
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
      const noteBtn = document.createElement('button');
      noteBtn.className = 'rblock-note-btn';
      noteBtn.textContent = '✎';
      noteBtn.title = 'Note on this block';
      noteBtn.setAttribute('aria-label', 'Add or edit note for this block');
      noteBtn.addEventListener('click', () => pushNote(doc, block, wrap));
      wrap.appendChild(noteBtn);
      if (hasNote(doc.id, block.tag)) wrap.classList.add('has-note');
    }

    container.appendChild(wrap);
  }

  wireConcepts(container);
  wireSelectionAsk(container);
}

function blockContext(el) {
  const block = el.closest('.rblock');
  const text = (block?.textContent || '').replace(/\s+/g, ' ').trim();
  return text.length > 1500 ? `${text.slice(0, 1500)}…` : text;
}

function wireConcepts(container) {
  const activate = (span) => {
    openConcept(span.dataset.concept, span.textContent, blockContext(span));
  };
  container.addEventListener('click', (e) => {
    const span = e.target.closest('.concept');
    if (span) activate(span);
  });
  container.addEventListener('keydown', (e) => {
    if ((e.key === 'Enter' || e.key === ' ') && e.target.classList?.contains('concept')) {
      e.preventDefault();
      activate(e.target);
    }
  });
}

// Select any passage -> floating "Ask" button -> question pane anchored to it.
function wireSelectionAsk(container) {
  let floatBtn = null;
  const removeBtn = () => {
    floatBtn?.remove();
    floatBtn = null;
  };

  document.addEventListener('selectionchange', () => {
    // Defer so click on the button itself wins before the selection collapses.
    setTimeout(() => {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed || !aiEnabled()) {
        removeBtn();
        return;
      }
      const range = sel.getRangeAt(0);
      if (!container.contains(range.commonAncestorContainer)) {
        removeBtn();
        return;
      }
      const text = sel.toString().trim();
      if (text.length < 3) {
        removeBtn();
        return;
      }
      const rect = range.getBoundingClientRect();
      if (!floatBtn) {
        floatBtn = document.createElement('button');
        floatBtn.className = 'reader-ask-float';
        floatBtn.textContent = 'Ask about this';
        document.body.appendChild(floatBtn);
      }
      floatBtn.style.left = `${window.scrollX + rect.left}px`;
      floatBtn.style.top = `${window.scrollY + rect.bottom + 6}px`;
      floatBtn.onclick = () => {
        const context = blockContext(
          range.commonAncestorContainer.nodeType === 1
            ? range.commonAncestorContainer
            : range.commonAncestorContainer.parentElement,
        );
        removeBtn();
        window.getSelection()?.removeAllRanges();
        pushAsk('Selection', context, `In this passage, explain: “${text}”`);
      };
    }, 10);
  });
}

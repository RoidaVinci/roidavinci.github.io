// Annotation panes: the per-block note editor and the document-wide
// annotations pane (all notes + highlights, with jump links and export).

import { push, popTo } from './panes.js';
import {
  getNote, setNote, listNotes, exportNotes, blockSnippet, blockOrder,
} from './notes.js';
import { listHighlights, removeHighlight } from './highlights.js';
import { scrollToTag } from './doc.js';

export function pushNote(doc, block, blockEl) {
  push({
    title: 'Note',
    render(el) {
      const snippet = document.createElement('div');
      snippet.className = 'reader-note-context';
      snippet.innerHTML = block.html;
      el.innerHTML = `<p class="reader-pane-eyebrow">Your note · stays local</p><h2>Note <span class="reader-tag-chip">${block.tag}</span></h2>`;
      el.appendChild(snippet);

      const textarea = document.createElement('textarea');
      textarea.className = 'reader-note-textarea';
      textarea.placeholder = 'Your note on this block…';
      textarea.value = getNote(doc.id, block.tag);
      el.appendChild(textarea);

      const status = document.createElement('div');
      status.className = 'reader-note-status';
      status.textContent = 'Autosaves locally in this browser · export from the Annotations pane.';
      el.appendChild(status);

      let timer;
      textarea.addEventListener('input', () => {
        clearTimeout(timer);
        timer = setTimeout(() => {
          setNote(doc.id, block.tag, textarea.value);
          blockEl.classList.toggle('has-note', Boolean(textarea.value.trim()));
          status.textContent = 'Saved.';
        }, 300);
      });
      textarea.focus();
    },
  });
}

export function pushAnnotations(doc) {
  push({
    title: 'Annotations',
    render(el) {
      el.innerHTML = '<p class="reader-pane-eyebrow">Yours · stays local</p><h2>Notes &amp; highlights</h2>';

      const notes = listNotes(doc.id);
      const tags = Object.keys(notes).sort((a, b) => blockOrder(doc, a) - blockOrder(doc, b));
      const highlights = [...listHighlights(doc.id)]
        .sort((a, b) => blockOrder(doc, a.tag) - blockOrder(doc, b.tag));

      if (tags.length === 0 && highlights.length === 0) {
        el.insertAdjacentHTML(
          'beforeend',
          '<p class="reader-hint">Nothing yet. Hover a paragraph and use the pencil to attach a note, or select any passage to highlight it. Everything stays in this browser.</p>',
        );
        return;
      }

      const jump = (tag) => {
        popTo(0);
        scrollToTag(tag);
      };

      if (tags.length) {
        el.insertAdjacentHTML('beforeend', '<h3>Notes</h3>');
        for (const tag of tags) {
          const item = document.createElement('div');
          item.className = 'reader-ann';
          const source = document.createElement('button');
          source.className = 'reader-ann-source';
          source.title = 'Jump to this block';
          source.textContent = blockSnippet(doc, tag, 110);
          source.addEventListener('click', () => jump(tag));
          const body = document.createElement('p');
          body.className = 'reader-ann-note';
          body.textContent = notes[tag];
          item.appendChild(source);
          item.appendChild(body);
          el.appendChild(item);
        }
      }

      if (highlights.length) {
        el.insertAdjacentHTML('beforeend', '<h3>Highlights</h3>');
        for (const hl of highlights) {
          const item = document.createElement('div');
          item.className = 'reader-ann';
          const source = document.createElement('button');
          source.className = 'reader-ann-source is-hl';
          source.title = 'Jump to this highlight';
          source.textContent = `“${hl.quote.length > 140 ? `${hl.quote.slice(0, 140)}…` : hl.quote}”`;
          source.addEventListener('click', () => jump(hl.tag));
          const remove = document.createElement('button');
          remove.className = 'reader-ann-remove';
          remove.textContent = 'Remove';
          remove.addEventListener('click', () => {
            removeHighlight(doc.id, hl.id);
            item.remove();
          });
          item.appendChild(source);
          item.appendChild(remove);
          el.appendChild(item);
        }
      }

      const exportBtn = document.createElement('button');
      exportBtn.className = 'reader-btn';
      exportBtn.style.marginTop = '1.1rem';
      exportBtn.textContent = 'Export as markdown ↓';
      exportBtn.addEventListener('click', () => exportNotes(doc));
      el.appendChild(exportBtn);
    },
  });
}

// Note-editing pane: attached to a block's stable tag, autosaved locally.

import { push } from './panes.js';
import { getNote, setNote } from './notes.js';

export function pushNote(doc, block, blockEl) {
  push({
    title: 'Note',
    render(el) {
      const snippet = document.createElement('div');
      snippet.className = 'reader-note-context';
      snippet.innerHTML = block.html;
      el.innerHTML = `<p class="reader-pane-eyebrow">Your note · stays local</p><h2>Note <span style="font-weight:400;color:var(--color-text-muted);font-size:0.8em">[${block.tag}]</span></h2>`;
      el.appendChild(snippet);

      const textarea = document.createElement('textarea');
      textarea.className = 'reader-note-textarea';
      textarea.placeholder = 'Your note on this block…';
      textarea.value = getNote(doc.id, block.tag);
      el.appendChild(textarea);

      const status = document.createElement('div');
      status.className = 'reader-note-status';
      status.textContent = 'Saved locally in this browser; export from the toolbar.';
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

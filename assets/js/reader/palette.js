// Command palette (⌘K / Ctrl-K / "/") — instant search over the concept
// database, section headings, and the full text. Dependency-free; the index
// is built once by reader.js and searched with simple ranked substring
// matching, which is plenty at document scale.

let overlay = null;

// entries: [{ type: 'concept'|'section'|'text', title, sub, keywords, action }]
export function openPalette(entries) {
  if (overlay) return;
  overlay = document.createElement('div');
  overlay.className = 'reader-palette-overlay';
  overlay.innerHTML = `
    <div class="reader-palette" role="dialog" aria-label="Search">
      <div class="reader-palette-head">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
        <input type="text" placeholder="Search concepts, sections, text…" aria-label="Search the document">
        <kbd>esc</kbd>
      </div>
      <ol class="reader-palette-results" role="listbox"></ol>
      <p class="reader-palette-hint">↑↓ navigate · Enter to open · concepts link to reviewed cards</p>
    </div>`;
  document.body.appendChild(overlay);

  const input = overlay.querySelector('input');
  const list = overlay.querySelector('ol');
  let results = [];
  let selected = 0;

  const close = () => {
    overlay.remove();
    overlay = null;
  };

  const run = (entry) => {
    close();
    entry.action();
  };

  const TYPE_LABEL = { concept: 'Concept', section: 'Section', text: 'Text' };

  const render = () => {
    list.innerHTML = '';
    results.forEach((entry, i) => {
      const li = document.createElement('li');
      li.setAttribute('role', 'option');
      if (i === selected) li.setAttribute('aria-selected', 'true');
      li.innerHTML = `<span class="reader-palette-type is-${entry.type}">${TYPE_LABEL[entry.type]}</span>
        <span class="reader-palette-body"><span class="reader-palette-title"></span><span class="reader-palette-sub"></span></span>`;
      li.querySelector('.reader-palette-title').textContent = entry.title;
      li.querySelector('.reader-palette-sub').textContent = entry.sub || '';
      li.addEventListener('mouseenter', () => {
        selected = i;
        render();
      });
      li.addEventListener('mousedown', (e) => e.preventDefault());
      li.addEventListener('click', () => run(entry));
      list.appendChild(li);
    });
  };

  const TYPE_BONUS = { concept: 20, section: 10, text: 0 };
  // Diacritic-insensitive fold so "ito" finds "Itô", "holder" finds "Hölder".
  const fold = (s) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const search = (q) => {
    q = fold(q.trim());
    if (!q) {
      results = entries.filter((e) => e.type !== 'text').slice(0, 12);
    } else {
      results = entries
        .map((e) => {
          const title = fold(e.title);
          let score = 0;
          if (title.startsWith(q)) score = 100;
          else if (title.includes(q)) score = 80;
          else if (fold(e.keywords || '').includes(q)) score = 60;
          else if (fold(e.sub || '').includes(q)) score = 40;
          return score ? { e, score: score + TYPE_BONUS[e.type] } : null;
        })
        .filter(Boolean)
        .sort((a, b) => b.score - a.score)
        .slice(0, 12)
        .map((r) => r.e);
    }
    selected = 0;
    render();
  };

  input.addEventListener('input', () => search(input.value));
  input.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      selected = Math.min(selected + 1, results.length - 1);
      render();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      selected = Math.max(selected - 1, 0);
      render();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (results[selected]) run(results[selected]);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      close();
    }
  });
  overlay.addEventListener('mousedown', (e) => {
    if (e.target === overlay) close();
  });

  search('');
  input.focus();
}

export function paletteOpen() {
  return overlay !== null;
}

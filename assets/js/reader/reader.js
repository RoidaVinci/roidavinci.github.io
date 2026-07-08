// Reader entry point. Text-agnostic: everything document-specific comes from
// the data attributes on #reader-app (one folder per document under
// assets/reader/), so adding another text later means adding a folder and a
// page — no engine changes.

import { push } from './panes.js';
import { renderDoc } from './doc.js';
import { initCards } from './cards.js';
import { exportNotes } from './notes.js';
import { getKey, setKey } from './ask.js';

const app = document.getElementById('reader-app');
const docEl = document.getElementById('reader-doc');
const tocEl = document.getElementById('reader-toc');
const progressEl = document.getElementById('reader-progress');
const base = app.dataset.base;

initCards(base);

function typeset(el) {
  window.MathJax?.typesetPromise?.([el]).catch(() => {});
}

async function main() {
  let doc;
  try {
    const res = await fetch(`${base}/doc.json`);
    doc = await res.json();
  } catch {
    docEl.innerHTML = '<p>Could not load the document.</p>';
    return;
  }

  buildHeader(doc);
  renderDoc(doc, docEl);
  typeset(docEl);
  buildToc(doc);
  trackProgress();
}

function buildHeader(doc) {
  const header = document.createElement('header');
  header.className = 'reader-header';

  const eyebrow = document.createElement('p');
  eyebrow.className = 'reader-eyebrow';
  eyebrow.textContent = app.dataset.eyebrow || 'Interactive text';
  header.appendChild(eyebrow);

  const h1 = document.createElement('h1');
  h1.className = 'reader-title';
  h1.textContent = doc.title;
  header.appendChild(h1);

  if (app.dataset.lead) {
    const lead = document.createElement('p');
    lead.className = 'reader-lead';
    lead.textContent = app.dataset.lead;
    header.appendChild(lead);
  }

  const meta = document.createElement('div');
  meta.className = 'reader-meta';

  const sections = doc.blocks.filter((b) => b.type === 'section').length;
  const words = doc.blocks.reduce((n, b) => n + b.html.split(/\s+/).length, 0);
  const facts = document.createElement('p');
  facts.className = 'reader-meta-facts';
  facts.innerHTML = [
    `${sections} sections`,
    `${doc.concepts.length} linked concepts`,
    `${Math.max(1, Math.round(words / 200))} min read`,
  ].join('<span class="sep">·</span>');
  meta.appendChild(facts);

  const actions = document.createElement('div');
  actions.className = 'reader-toolbar-actions';
  const exportBtn = document.createElement('button');
  exportBtn.className = 'reader-btn';
  exportBtn.textContent = 'Export notes';
  exportBtn.addEventListener('click', () => exportNotes(doc));
  const settingsBtn = document.createElement('button');
  settingsBtn.className = 'reader-btn';
  settingsBtn.textContent = getKey() ? 'AI · on' : 'AI settings';
  settingsBtn.title = 'Configure the AI assistant (bring your own key)';
  settingsBtn.addEventListener('click', pushSettings);
  actions.appendChild(exportBtn);
  actions.appendChild(settingsBtn);
  meta.appendChild(actions);
  header.appendChild(meta);

  docEl.appendChild(header);
}

function buildToc(doc) {
  const sections = [...docEl.querySelectorAll('h2.reader-section')];
  if (sections.length === 0) return;
  tocEl.hidden = false;

  const label = document.createElement('p');
  label.className = 'reader-toc-label';
  label.textContent = 'Contents';
  tocEl.appendChild(label);

  const ol = document.createElement('ol');
  const links = new Map();
  for (const h of sections) {
    const li = document.createElement('li');
    const a = document.createElement('a');
    a.href = `#${h.id}`;
    a.textContent = h.querySelector('.reader-section-text')?.textContent || h.textContent;
    li.appendChild(a);
    ol.appendChild(li);
    links.set(h.id, a);
  }
  tocEl.appendChild(ol);

  // Highlight the last section heading that has scrolled past the fold line.
  let active = null;
  const update = () => {
    const fold = window.innerHeight * 0.3;
    let current = sections[0];
    for (const h of sections) {
      if (h.getBoundingClientRect().top <= fold) current = h;
    }
    const link = links.get(current.id);
    if (link !== active) {
      active?.classList.remove('is-active');
      active = link;
      active?.classList.add('is-active');
    }
  };
  window.addEventListener('scroll', update, { passive: true });
  update();
}

function trackProgress() {
  const update = () => {
    const total = document.documentElement.scrollHeight - window.innerHeight;
    const frac = total > 0 ? Math.min(1, window.scrollY / total) : 0;
    progressEl.style.width = `${frac * 100}%`;
  };
  window.addEventListener('scroll', update, { passive: true });
  update();
}

function pushSettings() {
  push({
    title: 'AI settings',
    render(el) {
      el.innerHTML = '<p class="reader-pane-eyebrow">Assistant</p><h2>AI settings</h2><div class="reader-settings"></div>';
      const box = el.querySelector('.reader-settings');

      const label = document.createElement('label');
      label.textContent = 'Anthropic API key';
      const input = document.createElement('input');
      input.type = 'password';
      input.placeholder = 'sk-ant-…';
      input.value = getKey();
      const save = document.createElement('button');
      save.className = 'reader-btn reader-btn-primary';
      save.textContent = 'Save';
      save.addEventListener('click', () => {
        setKey(input.value);
        save.textContent = input.value.trim() ? 'Saved — AI enabled' : 'Cleared — AI disabled';
        setTimeout(() => window.location.reload(), 600);
      });

      const hint = document.createElement('p');
      hint.className = 'reader-hint';
      hint.textContent = 'The key is stored only in this browser (localStorage) and calls go directly to api.anthropic.com — no server involved. Without a key, the reader shows the curated text and concept cards only. AI answers are generated live and are not reviewed content.';

      box.appendChild(label);
      box.appendChild(input);
      box.appendChild(save);
      box.appendChild(hint);
    },
  });
}

main();

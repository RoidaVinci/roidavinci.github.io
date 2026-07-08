// Reader entry point. Text-agnostic: everything document-specific comes from
// the data attributes on #reader-app (one folder per document under
// assets/reader/), so adding another text later means adding a folder and a
// page — no engine changes. Concepts live in a single site-wide database
// (assets/reader/concepts/) shared by all documents.

import { push, initPanes, setHash } from './panes.js';
import {
  renderDoc, wireConceptInteractions, setCurrentDoc, scrollToTag,
} from './doc.js';
import { initCards, openConcept, pushConceptIndex } from './cards.js';
import { pushAnnotations } from './notes-pane.js';
import { annotationCount } from './notes.js';
import { applyHighlights, wireHighlightActions } from './highlights.js';
import { loadRegistry, allConcepts } from './registry.js';
import { openPalette, paletteOpen } from './palette.js';
import { getKey, setKey } from './ask.js';

const app = document.getElementById('reader-app');
const docEl = document.getElementById('reader-doc');
const tocEl = document.getElementById('reader-toc');
const progressEl = document.getElementById('reader-progress');
const base = app.dataset.base;
const conceptsBase = app.dataset.concepts;

const POS_STORAGE = 'reader.pos';

initCards(conceptsBase);

let paletteIndex = [];

async function main() {
  initPanes();
  let doc;
  try {
    const [docRes] = await Promise.all([
      fetch(`${base}/doc.json`),
      loadRegistry(`${conceptsBase}/index.json`),
    ]);
    doc = await docRes.json();
  } catch {
    docEl.innerHTML = '<p>Could not load the document.</p>';
    return;
  }

  setCurrentDoc(doc);
  buildHeader(doc);
  renderDoc(doc, docEl);
  wireConceptInteractions();
  wireHighlightActions(doc.id, docEl);
  buildToc(doc);
  trackProgress();
  buildPaletteIndex(doc);
  wireShortcuts();
  trackPosition(doc);

  await window.MathJax?.typesetPromise?.([docEl]).catch(() => {});
  applyHighlights(doc.id, docEl);
  route(doc);
}

/* --- Header & toolbar ----------------------------------------------------- */

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

  const isMac = /Mac|iPhone|iPad/.test(navigator.platform);
  const searchBtn = document.createElement('button');
  searchBtn.className = 'reader-btn';
  searchBtn.innerHTML = `Search <kbd class="reader-kbd">${isMac ? '⌘K' : 'Ctrl K'}</kbd>`;
  searchBtn.title = 'Search concepts, sections and text (or press /)';
  searchBtn.addEventListener('click', () => openPalette(paletteIndex));
  actions.appendChild(searchBtn);

  const conceptsBtn = document.createElement('button');
  conceptsBtn.className = 'reader-btn';
  conceptsBtn.textContent = 'Concepts';
  conceptsBtn.title = 'Browse every reviewed concept card';
  conceptsBtn.addEventListener('click', () => pushConceptIndex());
  actions.appendChild(conceptsBtn);

  const notesBtn = document.createElement('button');
  notesBtn.className = 'reader-btn';
  notesBtn.title = 'Your notes and highlights (stored in this browser)';
  const renderNotesBtn = () => {
    const n = annotationCount(doc.id);
    notesBtn.innerHTML = n > 0 ? `Annotations <span class="reader-badge">${n}</span>` : 'Annotations';
  };
  renderNotesBtn();
  document.addEventListener('reader:annotations-changed', renderNotesBtn);
  notesBtn.addEventListener('click', () => pushAnnotations(doc));
  actions.appendChild(notesBtn);

  const settingsBtn = document.createElement('button');
  settingsBtn.className = 'reader-btn';
  settingsBtn.textContent = getKey() ? 'AI · on' : 'AI settings';
  settingsBtn.title = 'Configure the AI assistant (bring your own key)';
  settingsBtn.addEventListener('click', pushSettings);
  actions.appendChild(settingsBtn);

  meta.appendChild(actions);
  header.appendChild(meta);
  docEl.appendChild(header);
}

/* --- TOC ------------------------------------------------------------------ */

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
    a.addEventListener('click', (e) => {
      // replaceState instead of an anchor jump: keeps the pane-depth history
      // clean so the back button always maps to pane pops.
      e.preventDefault();
      h.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setHash(h.id);
    });
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

/* --- Search index ---------------------------------------------------------- */

function stripHtml(html) {
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  return tmp.textContent.replace(/\s+/g, ' ').trim();
}

function buildPaletteIndex(doc) {
  paletteIndex = [];
  for (const c of allConcepts()) {
    paletteIndex.push({
      type: 'concept',
      title: c.title,
      sub: stripHtml(c.tldr || ''),
      keywords: (c.aliases || []).join(' '),
      action: () => openConcept(c.id, c.title, ''),
    });
  }
  let sectionNum = 0;
  for (const block of doc.blocks) {
    if (block.type === 'section') {
      sectionNum += 1;
      const id = `sec-${sectionNum}`;
      paletteIndex.push({
        type: 'section',
        title: `${sectionNum}. ${stripHtml(block.html)}`,
        sub: '',
        action: () => {
          document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          setHash(id);
        },
      });
    } else {
      const text = stripHtml(block.html);
      if (!text) continue;
      paletteIndex.push({
        type: 'text',
        title: text.length > 90 ? `${text.slice(0, 90)}…` : text,
        sub: `[${block.tag}]`,
        keywords: text,
        action: () => scrollToTag(block.tag),
      });
    }
  }
}

function wireShortcuts() {
  document.addEventListener('keydown', (e) => {
    const typing = /^(input|textarea|select)$/i.test(document.activeElement?.tagName || '')
      || document.activeElement?.isContentEditable;
    if ((e.key === 'k' || e.key === 'K') && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      if (!paletteOpen()) openPalette(paletteIndex);
    } else if (e.key === '/' && !typing && !paletteOpen()) {
      e.preventDefault();
      openPalette(paletteIndex);
    }
  });
}

/* --- Deep links & reading position ------------------------------------------ */

function route(doc) {
  const hash = decodeURIComponent(location.hash.slice(1));
  if (hash.startsWith('c/')) {
    const id = hash.slice(2);
    // Re-push so history state and pane stack agree.
    history.replaceState({ rd: 0 }, '', location.pathname + location.search);
    openConcept(id, '', '');
    return;
  }
  if (hash.startsWith('b/')) {
    if (scrollToTag(hash.slice(2))) return;
  }
  if (/^sec-\d+$/.test(hash)) {
    document.getElementById(hash)?.scrollIntoView({ block: 'start' });
    return;
  }
  restorePosition(doc);
}

function trackPosition(doc) {
  let timer;
  window.addEventListener('scroll', () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      try {
        const all = JSON.parse(localStorage.getItem(POS_STORAGE)) || {};
        all[doc.id] = { y: window.scrollY, t: Date.now() };
        localStorage.setItem(POS_STORAGE, JSON.stringify(all));
      } catch { /* storage full or blocked — position memory is optional */ }
    }, 400);
  }, { passive: true });
}

function restorePosition(doc) {
  let pos;
  try {
    pos = (JSON.parse(localStorage.getItem(POS_STORAGE)) || {})[doc.id];
  } catch {
    return;
  }
  if (!pos || pos.y < 800) return;
  window.scrollTo(0, pos.y);
  const toast = document.createElement('div');
  toast.className = 'reader-toast';
  toast.innerHTML = '<span>Resumed where you left off</span>';
  const top = document.createElement('button');
  top.textContent = 'Back to top';
  top.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    toast.remove();
  });
  toast.appendChild(top);
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 7000);
}

/* --- Settings ---------------------------------------------------------------- */

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

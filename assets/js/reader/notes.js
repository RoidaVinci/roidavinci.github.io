// Personal layer: notes keyed by stable block tags, stored locally.
// Tags are content hashes of the canonical text, so notes survive edits
// elsewhere in the document and detach only if their own block changes.

import { listHighlights } from './highlights.js';

const STORAGE = 'reader.notes';

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

export function getNote(docId, tag) {
  return load()[docId]?.[tag] || '';
}

export function setNote(docId, tag, text) {
  const all = load();
  all[docId] = all[docId] || {};
  if (text.trim()) {
    all[docId][tag] = text;
  } else {
    delete all[docId][tag];
  }
  save(all);
}

export function hasNote(docId, tag) {
  return Boolean(load()[docId]?.[tag]);
}

export function listNotes(docId) {
  return load()[docId] || {};
}

export function annotationCount(docId) {
  return Object.keys(listNotes(docId)).length + listHighlights(docId).length;
}

export function blockSnippet(doc, tag, max = 160) {
  const b = doc.blocks.find((x) => x.tag === tag);
  if (!b) return '(block no longer in the text)';
  const tmp = document.createElement('div');
  tmp.innerHTML = b.html;
  const t = tmp.textContent.trim().replace(/\s+/g, ' ');
  return t.length > max ? `${t.slice(0, max)}…` : t;
}

export function blockOrder(doc, tag) {
  const i = doc.blocks.findIndex((x) => x.tag === tag);
  return i === -1 ? Number.MAX_SAFE_INTEGER : i;
}

// Exports all notes and highlights for a document as a markdown download.
export function exportNotes(doc) {
  const notes = listNotes(doc.id);
  const highlights = listHighlights(doc.id);
  const tags = Object.keys(notes).sort((a, b) => blockOrder(doc, a) - blockOrder(doc, b));

  let md = `# Notes — ${doc.title}\n\n`;
  if (tags.length) {
    md += '## Notes\n\n';
    for (const tag of tags) {
      md += `### [${tag}] ${blockSnippet(doc, tag)}\n\n${notes[tag]}\n\n`;
    }
  }
  if (highlights.length) {
    md += '## Highlights\n\n';
    const sorted = [...highlights].sort((a, b) => blockOrder(doc, a.tag) - blockOrder(doc, b.tag));
    for (const hl of sorted) {
      md += `- [${hl.tag}] “${hl.quote}”\n`;
    }
    md += '\n';
  }

  const blob = new Blob([md], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `notes-${doc.id}.md`;
  a.click();
  URL.revokeObjectURL(url);
}

// Personal layer: notes keyed by stable block tags, stored locally.
// Tags are content hashes of the canonical text, so notes survive edits
// elsewhere in the document and detach only if their own block changes.

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

// Exports all notes for a document as a markdown file download.
export function exportNotes(doc) {
  const notes = load()[doc.id] || {};
  const tags = Object.keys(notes);
  if (tags.length === 0) {
    alert('No notes yet — hover a paragraph and click ✎ to add one.');
    return;
  }
  const blockText = (tag) => {
    const b = doc.blocks.find((x) => x.tag === tag);
    if (!b) return '(block no longer in the text)';
    const tmp = document.createElement('div');
    tmp.innerHTML = b.html;
    const t = tmp.textContent.trim().replace(/\s+/g, ' ');
    return t.length > 160 ? `${t.slice(0, 160)}…` : t;
  };
  const orderOf = (tag) => {
    const i = doc.blocks.findIndex((x) => x.tag === tag);
    return i === -1 ? Number.MAX_SAFE_INTEGER : i;
  };
  tags.sort((a, b) => orderOf(a) - orderOf(b));

  let md = `# Notes — ${doc.title}\n\n`;
  for (const tag of tags) {
    md += `## [${tag}] ${blockText(tag)}\n\n${notes[tag]}\n\n`;
  }
  const blob = new Blob([md], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `notes-${doc.id}.md`;
  a.click();
  URL.revokeObjectURL(url);
}

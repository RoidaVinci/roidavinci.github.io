// AI provider. Local-only by design: calls go directly from this browser to
// the Anthropic API with a key the site owner stores in localStorage. Without
// a key, every AI affordance in the UI stays hidden — visitors get the
// curated text and cards only. The reader page's CSP allows exactly this one
// extra origin (see _includes/head.html + reader/index.html front matter).

const KEY_STORAGE = 'reader.anthropicKey';
const MODEL = 'claude-opus-4-8';

export function getKey() {
  return localStorage.getItem(KEY_STORAGE) || '';
}

export function setKey(value) {
  if (value) localStorage.setItem(KEY_STORAGE, value.trim());
  else localStorage.removeItem(KEY_STORAGE);
}

export function aiEnabled() {
  return getKey() !== '';
}

const SYSTEM = `You are the assistant inside a mathematical reader. The user is reading a curated text and asking about a specific passage or concept; the relevant context is provided with each question.

Ground every answer in the provided context and standard mathematics. Be precise and concise — a focused paragraph or two unless the user asks for depth. Write plain prose (no markdown headings, bullets only if truly natural, no code fences). Use LaTeX for all mathematics: $...$ inline and \\[...\\] for display equations. If you are not sure of a claim, say so rather than guessing.`;

// Streams the assistant's answer as text chunks. `messages` is a Messages-API
// messages array; the caller owns conversation state.
export async function* ask(messages, { maxTokens = 2000 } = {}) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': getKey(),
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: maxTokens,
      system: SYSTEM,
      messages,
      stream: true,
    }),
  });

  if (!res.ok) {
    let detail = `HTTP ${res.status}`;
    try {
      detail = (await res.json())?.error?.message || detail;
    } catch { /* keep status text */ }
    throw new Error(detail);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop();
    for (const line of lines) {
      if (!line.startsWith('data:')) continue;
      let event;
      try {
        event = JSON.parse(line.slice(5));
      } catch {
        continue;
      }
      if (event.type === 'content_block_delta' && event.delta?.type === 'text_delta') {
        yield event.delta.text;
      } else if (event.type === 'error') {
        throw new Error(event.error?.message || 'stream error');
      }
    }
  }
}

// Renders streamed plain-prose-with-LaTeX into paragraphs.
export function proseToHtml(text) {
  const esc = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return esc
    .split(/\n\s*\n/)
    .filter((p) => p.trim())
    .map((p) => `<p>${p}</p>`)
    .join('');
}

// Concept layer: reviewed cards (fetched from the site-wide concept
// database, cached) plus the AI panes that hang off them — ad-hoc questions
// and "expand further". Cards are curated content; AI answers are generated
// live and visually provisional.
//
// Card anatomy (skim-first): an "At a glance" box with the compressed
// math-style definition and key properties, then the prose — why it
// matters, full definition, examples, consequences, related concepts.

import { push, typeset } from './panes.js';
import { aiEnabled, ask, proseToHtml } from './ask.js';
import { getConcept, conceptTitle, allConcepts, linkify } from './registry.js';

let conceptsBase = '';
const cardCache = new Map();

export function initCards(conceptsBasePath) {
  conceptsBase = conceptsBasePath;
}

export async function openConcept(id, displayText, contextText) {
  let card = cardCache.get(id);
  if (card === undefined) {
    try {
      const res = await fetch(`${conceptsBase}/cards/${id}.json`);
      card = res.ok ? await res.json() : null;
    } catch {
      card = null;
    }
    cardCache.set(id, card);
  }
  if (card) {
    pushCard(card, contextText);
  } else if (aiEnabled()) {
    pushAsk(displayText || conceptTitle(id), contextText, `Explain “${displayText || conceptTitle(id)}” as it is used in this passage.`);
  }
}

function section(title, html) {
  return `<h3>${title}</h3>${html}`;
}

function glanceHtml(card) {
  const tldr = getConcept(card.id)?.tldr || card.tldr;
  const props = card.properties || [];
  if (!tldr && props.length === 0) return '';
  let html = '<div class="reader-glance"><p class="reader-glance-label">At a glance</p>';
  if (tldr) html += `<p class="reader-glance-tldr">${tldr}</p>`;
  if (props.length) {
    html += `<ul class="reader-glance-props">${props.map((p) => `<li>${p}</li>`).join('')}</ul>`;
  }
  return `${html}</div>`;
}

function pushCard(card, contextText) {
  const state = { thread: [] }; // survives re-renders while the pane is on the stack
  push({
    title: card.title,
    hash: `c/${card.id}`,
    render(el) {
      let html = `<p class="reader-pane-eyebrow">Reviewed concept</p><h2>${card.title}</h2>`;
      html += glanceHtml(card);
      if (card.motivation) html += section('Why it matters', `<p>${card.motivation}</p>`);
      if (card.definition) html += section('Definition', `<p>${card.definition}</p>`);
      if (card.examples?.length) {
        html += section('Examples', `<ul>${card.examples.map((x) => `<li>${x}</li>`).join('')}</ul>`);
      }
      if (card.consequences?.length) {
        html += section('Consequences', `<ul>${card.consequences.map((x) => `<li>${x}</li>`).join('')}</ul>`);
      }
      el.innerHTML = html;

      // Same database, same links: concept mentions inside the card become
      // concept links too (never to the card itself).
      linkify(el, { exclude: card.id });

      if (card.related?.length) {
        el.insertAdjacentHTML('beforeend', '<h3>Related</h3>');
        const chips = document.createElement('div');
        chips.className = 'reader-chips';
        for (const id of card.related) {
          const chip = document.createElement('button');
          chip.className = 'reader-chip';
          chip.textContent = conceptTitle(id);
          chip.addEventListener('click', () => openConcept(id, conceptTitle(id), contextText));
          chips.appendChild(chip);
        }
        el.appendChild(chips);
      }

      if (aiEnabled()) {
        el.insertAdjacentHTML(
          'beforeend',
          '<p class="reader-ai-tag">Assistant — answers are generated live, not reviewed</p>',
        );
        const expand = document.createElement('button');
        expand.className = 'reader-btn';
        expand.style.marginTop = '0.7rem';
        expand.textContent = 'Expand into a deeper treatment ↗';
        expand.addEventListener('click', () => pushExpand(card));
        el.appendChild(expand);
        mountAskThread(el, state, cardContext(card, contextText));
      }
    },
  });
}

// The visible face of the concept database: every concept with its TL;DR.
export function pushConceptIndex() {
  push({
    title: 'Concepts',
    render(el) {
      el.innerHTML = '<p class="reader-pane-eyebrow">Concept library</p><h2>All concepts</h2><p class="reader-hint">Every linked term in the text resolves to one of these reviewed cards.</p>';
      const list = document.createElement('div');
      list.className = 'reader-concept-index';
      for (const c of allConcepts()) {
        const item = document.createElement('button');
        item.className = 'reader-concept-item';
        item.innerHTML = `<span class="reader-concept-item-title">${c.title}</span><span class="reader-concept-item-tldr">${c.tldr || ''}</span>`;
        item.addEventListener('click', () => openConcept(c.id, c.title, ''));
        list.appendChild(item);
      }
      el.appendChild(list);
    },
  });
}

function cardContext(card, contextText) {
  return [
    `Concept: ${card.title}.`,
    card.definition ? `Reviewed definition: ${card.definition}` : '',
    contextText ? `Passage where it appears: ${contextText}` : '',
  ].filter(Boolean).join('\n');
}

// A free-form question pane (used for selections and card-less concepts).
export function pushAsk(title, contextText, seedQuestion) {
  const state = { thread: [] };
  push({
    title: `Ask: ${title}`,
    render(el) {
      el.innerHTML = `<p class="reader-pane-eyebrow">Assistant · generated live</p><h2>Ask about ${title}</h2>`;
      mountAskThread(el, state, contextText, seedQuestion);
    },
  });
}

// "Expand further": a longer, structured AI treatment of a card's topic.
// It is a leaf workspace — the reader can only pop back, never wander off.
function pushExpand(card) {
  const state = { text: '', done: false, started: false };
  push({
    title: `Deeper: ${card.title}`,
    render(el) {
      el.innerHTML = `<p class="reader-pane-eyebrow">Assistant · generated live</p><h2>${card.title} — deeper treatment</h2><div class="reader-ask-a is-streaming"></div>`;
      const out = el.querySelector('.reader-ask-a');
      out.innerHTML = proseToHtml(state.text);
      if (state.done) {
        out.classList.remove('is-streaming');
        typeset(out);
      }
      if (state.started) return;
      state.started = true;

      const prompt = `Write a deeper treatment of "${card.title}" (about 700-900 words) for a reader who just read this reviewed card and wants the next level of depth. Build on the card without repeating it verbatim; include at least one worked argument or computation, and end with where the theory goes next.\n\nCard contents:\n${JSON.stringify(card)}`;
      streamInto(out, state, [{ role: 'user', content: prompt }], { maxTokens: 4000 });
    },
  });
}

function mountAskThread(el, state, contextText, seedQuestion) {
  const threadEl = document.createElement('div');
  threadEl.className = 'reader-ask-thread';
  el.appendChild(threadEl);

  for (const turn of state.thread) {
    appendTurn(threadEl, turn);
  }

  const form = document.createElement('form');
  form.className = 'reader-ask-form';
  form.innerHTML = '<input type="text" required placeholder="Ask a question…"><button type="submit">Ask</button>';
  const input = form.querySelector('input');
  if (seedQuestion && state.thread.length === 0) input.value = seedQuestion;
  el.appendChild(form);

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const question = input.value.trim();
    if (!question || state.busy) return;
    input.value = '';

    const turn = { q: question, a: '', done: false };
    state.thread.push(turn);
    const nodes = appendTurn(threadEl, turn);

    const messages = [];
    state.thread.forEach((t, i) => {
      const content = i === 0 && contextText
        ? `Context from the text:\n${contextText}\n\nQuestion: ${t.q}`
        : t.q;
      messages.push({ role: 'user', content });
      if (t.done) messages.push({ role: 'assistant', content: t.a });
    });

    state.busy = true;
    streamInto(nodes.answer, turn, messages).finally(() => {
      state.busy = false;
    });
  });
}

function appendTurn(threadEl, turn) {
  const q = document.createElement('div');
  q.className = 'reader-ask-q';
  q.textContent = turn.q;
  const answer = document.createElement('div');
  answer.className = 'reader-ask-a';
  if (!turn.done) answer.classList.add('is-streaming');
  answer.innerHTML = proseToHtml(turn.a || '');
  if (turn.done) typeset(answer);
  threadEl.appendChild(q);
  threadEl.appendChild(answer);
  return { q, answer };
}

// Streams a completion into `target`, accumulating on `holder.a`/`holder.text`
// so pane re-renders (push deeper, pop back) replay the current state.
async function streamInto(target, holder, messages, opts) {
  const key = 'a' in holder ? 'a' : 'text';
  try {
    for await (const chunk of ask(messages, opts)) {
      holder[key] += chunk;
      if (target.isConnected) target.innerHTML = proseToHtml(holder[key]);
    }
    holder.done = true;
  } catch (err) {
    holder.done = true;
    holder[key] += holder[key] ? '\n\n' : '';
    if (target.isConnected) {
      target.insertAdjacentHTML(
        'afterend',
        `<div class="reader-error">AI request failed: ${String(err.message || err).replace(/</g, '&lt;')}</div>`,
      );
    }
  }
  if (target.isConnected) {
    target.classList.remove('is-streaming');
    target.innerHTML = proseToHtml(holder[key]);
    typeset(target);
  }
}

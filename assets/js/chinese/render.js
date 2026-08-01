/**
 * render.js — the reading pane and the definition card.
 *
 * Every dictionary word becomes a three-line stack
 *
 *      汉字        ← the characters
 *     hàn zì       ← the reading, smaller
 * Chinese character← the gloss, smaller again and optional
 *
 * built as a <button>, so selection works from the keyboard and screen
 * readers announce its pressed state without any extra wiring.
 */

import { senses, cleanSense, shortGloss, compactGloss, readingOf, primaryEntry } from "./gloss.js";
import { toneMarks, toneMarksJoined, alignSyllables } from "./pinyin.js";

const el = (tag, className, text) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
};

export class Reader {
  /**
   * @param {object} options
   * @param {HTMLElement} options.host        pane the tokens are drawn into
   * @param {import("./dict.js").Dictionary} options.dict
   * @param {(word: string) => boolean} options.isSelected
   * @param {(word: string) => void} options.onToggle
   */
  constructor({ host, dict, isSelected, onToggle }) {
    this.host = host;
    this.dict = dict;
    this.isSelected = isSelected;
    this.onToggle = onToggle;
    this.tokens = [];
    this.showEnglish = true;
    this.card = this.#buildCard();
    this.cardWord = null;
    this.hideTimer = 0;
    this.showTimer = 0;
    this.lastPointer = "mouse";
    this.#bind();
  }

  /* ---------------------------------------------------------------- pane */

  render(tokens, { showEnglish = true } = {}) {
    this.tokens = tokens;
    this.showEnglish = showEnglish;
    this.hideCard();
    this.host.textContent = "";
    this.host.classList.toggle("zh-pane--no-english", !showEnglish);

    const frag = document.createDocumentFragment();
    for (const token of tokens) {
      if (token.type === "break") {
        frag.append(el("span", "zh-break"));
      } else if (token.type === "other") {
        frag.append(el("span", "zh-punct", token.text));
      } else {
        frag.append(this.#buildToken(token));
      }
    }
    this.host.append(frag);
  }

  #buildToken(token) {
    const entries = this.dict.lookup(token.text);
    const node = el("button", "zh-tok");
    node.type = "button";
    node.dataset.word = token.text;
    node.setAttribute("aria-pressed", String(this.isSelected(token.text)));
    if (!entries.length) node.classList.add("zh-tok--unknown");
    if (this.isSelected(token.text)) node.classList.add("is-selected");

    node.append(el("span", "zh-hanzi", token.text));
    node.append(el("span", "zh-pinyin", readingOf(entries)));

    node.append(el("span", "zh-en", compactGloss(entries)));

    const reading = readingOf(entries);
    const spoken = shortGloss(entries, 2);
    node.setAttribute(
      "aria-label",
      spoken ? `${token.text}, ${reading}, ${spoken}` : `${token.text}, no dictionary entry`
    );
    return node;
  }

  /** Repaint the pressed state after the selection changes elsewhere. */
  syncSelection() {
    for (const node of this.host.querySelectorAll(".zh-tok")) {
      const on = this.isSelected(node.dataset.word);
      node.setAttribute("aria-pressed", String(on));
      node.classList.toggle("is-selected", on);
    }
    if (this.cardWord) this.#paintCardButton();
  }

  /* ---------------------------------------------------------------- card */

  #buildCard() {
    const card = el("div", "zh-card");
    card.hidden = true;
    card.setAttribute("role", "dialog");
    card.setAttribute("aria-label", "Word details");
    card.innerHTML = "";

    card.append(el("div", "zh-card-head"));
    card.append(el("div", "zh-card-body"));
    const foot = el("div", "zh-card-foot");
    const btn = el("button", "zh-btn zh-card-add");
    btn.type = "button";
    foot.append(btn);
    card.append(foot);

    document.body.append(card);
    return card;
  }

  #bind() {
    this.host.addEventListener("pointerdown", (e) => {
      this.lastPointer = e.pointerType || "mouse";
    });

    this.host.addEventListener("click", (e) => {
      const tok = e.target.closest(".zh-tok");
      if (!tok) return;
      // On touch there is no hover, so a tap opens the card and the card
      // carries the add/remove action. A mouse click selects directly.
      if (this.lastPointer === "touch") {
        this.showCard(tok);
      } else {
        this.onToggle(tok.dataset.word);
      }
    });

    this.host.addEventListener("mouseover", (e) => {
      const tok = e.target.closest(".zh-tok");
      if (!tok || tok === this.cardAnchor) return;
      clearTimeout(this.showTimer);
      this.showTimer = setTimeout(() => this.showCard(tok), 110);
    });

    this.host.addEventListener("mouseout", (e) => {
      if (e.target.closest(".zh-tok")) {
        clearTimeout(this.showTimer);
        this.#scheduleHide();
      }
    });

    this.host.addEventListener("focusin", (e) => {
      const tok = e.target.closest(".zh-tok");
      if (tok) this.showCard(tok);
    });

    this.host.addEventListener("focusout", () => this.#scheduleHide());

    this.card.addEventListener("mouseenter", () => clearTimeout(this.hideTimer));
    this.card.addEventListener("mouseleave", () => this.#scheduleHide());
    this.card.querySelector(".zh-card-add").addEventListener("click", () => {
      if (this.cardWord) this.onToggle(this.cardWord);
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") this.hideCard();
    });
    window.addEventListener("scroll", () => this.hideCard(), { passive: true });
  }

  #scheduleHide() {
    clearTimeout(this.hideTimer);
    this.hideTimer = setTimeout(() => this.hideCard(), 220);
  }

  hideCard() {
    clearTimeout(this.hideTimer);
    this.card.hidden = true;
    this.cardWord = null;
    this.cardAnchor = null;
  }

  showCard(anchor) {
    const word = anchor.dataset.word;
    clearTimeout(this.hideTimer);
    this.cardWord = word;
    this.cardAnchor = anchor;

    const entries = this.dict.lookup(word);
    const head = this.card.querySelector(".zh-card-head");
    const body = this.card.querySelector(".zh-card-body");
    head.textContent = "";
    body.textContent = "";

    head.append(el("span", "zh-card-hanzi", word));
    const main = primaryEntry(entries);
    if (main && main.trad !== main.simp) {
      head.append(el("span", "zh-card-trad", main.trad === word ? main.simp : main.trad));
    }
    head.append(el("span", "zh-card-pinyin", readingOf(entries)));

    if (entries.length) {
      for (const entry of entries) {
        if (entries.length > 1) {
          body.append(el("p", "zh-card-reading", toneMarks(entry.pinyin)));
        }
        const list = el("ol", "zh-card-senses");
        for (const sense of senses(entry)) {
          const clean = cleanSense(sense);
          if (clean) list.append(el("li", null, clean));
        }
        body.append(list);
      }
    } else {
      // No entry for the whole token: fall back to one card per character.
      body.append(el("p", "zh-card-note", "No entry for this word. By character:"));
      body.append(this.#characterList(word, null));
    }

    // A multi-character word is often clearer with its parts spelled out.
    if (entries.length && [...word].length > 1) {
      const details = el("details", "zh-card-chars");
      details.append(el("summary", null, "Characters"));
      // Read each character as it is read *in this word*: 行 is háng in 银行
      // and xíng on its own, and the word's own entry settles it.
      details.append(this.#characterList(word, main ? alignSyllables(word, main.pinyin) : null));
      body.append(details);
    }

    this.#paintCardButton();
    this.card.hidden = false;
    this.#position(anchor);
  }

  #characterList(word, syllables) {
    const list = el("ul", "zh-card-charlist");
    [...word].forEach((ch, i) => {
      const all = this.dict.lookup(ch);
      // Once the reading is known from the word, the gloss should be the one
      // belonging to that reading: 行 in 银行 is háng, "row, line of business",
      // not xíng, "to walk".
      const wanted = syllables?.[i];
      const matching = wanted
        ? all.filter((e) => toneMarksJoined(e.pinyin).toLowerCase() === wanted.toLowerCase())
        : [];
      const chEntries = matching.length ? matching : all;

      const item = el("li");
      item.append(el("span", "zh-card-char", ch));
      item.append(el("span", "zh-card-charpinyin", wanted ?? readingOf(chEntries)));
      item.append(el("span", "zh-card-chargloss", shortGloss(chEntries, 2) || "—"));
      list.append(item);
    });
    return list;
  }

  #paintCardButton() {
    const btn = this.card.querySelector(".zh-card-add");
    const on = this.cardWord ? this.isSelected(this.cardWord) : false;
    btn.textContent = on ? "Remove from list" : "Add to list";
    btn.classList.toggle("zh-btn--primary", !on);
  }

  #position(anchor) {
    const rect = anchor.getBoundingClientRect();
    const card = this.card;
    card.style.left = "0px";
    card.style.top = "0px";
    const size = card.getBoundingClientRect();
    const margin = 8;

    let left = rect.left + rect.width / 2 - size.width / 2;
    left = Math.max(margin, Math.min(left, window.innerWidth - size.width - margin));

    let top = rect.bottom + margin;
    if (top + size.height > window.innerHeight - margin) {
      top = Math.max(margin, rect.top - size.height - margin);
    }

    card.style.left = `${Math.round(left)}px`;
    card.style.top = `${Math.round(top)}px`;
  }
}

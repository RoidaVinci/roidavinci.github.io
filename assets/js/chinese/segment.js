/**
 * segment.js — word segmentation against the CC-CEDICT vocabulary.
 *
 * The text is cut into runs of Han characters; everything else (latin,
 * digits, punctuation, whitespace) passes through untouched. Each Han run is
 * segmented by dynamic programming over the dictionary: among all the ways of
 * covering the run with headwords, we take the one of highest total
 * log-probability, using the corpus counts carried in the dictionary file.
 *
 * The vocabulary is CC-CEDICT and nothing else, which is the point: every
 * multi-character token the reader produces is guaranteed to have an entry
 * behind it, so a hover never lands on a word with no definition. Characters
 * that no headword covers are emitted on their own and looked up individually.
 */

import { MAX_WORD_LENGTH } from "./dict.js";

const HAN = /\p{Script=Han}/u;

/** Weight given to a character that appears in no headword at all. */
const UNKNOWN_WEIGHT = 0.2;

const isHan = (ch) => HAN.test(ch);

/**
 * Split a run of Han characters into words.
 *
 * @param {string[]} chars characters of the run, one code point each
 * @param {import("./dict.js").Dictionary} dict
 * @returns {{text: string, known: boolean}[]}
 */
function segmentRun(chars, dict) {
  const n = chars.length;
  const logTotal = Math.log(dict.totalFreq);

  // route[i] = best achievable score for chars[i..n), and the end index of the
  // token that starts at i on that best path.
  const score = new Float64Array(n + 1);
  const next = new Int32Array(n + 1);

  for (let i = n - 1; i >= 0; i -= 1) {
    let best = -Infinity;
    let bestEnd = i + 1;
    const limit = Math.min(n, i + MAX_WORD_LENGTH);
    for (let j = i + 1; j <= limit; j += 1) {
      const word = chars.slice(i, j).join("");
      const freq = dict.freq(word);
      if (!freq && j > i + 1) continue; // multi-character candidates must be words
      const weight = freq || UNKNOWN_WEIGHT;
      const value = Math.log(weight) - logTotal + score[j];
      if (value > best) {
        best = value;
        bestEnd = j;
      }
    }
    score[i] = best;
    next[i] = bestEnd;
  }

  const out = [];
  for (let i = 0; i < n; i = next[i]) {
    const text = chars.slice(i, next[i]).join("");
    out.push({ text, known: dict.has(text) });
  }
  return out;
}

/**
 * @typedef {object} Token
 * @property {"word"|"other"|"break"} type
 * @property {string} text
 * @property {boolean} known whether the dictionary has an entry for it
 */

/**
 * Cut `text` into tokens ready for rendering.
 *
 * @param {string} text
 * @param {import("./dict.js").Dictionary} dict
 * @returns {Token[]}
 */
export function segment(text, dict) {
  const tokens = [];
  const chars = [...text];
  let i = 0;

  while (i < chars.length) {
    if (isHan(chars[i])) {
      const start = i;
      while (i < chars.length && isHan(chars[i])) i += 1;
      for (const w of segmentRun(chars.slice(start, i), dict)) {
        tokens.push({ type: "word", text: w.text, known: w.known });
      }
      continue;
    }

    if (chars[i] === "\n") {
      tokens.push({ type: "break", text: "\n", known: false });
      i += 1;
      continue;
    }

    const start = i;
    while (i < chars.length && !isHan(chars[i]) && chars[i] !== "\n") i += 1;
    tokens.push({ type: "other", text: chars.slice(start, i).join(""), known: false });
  }

  return tokens;
}

/** Number of dictionary words in a token list — shown in the status line. */
export function countWords(tokens) {
  return tokens.filter((t) => t.type === "word" && t.known).length;
}

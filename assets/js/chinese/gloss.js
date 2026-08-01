/**
 * gloss.js — turning CC-CEDICT senses into something readable.
 *
 * Raw senses carry cross-references written for a dictionary reader rather
 * than for a gloss line: `see 中國|中国[Zhong1 guo2]`, `CL:個|个[ge4]`. We keep
 * the characters, drop the bracketed readings and the traditional half of a
 * `trad|simp` pair, and leave measure-word notes out of short glosses.
 */

import { toneMarksJoined } from "./pinyin.js";

/** Senses that describe the headword's spelling rather than its meaning. */
const WEAK =
  /^(variant of|old variant of|archaic variant of|surname |used in |abbr\. for|see |see also|also written)/i;

export function senses(entry) {
  return entry.defs.split("/").map((s) => s.trim()).filter(Boolean);
}

/** `see 中國|中国[Zhong1 guo2]` → `see 中国`. */
export function cleanSense(sense) {
  return sense
    .replace(/\[[^\]]*\]/g, "")
    .replace(/([\u3400-\u9FFF]+)\|([\u3400-\u9FFF]+)/g, "$2")
    .replace(/\s{2,}/g, " ")
    .trim();
}

/**
 * Pick the entry to show when a headword has several readings — 行 is
 * `xing2` and `hang2`, 長 is `chang2` and `zhang3`. Prefer entries that say
 * what the word means over entries that say how it is spelled.
 */
export function primaryEntry(entries) {
  if (entries.length <= 1) return entries[0] || null;
  let best = entries[0];
  let bestScore = -Infinity;
  for (const e of entries) {
    const list = senses(e);
    const strong = list.filter((s) => !WEAK.test(s)).length;
    const score = strong * 10 + list.length + e.freq / 1e6;
    if (score > bestScore) {
      bestScore = score;
      best = e;
    }
  }
  return best;
}

/** Tone-marked reading for a headword, or "" when it has no entry. */
export function readingOf(entries) {
  const entry = primaryEntry(entries);
  return entry ? toneMarksJoined(entry.pinyin) : "";
}

/**
 * The gloss that sits under a word in the reading pane. It has to fit on one
 * or two short lines or the rows stop lining up, so it takes the first sense
 * only and cuts it at a word boundary.
 */
export function compactGloss(entries, maxChars = 32) {
  const full = shortGloss(entries, 1);
  if (full.length <= maxChars) return full;
  const cut = full.slice(0, maxChars);
  const space = cut.lastIndexOf(" ");
  return `${(space > maxChars * 0.6 ? cut.slice(0, space) : cut).replace(/[,;]$/, "")}…`;
}

/**
 * A one-line English gloss: the first few senses that carry meaning, with
 * measure words and cross-references left out.
 *
 * @param {object[]} entries
 * @param {number} [limit] how many senses to keep
 */
export function shortGloss(entries, limit = 3) {
  const entry = primaryEntry(entries);
  if (!entry) return "";
  const list = senses(entry)
    .filter((s) => !s.startsWith("CL:"))
    .map(cleanSense)
    .filter(Boolean);
  const meaningful = list.filter((s) => !WEAK.test(s));
  const chosen = (meaningful.length ? meaningful : list).slice(0, limit);
  return chosen.join(", ");
}

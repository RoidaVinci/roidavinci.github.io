/**
 * pinyin.js — CC-CEDICT's numbered pinyin to tone marks.
 *
 * CC-CEDICT stores readings as `ni3 hao3`, `lu:4 shi1`, `Zhong1 guo2`.
 * The reader shows `nǐ hǎo`, `lǜ shī`, `Zhōng guó`.
 */

const MARKS = {
  a: "āáǎàa",
  e: "ēéěèe",
  i: "īíǐìi",
  o: "ōóǒòo",
  u: "ūúǔùu",
  "ü": "ǖǘǚǜü",
};

/** Where the tone mark goes: a, then e or o, otherwise the last vowel. */
function markIndex(letters) {
  const a = letters.indexOf("a");
  if (a !== -1) return a;
  const e = letters.indexOf("e");
  if (e !== -1) return e;
  const ou = letters.indexOf("ou");
  if (ou !== -1) return ou;
  for (let i = letters.length - 1; i >= 0; i -= 1) {
    if (MARKS[letters[i]]) return i;
  }
  return -1;
}

/** `hao3` → `hǎo`. Anything that is not a syllable is returned unchanged. */
export function syllableToMarks(syllable) {
  const m = /^([A-Za-zÜü:]+)([1-5])?$/.exec(syllable);
  if (!m) return syllable.replace(/u:/g, "ü").replace(/U:/g, "Ü");

  const tone = m[2] ? Number(m[2]) : 5;
  // `u:` and a bare `v` are both CC-CEDICT spellings of ü.
  let body = m[1].replace(/u:/g, "ü").replace(/U:/g, "Ü").replace(/v/g, "ü");
  if (tone === 5) return body;

  const lower = body.toLowerCase();
  const at = markIndex(lower);
  if (at === -1) return body;

  const marked = MARKS[lower[at]][tone - 1];
  const isUpper = body[at] !== lower[at];
  return body.slice(0, at) + (isUpper ? marked.toUpperCase() : marked) + body.slice(at + 1);
}

/** `ni3 hao3` → `nǐ hǎo`, one syllable per space, as CC-CEDICT stores it. */
export function toneMarks(reading) {
  if (!reading) return "";
  return reading
    .split(/\s+/)
    .map(syllableToMarks)
    .join(" ")
    .replace(/\s+([,.·、])/g, "$1");
}

const VOWEL_START = /^[aeoāáǎàēéěèōóǒò]/i;

/**
 * `yin2 hang2` → `yínháng`, `Xi1 an1` → `Xī'ān`.
 *
 * Pinyin orthography writes a word as one unit, not as loose syllables. Two
 * rules keep that readable: a syllable beginning with a vowel takes an
 * apostrophe so the boundary stays unambiguous, and a capitalised syllable
 * starts a new unit, which is how multi-part proper nouns stay legible
 * (`Zhōnghuá Rénmín Gònghéguó`).
 */
export function toneMarksJoined(reading) {
  if (!reading) return "";
  const parts = reading.split(/\s+/).filter(Boolean).map(syllableToMarks);
  let out = "";
  for (const part of parts) {
    if (!out) {
      out = part;
      continue;
    }
    const upper = part[0] === part[0].toUpperCase() && part[0] !== part[0].toLowerCase();
    // `ka3 la1 O K` is 卡拉OK: a run of bare capitals is one latin word.
    const bothBare = part.length === 1 && /(^|\s)[A-Z]$/.test(out);
    if ((upper && !bothBare) || /[^A-Za-zü'·\u00C0-\u024F]$/.test(out)) out += " ";
    else if (VOWEL_START.test(part)) out += "'";
    out += part;
  }
  return out;
}

/**
 * The reading of a single character inside a word, so the pinyin line can be
 * laid out character by character when a word is broken across a line.
 * Returns null when the syllable count does not match the character count
 * (true of entries like 卡拉OK, and of any reading with embedded latin).
 */
export function alignSyllables(word, reading) {
  const chars = [...word];
  const syllables = reading.split(/\s+/).filter(Boolean);
  if (chars.length !== syllables.length) return null;
  return syllables.map(syllableToMarks);
}

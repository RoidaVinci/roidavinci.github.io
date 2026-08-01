/**
 * dict.js — loads assets/data/cedict.tsv.gz and indexes it.
 *
 * The file is fetched once, decompressed in the browser with
 * DecompressionStream, and kept in memory for the life of the page. A copy of
 * the compressed response is put in the Cache API, so a second visit skips the
 * network entirely even when the HTTP cache has been evicted.
 *
 * Line format (see script/build-dict.mjs):
 *   simplified <TAB> traditional <TAB> pinyin <TAB> freq <TAB> sense/sense/…
 */

const CACHE_NAME = "cedict-v1";

/** Longest headword the segmenter will try to match, in characters. */
export const MAX_WORD_LENGTH = 12;

export class Dictionary {
  constructor() {
    /** @type {{simp: string, trad: string, pinyin: string, freq: number, defs: string}[]} */
    this.entries = [];
    /** @type {Map<string, number[]>} headword → indices into `entries` */
    this.index = new Map();
    this.totalFreq = 0;
    this.loaded = false;
  }

  /** Every entry recorded under `word`, simplified or traditional. */
  lookup(word) {
    const ids = this.index.get(word);
    if (!ids) return [];
    return ids.map((i) => this.entries[i]);
  }

  has(word) {
    return this.index.has(word);
  }

  /** Corpus count used to score segmentations; 1 for entries jieba lacks. */
  freq(word) {
    const ids = this.index.get(word);
    if (!ids) return 0;
    let best = 1;
    for (const i of ids) best = Math.max(best, this.entries[i].freq);
    return best;
  }

  #add(word, id) {
    const existing = this.index.get(word);
    if (existing) existing.push(id);
    else this.index.set(word, [id]);
  }

  ingest(text) {
    for (const line of text.split("\n")) {
      if (!line || line.charCodeAt(0) === 35 /* # */) continue;
      const parts = line.split("\t");
      if (parts.length < 5) continue;
      const [simp, trad, pinyin, freqRaw, defs] = parts;
      const freq = Number(freqRaw) || 0;
      const id = this.entries.length;
      this.entries.push({ simp, trad: trad || simp, pinyin, freq, defs });
      this.totalFreq += freq;
      this.#add(simp, id);
      if (trad && trad !== simp) this.#add(trad, id);
    }
    // Guard against a corrupt or truncated file producing a useless total.
    if (this.totalFreq <= 0) this.totalFreq = this.entries.length;
    this.loaded = this.entries.length > 0;
  }
}

async function cachedResponse(url) {
  if (typeof caches === "undefined") return null;
  try {
    const cache = await caches.open(CACHE_NAME);
    const hit = await cache.match(url);
    if (hit) return hit;
    const res = await fetch(url);
    if (!res.ok) return res;
    await cache.put(url, res.clone());
    return res;
  } catch {
    // Private browsing, insecure origin, or a full quota — just use the network.
    return null;
  }
}

/**
 * Fetch, decompress and index the dictionary.
 *
 * @param {string} url
 * @param {(loaded: number, total: number) => void} [onProgress] bytes compressed
 * @returns {Promise<Dictionary>}
 */
export async function loadDictionary(url, onProgress) {
  const res = (await cachedResponse(url)) || (await fetch(url));
  if (!res.ok) throw new Error(`Could not load the dictionary (HTTP ${res.status}).`);
  if (!res.body) throw new Error("This browser cannot stream the dictionary file.");

  const total = Number(res.headers.get("content-length")) || 0;
  let loaded = 0;

  const source = res.body.getReader();
  const first = await source.read();
  const head = first.value;

  const count = (chunk) => {
    loaded += chunk.byteLength;
    if (onProgress) onProgress(loaded, total);
  };

  // Some hosts serve .gz with Content-Encoding set, in which case the browser
  // has already expanded it and there is nothing left to decompress. The magic
  // number says which of the two we actually received.
  const compressed = head && head.length > 1 && head[0] === 0x1f && head[1] === 0x8b;
  if (compressed && typeof DecompressionStream !== "function") {
    throw new Error(
      "This browser cannot decompress the dictionary. Chrome 80+, Safari 16.4+ or Firefox 113+ are needed."
    );
  }

  const bytes = new ReadableStream({
    start(controller) {
      if (head) {
        count(head);
        controller.enqueue(head);
      }
      if (first.done) controller.close();
    },
    async pull(controller) {
      const { value, done } = await source.read();
      if (done) {
        controller.close();
        return;
      }
      count(value);
      controller.enqueue(value);
    },
    cancel(reason) {
      source.cancel(reason);
    },
  });

  const stream = (compressed ? bytes.pipeThrough(new DecompressionStream("gzip")) : bytes)
    .pipeThrough(new TextDecoderStream("utf-8"));

  const dict = new Dictionary();
  const reader = stream.getReader();
  let tail = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    const text = tail + value;
    const cut = text.lastIndexOf("\n");
    if (cut === -1) {
      tail = text;
      continue;
    }
    dict.ingest(text.slice(0, cut));
    tail = text.slice(cut + 1);
  }
  if (tail) dict.ingest(tail);

  if (!dict.loaded) throw new Error("The dictionary file is empty or malformed.");
  return dict;
}

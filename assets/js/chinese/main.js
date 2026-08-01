/**
 * main.js — the /chinese/ reader.
 *
 * Paste Chinese, press Annotate: the text is segmented into words, each word
 * is stacked over its reading and its gloss, hovering one opens its
 * dictionary entry, clicking one adds it to a list, and the list exports as a
 * plain text file.
 *
 * The dictionary is only fetched when it is first needed, so arriving on the
 * page costs nothing beyond the page itself.
 */

import { loadDictionary } from "./dict.js";
import { segment, countWords } from "./segment.js";
import { Reader } from "./render.js";
import { readingOf, shortGloss } from "./gloss.js";
import { toText, toTsv, download, stamp, copyToClipboard } from "./export.js";

const STORE = {
  text: "zh-reader:text",
  words: "zh-reader:words",
  options: "zh-reader:options",
};

const SAMPLE = `我叫马克，是一名来自西班牙的学生。
去年秋天我第一次到北京，在语言学校学了半年中文。
刚开始的时候，我连菜单都看不懂，只能指着别人的盘子点菜。
现在我每天早上读一篇短文，晚上把新学的词写在本子上。
学中文很难，可是每认识一个新词，世界就大了一点。`;

const app = document.getElementById("zh-app");
if (app) start(app);

function start(app) {
  const $ = (id) => document.getElementById(id);

  const input = $("zh-input");
  const pane = $("zh-pane");
  const status = $("zh-status");
  const tray = $("zh-tray");
  const list = $("zh-list");
  const count = $("zh-count");
  const showPinyin = $("zh-show-pinyin");
  const showEnglish = $("zh-show-english");

  /** @type {Map<string, {hanzi: string, pinyin: string, english: string}>} */
  const selection = new Map(readJson(STORE.words, []).map((w) => [w.hanzi, w]));
  const options = { pinyin: true, english: true, ...readJson(STORE.options, {}) };
  showPinyin.checked = options.pinyin;
  showEnglish.checked = options.english;

  let dict = null;
  let loading = null;
  let tokens = [];

  const reader = new Reader({
    host: pane,
    dict: null,
    isSelected: (word) => selection.has(word),
    onToggle: toggle,
  });

  /* ------------------------------------------------------------ dictionary */

  function ensureDictionary() {
    if (dict) return Promise.resolve(dict);
    if (loading) return loading;

    const url = app.dataset.dict;
    say("Loading the dictionary…");
    loading = loadDictionary(url, (loaded, total) => {
      const mb = (n) => (n / 1048576).toFixed(1);
      say(
        total
          ? `Loading the dictionary… ${Math.round((loaded / total) * 100)}%`
          : `Loading the dictionary… ${mb(loaded)} MB`
      );
    })
      .then((loaded) => {
        dict = loaded;
        reader.dict = loaded;
        return loaded;
      })
      .catch((err) => {
        loading = null;
        throw err;
      });
    return loading;
  }

  /* --------------------------------------------------------------- actions */

  async function annotate() {
    const text = input.value.trim();
    if (!text) {
      say("Type or paste some Chinese first.");
      input.focus();
      return;
    }
    localStorage.setItem(STORE.text, input.value);

    try {
      await ensureDictionary();
    } catch (err) {
      say(err.message || "The dictionary could not be loaded.", true);
      return;
    }

    tokens = segment(text, dict);
    draw();
    const words = countWords(tokens);
    say(`${words} word${words === 1 ? "" : "s"} found. Hover a word for its entry; click to add it to your list.`);
    pane.setAttribute("tabindex", "-1");
  }

  function draw() {
    reader.render(tokens, { showEnglish: options.english });
    pane.classList.toggle("zh-pane--no-pinyin", !options.pinyin);
  }

  function toggle(word) {
    if (selection.has(word)) {
      selection.delete(word);
    } else {
      const entries = dict.lookup(word);
      selection.set(word, {
        hanzi: word,
        pinyin: readingOf(entries),
        english: shortGloss(entries, 3) || "—",
      });
    }
    persistWords();
    reader.syncSelection();
    drawTray();
  }

  function drawTray() {
    const words = [...selection.values()];
    count.textContent = String(words.length);
    tray.hidden = words.length === 0;
    list.textContent = "";

    for (const word of words) {
      const item = document.createElement("li");
      const chip = document.createElement("button");
      chip.type = "button";
      chip.className = "zh-chip";
      chip.title = `${word.pinyin} — ${word.english}`;
      chip.setAttribute("aria-label", `Remove ${word.hanzi} from the list`);

      const hanzi = document.createElement("span");
      hanzi.className = "zh-chip-hanzi";
      hanzi.textContent = word.hanzi;
      const pinyin = document.createElement("span");
      pinyin.className = "zh-chip-pinyin";
      pinyin.textContent = word.pinyin;
      const cross = document.createElement("span");
      cross.className = "zh-chip-x";
      cross.setAttribute("aria-hidden", "true");
      cross.textContent = "×";

      chip.append(hanzi, pinyin, cross);
      chip.addEventListener("click", () => toggle(word.hanzi));
      item.append(chip);
      list.append(item);
    }
  }

  function words() {
    return [...selection.values()];
  }

  /* --------------------------------------------------------------- wiring */

  $("zh-annotate").addEventListener("click", annotate);

  $("zh-sample").addEventListener("click", () => {
    input.value = SAMPLE;
    annotate();
  });

  $("zh-clear").addEventListener("click", () => {
    input.value = "";
    tokens = [];
    pane.textContent = "";
    localStorage.removeItem(STORE.text);
    say("Cleared. Your saved word list is untouched.");
    input.focus();
  });

  showPinyin.addEventListener("change", () => {
    options.pinyin = showPinyin.checked;
    persistOptions();
    draw();
  });

  showEnglish.addEventListener("change", () => {
    options.english = showEnglish.checked;
    persistOptions();
    draw();
  });

  $("zh-export-txt").addEventListener("click", () => {
    if (!selection.size) return;
    download(stamp("chinese-words", "txt"), toText(words()));
    say(`Exported ${selection.size} words.`);
  });

  $("zh-export-tsv").addEventListener("click", () => {
    if (!selection.size) return;
    download(stamp("chinese-words", "tsv"), toTsv(words()));
    say(`Exported ${selection.size} words as tab-separated text.`);
  });

  $("zh-copy").addEventListener("click", async () => {
    if (!selection.size) return;
    const ok = await copyToClipboard(toText(words()));
    say(ok ? "Copied to the clipboard." : "This browser blocked the clipboard — use Export instead.", !ok);
  });

  $("zh-clear-list").addEventListener("click", () => {
    if (!selection.size) return;
    selection.clear();
    persistWords();
    reader.syncSelection();
    drawTray();
    say("Word list cleared.");
  });

  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) annotate();
  });

  /* ----------------------------------------------------------- persistence */

  function persistWords() {
    try {
      localStorage.setItem(STORE.words, JSON.stringify(words()));
    } catch {
      /* quota or private mode — the list still works for this session */
    }
  }

  function persistOptions() {
    try {
      localStorage.setItem(STORE.options, JSON.stringify(options));
    } catch {
      /* ignore */
    }
  }

  function readJson(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  }

  function say(message, isError = false) {
    status.textContent = message;
    status.classList.toggle("zh-status--error", isError);
  }

  /* ------------------------------------------------------------------ boot */

  const saved = localStorage.getItem(STORE.text);
  if (saved) input.value = saved;
  drawTray();
  say(
    selection.size
      ? `${selection.size} word${selection.size === 1 ? "" : "s"} saved from last time.`
      : "The dictionary (about 3.6 MB) downloads the first time you annotate."
  );
}

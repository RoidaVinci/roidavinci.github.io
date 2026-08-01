/**
 * export.js — writing the selected words out.
 *
 * The .txt form is the one asked for:
 *
 *     汉字; hàn zì - Chinese character
 *
 * The .tsv form is the same three fields separated by tabs, which is what
 * Anki's import dialog expects.
 */

/** @typedef {{hanzi: string, pinyin: string, english: string}} Word */

/** @param {Word[]} words */
export function toText(words) {
  return words.map((w) => `${w.hanzi}; ${w.pinyin} - ${w.english}`).join("\n") + "\n";
}

/** @param {Word[]} words */
export function toTsv(words) {
  return (
    words
      .map((w) => [w.hanzi, w.pinyin, w.english].map((f) => f.replace(/\t/g, " ")).join("\t"))
      .join("\n") + "\n"
  );
}

export function download(filename, contents) {
  const blob = new Blob([contents], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  // Revoke on the next frame; revoking synchronously cancels the download in
  // some browsers.
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

export function stamp(prefix, extension) {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${prefix}-${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}.${extension}`;
}

export async function copyToClipboard(text) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return true;
  }
  return false;
}

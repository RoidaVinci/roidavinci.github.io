// MathJax 3 configuration. Must load before the MathJax script itself.
window.MathJax = {
  tex: {
    inlineMath: [["\\(", "\\)"], ["$", "$"]],
    displayMath: [["$$", "$$"], ["\\[", "\\]"]],
    packages: { "[+]": ["ams"] },
    tags: "ams",
    macros: {
      RR: "{\\mathbb{R}}",
      bold: ["{\\bf #1}", 1]
    }
  },
  options: {
    // Don't typeset inside code samples
    skipHtmlTags: ["script", "noscript", "style", "textarea", "pre", "code"]
  }
};

// Applies the saved (or system-preferred) theme before first paint.
(function () {
  var stored = null;
  try { stored = localStorage.getItem("theme"); } catch (e) { /* storage unavailable */ }
  var theme = stored || (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
  document.documentElement.setAttribute("data-theme", theme);
})();

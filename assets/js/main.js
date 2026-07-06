// Site-wide behaviour: theme toggle + MathJax helpers.
(function () {
  "use strict";

  // --- Theme toggle -------------------------------------------------------
  var toggle = document.getElementById("theme-toggle");
  if (toggle) {
    toggle.addEventListener("click", function () {
      var root = document.documentElement;
      var next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
      root.setAttribute("data-theme", next);
      try { localStorage.setItem("theme", next); } catch (e) { /* storage unavailable */ }
    });
  }

  // --- Re-typeset math inside <details> on first open (hidden content can
  //     be measured incorrectly by MathJax while collapsed) ----------------
  document.querySelectorAll("details").forEach(function (details) {
    details.addEventListener("toggle", function () {
      if (details.open && !details.dataset.typeset &&
          window.MathJax && window.MathJax.typesetPromise) {
        details.dataset.typeset = "true";
        window.MathJax.typesetPromise([details]);
      }
    });
  });
})();

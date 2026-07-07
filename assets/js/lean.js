// Lean notes: drill-down cards, foundation tabs, and on-demand editor embeds.
(function () {
  "use strict";

  // Hidden content can be measured incorrectly by MathJax; re-typeset a note
  // the first time it opens (same approach as the <details> handler in main.js).
  function typeset(el) {
    if (!el.dataset.typeset && window.MathJax && window.MathJax.typesetPromise) {
      el.dataset.typeset = "true";
      window.MathJax.typesetPromise([el]);
    }
  }

  function openNote(id, scroll) {
    var note = document.getElementById(id);
    if (!note) return;
    document.querySelectorAll(".note.open").forEach(function (n) {
      if (n !== note) n.classList.remove("open");
    });
    note.classList.add("open");
    typeset(note);
    document.querySelectorAll(".tok.active").forEach(function (t) {
      t.classList.remove("active");
    });
    document.querySelectorAll('.tok[data-note="' + id + '"]').forEach(function (t) {
      t.classList.add("active");
    });
    if (scroll) note.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  document.querySelectorAll(".tok").forEach(function (tok) {
    tok.setAttribute("role", "button");
    tok.setAttribute("tabindex", "0");
    tok.setAttribute("title", "Click to open the explanation");
    function activate(e) {
      e.preventDefault();
      openNote(tok.dataset.note, true);
    }
    tok.addEventListener("click", activate);
    tok.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") activate(e);
    });
  });

  document.querySelectorAll(".note > h4").forEach(function (h) {
    h.addEventListener("click", function () {
      var note = h.parentElement;
      if (note.classList.contains("open")) {
        note.classList.remove("open");
        document.querySelectorAll('.tok[data-note="' + note.id + '"]').forEach(function (t) {
          t.classList.remove("active");
        });
      } else {
        openNote(note.id, false);
      }
    });
  });

  document.querySelectorAll("a.note-link").forEach(function (a) {
    a.addEventListener("click", function (e) {
      e.preventDefault();
      openNote(a.getAttribute("href").slice(1), true);
    });
  });

  // Tabs (three-foundations page).
  document.querySelectorAll(".tabs").forEach(function (tabs) {
    var buttons = tabs.querySelectorAll(".tab-buttons button");
    var panels = tabs.querySelectorAll(".tab-panel");
    buttons.forEach(function (btn) {
      btn.addEventListener("click", function () {
        buttons.forEach(function (b) { b.classList.remove("active"); });
        panels.forEach(function (p) { p.classList.remove("active"); });
        btn.classList.add("active");
        var panel = tabs.querySelector('.tab-panel[data-panel="' + btn.dataset.tab + '"]');
        panel.classList.add("active");
        typeset(panel);
      });
    });
    if (buttons.length) buttons[0].click();
  });

  // Lean editor embeds. Each .lean-embed names a .lean file in this repo
  // (data-lean-src); we fetch it and build a live.lean-lang.org URL from it.
  // The editor is only loaded on click — every live editor opens a session
  // on the Lean FRO's server, so we don't start them unasked.
  var PLAYGROUND = "https://live.lean-lang.org/#project=MathlibDemo&code=";
  document.querySelectorAll(".lean-embed").forEach(function (box) {
    var btn = box.querySelector(".lean-embed-load");
    var link = box.querySelector(".open-playground");
    if (!btn) return;
    fetch(box.dataset.leanSrc)
      .then(function (r) { return r.text(); })
      .then(function (code) {
        var url = PLAYGROUND + encodeURIComponent(code);
        if (link) link.href = url;
        btn.addEventListener("click", function () {
          var iframe = document.createElement("iframe");
          iframe.src = url;
          iframe.className = "lean-iframe";
          iframe.setAttribute("title", "Lean 4 web editor");
          box.appendChild(iframe);
          btn.remove();
        });
      })
      .catch(function () {
        btn.disabled = true;
        btn.textContent = "Editor unavailable (could not load code)";
      });
  });
})();

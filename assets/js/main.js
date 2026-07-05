// Site-wide behaviour: theme toggle + home-page profile waves.
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

  // --- Profile picture: play music with animated waves (home page only) ---
  var profileButton = document.getElementById("profile-button");
  var profileAudio = document.getElementById("profile-audio");
  var waveSvg = document.getElementById("profile-waves");
  if (!profileButton || !profileAudio || !waveSvg) return;

  var reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var waves = [
    { A: 10, n: 8 }, { A: 10, n: 15 }, { A: 10, n: 20 },
    { A: 6, n: 12 }, { A: 6, n: 26 }, { A: 6, n: 40 },
    { A: 2, n: 30 }, { A: 2, n: 60 }, { A: 2, n: 90 }
  ].map(function (wave, i) {
    wave.element = waveSvg.children[i];
    return wave;
  });

  var CENTER = 150;
  var RADIUS = 120;
  var POINTS = 360;
  var TWO_PI = 2 * Math.PI;
  var rotation = 0;
  var isPlaying = false;

  function drawWave(wave) {
    var d = "M";
    for (var i = 0; i <= POINTS; i++) {
      var t = (i / POINTS) * TWO_PI + rotation;
      var r = RADIUS + wave.A * Math.cos(wave.n * t);
      d += (CENTER + r * Math.cos(t)) + "," + (CENTER + r * Math.sin(t)) + " ";
    }
    wave.element.setAttribute("d", d);
  }

  function drawAll() {
    waves.forEach(drawWave);
  }

  function animate() {
    if (isPlaying && !reducedMotion) {
      rotation = (rotation + 0.01) % TWO_PI;
      drawAll();
    }
    requestAnimationFrame(animate);
  }

  function setPlaying(playing) {
    isPlaying = playing;
    profileButton.setAttribute("aria-pressed", String(playing));
  }

  profileButton.addEventListener("click", function () {
    if (isPlaying) {
      profileAudio.pause();
      setPlaying(false);
    } else {
      profileAudio.play().then(function () {
        setPlaying(true);
      }).catch(function () { /* autoplay blocked or file missing */ });
    }
  });

  profileAudio.addEventListener("ended", function () {
    setPlaying(false);
  });

  drawAll();
  animate();
})();

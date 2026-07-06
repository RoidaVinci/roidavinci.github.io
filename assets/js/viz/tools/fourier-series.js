// Fourier series builder: a chain of rotating vectors (epicycles) whose tip
// traces the partial sum of a Fourier series next to the exact target wave.
//
// A second, deliberately different tool built on the same toolkit as the
// gradient-descent playground — registry data (waves.js), theme bridge and
// panel builder — to show the toolkit generalizes across concepts.

import { register, onTheme, buildPanel, prefersReducedMotion } from "../toolkit.js";
import { WAVES, partialSeries } from "../waves.js";

const TAU = 2 * Math.PI;
const DT_SAMPLE = TAU / 240;   // one recorded sample per 1.5° of phase
const SECONDS_PER_PERIOD = 5;  // at speed ×1

register("fourier-series", (host) => {
  /* ---- state ------------------------------------------------------------ */
  const state = {
    waveKey: "square",
    nTerms: 4,
    speed: 1,
    playing: !prefersReducedMotion(),
    show: { circles: true, target: true },
    t: 0,
  };
  let theme = null;
  let dirty = true;
  let terms = [];
  let rms = 0;
  let trace = [];               // [{t, v}], newest last; length ≤ capacity()

  const wave = () => WAVES[state.waveKey];

  /* ---- DOM -------------------------------------------------------------- */
  host.innerHTML = "";
  const tool = el("div", "viz-tool");
  const stage = el("div", "viz-stage");
  const legend = el("ul", "viz-legend viz-stage-legend");
  legend.setAttribute("aria-label", "Curves");
  const canvas = el("canvas", "viz-canvas viz-canvas-wide");
  canvas.setAttribute("role", "img");
  canvas.setAttribute("aria-label",
    "Rotating epicycle vectors tracing the partial Fourier sum beside the exact target waveform.");
  const hint = el("p", "viz-hint");
  hint.textContent = "Each circle is one harmonic — its radius is the coefficient, its speed the frequency";
  stage.append(legend, canvas, hint);

  const panel = el("aside", "viz-panel");
  const readout = el("p", "viz-readout");
  readout.setAttribute("aria-live", "polite");
  tool.append(stage, panel);
  host.append(tool);

  /* ---- series ------------------------------------------------------------ */
  function value(tt) {
    let v = wave().dc;
    for (const h of terms) v += h.amp * Math.sin(h.omega * tt + h.phase);
    return v;
  }

  function rebuildSeries() {
    terms = partialSeries(wave(), state.nTerms);
    let sq = 0;
    const N = 2048;
    for (let i = 0; i < N; i++) {
      const u = (TAU * i) / N;
      const e = value(u) - wave().target(u);
      sq += e * e;
    }
    rms = Math.sqrt(sq / N);
    refillTrace();
    updateReadout();
    dirty = true;
  }

  /* ---- trace ------------------------------------------------------------- */
  const dpr = () => canvas.width / (canvas.clientWidth || canvas.width);

  // Plot geometry, all in device pixels.
  function layout() {
    const w = canvas.width, h = canvas.height, k = dpr();
    return {
      w, h, k,
      cy: h / 2,
      R: h * 0.28,
      cx0: w * 0.18,
      xTrace: w * 0.4,
      xEnd: w - 14 * k,
      pxStep: 2 * k,
    };
  }

  const capacity = () => {
    const g = layout();
    return Math.max(2, Math.floor((g.xEnd - g.xTrace) / g.pxStep));
  };

  // Recompute the whole visible history with the current series, so changing
  // the waveform or term count updates the entire trace instantly.
  function refillTrace() {
    const cap = capacity();
    trace = [];
    for (let i = cap - 1; i >= 0; i--) {
      const tt = state.t - i * DT_SAMPLE;
      trace.push({ t: tt, v: value(tt) });
    }
  }

  function advance(dtWall) {
    let steps = Math.floor((advance.acc = (advance.acc || 0) + (dtWall * state.speed * TAU) / SECONDS_PER_PERIOD) / DT_SAMPLE);
    advance.acc -= steps * DT_SAMPLE;
    if (steps > 600) steps = 600;
    const cap = capacity();
    while (steps-- > 0) {
      state.t += DT_SAMPLE;
      trace.push({ t: state.t, v: value(state.t) });
      if (trace.length > cap) trace.shift();
    }
  }

  /* ---- rendering ---------------------------------------------------------- */
  function render() {
    const ctx = canvas.getContext("2d");
    const g = layout();
    ctx.clearRect(0, 0, g.w, g.h);
    if (!theme) return;

    // Recessive grid: baseline and ±1, with tiny labels.
    ctx.strokeStyle = theme.border;
    ctx.lineWidth = 1;
    ctx.fillStyle = theme.muted;
    ctx.font = `${11 * g.k}px -apple-system, "Segoe UI", Roboto, sans-serif`;
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    for (const [lvl, label] of [[1, "+1"], [0, "0"], [-1, "−1"]]) {
      const y = g.cy - lvl * g.R;
      ctx.beginPath();
      ctx.moveTo(g.xTrace, y);
      ctx.lineTo(g.xEnd, y);
      ctx.stroke();
      ctx.fillText(label, g.xTrace - 5 * g.k, y);
    }

    const X = (j) => g.xTrace + j * g.pxStep;
    const Y = (v) => g.cy - v * g.R;
    const newest = trace.length - 1;

    // Exact target wave (dashed, muted), under the partial sum.
    if (state.show.target) {
      ctx.beginPath();
      for (let j = 0; j <= newest; j++) {
        const s = trace[newest - j];
        j === 0 ? ctx.moveTo(X(j), Y(wave().target(s.t))) : ctx.lineTo(X(j), Y(wave().target(s.t)));
      }
      ctx.strokeStyle = theme.muted;
      ctx.lineWidth = 1.5 * g.k;
      ctx.setLineDash([5 * g.k, 5 * g.k]);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Partial Fourier sum.
    ctx.beginPath();
    for (let j = 0; j <= newest; j++) {
      const s = trace[newest - j];
      j === 0 ? ctx.moveTo(X(j), Y(s.v)) : ctx.lineTo(X(j), Y(s.v));
    }
    ctx.strokeStyle = theme.series[0];
    ctx.lineWidth = 2 * g.k;
    ctx.lineJoin = "round";
    ctx.stroke();

    // Epicycles: one circle + rotating vector per harmonic.
    let px = g.cx0, py = g.cy - wave().dc * g.R;
    if (state.show.circles) {
      for (const h of terms) {
        const r = Math.abs(h.amp) * g.R;
        const ang = h.omega * state.t + h.phase;
        const nx = px + h.amp * g.R * Math.cos(ang);
        const ny = py - h.amp * g.R * Math.sin(ang);
        ctx.beginPath();
        ctx.arc(px, py, r, 0, TAU);
        ctx.strokeStyle = theme.border;
        ctx.lineWidth = 1 * g.k;
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(nx, ny);
        ctx.strokeStyle = theme.muted;
        ctx.stroke();
        px = nx; py = ny;
      }
    } else {
      px = g.xTrace; py = Y(trace.length ? trace[newest].v : 0);
    }

    // Connector from the tip to the head of the trace.
    const tipY = state.show.circles ? py : Y(trace.length ? trace[newest].v : 0);
    if (state.show.circles) {
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(g.xTrace, tipY);
      ctx.strokeStyle = theme.muted;
      ctx.lineWidth = 1 * g.k;
      ctx.setLineDash([3 * g.k, 4 * g.k]);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Tip marker with a surface ring so it stays separable over the curve.
    ctx.beginPath();
    ctx.arc(state.show.circles ? px : g.xTrace, tipY, 4 * g.k, 0, TAU);
    ctx.fillStyle = theme.series[0];
    ctx.fill();
    ctx.strokeStyle = theme.surface;
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  /* ---- control panel ------------------------------------------------------ */
  const controls = buildPanel(panel, [
    {
      title: "Series",
      fields: [
        {
          kind: "select", id: "wave", label: "Waveform", value: state.waveKey,
          options: Object.entries(WAVES).map(([value, w]) => ({ value, label: w.name })),
          onChange: (v) => { state.waveKey = v; rebuildSeries(); },
        },
        {
          kind: "range", id: "terms", label: "Harmonics", min: 1, max: 64, step: 1,
          value: state.nTerms, format: (v) => v + (v === 1 ? " term" : " terms"),
          onChange: (v) => { state.nTerms = v; rebuildSeries(); },
        },
        { kind: "checkbox", id: "circles", label: "Show epicycles", value: state.show.circles, onChange: (v) => { state.show.circles = v; dirty = true; } },
        { kind: "checkbox", id: "target", label: "Show target wave", value: state.show.target, onChange: (v) => { state.show.target = v; dirty = true; } },
      ],
    },
    {
      title: "Playback",
      fields: [
        {
          kind: "buttons",
          buttons: [
            { id: "play", label: state.playing ? "Pause" : "Play", primary: true, onClick: () => setPlaying(!state.playing) },
          ],
        },
        {
          kind: "range", id: "speed", label: "Speed", min: 0.25, max: 4, step: 0.25,
          value: state.speed, format: (v) => "×" + v,
          onChange: (v) => { state.speed = v; },
        },
      ],
    },
    { title: "", fields: [{ kind: "custom", build: (section) => section.appendChild(readout) }] },
  ]);

  function setPlaying(playing) {
    state.playing = playing;
    controls.set("play", playing ? "Pause" : "Play");
  }

  function updateReadout() {
    readout.textContent =
      terms.length + (terms.length === 1 ? " harmonic" : " harmonics") +
      " · RMS error " + rms.toFixed(3);
  }

  function updateLegend() {
    legend.innerHTML = "";
    for (const item of [
      { color: theme.series[0], label: "Partial Fourier sum" },
      { color: theme.muted, label: "Target waveform" },
    ]) {
      const li = el("li", "viz-legend-item");
      const dot = el("span", "viz-swatch");
      dot.style.background = item.color;
      li.append(dot, document.createTextNode(item.label));
      legend.appendChild(li);
    }
  }

  /* ---- boot ---------------------------------------------------------------- */
  onTheme((t) => {
    theme = t;
    updateLegend();
    dirty = true;
  });

  const resizeObserver = new ResizeObserver(() => {
    const k = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.max(1, Math.round(canvas.clientWidth * k));
    const h = Math.max(1, Math.round(canvas.clientHeight * k));
    if (w !== canvas.width || h !== canvas.height) {
      canvas.width = w;
      canvas.height = h;
      refillTrace();
      dirty = true;
    }
  });
  resizeObserver.observe(canvas);

  rebuildSeries();

  let last = performance.now();
  (function frame(now) {
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    if (state.playing) {
      advance(dt);
      dirty = true;
    }
    if (dirty) { dirty = false; render(); }
    requestAnimationFrame(frame);
  })(last);
});

function el(tag, className) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  return node;
}

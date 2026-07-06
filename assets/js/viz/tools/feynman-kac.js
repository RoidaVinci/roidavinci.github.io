// The Feynman–Kac machine: Brownian walkers with drift, killing and running
// reward estimate the solution of
//
//   (σ²/2)Δu + b·∇u − c u + f = 0 in D,   u = g on ∂D  (g = 1 on Γ, 0 else)
//
// at a chosen start point, u(x₀) = E[e^{−cτ} g(X_τ) + ∫₀^τ e^{−cs} f ds],
// while a finite-difference reference solve (fdm.js) — or a closed form from
// domains.js when one exists — paints the same u across the whole domain.
// Charts expose the probabilistic side: CLT convergence, the exit-time
// distribution, harmonic measure on the boundary (with the exact Poisson
// kernel on the disk) and the survival function whose log-linear tail is the
// principal Dirichlet eigenvalue.

import { register, onTheme, buildPanel, prefersReducedMotion, hexToRgb, rgbToCss } from "../toolkit.js";
import { Surface3D } from "../surface3d.js";
import { DomainView } from "../domainview.js";
import { DOMAINS } from "../domains.js";
import { DRIFTS } from "../drifts.js";
import { createSolver } from "../fdm.js";

const PI = Math.PI;
const T_MAX = 40;             // censoring time for walkers that never exit
const TRAIL_MAX = 380;        // points kept per trailed walker
const TRAILED_MAX = 14;       // walkers that draw a trail at any moment
const EXIT_STORE_MAX = 20000; // exit samples kept for the histograms
const HISTORY_MAX = 3000;     // convergence-history entries before decimation
const BURST_SIZE = 2000;
const J01 = 2.404825557695773; // first zero of the Bessel function J₀

const QUANTITIES = [
  { value: "exitprob", label: "Exit probability P(X_τ ∈ Γ)", gOn: true, f: 0, c: 0 },
  { value: "exittime", label: "Mean exit time E[τ]", gOn: false, f: 1, c: 0 },
  { value: "laplace", label: "Laplace transform E[e^(−cτ); Γ]", gOn: true, f: 0, c: 1.5 },
  { value: "custom", label: "Custom (set g, f, c below)" },
];

const CHARTS = [
  { value: "convergence", label: "Monte-Carlo convergence", title: "Monte-Carlo estimate of u(x₀)" },
  { value: "tau", label: "Exit-time histogram", title: "Exit-time distribution" },
  { value: "dir", label: "Exit directions", title: "Exit directions (harmonic measure)" },
  { value: "survival", label: "Survival P(τ > t)", title: "Survival function P(τ > t) — log scale" },
];

register("feynman-kac", (host) => {
  /* ---- state ------------------------------------------------------------ */
  const state = {
    domainKey: "disk",
    view: "2d",
    playing: !prefersReducedMotion(),
    quantity: "exitprob",
    gOn: true, f: 0, c: 0,
    sigma: 1, driftKey: "none", driftStrength: 1, driftAngle: 0,
    dt: 5e-4,
    walkersTarget: 150, stepsPerSec: 400,
    show: { field: true, arrows: true, trails: true, wireframe: true },
    chart: "convergence",
  };
  let theme = null;
  let dirty = true;
  let chartDirty = true;

  const dom = () => DOMAINS[state.domainKey];
  let x0 = [...dom().start];

  // Simulation state.
  let walkers = [];
  let ghosts = [];
  let trailedCount = 0;
  let burstLeft = 0;
  let stats = null;
  let history = [];
  let exits = null;
  let tauSorted = null;
  let sqrtDt = Math.sqrt(state.dt);
  let cKillProb = 0;
  let currentDrift = DRIFTS.none.make();

  // Reference solve.
  let solver = null;
  let fieldVersion = 0;
  let solveTicks = 0;
  let rebuildTimer = 0;

  /* ---- DOM -------------------------------------------------------------- */
  host.innerHTML = "";
  const tool = el("div", "viz-tool");
  const stage = el("div", "viz-stage");
  const canvas2d = el("canvas", "viz-canvas");
  const canvas3d = el("canvas", "viz-canvas");
  canvas2d.setAttribute("role", "img");
  canvas2d.setAttribute("aria-label",
    "Domain with random walkers diffusing from a start point; the background shades the PDE solution u. Click to move the start point.");
  canvas3d.setAttribute("role", "img");
  canvas3d.setAttribute("aria-label",
    "3D surface of the solution u with walkers moving on it. Drag or use arrow keys to rotate, scroll to zoom, click to move the start point.");
  canvas3d.hidden = true;
  const hint = el("p", "viz-hint");
  hint.textContent = "Click inside the domain to move x₀ · the green boundary arc is the target set Γ";
  stage.append(canvas2d, canvas3d, hint);

  const panel = el("aside", "viz-panel");
  const readout = el("p", "viz-readout");
  readout.setAttribute("aria-live", "polite");
  const eqBox = el("div", "viz-eq");

  const chartSection = el("section", "viz-chart");
  const chartHead = el("div", "viz-chart-head");
  const chartTitle = el("h2", "viz-chart-title");
  const chartSelect = document.createElement("select");
  chartSelect.className = "viz-chart-select";
  chartSelect.setAttribute("aria-label", "Chart");
  CHARTS.forEach((c) => {
    const opt = document.createElement("option");
    opt.value = c.value;
    opt.textContent = c.label;
    chartSelect.appendChild(opt);
  });
  chartSelect.addEventListener("change", () => {
    state.chart = chartSelect.value;
    updateChartHead();
    chartDirty = true;
  });
  const legend = el("ul", "viz-legend");
  legend.setAttribute("aria-label", "Chart legend");
  chartHead.append(chartTitle, legend, chartSelect);
  const chartCanvas = el("canvas", "viz-loss-canvas");
  chartSection.append(chartHead, chartCanvas);

  tool.append(stage, panel);
  host.append(tool, chartSection);

  /* ---- renderers ---------------------------------------------------------- */
  const markDirty = () => { dirty = true; };
  const moveStart = (x, y) => {
    if (dom().sdf(x, y) >= -0.01) return;
    x0 = [x, y];
    resetStats();
  };
  const domainView = new DomainView(canvas2d, { onPick: moveStart, onChange: markDirty });
  const surface = new Surface3D(canvas3d, { onPick: moveStart, onChange: markDirty });
  const chartCtx = chartCanvas.getContext("2d");
  const chartResize = new ResizeObserver(() => {
    const k = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.max(1, Math.round(chartCanvas.clientWidth * k));
    const h = Math.max(1, Math.round(chartCanvas.clientHeight * k));
    if (w !== chartCanvas.width || h !== chartCanvas.height) {
      chartCanvas.width = w;
      chartCanvas.height = h;
      chartDirty = true;
    }
  });
  chartResize.observe(chartCanvas);

  /* ---- problem / reference solve ------------------------------------------ */
  function driftFn() {
    return DRIFTS[state.driftKey].make(state.driftStrength, state.driftAngle);
  }

  function rebuildSolver() {
    solver = createSolver(dom(), {
      sigma: state.sigma, c: state.c, f: state.f, gOn: state.gOn, drift: driftFn(),
    });
    solveTicks = 0;
    fieldVersion++;
    refreshFieldViews();
  }

  const uAt = (x, y) => (solver ? solver.interp(x, y) : 0);

  function surfaceField() {
    const [X0, Y0, X1, Y1] = dom().bbox;
    return {
      f: uAt,
      domain: [Math.min(X0, Y0), Math.max(X1, Y1)],
      mask: (x, y) => dom().sdf(x, y) < 0,
    };
  }

  function refreshFieldViews() {
    domainView.setField(state.show.field ? uAt : null, fieldVersion);
    surface.setField(surfaceField());
    dirty = true;
  }

  // Closed form for the current configuration, or null. Only driftless,
  // killing-free problems have exact solutions in domains.js; by linearity
  // u = g·(exit probability) + f·(expected exit time).
  function exactAt(x, y) {
    if (state.c > 0) return null;
    if (state.driftKey !== "none" && state.driftStrength > 0) return null;
    const ex = dom().exact;
    let total = 0;
    if (state.gOn) {
      if (!ex.exitProb) return null;
      total += ex.exitProb(x, y);
    }
    if (state.f !== 0) {
      if (!ex.exitTime) return null;
      total += state.f * ex.exitTime(x, y, state.sigma);
    }
    return total;
  }

  function refValue() {
    const exact = exactAt(x0[0], x0[1]);
    if (exact !== null) return { value: exact, kind: "exact" };
    if (solver && solver.done) return { value: uAt(x0[0], x0[1]), kind: "FDM" };
    return null;
  }

  // Rebuild the reference solve soon (debounced: sliders fire continuously).
  function scheduleProblemRebuild() {
    resetStats();
    updateEquation();
    clearTimeout(rebuildTimer);
    rebuildTimer = setTimeout(rebuildSolver, 220);
  }

  function recomputeStepConstants() {
    sqrtDt = Math.sqrt(state.dt);
    cKillProb = state.c > 0 ? 1 - Math.exp(-state.c * state.dt) : 0;
    currentDrift = driftFn();
  }

  /* ---- walker simulation ---------------------------------------------------- */
  let spare = null;
  function randn() {
    if (spare !== null) { const v = spare; spare = null; return v; }
    let u1 = 0;
    while (u1 === 0) u1 = Math.random();
    const m = Math.sqrt(-2 * Math.log(u1));
    const a = 2 * PI * Math.random();
    spare = m * Math.sin(a);
    return m * Math.cos(a);
  }

  function newWalker(withTrail) {
    const w = { x: x0[0], y: x0[1], t: 0, trail: null };
    if (withTrail && trailedCount < TRAILED_MAX) {
      w.trail = [[w.x, w.y]];
      trailedCount++;
    }
    return w;
  }

  // Locate the boundary crossing between an inside and an outside point.
  function bisectBoundary(x1, y1, x2, y2) {
    const sdf = dom().sdf;
    for (let k = 0; k < 14; k++) {
      const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
      if (sdf(mx, my) < 0) { x1 = mx; y1 = my; } else { x2 = mx; y2 = my; }
    }
    return [(x1 + x2) / 2, (y1 + y2) / 2];
  }

  // One Euler–Maruyama step; returns an outcome object or null.
  function stepWalker(w) {
    if (cKillProb > 0 && Math.random() < cKillProb) return { type: "killed" };
    const [bx, by] = currentDrift(w.x, w.y);
    const s = state.sigma * sqrtDt;
    const nx = w.x + bx * state.dt + s * randn();
    const ny = w.y + by * state.dt + s * randn();
    w.t += state.dt;
    if (dom().sdf(nx, ny) >= 0) {
      const [ex, ey] = bisectBoundary(w.x, w.y, nx, ny);
      return { type: "exit", x: ex, y: ey, hit: dom().target(ex, ey) };
    }
    w.x = nx;
    w.y = ny;
    if (w.trail) {
      w.trail.push([nx, ny]);
      if (w.trail.length > TRAIL_MAX) w.trail.shift();
    }
    if (w.t >= T_MAX) return { type: "censored" };
    return null;
  }

  function finalize(w, outcome) {
    // Feynman–Kac contribution: killing is realized as actual death (the
    // walker's own e^{−cτ} coin flip), so no reweighting is needed —
    // payoff g only if the walker reached Γ alive, plus running reward f·t
    // over its realized lifetime.
    let contrib = state.f * w.t;
    if (outcome.type === "exit" && outcome.hit && state.gOn) contrib += 1;

    stats.n++;
    const d = contrib - stats.mean;
    stats.mean += d / stats.n;
    stats.M2 += d * (contrib - stats.mean);
    const half = stats.n > 1 ? (1.96 * Math.sqrt(stats.M2 / (stats.n - 1))) / Math.sqrt(stats.n) : 0;
    history.push({ n: stats.n, mean: stats.mean, half });
    if (history.length > HISTORY_MAX) history = history.filter((_, i) => i % 2 === 0);

    if (outcome.type === "exit") {
      stats.exits++;
      if (outcome.hit) stats.hits++;
      if (exits.t.length < EXIT_STORE_MAX) {
        exits.t.push(w.t);
        exits.theta.push(Math.atan2(outcome.y, outcome.x));
        exits.hit.push(outcome.hit ? 1 : 0);
        tauSorted = null;
      }
    } else if (outcome.type === "killed") {
      stats.kills++;
    } else {
      stats.censored++;
    }
  }

  function addGhost(w, outcome) {
    if (ghosts.length > 60) ghosts.shift();
    if (outcome.type === "killed") ghosts.push({ x: w.x, y: w.y, kind: "killed", life: 1 });
    else if (outcome.type === "exit") {
      ghosts.push({ x: outcome.x, y: outcome.y, kind: outcome.hit ? "hit" : "miss", life: 1 });
    }
  }

  function resetStats() {
    stats = { n: 0, mean: 0, M2: 0, exits: 0, hits: 0, kills: 0, censored: 0 };
    history = [];
    exits = { t: [], theta: [], hit: [] };
    tauSorted = null;
    walkers = [];
    ghosts = [];
    trailedCount = 0;
    burstLeft = 0;
    recomputeStepConstants();
    dirty = chartDirty = true;
  }

  function sortedTau() {
    if (!tauSorted) tauSorted = Float64Array.from(exits.t).sort();
    return tauSorted;
  }

  /* ---- control panel -------------------------------------------------------- */
  const controls = buildPanel(panel, [
    {
      title: "Problem",
      fields: [
        {
          kind: "select", id: "domain", label: "Domain", value: state.domainKey,
          options: Object.entries(DOMAINS).map(([value, d]) => ({ value, label: d.name })),
          onChange: (v) => {
            state.domainKey = v;
            x0 = [...dom().start];
            domainView.setDomain(dom());
            resetStats();
            updateEquation();
            rebuildSolver();
          },
        },
        {
          kind: "select", id: "quantity", label: "Quantity", value: state.quantity,
          options: QUANTITIES.map((q) => ({ value: q.value, label: q.label })),
          onChange: (v) => {
            state.quantity = v;
            const q = QUANTITIES.find((qq) => qq.value === v);
            if (q && v !== "custom") {
              state.gOn = q.gOn; state.f = q.f; state.c = q.c;
              controls.set("gOn", q.gOn);
              controls.set("f", q.f);
              controls.set("c", q.c);
            }
            scheduleProblemRebuild();
          },
        },
        {
          kind: "checkbox", id: "gOn", label: "Boundary payoff g = 1 on Γ", value: state.gOn,
          onChange: (v) => { state.gOn = v; markCustom(); scheduleProblemRebuild(); },
        },
        {
          kind: "range", id: "f", label: "Running reward f", min: -2, max: 2, step: 0.1,
          value: state.f, format: (v) => v.toFixed(1),
          onChange: (v) => { state.f = v; markCustom(); scheduleProblemRebuild(); },
        },
        {
          kind: "range", id: "c", label: "Killing rate c", min: 0, max: 4, step: 0.05,
          value: state.c, format: (v) => v.toFixed(2),
          onChange: (v) => { state.c = v; markCustom(); scheduleProblemRebuild(); },
        },
        { kind: "custom", build: (section) => section.appendChild(eqBox) },
      ],
    },
    {
      title: "Dynamics",
      fields: [
        {
          kind: "range", id: "sigma", label: "Diffusion σ", min: 0.2, max: 2, step: 0.05,
          value: state.sigma, format: (v) => v.toFixed(2),
          onChange: (v) => { state.sigma = v; scheduleProblemRebuild(); },
        },
        {
          kind: "select", id: "drift", label: "Drift b", value: state.driftKey,
          options: Object.entries(DRIFTS).map(([value, d]) => ({ value, label: d.name })),
          onChange: (v) => { state.driftKey = v; updateDriftRows(); scheduleProblemRebuild(); },
        },
        {
          kind: "range", id: "driftStrength", label: "Drift strength", min: 0, max: 3, step: 0.1,
          value: state.driftStrength, format: (v) => v.toFixed(1),
          onChange: (v) => { state.driftStrength = v; scheduleProblemRebuild(); },
        },
        {
          kind: "range", id: "driftAngle", label: "Wind direction", min: 0, max: 360, step: 5,
          value: state.driftAngle, format: (v) => v + "°",
          onChange: (v) => { state.driftAngle = v; scheduleProblemRebuild(); },
        },
        {
          kind: "range", id: "dt", label: "Time step Δt", min: 1e-4, max: 2e-3, step: 1e-4,
          value: state.dt, format: (v) => v.toFixed(4),
          onChange: (v) => { state.dt = v; resetStats(); },
        },
      ],
    },
    {
      title: "Walkers",
      fields: [
        {
          kind: "buttons",
          buttons: [
            { id: "play", label: state.playing ? "Pause" : "Play", primary: true, onClick: () => setPlaying(!state.playing) },
            { label: "+" + BURST_SIZE.toLocaleString() + " fast", onClick: () => { burstLeft += BURST_SIZE; } },
            { label: "Reset", onClick: () => resetStats() },
          ],
        },
        {
          kind: "range", id: "walkers", label: "Live walkers", min: 10, max: 400, step: 10,
          value: state.walkersTarget, format: (v) => String(v),
          onChange: (v) => { state.walkersTarget = v; },
        },
        {
          kind: "range", id: "speed", label: "Sim speed", min: 50, max: 2000, step: 50,
          value: state.stepsPerSec, format: (v) => v + " steps/s",
          onChange: (v) => { state.stepsPerSec = v; },
        },
      ],
    },
    {
      title: "Display",
      fields: [
        {
          kind: "select", id: "view", label: "View", value: state.view,
          options: [
            { value: "2d", label: "2D domain" },
            { value: "3d", label: "3D surface of u" },
          ],
          onChange: (v) => {
            state.view = v;
            canvas2d.hidden = v !== "2d";
            canvas3d.hidden = v !== "3d";
            hint.textContent = v === "2d"
              ? "Click inside the domain to move x₀ · the green boundary arc is the target set Γ"
              : "Walkers move on the graph of their own solution u · drag to rotate, click to move x₀";
            dirty = true;
          },
        },
        { kind: "checkbox", id: "field", label: "Shade solution u (2D)", value: state.show.field, onChange: (v) => { state.show.field = v; domainView.setField(v ? uAt : null, fieldVersion); dirty = true; } },
        { kind: "checkbox", id: "arrows", label: "Drift field arrows", value: state.show.arrows, onChange: (v) => { state.show.arrows = v; dirty = true; } },
        { kind: "checkbox", id: "trails", label: "Trails", value: state.show.trails, onChange: (v) => { state.show.trails = v; dirty = true; } },
        { kind: "checkbox", id: "wireframe", label: "Wireframe (3D)", value: state.show.wireframe, onChange: (v) => { state.show.wireframe = v; dirty = true; } },
      ],
    },
    { title: "", fields: [{ kind: "custom", build: (section) => section.appendChild(readout) }] },
  ]);

  function markCustom() {
    state.quantity = "custom";
    controls.set("quantity", "custom");
  }

  const rowOf = (id) => controls.field(id).el.closest(".viz-field");
  function updateDriftRows() {
    rowOf("driftStrength").hidden = state.driftKey === "none";
    rowOf("driftAngle").hidden = state.driftKey !== "wind";
  }

  function setPlaying(playing) {
    state.playing = playing;
    controls.set("play", playing ? "Pause" : "Play");
  }

  /* ---- equation + readout ----------------------------------------------------- */
  function updateEquation() {
    const D = (state.sigma * state.sigma) / 2;
    const hasDrift = state.driftKey !== "none" && state.driftStrength > 0;
    let pde = D.toFixed(2) + "·Δu";
    if (hasDrift) pde += " + b·∇u";
    if (state.c > 0) pde += " − " + state.c.toFixed(2) + "·u";
    if (state.f !== 0) pde += (state.f > 0 ? " + " : " − ") + Math.abs(state.f).toFixed(1);
    pde += " = 0 in D";
    const bc = state.gOn ? "u = 1 on Γ, u = 0 elsewhere on ∂D" : "u = 0 on ∂D";

    const parts = [];
    if (state.gOn) parts.push(state.c > 0 ? "e^(−" + state.c.toFixed(2) + "·τ)·1{X_τ∈Γ}" : "1{X_τ∈Γ}");
    if (state.f !== 0) {
      parts.push(state.c > 0
        ? state.f.toFixed(1) + "·∫₀^τ e^(−" + state.c.toFixed(2) + "·s) ds"
        : state.f.toFixed(1) + "·τ");
    }
    const fk = "u(x₀) = E[ " + (parts.length ? parts.join(" + ") : "0") + " ]";

    eqBox.innerHTML = "";
    for (const line of [pde, bc, fk]) {
      const p = el("div", "viz-eq-line");
      p.textContent = line;
      eqBox.appendChild(p);
    }
  }

  function updateReadout() {
    const parts = [];
    if (stats.n > 0) {
      const half = stats.n > 1 ? (1.96 * Math.sqrt(stats.M2 / (stats.n - 1))) / Math.sqrt(stats.n) : 0;
      parts.push("û = " + fmt(stats.mean) + " ± " + fmt(half) + " (n = " + stats.n.toLocaleString() + ")");
      const ref = refValue();
      if (ref) parts.push(ref.kind + " " + fmt(ref.value) + " · Δ = " + fmt(Math.abs(stats.mean - ref.value)));
    } else {
      parts.push("waiting for walkers…");
    }
    const tail = [];
    if (stats.kills) tail.push(stats.kills.toLocaleString() + " killed");
    if (stats.censored) tail.push(stats.censored + " censored");
    if (burstLeft > 0) tail.push(burstLeft.toLocaleString() + " queued");
    if (solver && !solver.done) tail.push("PDE solve " + Math.round(solver.progress * 100) + "%");
    readout.textContent = parts.concat(tail).join(" · ");
  }

  /* ---- scenes ------------------------------------------------------------------ */
  function currentScene2d() {
    return {
      drift: state.show.arrows && state.driftKey !== "none" && state.driftStrength > 0 ? currentDrift : null,
      trails: state.show.trails
        ? walkers.filter((w) => w.trail).map((w) => ({ color: theme.series[0], points: w.trail }))
        : [],
      walkers: walkers.slice(0, 400).map((w) => ({ x: w.x, y: w.y, color: theme.series[0] })),
      ghosts: ghosts.map((g) => ({
        x: g.x, y: g.y, kind: g.kind === "killed" ? "killed" : "exit", life: g.life,
        color: g.kind === "killed" ? theme.series[5] : g.kind === "hit" ? theme.series[1] : theme.muted,
      })),
      start: x0,
    };
  }

  function currentScene3d() {
    return {
      wireframe: state.show.wireframe,
      minimum: null,
      trails: state.show.trails
        ? walkers.filter((w) => w.trail).map((w) => ({
            color: theme.series[0],
            points: w.trail.map(([x, y]) => [x, y, uAt(x, y)]),
          }))
        : [],
      particles: walkers.slice(0, 250).map((w) => ({
        color: theme.series[0], size: 0.018, x: w.x, y: w.y, fval: uAt(w.x, w.y),
      })),
    };
  }

  function renderScene() {
    if (state.view === "2d") domainView.render(currentScene2d(), theme);
    else surface.render(currentScene3d(), theme);
    updateReadout();
  }

  /* ---- charts ------------------------------------------------------------------ */
  function updateChartHead() {
    chartTitle.textContent = CHARTS.find((c) => c.value === state.chart).title;
    legend.innerHTML = "";
    if (!theme) return;
    const items = [];
    if (state.chart === "convergence") {
      items.push([theme.series[0], "MC estimate ± 95% CI"], [theme.series[2], "reference u(x₀)"]);
    } else if (state.chart === "tau" || state.chart === "dir") {
      items.push([theme.series[1], "exited through Γ"], [theme.muted, "other exits"]);
      if (state.chart === "dir") items.push([theme.series[2], "Poisson kernel (exact)"]);
      else items.push([theme.series[2], "exact E[τ]"]);
    } else {
      items.push([theme.series[0], "empirical P(τ > t)"], [theme.series[2], "exponential tail fit"]);
    }
    for (const [color, label] of items) {
      const li = el("li", "viz-legend-item");
      const dot = el("span", "viz-swatch");
      dot.style.background = color;
      li.append(dot, document.createTextNode(label));
      legend.appendChild(li);
    }
  }

  function chartGeom() {
    const w = chartCanvas.width, h = chartCanvas.height;
    const dpr = w / (chartCanvas.clientWidth || w);
    const m = { l: 56 * dpr, r: 14 * dpr, t: 14 * dpr, b: 24 * dpr };
    return { w, h, dpr, m, pw: w - m.l - m.r, ph: h - m.t - m.b };
  }

  function placeholder(text) {
    const { w, h, dpr } = chartGeom();
    chartCtx.clearRect(0, 0, w, h);
    chartCtx.fillStyle = theme.muted;
    chartCtx.font = font(dpr);
    chartCtx.textAlign = "center";
    chartCtx.textBaseline = "middle";
    chartCtx.fillText(text, w / 2, h / 2);
  }

  function drawGridY(g, ticks, labels) {
    const ctx = chartCtx;
    ctx.strokeStyle = theme.border;
    ctx.fillStyle = theme.muted;
    ctx.font = font(g.dpr);
    ctx.lineWidth = 1;
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    ticks.forEach((yy, i) => {
      ctx.beginPath();
      ctx.moveTo(g.m.l, yy);
      ctx.lineTo(g.w - g.m.r, yy);
      ctx.stroke();
      ctx.fillText(labels[i], g.m.l - 6 * g.dpr, yy);
    });
  }

  function drawXLabels(g, fracs, labels) {
    const ctx = chartCtx;
    ctx.fillStyle = theme.muted;
    ctx.font = font(g.dpr);
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    fracs.forEach((fr, i) => ctx.fillText(labels[i], g.m.l + g.pw * fr, g.m.t + g.ph + 6 * g.dpr));
  }

  function renderChart() {
    if (!theme) return;
    if (state.chart === "convergence") renderConvergence();
    else if (state.chart === "tau") renderTauHist();
    else if (state.chart === "dir") renderDirHist();
    else renderSurvival();
  }

  function renderConvergence() {
    if (history.length < 2) return placeholder("Run walkers to build the Monte-Carlo estimate of u(x₀)");
    const g = chartGeom();
    const ctx = chartCtx;
    ctx.clearRect(0, 0, g.w, g.h);
    const ref = refValue();

    let ymin = Infinity, ymax = -Infinity;
    const skipEarly = history.length > 30;
    for (const e of history) {
      if (skipEarly && e.n < 8) continue;
      if (e.mean < ymin) ymin = e.mean;
      if (e.mean > ymax) ymax = e.mean;
    }
    if (ref) { ymin = Math.min(ymin, ref.value); ymax = Math.max(ymax, ref.value); }
    const pad = Math.max((ymax - ymin) * 0.35, Math.abs(ymax) * 0.05, 1e-4);
    ymin -= pad; ymax += pad;

    const n0 = history[0].n, n1 = history[history.length - 1].n;
    const X = (n) => g.m.l + (g.pw * (n - n0)) / Math.max(1, n1 - n0);
    const Y = (v) => g.m.t + g.ph * (1 - (v - ymin) / (ymax - ymin));
    const clampY = (v) => Math.min(g.m.t + g.ph, Math.max(g.m.t, v));

    const ticks = [0, 1, 2, 3].map((i) => g.m.t + (g.ph * i) / 3);
    drawGridY(g, ticks, ticks.map((_, i) => fmt(ymax - ((ymax - ymin) * i) / 3)));
    drawXLabels(g, [0, 0.5, 1], [String(n0), String(Math.round((n0 + n1) / 2)), String(n1)]);

    // 95% CI band (clipped to the plot).
    ctx.beginPath();
    history.forEach((e, i) => {
      const px = X(e.n), py = clampY(Y(e.mean + e.half));
      i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
    });
    for (let i = history.length - 1; i >= 0; i--) {
      ctx.lineTo(X(history[i].n), clampY(Y(history[i].mean - history[i].half)));
    }
    ctx.closePath();
    ctx.fillStyle = rgbToCss(hexToRgb(theme.series[0]), 0.15);
    ctx.fill();

    if (ref) {
      ctx.strokeStyle = theme.series[2];
      ctx.lineWidth = 1.5 * g.dpr;
      ctx.setLineDash([5 * g.dpr, 4 * g.dpr]);
      ctx.beginPath();
      ctx.moveTo(g.m.l, Y(ref.value));
      ctx.lineTo(g.w - g.m.r, Y(ref.value));
      ctx.stroke();
      ctx.setLineDash([]);
    }

    ctx.beginPath();
    history.forEach((e, i) => {
      const px = X(e.n), py = clampY(Y(e.mean));
      i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
    });
    ctx.strokeStyle = theme.series[0];
    ctx.lineWidth = 2 * g.dpr;
    ctx.lineJoin = "round";
    ctx.stroke();
  }

  function histBars(g, counts, hitCounts, maxCount) {
    const ctx = chartCtx;
    const bw = g.pw / counts.length;
    for (let i = 0; i < counts.length; i++) {
      if (!counts[i]) continue;
      const x = g.m.l + i * bw;
      const hHit = (g.ph * hitCounts[i]) / maxCount;
      const hMiss = (g.ph * (counts[i] - hitCounts[i])) / maxCount;
      const yTop = g.m.t + g.ph - hHit - hMiss;
      ctx.fillStyle = rgbToCss(hexToRgb(theme.series[1]), 0.85);
      ctx.fillRect(x + 0.5, g.m.t + g.ph - hHit, bw - 1, hHit);
      ctx.fillStyle = theme.dark ? "rgba(200,200,205,0.45)" : "rgba(90,90,96,0.4)";
      ctx.fillRect(x + 0.5, yTop, bw - 1, hMiss);
    }
  }

  function renderTauHist() {
    if (exits.t.length < 8) return placeholder("Waiting for exits…");
    const g = chartGeom();
    const ctx = chartCtx;
    ctx.clearRect(0, 0, g.w, g.h);
    const sorted = sortedTau();
    const tHi = Math.max(sorted[Math.floor(0.98 * (sorted.length - 1))], 1e-6);
    const BINS = 36;
    const counts = new Array(BINS).fill(0), hitCounts = new Array(BINS).fill(0);
    let meanTau = 0;
    for (let i = 0; i < exits.t.length; i++) {
      meanTau += exits.t[i];
      const b = Math.min(BINS - 1, Math.floor((exits.t[i] / tHi) * BINS));
      counts[b]++;
      if (exits.hit[i]) hitCounts[b]++;
    }
    meanTau /= exits.t.length;
    const maxCount = Math.max(...counts) * 1.08;
    drawXLabels(g, [0, 0.5, 1], ["0", fmt(tHi / 2), fmt(tHi)]);
    histBars(g, counts, hitCounts, maxCount);

    const tX = (t) => g.m.l + (g.pw * Math.min(t, tHi)) / tHi;
    ctx.strokeStyle = theme.text;
    ctx.lineWidth = 1.5 * g.dpr;
    ctx.beginPath();
    ctx.moveTo(tX(meanTau), g.m.t);
    ctx.lineTo(tX(meanTau), g.m.t + g.ph);
    ctx.stroke();
    labelAt(g, tX(meanTau), "τ̄ = " + fmt(meanTau), theme.text);

    // Exact E[τ] marker — only meaningful without killing (killed walkers
    // never report a τ, which biases the observed sample).
    if (state.c === 0 && (state.driftKey === "none" || state.driftStrength === 0) && dom().exact.exitTime) {
      const et = dom().exact.exitTime(x0[0], x0[1], state.sigma);
      if (et > 0 && et < tHi) {
        ctx.strokeStyle = theme.series[2];
        ctx.setLineDash([5 * g.dpr, 4 * g.dpr]);
        ctx.beginPath();
        ctx.moveTo(tX(et), g.m.t);
        ctx.lineTo(tX(et), g.m.t + g.ph);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }
  }

  function renderDirHist() {
    if (exits.t.length < 8) return placeholder("Waiting for exits…");
    const g = chartGeom();
    const ctx = chartCtx;
    ctx.clearRect(0, 0, g.w, g.h);
    const BINS = 36;
    const counts = new Array(BINS).fill(0), hitCounts = new Array(BINS).fill(0);
    for (let i = 0; i < exits.theta.length; i++) {
      const b = Math.min(BINS - 1, Math.floor(((exits.theta[i] + PI) / (2 * PI)) * BINS));
      counts[b]++;
      if (exits.hit[i]) hitCounts[b]++;
    }
    const maxCount = Math.max(...counts) * 1.15;
    drawXLabels(g, [0, 0.25, 0.5, 0.75, 1], ["−π", "−π/2", "0", "π/2", "π"]);
    histBars(g, counts, hitCounts, maxCount);

    // Exact harmonic-measure density on the disk: the Poisson kernel at x₀.
    if (state.domainKey === "disk" && state.c === 0 &&
        (state.driftKey === "none" || state.driftStrength === 0)) {
      const r2 = x0[0] * x0[0] + x0[1] * x0[1];
      const nEx = exits.theta.length;
      const binw = (2 * PI) / BINS;
      ctx.beginPath();
      for (let i = 0; i <= 120; i++) {
        const th = -PI + (2 * PI * i) / 120;
        const dx = x0[0] - Math.cos(th), dy = x0[1] - Math.sin(th);
        const dens = (1 - r2) / (2 * PI * (dx * dx + dy * dy));
        const expected = nEx * binw * dens;
        const px = g.m.l + (g.pw * i) / 120;
        const py = g.m.t + g.ph * (1 - expected / maxCount);
        i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
      }
      ctx.strokeStyle = theme.series[2];
      ctx.lineWidth = 2 * g.dpr;
      ctx.lineJoin = "round";
      ctx.stroke();
    }
  }

  function renderSurvival() {
    if (exits.t.length < 20) return placeholder("Waiting for exits… (survival needs a larger sample)");
    const g = chartGeom();
    const ctx = chartCtx;
    ctx.clearRect(0, 0, g.w, g.h);
    const sorted = sortedTau();
    const n = sorted.length;
    const tMax = sorted[n - 1];
    const sMin = Math.max(1 / n, 1e-4);
    const lo = Math.log10(sMin);

    const X = (t) => g.m.l + (g.pw * t) / tMax;
    const Y = (S) => g.m.t + g.ph * (Math.log10(Math.max(S, sMin)) / lo);

    const decades = [];
    for (let d = 0; d >= Math.ceil(lo); d--) decades.push(Math.pow(10, d));
    drawGridY(g, decades.map((S) => Y(S)), decades.map((S) => (S >= 0.01 ? String(S) : S.toExponential(0))));
    drawXLabels(g, [0, 0.5, 1], ["0", fmt(tMax / 2), fmt(tMax)]);

    ctx.beginPath();
    const step = Math.max(1, Math.floor(n / 240));
    for (let i = 0; i < n; i += step) {
      const S = (n - i) / n;
      const px = X(sorted[i]), py = Y(S);
      i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
    }
    ctx.strokeStyle = theme.series[0];
    ctx.lineWidth = 2 * g.dpr;
    ctx.lineJoin = "round";
    ctx.stroke();

    // Exponential tail fit ln S ≈ a − λ₁ t on the mid-tail: the slope is the
    // principal Dirichlet eigenvalue of the generator.
    const pts = [];
    for (let i = 0; i < n; i++) {
      const S = (n - i) / n;
      if (S <= 0.5 && S >= Math.max(5 / n, 0.005)) pts.push([sorted[i], Math.log(S)]);
    }
    if (pts.length > 10) {
      let sx = 0, sy = 0, sxx = 0, sxy = 0;
      for (const [x, y] of pts) { sx += x; sy += y; sxx += x * x; sxy += x * y; }
      const k = pts.length;
      const slope = (k * sxy - sx * sy) / (k * sxx - sx * sx);
      const icept = (sy - slope * sx) / k;
      if (isFinite(slope) && slope < 0) {
        ctx.strokeStyle = theme.series[2];
        ctx.lineWidth = 1.5 * g.dpr;
        ctx.setLineDash([5 * g.dpr, 4 * g.dpr]);
        ctx.beginPath();
        let first = true;
        for (let i = 0; i <= 40; i++) {
          const t = (tMax * i) / 40;
          const S = Math.exp(icept + slope * t);
          if (S > 1 || S < sMin) continue;
          const px = X(t), py = Y(S);
          first ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
          first = false;
        }
        ctx.stroke();
        ctx.setLineDash([]);

        let text = "tail slope λ̂₁ ≈ " + fmt(-slope);
        if (state.domainKey === "disk" && state.c === 0 &&
            (state.driftKey === "none" || state.driftStrength === 0)) {
          text += " · exact λ₁ = σ²j₀₁²/2 = " + fmt((state.sigma * state.sigma * J01 * J01) / 2);
        }
        ctx.fillStyle = theme.text;
        ctx.font = font(g.dpr);
        ctx.textAlign = "right";
        ctx.textBaseline = "top";
        ctx.fillText(text, g.w - g.m.r - 4 * g.dpr, g.m.t + 2 * g.dpr);
      }
    }
  }

  function labelAt(g, px, text, color) {
    const ctx = chartCtx;
    ctx.fillStyle = color;
    ctx.font = font(g.dpr);
    ctx.textBaseline = "top";
    ctx.textAlign = px > g.m.l + g.pw * 0.75 ? "right" : "left";
    ctx.fillText(text, px + (ctx.textAlign === "left" ? 5 : -5) * g.dpr, g.m.t + 2 * g.dpr);
  }

  /* ---- frame loop ----------------------------------------------------------------- */
  function liveStep(dtWall) {
    let spawnBudget = walkers.length === 0 ? state.walkersTarget : 6;
    while (walkers.length < state.walkersTarget && spawnBudget-- > 0) {
      walkers.push(newWalker(true));
    }
    let k = Math.max(1, Math.round(state.stepsPerSec * dtWall));
    k = Math.min(k, Math.max(1, Math.floor(60000 / Math.max(1, walkers.length))));
    for (let wi = walkers.length - 1; wi >= 0; wi--) {
      const w = walkers[wi];
      let out = null;
      for (let s = 0; s < k && !out; s++) out = stepWalker(w);
      if (out) {
        finalize(w, out);
        addGhost(w, out);
        if (w.trail) trailedCount--;
        walkers.splice(wi, 1);
      }
    }
  }

  function burstStep() {
    const t0 = performance.now();
    while (burstLeft > 0 && performance.now() - t0 < 8) {
      const w = newWalker(false);
      let out = null;
      while (!out) out = stepWalker(w);
      finalize(w, out);
      burstLeft--;
    }
  }

  /* ---- boot ------------------------------------------------------------------------ */
  onTheme((t) => {
    theme = t;
    domainView.setField(state.show.field ? uAt : null, fieldVersion); // raster caches per theme
    updateChartHead();
    dirty = chartDirty = true;
  });

  domainView.setDomain(dom());
  updateDriftRows();
  updateEquation();
  recomputeStepConstants();
  resetStats();
  rebuildSolver();
  updateChartHead();

  let last = performance.now();
  (function frame(now) {
    const dtWall = Math.min(0.1, (now - last) / 1000);
    last = now;

    if (solver && !solver.done) {
      solver.sweep(40);
      solveTicks++;
      if (solver.done || solveTicks % 8 === 0) {
        fieldVersion++;
        refreshFieldViews();
        chartDirty = true; // the FDM reference line settles as it converges
      }
    }

    if (state.playing) {
      liveStep(dtWall);
      dirty = chartDirty = true;
    }
    if (burstLeft > 0) {
      burstStep();
      dirty = chartDirty = true;
    }
    if (ghosts.length) {
      for (const gh of ghosts) gh.life -= dtWall * 1.4;
      ghosts = ghosts.filter((gh) => gh.life > 0);
      dirty = true;
    }

    if (dirty) { dirty = false; renderScene(); }
    if (chartDirty) { chartDirty = false; renderChart(); }
    requestAnimationFrame(frame);
  })(last);
});

function font(dpr) {
  return `${11 * dpr}px -apple-system, "Segoe UI", Roboto, sans-serif`;
}

function fmt(v) {
  if (!isFinite(v)) return "∞";
  const a = Math.abs(v);
  if (a !== 0 && (a >= 10000 || a < 0.001)) return v.toExponential(1);
  if (a >= 100) return v.toFixed(0);
  if (a >= 1) return v.toFixed(2);
  return v.toFixed(3);
}

function el(tag, className) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  return node;
}

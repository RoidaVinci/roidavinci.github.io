// Gradient-descent playground: race optimizers across loss landscapes on an
// interactive 3D surface or 2D contour view, with live loss curves.
//
// Built entirely from toolkit primitives (Surface3D, Heatmap, LinePlot,
// buildPanel) — use it as the template for new tools.

import { register, onTheme, buildPanel, prefersReducedMotion } from "../toolkit.js";
import { Surface3D } from "../surface3d.js";
import { Heatmap, LinePlot } from "../plot2d.js";
import { LANDSCAPES } from "../landscapes.js";
import { OPTIMIZERS, OPTIMIZER_INDEX } from "../optimizers.js";

const TRAIL_MAX = 700;   // points kept per particle path
const LOSS_MAX = 600;    // rolling window shown in the loss chart
const MAX_STEPS_PER_FRAME = 240;

register("gradient-descent", (host) => {
  /* ---- state ------------------------------------------------------------ */
  const state = {
    fnKey: "bowl",
    view: "3d",
    playing: false,
    stepsPerSec: 30,
    activeOpts: new Set(["vanilla", "momentum", "adam"]),
    params: Object.fromEntries(OPTIMIZERS.map((o) => [o.key, { ...o.defaults }])),
    show: { wireframe: true, trails: true, minimum: true, autoRotate: false },
    seeds: [],
    particles: [],
    step: 0,
  };
  let theme = null;
  let dirty = true;
  let chartDirty = true;

  const fn = () => LANDSCAPES[state.fnKey];
  const clampDom = (v) => Math.min(fn().domain[1], Math.max(fn().domain[0], v));

  /* ---- DOM -------------------------------------------------------------- */
  host.innerHTML = "";
  const tool = el("div", "viz-tool");
  const stage = el("div", "viz-stage");
  const canvas3d = el("canvas", "viz-canvas");
  const canvas2d = el("canvas", "viz-canvas");
  canvas3d.setAttribute("role", "img");
  canvas3d.setAttribute("aria-label",
    "3D loss surface. Drag or use arrow keys to rotate, scroll or +/- to zoom, click to drop optimizers.");
  canvas2d.setAttribute("role", "img");
  canvas2d.setAttribute("aria-label", "Top view of the loss landscape. Click to drop optimizers.");
  canvas2d.hidden = true;
  const hint = el("p", "viz-hint");
  hint.textContent = "Drag to rotate · scroll to zoom · click anywhere on the surface to drop the optimizers";
  stage.append(canvas3d, canvas2d, hint);

  const panel = el("aside", "viz-panel");
  const readout = el("p", "viz-readout");
  readout.setAttribute("aria-live", "polite");

  const chartSection = el("section", "viz-chart");
  const chartHead = el("div", "viz-chart-head");
  const chartTitle = el("h2", "viz-chart-title");
  chartTitle.textContent = "Loss vs. iteration";
  const legend = el("ul", "viz-legend");
  legend.setAttribute("aria-label", "Active optimizers");
  chartHead.append(chartTitle, legend);
  const chartCanvas = el("canvas", "viz-loss-canvas");
  chartSection.append(chartHead, chartCanvas);

  tool.append(stage, panel);
  host.append(tool, chartSection);

  /* ---- renderers --------------------------------------------------------- */
  const markDirty = () => { dirty = true; };
  const spawnHere = (x, y) => {
    state.seeds.push([x, y]);
    for (const key of state.activeOpts) addParticle(key, x, y);
    dirty = chartDirty = true;
  };
  const surface = new Surface3D(canvas3d, { onPick: spawnHere, onChange: markDirty });
  const heatmap = new Heatmap(canvas2d, { onPick: spawnHere, onChange: markDirty });
  const lossPlot = new LinePlot(chartCanvas, { onChange: () => { chartDirty = true; } });

  /* ---- particles ---------------------------------------------------------- */
  function addParticle(optKey, x, y) {
    const opt = OPTIMIZERS[OPTIMIZER_INDEX[optKey]];
    const p = {
      opt: optKey, x0: x, y0: y, x, y,
      trail: [[x, y, fn().f(x, y)]],
      losses: [fn().f(x, y)],
      lossStart: state.step,
      alive: true,
    };
    opt.init(p);
    state.particles.push(p);
  }

  function rebuildParticles() {
    state.particles = [];
    state.step = 0;
    for (const [x, y] of state.seeds) {
      for (const key of state.activeOpts) addParticle(key, x, y);
    }
    dirty = chartDirty = true;
    updateLegend();
  }

  function randomSeed() {
    const [lo, hi] = fn().domain;
    const r = () => lo + 0.1 * (hi - lo) + 0.8 * (hi - lo) * Math.random();
    return [r(), r()];
  }

  function simStep() {
    const grad = fn().grad;
    for (const p of state.particles) {
      if (!p.alive) continue;
      const [gx, gy] = grad(p.x, p.y);
      if (!isFinite(gx) || !isFinite(gy)) { p.alive = false; continue; }
      OPTIMIZERS[OPTIMIZER_INDEX[p.opt]].step({ p, gx, gy, params: state.params[p.opt], clamp: clampDom, grad });
      if (!isFinite(p.x) || !isFinite(p.y)) {
        p.alive = false;
        p.x = clampDom(p.x0); p.y = clampDom(p.y0);
        continue;
      }
      const z = fn().f(p.x, p.y);
      p.trail.push([p.x, p.y, z]);
      if (p.trail.length > TRAIL_MAX) p.trail.shift();
      p.losses.push(z);
      if (p.losses.length > LOSS_MAX) { p.losses.shift(); p.lossStart++; }
    }
    state.step++;
  }

  /* ---- control panel ------------------------------------------------------ */
  const optimizerParamEls = new Map();

  const controls = buildPanel(panel, [
    {
      title: "Landscape",
      fields: [
        {
          kind: "select", id: "fn", label: "Function", value: state.fnKey,
          options: Object.entries(LANDSCAPES).map(([value, l]) => ({ value, label: l.name })),
          onChange: (v) => {
            state.fnKey = v;
            surface.setField(fn());
            heatmap.setField(fn());
            state.seeds = [randomSeed()];
            rebuildParticles();
          },
        },
        {
          kind: "select", id: "view", label: "View", value: state.view,
          options: [
            { value: "3d", label: "3D surface" },
            { value: "2d", label: "2D contour map" },
          ],
          onChange: (v) => {
            state.view = v;
            canvas3d.hidden = v !== "3d";
            canvas2d.hidden = v !== "2d";
            hint.textContent = v === "3d"
              ? "Drag to rotate · scroll to zoom · click anywhere on the surface to drop the optimizers"
              : "Click anywhere on the map to drop the optimizers";
            dirty = true;
          },
        },
        { kind: "checkbox", id: "wireframe", label: "Wireframe", value: state.show.wireframe, onChange: (v) => { state.show.wireframe = v; dirty = true; } },
        { kind: "checkbox", id: "trails", label: "Trails", value: state.show.trails, onChange: (v) => { state.show.trails = v; dirty = true; } },
        { kind: "checkbox", id: "minimum", label: "Mark global minimum", value: state.show.minimum, onChange: (v) => { state.show.minimum = v; dirty = true; } },
        { kind: "checkbox", id: "autorotate", label: "Auto-rotate", value: false, onChange: (v) => { state.show.autoRotate = v; } },
      ],
    },
    {
      title: "Playback",
      fields: [
        {
          kind: "buttons",
          buttons: [
            { id: "play", label: "Play", primary: true, onClick: () => setPlaying(!state.playing) },
            { id: "step1", label: "Step", onClick: () => { simStep(); dirty = chartDirty = true; } },
          ],
        },
        {
          kind: "buttons",
          buttons: [
            { label: "Reset", onClick: () => rebuildParticles() },
            { label: "Random seed", onClick: () => { state.seeds = [randomSeed()]; rebuildParticles(); } },
            { label: "Clear", onClick: () => { state.seeds = []; rebuildParticles(); } },
          ],
        },
        {
          kind: "range", id: "speed", label: "Speed", min: 1, max: 120, step: 1,
          value: state.stepsPerSec, format: (v) => v + " steps/s",
          onChange: (v) => { state.stepsPerSec = v; },
        },
      ],
    },
    {
      title: "Optimizers",
      fields: OPTIMIZERS.map((opt, i) => ({
        kind: "custom",
        build: (section) => buildOptimizerRow(section, opt, i),
      })),
    },
    { title: "", fields: [{ kind: "custom", build: (section) => section.appendChild(readout) }] },
  ]);

  function buildOptimizerRow(section, opt, i) {
    const wrap = el("div", "viz-opt");
    const row = el("div", "viz-field viz-field-checkbox");
    const input = document.createElement("input");
    input.type = "checkbox";
    input.id = "viz-opt-" + opt.key;
    input.checked = state.activeOpts.has(opt.key);
    const label = document.createElement("label");
    label.htmlFor = input.id;
    const dot = el("span", "viz-swatch");
    label.append(dot, document.createTextNode(opt.name));
    row.append(input, label);

    const params = el("div", "viz-opt-params");
    params.hidden = !input.checked;
    opt.ui.forEach((spec) => {
      const field = el("div", "viz-field viz-field-range");
      const head = el("div", "viz-range-head");
      const flabel = document.createElement("label");
      const id = "viz-p-" + opt.key + "-" + spec.key;
      flabel.htmlFor = id;
      flabel.textContent = spec.label;
      const out = document.createElement("output");
      out.textContent = spec.format(state.params[opt.key][spec.key]);
      const slider = document.createElement("input");
      slider.type = "range";
      slider.id = id;
      slider.min = spec.min; slider.max = spec.max; slider.step = spec.step;
      slider.value = state.params[opt.key][spec.key];
      slider.addEventListener("input", () => {
        const v = parseFloat(slider.value);
        state.params[opt.key][spec.key] = v;
        out.textContent = spec.format(v);
      });
      head.append(flabel, out);
      field.append(head, slider);
      params.appendChild(field);
    });

    input.addEventListener("change", () => {
      params.hidden = !input.checked;
      input.checked ? state.activeOpts.add(opt.key) : state.activeOpts.delete(opt.key);
      // Respawn from the current seed points so every active optimizer races
      // from the same starting positions.
      rebuildParticles();
    });

    wrap.append(row, params);
    section.appendChild(wrap);
    optimizerParamEls.set(opt.key, { dot });
  }

  function setPlaying(playing) {
    state.playing = playing;
    controls.set("play", playing ? "Pause" : "Play");
  }

  /* ---- legend + readout ---------------------------------------------------- */
  function updateLegend() {
    legend.innerHTML = "";
    OPTIMIZERS.forEach((opt, i) => {
      if (!state.activeOpts.has(opt.key)) return;
      const li = el("li", "viz-legend-item");
      const dot = el("span", "viz-swatch");
      dot.style.background = theme.series[i];
      li.append(dot, document.createTextNode(opt.name));
      legend.appendChild(li);
    });
  }

  function updateReadout() {
    const diverged = state.particles.filter((p) => !p.alive).length;
    readout.textContent =
      "Iteration " + state.step +
      " · " + state.particles.length + " particle" + (state.particles.length === 1 ? "" : "s") +
      (diverged ? " · " + diverged + " diverged (frozen)" : "");
  }

  /* ---- scene assembly ------------------------------------------------------ */
  function currentScene() {
    const colorOf = (p) => theme.series[OPTIMIZER_INDEX[p.opt]];
    return {
      wireframe: state.show.wireframe,
      minimum: state.show.minimum ? fn().minimum : null,
      trails: state.show.trails ? state.particles.map((p) => ({ color: colorOf(p), points: p.trail })) : [],
      particles: state.particles.map((p) => ({ color: colorOf(p), x: p.x, y: p.y, fval: fn().f(p.x, p.y) })),
    };
  }

  function renderScene() {
    const scene = currentScene();
    if (state.view === "3d") surface.render(scene, theme);
    else heatmap.render(scene, theme);
    updateReadout();
  }

  function renderChart() {
    lossPlot.setData({
      startStep: Math.min(...state.particles.map((p) => p.lossStart), state.step),
      series: state.particles.map((p) => ({
        color: theme.series[OPTIMIZER_INDEX[p.opt]],
        label: OPTIMIZERS[OPTIMIZER_INDEX[p.opt]].name,
        values: p.losses,
      })),
    });
    lossPlot.render(theme);
  }

  /* ---- boot ---------------------------------------------------------------- */
  onTheme((t) => {
    theme = t;
    optimizerParamEls.forEach(({ dot }, key) => {
      dot.style.background = t.series[OPTIMIZER_INDEX[key]];
    });
    updateLegend();
    dirty = chartDirty = true;
  });

  surface.setField(fn());
  heatmap.setField(fn());
  state.seeds = [randomSeed()];
  rebuildParticles();

  const reducedMotion = prefersReducedMotion();
  let last = performance.now();
  let acc = 0;
  (function frame(now) {
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    if (state.playing) {
      acc += dt * state.stepsPerSec;
      let n = Math.min(Math.floor(acc), MAX_STEPS_PER_FRAME);
      acc -= Math.floor(acc);
      while (n-- > 0) simStep();
      dirty = chartDirty = true;
    }
    if (state.show.autoRotate && state.view === "3d" && !reducedMotion) {
      surface.view.yaw += 0.004;
      dirty = true;
    }
    if (dirty) { dirty = false; renderScene(); }
    if (chartDirty) { chartDirty = false; renderChart(); }
    requestAnimationFrame(frame);
  })(last);
});

function el(tag, className) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  return node;
}

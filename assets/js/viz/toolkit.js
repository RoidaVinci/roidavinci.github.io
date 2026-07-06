// Visualization toolkit core: registry + mounting, theme bridge, palettes,
// colormaps and a schema-driven control panel builder.
//
// A visualization is a factory function `(hostElement) => void` registered
// under a name. Any page can then embed it with `<div data-viz="name"></div>`.
// New tools only need to import { register } and call it — no other wiring.

/* --------------------------------------------------------------------------
 * Registry and mounting
 * ------------------------------------------------------------------------ */

const registry = new Map();

export function register(name, factory) {
  registry.set(name, factory);
}

export function mountAll(root = document) {
  root.querySelectorAll("[data-viz]").forEach((el) => {
    if (el.dataset.vizMounted) return;
    const factory = registry.get(el.dataset.viz);
    if (!factory) return;
    el.dataset.vizMounted = "true";
    try {
      factory(el);
    } catch (err) {
      el.textContent = "This visualization failed to load.";
      console.error("viz: mount of \"" + el.dataset.viz + "\" failed", err);
    }
  });
}

/* --------------------------------------------------------------------------
 * Theme bridge
 *
 * Canvas cannot use CSS custom properties directly, so we resolve the site's
 * design tokens once per theme change and hand plain colors to renderers.
 * ------------------------------------------------------------------------ */

// Categorical series colors (one per optimizer/series, fixed order — never
// cycled or reassigned). Both columns are a pre-validated colorblind-safe
// ordering; the dark column is the same hues re-stepped for dark surfaces.
const SERIES_LIGHT = ["#2a78d6", "#1baf7a", "#eda100", "#008300", "#4a3aa7", "#e34948"];
const SERIES_DARK = ["#3987e5", "#199e70", "#c98500", "#008300", "#9085e9", "#e66767"];

// Sequential single-hue ramp (blue, light→dark) for magnitude encodings.
const RAMP_BLUE = ["#cde2fb", "#9ec5f4", "#6da7ec", "#3987e5", "#256abf", "#184f95", "#0d366b"];

function cssVar(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

export function readTheme() {
  const dark = document.documentElement.getAttribute("data-theme") === "dark";
  return {
    dark,
    bg: cssVar("--color-bg"),
    surface: cssVar("--color-surface"),
    bgAlt: cssVar("--color-bg-alt"),
    text: cssVar("--color-text"),
    muted: cssVar("--color-text-muted"),
    accent: cssVar("--color-accent"),
    border: cssVar("--color-border"),
    series: dark ? SERIES_DARK : SERIES_LIGHT,
    // On dark surfaces the ramp runs dark→light so high values stay salient.
    ramp: dark ? RAMP_BLUE.slice().reverse() : RAMP_BLUE,
  };
}

// Calls `cb(theme)` now and whenever the site theme toggles.
// Returns a function that disconnects the observer.
export function onTheme(cb) {
  cb(readTheme());
  const observer = new MutationObserver(() => cb(readTheme()));
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => observer.disconnect();
}

export const prefersReducedMotion = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* --------------------------------------------------------------------------
 * Color helpers
 * ------------------------------------------------------------------------ */

export function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function rgbToCss(rgb, alpha) {
  return alpha === undefined
    ? "rgb(" + rgb[0] + "," + rgb[1] + "," + rgb[2] + ")"
    : "rgba(" + rgb[0] + "," + rgb[1] + "," + rgb[2] + "," + alpha + ")";
}

// Piecewise-linear interpolation through a list of hex anchors, t ∈ [0,1].
// Returns [r,g,b]. Adjacent anchors share a hue, so sRGB lerp is safe here.
export function ramp(anchors, t) {
  const x = Math.min(1, Math.max(0, t)) * (anchors.length - 1);
  const i = Math.min(anchors.length - 2, Math.floor(x));
  const f = x - i;
  const a = hexToRgb(anchors[i]);
  const b = hexToRgb(anchors[i + 1]);
  return [
    Math.round(a[0] + (b[0] - a[0]) * f),
    Math.round(a[1] + (b[1] - a[1]) * f),
    Math.round(a[2] + (b[2] - a[2]) * f),
  ];
}

// Lambert-ish shade of an [r,g,b] color, k ∈ [0, ~1.2].
export function shade(rgb, k) {
  return [
    Math.min(255, Math.round(rgb[0] * k)),
    Math.min(255, Math.round(rgb[1] * k)),
    Math.min(255, Math.round(rgb[2] * k)),
  ];
}

/* --------------------------------------------------------------------------
 * Control panel builder
 *
 * buildPanel(container, sections) renders accessible form controls from a
 * schema and returns { get(id), set(id, v), field(id) }. Field kinds:
 *   { kind:"select",   id, label, options:[{value,label}], value, onChange }
 *   { kind:"range",    id, label, min, max, step, value, format, onChange }
 *   { kind:"checkbox", id, label, value, swatch?, onChange }
 *   { kind:"buttons",  buttons:[{id, label, primary?, onClick}] }
 *   { kind:"custom",   build(sectionEl) }
 * ------------------------------------------------------------------------ */

let uid = 0;

export function buildPanel(container, sections) {
  const fields = new Map();

  sections.forEach((section) => {
    const box = document.createElement("fieldset");
    box.className = "viz-section";
    if (section.title) {
      const legend = document.createElement("legend");
      legend.textContent = section.title;
      box.appendChild(legend);
    }
    section.fields.forEach((f) => addField(box, f, fields));
    container.appendChild(box);
  });

  return {
    field: (id) => fields.get(id),
    get: (id) => fields.get(id).get(),
    set: (id, v) => fields.get(id).set(v),
  };
}

function addField(box, f, fields) {
  if (f.kind === "custom") {
    f.build(box);
    return;
  }

  if (f.kind === "buttons") {
    const row = document.createElement("div");
    row.className = "viz-btn-row";
    f.buttons.forEach((b) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "viz-btn" + (b.primary ? " viz-btn-primary" : "");
      btn.textContent = b.label;
      btn.addEventListener("click", b.onClick);
      row.appendChild(btn);
      if (b.id) fields.set(b.id, { el: btn, get: () => null, set: (label) => { btn.textContent = label; } });
    });
    box.appendChild(row);
    return;
  }

  const id = "viz-f" + uid++;
  const row = document.createElement("div");
  row.className = "viz-field viz-field-" + f.kind;

  if (f.kind === "select") {
    const label = document.createElement("label");
    label.htmlFor = id;
    label.textContent = f.label;
    const select = document.createElement("select");
    select.id = id;
    f.options.forEach((o) => {
      const opt = document.createElement("option");
      opt.value = o.value;
      opt.textContent = o.label;
      select.appendChild(opt);
    });
    select.value = f.value;
    select.addEventListener("change", () => f.onChange(select.value));
    row.appendChild(label);
    row.appendChild(select);
    fields.set(f.id, { el: select, get: () => select.value, set: (v) => { select.value = v; } });
  } else if (f.kind === "range") {
    const format = f.format || ((v) => String(v));
    const label = document.createElement("label");
    label.htmlFor = id;
    label.textContent = f.label;
    const output = document.createElement("output");
    output.htmlFor = id;
    output.textContent = format(f.value);
    const input = document.createElement("input");
    input.type = "range";
    input.id = id;
    input.min = f.min;
    input.max = f.max;
    input.step = f.step;
    input.value = f.value;
    input.addEventListener("input", () => {
      const v = parseFloat(input.value);
      output.textContent = format(v);
      f.onChange(v);
    });
    const head = document.createElement("div");
    head.className = "viz-range-head";
    head.appendChild(label);
    head.appendChild(output);
    row.appendChild(head);
    row.appendChild(input);
    fields.set(f.id, {
      el: input,
      get: () => parseFloat(input.value),
      set: (v) => { input.value = v; output.textContent = format(v); },
    });
  } else if (f.kind === "checkbox") {
    const input = document.createElement("input");
    input.type = "checkbox";
    input.id = id;
    input.checked = !!f.value;
    input.addEventListener("change", () => f.onChange(input.checked));
    const label = document.createElement("label");
    label.htmlFor = id;
    if (f.swatch) {
      const dot = document.createElement("span");
      dot.className = "viz-swatch";
      dot.style.background = f.swatch;
      label.appendChild(dot);
    }
    label.appendChild(document.createTextNode(f.label));
    row.appendChild(input);
    row.appendChild(label);
    fields.set(f.id, {
      el: input,
      row,
      get: () => input.checked,
      set: (v) => { input.checked = !!v; },
    });
  }

  box.appendChild(row);
}

// 2D plotting primitives shared by the tools:
//   Heatmap  – a colormapped, contour-banded top view of a scalar field with
//              overlay trails/particles and click picking.
//   LinePlot – a small multi-series line chart (loss curves) with a
//              crosshair + tooltip hover layer.

import { ramp, rgbToCss } from "./toolkit.js";

const HEATMAP_RES = 200;
const BANDS = 12; // quantized colormap steps read like contour bands

export class Heatmap {
  constructor(canvas, { onPick, onChange } = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.onPick = onPick || null;
    this.onChange = onChange || (() => {});
    this.field = null;
    this._imageKey = null;

    this._resizeObserver = new ResizeObserver(() => this._resize());
    this._resizeObserver.observe(canvas);
    this._resize();

    if (this.onPick) {
      let downAt = null;
      canvas.addEventListener("pointerdown", (ev) => { downAt = [ev.clientX, ev.clientY]; });
      canvas.addEventListener("pointerup", (ev) => {
        if (!downAt || Math.hypot(ev.clientX - downAt[0], ev.clientY - downAt[1]) > 4) return;
        const hit = this.pick(ev.clientX, ev.clientY);
        if (hit) this.onPick(hit[0], hit[1]);
      });
    }
  }

  destroy() {
    this._resizeObserver.disconnect();
  }

  _resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.max(1, Math.round(this.canvas.clientWidth * dpr));
    const h = Math.max(1, Math.round(this.canvas.clientHeight * dpr));
    if (w !== this.canvas.width || h !== this.canvas.height) {
      this.canvas.width = w;
      this.canvas.height = h;
      this.onChange();
    }
  }

  setField(field) {
    this.field = field;
    this._imageKey = null; // force colormap re-render
    const [lo, hi] = field.domain;
    const n = HEATMAP_RES;
    const values = new Float64Array(n * n);
    let zmin = Infinity, zmax = -Infinity;
    for (let j = 0; j < n; j++) {
      for (let i = 0; i < n; i++) {
        const x = lo + ((hi - lo) * (i + 0.5)) / n;
        const y = lo + ((hi - lo) * (j + 0.5)) / n;
        let z = field.f(x, y);
        if (!isFinite(z)) z = 0;
        values[j * n + i] = z;
        if (z < zmin) zmin = z;
        if (z > zmax) zmax = z;
      }
    }
    if (zmax - zmin < 1e-12) zmax = zmin + 1;
    this._values = values;
    this._zmin = zmin;
    this._zmax = zmax;
    this.onChange();
  }

  _ensureImage(theme) {
    const key = theme.dark ? "dark" : "light";
    if (this._imageKey === key) return;
    const n = HEATMAP_RES;
    const off = this._offscreen || (this._offscreen = document.createElement("canvas"));
    off.width = n;
    off.height = n;
    const octx = off.getContext("2d");
    const img = octx.createImageData(n, n);
    for (let idx = 0; idx < n * n; idx++) {
      let t = (this._values[idx] - this._zmin) / (this._zmax - this._zmin);
      t = Math.round(t * BANDS) / BANDS;
      const rgb = ramp(theme.ramp, t);
      // Flip vertically: canvas rows grow downward, domain y grows upward.
      const row = n - 1 - Math.floor(idx / n);
      const o = (row * n + (idx % n)) * 4;
      img.data[o] = rgb[0]; img.data[o + 1] = rgb[1]; img.data[o + 2] = rgb[2]; img.data[o + 3] = 255;
    }
    octx.putImageData(img, 0, 0);
    this._imageKey = key;
  }

  _dpr() {
    return this.canvas.width / (this.canvas.clientWidth || this.canvas.width);
  }

  // Square plot area centered in the canvas, with room for tick labels.
  _plotRect() {
    const { width: w, height: h } = this.canvas;
    const m = 34 * this._dpr();
    const side = Math.max(10, Math.min(w, h) - 2 * m);
    return { x: (w - side) / 2, y: (h - side) / 2, side };
  }

  _toPx(rect, x, y) {
    const [lo, hi] = this.field.domain;
    return [
      rect.x + ((x - lo) / (hi - lo)) * rect.side,
      rect.y + (1 - (y - lo) / (hi - lo)) * rect.side,
    ];
  }

  pick(clientX, clientY) {
    if (!this.field) return null;
    const box = this.canvas.getBoundingClientRect();
    const sx = this.canvas.width / box.width;
    const px = (clientX - box.left) * sx;
    const py = (clientY - box.top) * sx;
    const rect = this._plotRect();
    const [lo, hi] = this.field.domain;
    const x = lo + ((px - rect.x) / rect.side) * (hi - lo);
    const y = lo + (1 - (py - rect.y) / rect.side) * (hi - lo);
    if (x < lo || x > hi || y < lo || y > hi) return null;
    return [x, y];
  }

  render(scene, theme) {
    if (!this.field) return;
    this._ensureImage(theme);
    const ctx = this.ctx;
    const { width: w, height: h } = this.canvas;
    const rect = this._plotRect();
    ctx.clearRect(0, 0, w, h);

    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(this._offscreen, rect.x, rect.y, rect.side, rect.side);
    ctx.strokeStyle = theme.border;
    ctx.lineWidth = 1;
    ctx.strokeRect(rect.x, rect.y, rect.side, rect.side);

    // Tick labels: domain bounds and 0.
    const [lo, hi] = this.field.domain;
    const dpr = this._dpr();
    ctx.fillStyle = theme.muted;
    ctx.font = `${11 * dpr}px -apple-system, "Segoe UI", Roboto, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    for (const v of [lo, 0, hi]) {
      const [px] = this._toPx(rect, v, lo);
      ctx.fillText(String(v), px, rect.y + rect.side + 5 * dpr);
    }
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    for (const v of [lo, 0, hi]) {
      const [, py] = this._toPx(rect, lo, v);
      ctx.fillText(String(v), rect.x - 5 * dpr, py);
    }

    ctx.save();
    ctx.beginPath();
    ctx.rect(rect.x, rect.y, rect.side, rect.side);
    ctx.clip();

    for (const trail of scene.trails || []) {
      const pts = trail.points;
      if (pts.length < 2) continue;
      ctx.beginPath();
      for (let i = 0; i < pts.length; i++) {
        const [px, py] = this._toPx(rect, pts[i][0], pts[i][1]);
        i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
      }
      ctx.strokeStyle = trail.color;
      ctx.lineWidth = 2 * dpr;
      ctx.lineJoin = "round";
      ctx.globalAlpha = 0.9;
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    if (scene.minimum) {
      const [px, py] = this._toPx(rect, scene.minimum[0], scene.minimum[1]);
      ctx.strokeStyle = theme.text;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(px, py, 7, 0, 2 * Math.PI);
      ctx.stroke();
    }

    for (const p of scene.particles || []) {
      const [px, py] = this._toPx(rect, p.x, p.y);
      ctx.beginPath();
      ctx.arc(px, py, 5 * dpr, 0, 2 * Math.PI);
      ctx.fillStyle = p.color;
      ctx.fill();
      ctx.strokeStyle = theme.surface;
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    ctx.restore();
  }
}

/* -------------------------------------------------------------------------- */

export class LinePlot {
  constructor(canvas, { onChange } = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.onChange = onChange || (() => {});
    this.data = { series: [], startStep: 0 };
    this._hover = null;

    this._resizeObserver = new ResizeObserver(() => this._resize());
    this._resizeObserver.observe(canvas);
    this._resize();

    canvas.addEventListener("pointermove", (ev) => {
      const box = canvas.getBoundingClientRect();
      this._hover = [(ev.clientX - box.left) / box.width, (ev.clientY - box.top) / box.height];
      this.onChange();
    });
    canvas.addEventListener("pointerleave", () => {
      this._hover = null;
      this.onChange();
    });
  }

  destroy() {
    this._resizeObserver.disconnect();
  }

  _resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.max(1, Math.round(this.canvas.clientWidth * dpr));
    const h = Math.max(1, Math.round(this.canvas.clientHeight * dpr));
    if (w !== this.canvas.width || h !== this.canvas.height) {
      this.canvas.width = w;
      this.canvas.height = h;
      this.onChange();
    }
  }

  // data: { series: [{color, label, values: []}], startStep }
  setData(data) {
    this.data = data;
  }

  render(theme) {
    const ctx = this.ctx;
    const { width: w, height: h } = this.canvas;
    const dpr = this.canvas.width / (this.canvas.clientWidth || this.canvas.width);
    ctx.clearRect(0, 0, w, h);

    const series = this.data.series.filter((s) => s.values.length > 1);
    const font = `${11 * dpr}px -apple-system, "Segoe UI", Roboto, sans-serif`;
    if (!series.length) {
      ctx.fillStyle = theme.muted;
      ctx.font = font;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("Press play to record loss curves", w / 2, h / 2);
      return;
    }

    const m = { l: 52 * dpr, r: 12 * dpr, t: 10 * dpr, b: 22 * dpr };
    const pw = w - m.l - m.r, ph = h - m.t - m.b;
    const maxLen = Math.max(...series.map((s) => s.values.length));
    let ymin = Infinity, ymax = -Infinity;
    for (const s of series) for (const v of s.values) {
      if (v < ymin) ymin = v;
      if (v > ymax) ymax = v;
    }
    if (ymax - ymin < 1e-12) { ymax += 1; ymin -= 1; }
    const log = ymin > 0 && ymax / ymin > 100;
    const ty = (v) => (log ? Math.log10(v) : v);
    const y0 = ty(ymin), y1 = ty(ymax);
    const X = (i) => m.l + (pw * i) / (maxLen - 1);
    const Y = (v) => m.t + ph * (1 - (ty(v) - y0) / (y1 - y0));

    // Recessive grid + y labels.
    ctx.strokeStyle = theme.border;
    ctx.fillStyle = theme.muted;
    ctx.font = font;
    ctx.lineWidth = 1;
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    for (let g = 0; g <= 3; g++) {
      const yy = m.t + (ph * g) / 3;
      ctx.beginPath();
      ctx.moveTo(m.l, yy);
      ctx.lineTo(w - m.r, yy);
      ctx.stroke();
      const val = log ? Math.pow(10, y1 - ((y1 - y0) * g) / 3) : ymax - ((ymax - ymin) * g) / 3;
      ctx.fillText(fmt(val), m.l - 6 * dpr, yy);
    }
    // x labels: absolute step numbers (the window may be rolling).
    const s0 = this.data.startStep || 0;
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    for (const frac of [0, 0.5, 1]) {
      ctx.fillText(String(Math.round(s0 + frac * (maxLen - 1))), m.l + pw * frac, m.t + ph + 6 * dpr);
    }

    for (const s of series) {
      ctx.beginPath();
      for (let i = 0; i < s.values.length; i++) {
        const px = X(i), py = Y(s.values[i]);
        i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
      }
      ctx.strokeStyle = s.color;
      ctx.lineWidth = 2 * dpr;
      ctx.lineJoin = "round";
      ctx.stroke();
    }

    this._renderHover(ctx, theme, series, { m, pw, ph, maxLen, X, Y, dpr, s0, w });
  }

  _renderHover(ctx, theme, series, g) {
    if (!this._hover) return;
    const hx = this._hover[0] * this.canvas.width;
    if (hx < g.m.l || hx > g.m.l + g.pw) return;
    const i = Math.round(((hx - g.m.l) / g.pw) * (g.maxLen - 1));

    ctx.strokeStyle = theme.muted;
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(g.X(i), g.m.t);
    ctx.lineTo(g.X(i), g.m.t + g.ph);
    ctx.stroke();
    ctx.setLineDash([]);

    const rows = series
      .filter((s) => i < s.values.length)
      .map((s) => ({ color: s.color, text: s.label + "  " + fmt(s.values[i]) }));
    if (!rows.length) return;

    const font = `${11 * g.dpr}px -apple-system, "Segoe UI", Roboto, sans-serif`;
    ctx.font = font;
    const lineH = 15 * g.dpr;
    const boxW = Math.max(
      ctx.measureText("step " + (g.s0 + i)).width,
      ...rows.map((r) => ctx.measureText(r.text).width)
    ) + 26 * g.dpr;
    const boxH = lineH * (rows.length + 1) + 10 * g.dpr;
    let bx = g.X(i) + 10 * g.dpr;
    if (bx + boxW > g.w - g.m.r) bx = g.X(i) - boxW - 10 * g.dpr;
    const by = g.m.t + 4 * g.dpr;

    ctx.fillStyle = theme.surface;
    ctx.strokeStyle = theme.border;
    ctx.beginPath();
    ctx.roundRect(bx, by, boxW, boxH, 5 * g.dpr);
    ctx.fill();
    ctx.stroke();

    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillStyle = theme.muted;
    ctx.fillText("step " + (g.s0 + i), bx + 8 * g.dpr, by + 5 * g.dpr + lineH / 2);
    rows.forEach((r, k) => {
      const yy = by + 5 * g.dpr + lineH * (k + 1) + lineH / 2;
      ctx.fillStyle = r.color;
      ctx.beginPath();
      ctx.arc(bx + 12 * g.dpr, yy, 3.5 * g.dpr, 0, 2 * Math.PI);
      ctx.fill();
      ctx.fillStyle = theme.text;
      ctx.fillText(r.text, bx + 20 * g.dpr, yy);
    });
  }
}

function fmt(v) {
  if (!isFinite(v)) return "∞";
  const a = Math.abs(v);
  if (a !== 0 && (a >= 10000 || a < 0.001)) return v.toExponential(1);
  if (a >= 100) return v.toFixed(0);
  if (a >= 1) return v.toFixed(2);
  return v.toFixed(3);
}

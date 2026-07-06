// 2D renderer for exit-problem domains (domains.js): a masked, contour-banded
// heatmap of the solution u inside the domain, the boundary with the target
// set Γ highlighted, a drift vector field, and walker/trail/ghost overlays.
// Complements Heatmap (plot2d.js), which assumes a full square field.

import { ramp, rgbToCss, hexToRgb } from "./toolkit.js";

const RASTER_MAX = 320; // raster resolution along the larger bbox dimension
const BANDS = 12;       // quantized colormap steps read like contour bands

export class DomainView {
  constructor(canvas, { onPick, onChange } = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.onPick = onPick || null;
    this.onChange = onChange || (() => {});
    this.domain = null;
    this.fieldFn = null;      // u(x, y) or null → flat fill
    this._rasterKey = null;   // cache key: domain|theme|field version

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

  setDomain(domain) {
    this.domain = domain;
    this._rasterKey = null;
    this.onChange();
  }

  // fieldFn: u(x, y) or null. Bump `version` whenever the field's values
  // change (e.g. as the reference solve converges) to invalidate the raster.
  setField(fieldFn, version) {
    this.fieldFn = fieldFn;
    this._fieldVersion = version;
    this._rasterKey = null;
    this.onChange();
  }

  _dpr() {
    return this.canvas.width / (this.canvas.clientWidth || this.canvas.width);
  }

  // Largest rect with the bbox's aspect ratio that fits the canvas.
  _plotRect() {
    const [X0, Y0, X1, Y1] = this.domain.bbox;
    const { width: w, height: h } = this.canvas;
    const m = 14 * this._dpr();
    const scale = Math.min((w - 2 * m) / (X1 - X0), (h - 2 * m) / (Y1 - Y0));
    const pw = (X1 - X0) * scale, ph = (Y1 - Y0) * scale;
    return { x: (w - pw) / 2, y: (h - ph) / 2, w: pw, h: ph, scale };
  }

  _toPx(rect, x, y) {
    const [X0, Y0, X1, Y1] = this.domain.bbox;
    return [
      rect.x + ((x - X0) / (X1 - X0)) * rect.w,
      rect.y + ((Y1 - y) / (Y1 - Y0)) * rect.h,
    ];
  }

  pick(clientX, clientY) {
    if (!this.domain) return null;
    const box = this.canvas.getBoundingClientRect();
    const sx = this.canvas.width / box.width;
    const px = (clientX - box.left) * sx;
    const py = (clientY - box.top) * sx;
    const rect = this._plotRect();
    const [X0, Y0, X1, Y1] = this.domain.bbox;
    const x = X0 + ((px - rect.x) / rect.w) * (X1 - X0);
    const y = Y1 - ((py - rect.y) / rect.h) * (Y1 - Y0);
    if (this.domain.sdf(x, y) >= -0.01) return null;
    return [x, y];
  }

  _ensureRaster(theme) {
    const key = (theme.dark ? "d" : "l") + "|" + this.domain.name + "|" + (this._fieldVersion ?? "-");
    if (this._rasterKey === key) return;
    const [X0, Y0, X1, Y1] = this.domain.bbox;
    const aspect = (X1 - X0) / (Y1 - Y0);
    const rw = aspect >= 1 ? RASTER_MAX : Math.round(RASTER_MAX * aspect);
    const rh = aspect >= 1 ? Math.round(RASTER_MAX / aspect) : RASTER_MAX;
    const off = this._offscreen || (this._offscreen = document.createElement("canvas"));
    off.width = rw;
    off.height = rh;

    const pxu = (X1 - X0) / rw; // domain units per raster pixel
    const pyu = (Y1 - Y0) / rh;
    const sdfs = new Float64Array(rw * rh);
    const vals = this.fieldFn ? new Float64Array(rw * rh) : null;
    let vmin = Infinity, vmax = -Infinity;
    for (let j = 0; j < rh; j++) {
      for (let i = 0; i < rw; i++) {
        const x = X0 + (i + 0.5) * pxu;
        const y = Y1 - (j + 0.5) * pyu;
        const idx = j * rw + i;
        const s = this.domain.sdf(x, y);
        sdfs[idx] = s;
        if (vals && s < 0) {
          const v = this.fieldFn(x, y);
          vals[idx] = v;
          if (v < vmin) vmin = v;
          if (v > vmax) vmax = v;
        }
      }
    }
    if (vmax - vmin < 1e-12) { vmax = vmin + 1; }

    const octx = off.getContext("2d");
    const img = octx.createImageData(rw, rh);
    const edge = 1.4 * pxu;
    const targetRGB = hexToRgb(theme.series[1]);
    const wallRGB = hexToRgb(theme.dark ? "#8f8f96" : "#5a5a60");
    const flatRGB = hexToRgb(theme.dark ? "#2a2a2e" : "#eef1f5");
    for (let j = 0; j < rh; j++) {
      for (let i = 0; i < rw; i++) {
        const idx = j * rw + i;
        const s = sdfs[idx];
        const o = idx * 4;
        if (s >= edge) continue; // transparent outside
        let rgb;
        if (s >= -edge) {
          const x = X0 + (i + 0.5) * pxu;
          const y = Y1 - (j + 0.5) * pyu;
          rgb = this.domain.target(x, y) ? targetRGB : wallRGB;
        } else if (vals) {
          let t = (vals[idx] - vmin) / (vmax - vmin);
          t = Math.round(t * BANDS) / BANDS;
          rgb = ramp(theme.ramp, t);
        } else {
          rgb = flatRGB;
        }
        img.data[o] = rgb[0]; img.data[o + 1] = rgb[1]; img.data[o + 2] = rgb[2];
        img.data[o + 3] = 255;
      }
    }
    octx.putImageData(img, 0, 0);
    this._rasterKey = key;
    this._range = [vmin, vmax];
  }

  // scene: { drift: b(x,y)|null,
  //          trails: [{color, points: [[x,y],…], alpha}],
  //          walkers: [{x, y, color}],
  //          ghosts: [{x, y, kind: "killed"|"exit"|"miss", color, life}],
  //          start: [x, y] | null }
  render(scene, theme) {
    if (!this.domain) return;
    this._ensureRaster(theme);
    const ctx = this.ctx;
    const { width: w, height: h } = this.canvas;
    const rect = this._plotRect();
    const dpr = this._dpr();
    ctx.clearRect(0, 0, w, h);
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(this._offscreen, rect.x, rect.y, rect.w, rect.h);

    if (scene.drift) this._drawDrift(ctx, rect, dpr, scene.drift, theme);

    for (const trail of scene.trails || []) {
      const pts = trail.points;
      if (pts.length < 2) continue;
      ctx.beginPath();
      for (let i = 0; i < pts.length; i++) {
        const [px, py] = this._toPx(rect, pts[i][0], pts[i][1]);
        i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
      }
      ctx.strokeStyle = trail.color;
      ctx.lineWidth = 1.5 * dpr;
      ctx.lineJoin = "round";
      ctx.globalAlpha = trail.alpha ?? 0.55;
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    for (const g of scene.ghosts || []) {
      const [px, py] = this._toPx(rect, g.x, g.y);
      ctx.globalAlpha = Math.max(0, Math.min(1, g.life));
      if (g.kind === "killed") {
        const r = 4 * dpr;
        ctx.strokeStyle = g.color;
        ctx.lineWidth = 2 * dpr;
        ctx.beginPath();
        ctx.moveTo(px - r, py - r); ctx.lineTo(px + r, py + r);
        ctx.moveTo(px - r, py + r); ctx.lineTo(px + r, py - r);
        ctx.stroke();
      } else {
        // Exit flash: expanding ring at the boundary point.
        const r = (4 + 8 * (1 - g.life)) * dpr;
        ctx.strokeStyle = g.color;
        ctx.lineWidth = 2 * dpr;
        ctx.beginPath();
        ctx.arc(px, py, r, 0, 2 * Math.PI);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }

    for (const p of scene.walkers || []) {
      const [px, py] = this._toPx(rect, p.x, p.y);
      ctx.beginPath();
      ctx.arc(px, py, 3 * dpr, 0, 2 * Math.PI);
      ctx.fillStyle = p.color;
      ctx.fill();
    }

    if (scene.start) {
      const [px, py] = this._toPx(rect, scene.start[0], scene.start[1]);
      ctx.strokeStyle = theme.text;
      ctx.lineWidth = 2 * dpr;
      ctx.beginPath();
      ctx.arc(px, py, 6 * dpr, 0, 2 * Math.PI);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(px, py, 1.5 * dpr, 0, 2 * Math.PI);
      ctx.fillStyle = theme.text;
      ctx.fill();
    }
  }

  _drawDrift(ctx, rect, dpr, drift, theme) {
    const [X0, Y0, X1, Y1] = this.domain.bbox;
    const N = 13;
    const step = Math.max(X1 - X0, Y1 - Y0) / N;
    ctx.strokeStyle = theme.muted;
    ctx.fillStyle = theme.muted;
    ctx.globalAlpha = 0.6;
    ctx.lineWidth = 1 * dpr;
    for (let y = Y0 + step / 2; y < Y1; y += step) {
      for (let x = X0 + step / 2; x < X1; x += step) {
        if (this.domain.sdf(x, y) > -0.05) continue;
        const [bx, by] = drift(x, y);
        const mag = Math.hypot(bx, by);
        if (mag < 1e-6) continue;
        const len = Math.min(0.42 * step, 0.14 * step * mag) * rect.scale;
        const ux = bx / mag, uy = by / mag;
        const [px, py] = this._toPx(rect, x, y);
        const tx = px + ux * len, ty = py - uy * len;
        ctx.beginPath();
        ctx.moveTo(px - ux * len, py + uy * len);
        ctx.lineTo(tx, ty);
        ctx.stroke();
        // Arrow head.
        const hx = -uy, hy = -ux;
        ctx.beginPath();
        ctx.moveTo(tx, ty);
        ctx.lineTo(tx - ux * 4 * dpr + hx * 2.5 * dpr, ty + uy * 4 * dpr + hy * 2.5 * dpr);
        ctx.lineTo(tx - ux * 4 * dpr - hx * 2.5 * dpr, ty + uy * 4 * dpr - hy * 2.5 * dpr);
        ctx.closePath();
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  }
}

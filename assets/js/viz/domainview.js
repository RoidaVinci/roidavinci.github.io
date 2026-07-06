// 2D renderer for exit-problem domains (domains.js): a smooth, contour-traced
// heatmap of the solution u inside the domain, an antialiased boundary with
// the target set Γ highlighted as a rim, a drift vector field, and
// walker/trail/ghost overlays with a soft glow to match the polish of the 3D
// surface view. Complements Heatmap (plot2d.js), which assumes a full square
// field.

import { ramp, rgbToCss, hexToRgb } from "./toolkit.js";

const RASTER_MIN = 240;   // raster resolution floor, along the larger bbox dimension
const RASTER_MAX = 576;   // raster resolution ceiling — quality vs. rebuild cost
const RASTER_STEP = 32;   // round the target raster size to this grid to limit rebuild churn
const AA_PX = 1.1;        // half-width of the inside/outside antialiasing band, in raster px
const RIM_PX = 2.5;       // thickness of the boundary-condition rim, in raster px
const CONTOUR_LEVELS = 9; // interior iso-value bands traced with a faint line, like a contour map
const CONTOUR_HALF = 0.055; // half-width of a contour line, as a fraction of one band

export class DomainView {
  constructor(canvas, { onPick, onChange } = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.onPick = onPick || null;
    this.onChange = onChange || (() => {});
    this.domain = null;
    this.fieldFn = null;      // u(x, y) or null → flat fill
    this._rasterKey = null;   // cache key: domain|theme|field version|resolution

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

  // rect: the current plot rect (device px) — the raster is sized to match it
  // (up to RASTER_MAX) so on-screen scaling stays close to 1:1 and sharp.
  _ensureRaster(theme, rect) {
    const targetDim = clamp(
      Math.round(Math.max(rect.w, rect.h) / RASTER_STEP) * RASTER_STEP,
      RASTER_MIN, RASTER_MAX,
    );
    const key = (theme.dark ? "d" : "l") + "|" + this.domain.name + "|" + (this._fieldVersion ?? "-") + "|" + targetDim;
    if (this._rasterKey === key) return;
    const [X0, Y0, X1, Y1] = this.domain.bbox;
    const aspect = (X1 - X0) / (Y1 - Y0);
    const rw = aspect >= 1 ? targetDim : Math.round(targetDim * aspect);
    const rh = aspect >= 1 ? Math.round(targetDim / aspect) : targetDim;
    const off = this._offscreen || (this._offscreen = document.createElement("canvas"));
    off.width = rw;
    off.height = rh;

    const pxu = (X1 - X0) / rw; // domain units per raster pixel, x axis
    const pyu = (Y1 - Y0) / rh; // domain units per raster pixel, y axis
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
    const aa = AA_PX * pxu;
    const rim = RIM_PX * pxu;
    const targetRGB = hexToRgb(theme.series[1]);
    const wallRGB = hexToRgb(theme.dark ? "#8f8f96" : "#5a5a60");
    const flatRGB = hexToRgb(theme.dark ? "#2a2a2e" : "#eef1f5");
    const contourRGB = theme.dark ? [255, 255, 255] : [12, 12, 16];
    const contourStrength = theme.dark ? 0.22 : 0.13;

    for (let j = 0; j < rh; j++) {
      for (let i = 0; i < rw; i++) {
        const idx = j * rw + i;
        const s = sdfs[idx];
        if (s >= aa) continue; // fully outside: leave transparent

        const alpha = 1 - smoothstep(-aa, aa, s);
        const rimBlend = smoothstep(-rim - aa, -rim + aa, s);

        let rgb;
        if (rimBlend >= 0.999) {
          const x = X0 + (i + 0.5) * pxu;
          const y = Y1 - (j + 0.5) * pyu;
          rgb = this.domain.target(x, y) ? targetRGB : wallRGB;
        } else {
          let interior;
          if (vals) {
            const t = clamp01((vals[idx] - vmin) / (vmax - vmin));
            interior = ramp(theme.ramp, t);
            const levelPos = t * CONTOUR_LEVELS;
            const d = Math.abs(levelPos - Math.round(levelPos));
            if (d < CONTOUR_HALF && levelPos > 0.4 && levelPos < CONTOUR_LEVELS - 0.4) {
              const lineA = (1 - d / CONTOUR_HALF) * contourStrength;
              interior = mixRGB(interior, contourRGB, lineA);
            }
          } else {
            interior = flatRGB;
          }
          if (rimBlend <= 0.001) {
            rgb = interior;
          } else {
            const x = X0 + (i + 0.5) * pxu;
            const y = Y1 - (j + 0.5) * pyu;
            const rimRGB = this.domain.target(x, y) ? targetRGB : wallRGB;
            rgb = mixRGB(interior, rimRGB, rimBlend);
          }
        }

        const o = idx * 4;
        img.data[o] = Math.round(rgb[0]);
        img.data[o + 1] = Math.round(rgb[1]);
        img.data[o + 2] = Math.round(rgb[2]);
        img.data[o + 3] = Math.round(alpha * 255);
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
    const rect = this._plotRect();
    this._ensureRaster(theme, rect);
    const ctx = this.ctx;
    const { width: w, height: h } = this.canvas;
    const dpr = this._dpr();
    ctx.clearRect(0, 0, w, h);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(this._offscreen, rect.x, rect.y, rect.w, rect.h);

    if (scene.drift) this._drawDrift(ctx, rect, dpr, scene.drift, theme);

    for (const trail of scene.trails || []) this._drawTrail(ctx, rect, dpr, trail);

    for (const g of scene.ghosts || []) {
      const [px, py] = this._toPx(rect, g.x, g.y);
      ctx.globalAlpha = Math.max(0, Math.min(1, g.life));
      if (g.kind === "killed") {
        const r = 4 * dpr;
        ctx.strokeStyle = g.color;
        ctx.lineWidth = 2 * dpr;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(px - r, py - r); ctx.lineTo(px + r, py + r);
        ctx.moveTo(px - r, py + r); ctx.lineTo(px + r, py - r);
        ctx.stroke();
      } else {
        // Exit flash: an expanding ring with a softly fading fill at the
        // boundary point, like a gentle ripple.
        const r = (4 + 10 * (1 - g.life)) * dpr;
        const rgb = hexToRgb(g.color);
        ctx.beginPath();
        ctx.arc(px, py, r, 0, 2 * Math.PI);
        ctx.fillStyle = rgbToCss(rgb, 0.12 * g.life);
        ctx.fill();
        ctx.strokeStyle = g.color;
        ctx.lineWidth = 2 * dpr;
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }

    for (const p of scene.walkers || []) this._drawWalker(ctx, rect, dpr, p);

    if (scene.start) this._drawStart(ctx, rect, dpr, scene.start, theme);
  }

  _drawWalker(ctx, rect, dpr, p) {
    const [px, py] = this._toPx(rect, p.x, p.y);
    const r = 3 * dpr;
    const rgb = hexToRgb(p.color);
    const glow = ctx.createRadialGradient(px, py, 0, px, py, r * 2.6);
    glow.addColorStop(0, rgbToCss(rgb, 0.32));
    glow.addColorStop(1, rgbToCss(rgb, 0));
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(px, py, r * 2.6, 0, 2 * Math.PI);
    ctx.fill();

    ctx.beginPath();
    ctx.arc(px, py, r, 0, 2 * Math.PI);
    ctx.fillStyle = p.color;
    ctx.fill();
    ctx.lineWidth = dpr;
    ctx.strokeStyle = "rgba(255,255,255,0.5)";
    ctx.stroke();
  }

  // Comet-style trail: a handful of chunks that thicken and brighten toward
  // the head (the walker's current position, the trail's last point).
  _drawTrail(ctx, rect, dpr, trail) {
    const pts = trail.points;
    if (pts.length < 2) return;
    const segs = Math.min(6, pts.length - 1);
    const n = pts.length;
    const baseAlpha = trail.alpha ?? 0.6;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    for (let s = 0; s < segs; s++) {
      const i0 = Math.floor((s / segs) * (n - 1));
      const i1 = Math.floor(((s + 1) / segs) * (n - 1));
      if (i1 <= i0) continue;
      const f = segs > 1 ? s / (segs - 1) : 1;
      ctx.beginPath();
      for (let i = i0; i <= i1; i++) {
        const [px, py] = this._toPx(rect, pts[i][0], pts[i][1]);
        i === i0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
      }
      ctx.strokeStyle = trail.color;
      ctx.lineWidth = (1 + 1.2 * f) * dpr;
      ctx.globalAlpha = baseAlpha * (0.12 + 0.88 * f);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  _drawStart(ctx, rect, dpr, start, theme) {
    const [px, py] = this._toPx(rect, start[0], start[1]);
    const rgb = hexToRgb(theme.text);
    const haloR = 11 * dpr;
    const halo = ctx.createRadialGradient(px, py, 0, px, py, haloR);
    halo.addColorStop(0, rgbToCss(rgb, 0.16));
    halo.addColorStop(1, rgbToCss(rgb, 0));
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(px, py, haloR, 0, 2 * Math.PI);
    ctx.fill();

    ctx.save();
    ctx.shadowColor = rgbToCss(rgb, 0.4);
    ctx.shadowBlur = 4 * dpr;
    ctx.strokeStyle = theme.text;
    ctx.lineWidth = 2 * dpr;
    ctx.beginPath();
    ctx.arc(px, py, 6 * dpr, 0, 2 * Math.PI);
    ctx.stroke();
    ctx.restore();

    ctx.beginPath();
    ctx.arc(px, py, 1.5 * dpr, 0, 2 * Math.PI);
    ctx.fillStyle = theme.text;
    ctx.fill();
  }

  _drawDrift(ctx, rect, dpr, drift, theme) {
    const [X0, Y0, X1, Y1] = this.domain.bbox;
    const N = 13;
    const step = Math.max(X1 - X0, Y1 - Y0) / N;
    ctx.strokeStyle = theme.muted;
    ctx.fillStyle = theme.muted;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = 1.15 * dpr;
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
        ctx.globalAlpha = 0.32 + 0.4 * Math.min(1, mag / 2);
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

function clamp(v, lo, hi) { return Math.min(hi, Math.max(lo, v)); }
function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }

function smoothstep(e0, e1, x) {
  const t = clamp01((x - e0) / (e1 - e0));
  return t * t * (3 - 2 * t);
}

function mixRGB(a, b, t) {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

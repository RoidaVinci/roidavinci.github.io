// Dependency-free 3D surface renderer on a 2D canvas.
//
// Renders z = f(x, y) over a square domain as a shaded, colormapped mesh
// (painter's algorithm), plus overlay primitives (trails, particles, a
// minimum marker) and an orbit camera with pointer/wheel/pinch/keyboard
// controls. Nothing here is specific to gradient descent — any scalar field
// can be displayed, which is what the other tools build on.
//
// The renderer draws only when asked: interactions invoke `onChange()` and
// the owning tool decides when to call `render(scene, theme)`.

import { ramp, shade, rgbToCss } from "./toolkit.js";

const GRID_N = 64;          // surface resolution (GRID_N² quads)
const Z_SCALE = 0.85;       // world-space height of the normalized field
const FOV_FOCAL = 2.75;     // ≈ 1/tan(fov/2) for a ~40° field of view
const LIGHT = normalize3([0.45, -0.55, 0.72]);

export class Surface3D {
  constructor(canvas, { onPick, onChange } = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.onPick = onPick || null;
    this.onChange = onChange || (() => {});
    this.view = { yaw: -2.25, pitch: 0.62, dist: 3.4 };
    this.field = null;
    this._pointers = new Map();
    this._attachInteraction();

    this._resizeObserver = new ResizeObserver(() => this._resize());
    this._resizeObserver.observe(canvas);
    this._resize();
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

  // field: { f(x,y), domain: [lo, hi], mask?(x,y) — false ⇒ point is outside
  // the field's region; quads touching masked vertices are not drawn }
  setField(field) {
    this.field = field;
    const [lo, hi] = field.domain;
    const n = GRID_N;
    const heights = new Float64Array((n + 1) * (n + 1));
    const inside = field.mask ? new Uint8Array((n + 1) * (n + 1)) : null;
    let zmin = Infinity, zmax = -Infinity;
    for (let j = 0; j <= n; j++) {
      for (let i = 0; i <= n; i++) {
        const x = lo + ((hi - lo) * i) / n;
        const y = lo + ((hi - lo) * j) / n;
        const ok = !field.mask || field.mask(x, y);
        if (inside) inside[j * (n + 1) + i] = ok ? 1 : 0;
        let z = ok ? field.f(x, y) : 0;
        if (!isFinite(z)) z = 0;
        heights[j * (n + 1) + i] = z;
        if (ok) {
          if (z < zmin) zmin = z;
          if (z > zmax) zmax = z;
        }
      }
    }
    if (zmin === Infinity) { zmin = 0; zmax = 1; }
    if (zmax - zmin < 1e-12) zmax = zmin + 1;
    this._heights = heights;
    this._inside = inside;
    this._zmin = zmin;
    this._zmax = zmax;
    this.onChange();
  }

  // Domain (x, y) and raw field value → world coordinates in [-1, 1]³-ish.
  _world(x, y, fval) {
    const [lo, hi] = this.field.domain;
    const half = (hi - lo) / 2;
    const cx = (lo + hi) / 2;
    const t = (fval - this._zmin) / (this._zmax - this._zmin);
    return [(x - cx) / half, (y - cx) / half, (t - 0.5) * Z_SCALE];
  }

  _camera() {
    const { yaw, pitch, dist } = this.view;
    const eye = [
      dist * Math.cos(pitch) * Math.cos(yaw),
      dist * Math.cos(pitch) * Math.sin(yaw),
      dist * Math.sin(pitch),
    ];
    const fwd = normalize3([-eye[0], -eye[1], -eye[2]]);
    const right = normalize3(cross3(fwd, [0, 0, 1]));
    const up = cross3(right, fwd);
    const w = this.canvas.width, h = this.canvas.height;
    const k = 0.5 * Math.min(w, h) * (FOV_FOCAL / 2.9);
    return { eye, fwd, right, up, k, cx: w / 2, cy: h / 2 };
  }

  _project(cam, p) {
    const dx = p[0] - cam.eye[0], dy = p[1] - cam.eye[1], dz = p[2] - cam.eye[2];
    const vz = dx * cam.fwd[0] + dy * cam.fwd[1] + dz * cam.fwd[2];
    const vx = dx * cam.right[0] + dy * cam.right[1] + dz * cam.right[2];
    const vy = dx * cam.up[0] + dy * cam.up[1] + dz * cam.up[2];
    return [cam.cx + (vx / vz) * cam.k * FOV_FOCAL, cam.cy - (vy / vz) * cam.k * FOV_FOCAL, vz];
  }

  // scene: { trails: [{color, points: [[x, y, fval], …]}],
  //          particles: [{color, x, y, fval}],
  //          minimum: [x, y] | null, wireframe: bool, floor: bool }
  render(scene, theme) {
    const ctx = this.ctx;
    const { width: w, height: h } = this.canvas;
    if (!this.field) return;
    const cam = this._camera();
    ctx.clearRect(0, 0, w, h);

    if (scene.floor !== false) this._drawFloor(ctx, cam, theme);
    this._drawSurface(ctx, cam, theme, scene.wireframe);

    // Overlays are drawn without depth testing (matching the original tool):
    // paths and particles stay visible even behind ridges.
    for (const trail of scene.trails || []) this._drawTrail(ctx, cam, trail);
    if (scene.minimum) this._drawMinimum(ctx, cam, scene.minimum, theme);

    const particles = (scene.particles || [])
      .map((p) => ({ p, s: this._project(cam, this._world(p.x, p.y, p.fval)) }))
      .sort((a, b) => b.s[2] - a.s[2]);
    for (const { p, s } of particles) this._drawParticle(ctx, s, p, theme, cam);
  }

  _drawFloor(ctx, cam, theme) {
    const zf = -Z_SCALE / 2 - 0.12;
    ctx.strokeStyle = theme.border;
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.9;
    const div = 8;
    ctx.beginPath();
    for (let i = 0; i <= div; i++) {
      const t = -1 + (2 * i) / div;
      const a = this._project(cam, [t, -1, zf]);
      const b = this._project(cam, [t, 1, zf]);
      const c = this._project(cam, [-1, t, zf]);
      const d = this._project(cam, [1, t, zf]);
      ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]);
      ctx.moveTo(c[0], c[1]); ctx.lineTo(d[0], d[1]);
    }
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  _drawSurface(ctx, cam, theme, wireframe) {
    const n = GRID_N;
    const [lo, hi] = this.field.domain;
    const verts = this._surfaceVerts || (this._surfaceVerts = new Float64Array((n + 1) * (n + 1) * 3));
    const screen = this._surfaceScreen || (this._surfaceScreen = new Float64Array((n + 1) * (n + 1) * 3));

    for (let j = 0; j <= n; j++) {
      for (let i = 0; i <= n; i++) {
        const idx = j * (n + 1) + i;
        const x = lo + ((hi - lo) * i) / n;
        const y = lo + ((hi - lo) * j) / n;
        const p = this._world(x, y, this._heights[idx]);
        verts[idx * 3] = p[0]; verts[idx * 3 + 1] = p[1]; verts[idx * 3 + 2] = p[2];
        const s = this._project(cam, p);
        screen[idx * 3] = s[0]; screen[idx * 3 + 1] = s[1]; screen[idx * 3 + 2] = s[2];
      }
    }

    const quads = [];
    const zrange = this._zmax - this._zmin;
    const inside = this._inside;
    for (let j = 0; j < n; j++) {
      for (let i = 0; i < n; i++) {
        const a = j * (n + 1) + i, b = a + 1, c = a + n + 2, d = a + n + 1;
        if (inside && !(inside[a] && inside[b] && inside[c] && inside[d])) continue;
        const depth = (screen[a * 3 + 2] + screen[b * 3 + 2] + screen[c * 3 + 2] + screen[d * 3 + 2]) / 4;
        const tAvg =
          ((this._heights[a] + this._heights[b] + this._heights[c] + this._heights[d]) / 4 - this._zmin) / zrange;
        quads.push({ a, b, c, d, depth, tAvg });
      }
    }
    quads.sort((q1, q2) => q2.depth - q1.depth);

    const wireColor = theme.dark ? "rgba(232,232,234,0.16)" : "rgba(28,28,30,0.14)";
    for (const q of quads) {
      // Lambert shading from the quad normal (two grid edges).
      const e1 = sub3(verts, q.b, q.a), e2 = sub3(verts, q.d, q.a);
      let nrm = cross3(e1, e2);
      if (nrm[2] < 0) nrm = [-nrm[0], -nrm[1], -nrm[2]];
      nrm = normalize3(nrm);
      const lambert = 0.74 + 0.36 * Math.max(0, nrm[0] * LIGHT[0] + nrm[1] * LIGHT[1] + nrm[2] * LIGHT[2]);
      const fill = rgbToCss(shade(ramp(theme.ramp, q.tAvg), lambert));

      ctx.beginPath();
      ctx.moveTo(screen[q.a * 3], screen[q.a * 3 + 1]);
      ctx.lineTo(screen[q.b * 3], screen[q.b * 3 + 1]);
      ctx.lineTo(screen[q.c * 3], screen[q.c * 3 + 1]);
      ctx.lineTo(screen[q.d * 3], screen[q.d * 3 + 1]);
      ctx.closePath();
      ctx.fillStyle = fill;
      ctx.fill();
      // Stroke with the fill color to seal antialiasing seams, or with the
      // wire color when the wireframe is on.
      ctx.strokeStyle = wireframe ? wireColor : fill;
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }

  _drawTrail(ctx, cam, trail) {
    const pts = trail.points;
    if (pts.length < 2) return;
    ctx.beginPath();
    for (let i = 0; i < pts.length; i++) {
      const s = this._project(cam, this._world(pts[i][0], pts[i][1], pts[i][2] + 0.0));
      if (i === 0) ctx.moveTo(s[0], s[1]);
      else ctx.lineTo(s[0], s[1]);
    }
    ctx.strokeStyle = trail.color;
    ctx.lineWidth = 2 * (this.canvas.width / (this.canvas.clientWidth || this.canvas.width));
    ctx.globalAlpha = 0.85;
    ctx.lineJoin = "round";
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  // p: { color, size? } — size is a world-space radius (default 0.05).
  _drawParticle(ctx, s, p, theme, cam) {
    const r = Math.max(2, ((p.size ?? 0.05) * cam.k * FOV_FOCAL) / s[2]);
    ctx.beginPath();
    ctx.arc(s[0], s[1], r, 0, 2 * Math.PI);
    ctx.fillStyle = p.color;
    ctx.fill();
    // Surface-colored ring so overlapping particles stay separable.
    ctx.strokeStyle = theme.surface;
    ctx.lineWidth = r > 4 ? 2 : 1;
    ctx.stroke();
  }

  _drawMinimum(ctx, cam, minimum, theme) {
    const [x, y] = minimum;
    const s = this._project(cam, this._world(x, y, this.field.f(x, y)));
    ctx.strokeStyle = theme.text;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(s[0], s[1], 7, 0, 2 * Math.PI);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(s[0], s[1], 1.5, 0, 2 * Math.PI);
    ctx.fillStyle = theme.text;
    ctx.fill();
  }

  // Ray-march the view ray against the surface; returns domain [x, y] or null.
  pick(clientX, clientY) {
    if (!this.field) return null;
    const rect = this.canvas.getBoundingClientRect();
    const px = ((clientX - rect.left) / rect.width) * this.canvas.width;
    const py = ((clientY - rect.top) / rect.height) * this.canvas.height;
    const cam = this._camera();
    const dxs = (px - cam.cx) / (cam.k * FOV_FOCAL);
    const dys = (cam.cy - py) / (cam.k * FOV_FOCAL);
    const dir = normalize3([
      cam.right[0] * dxs + cam.up[0] * dys + cam.fwd[0],
      cam.right[1] * dxs + cam.up[1] * dys + cam.fwd[1],
      cam.right[2] * dxs + cam.up[2] * dys + cam.fwd[2],
    ]);

    const [lo, hi] = this.field.domain;
    const half = (hi - lo) / 2, mid = (lo + hi) / 2;
    const worldToDomain = (p) => [mid + p[0] * half, mid + p[1] * half];
    const above = (t) => {
      const p = [cam.eye[0] + dir[0] * t, cam.eye[1] + dir[1] * t, cam.eye[2] + dir[2] * t];
      if (Math.abs(p[0]) > 1 || Math.abs(p[1]) > 1) return null;
      const [x, y] = worldToDomain(p);
      const sz = this._world(x, y, this.field.f(x, y))[2];
      return p[2] - sz;
    };

    const tMax = this.view.dist * 2.5;
    let tPrev = 0, dPrev = null;
    for (let i = 1; i <= 220; i++) {
      const t = (tMax * i) / 220;
      const d = above(t);
      if (d !== null && dPrev !== null && dPrev > 0 && d <= 0) {
        let a = tPrev, b = t;
        for (let k = 0; k < 24; k++) {
          const m = (a + b) / 2;
          ((above(m) ?? 1) > 0) ? (a = m) : (b = m);
        }
        const m = (a + b) / 2;
        const p = [cam.eye[0] + dir[0] * m, cam.eye[1] + dir[1] * m, cam.eye[2] + dir[2] * m];
        const [x, y] = worldToDomain(p);
        return [Math.min(hi, Math.max(lo, x)), Math.min(hi, Math.max(lo, y))];
      }
      if (d !== null) { dPrev = d; tPrev = t; } else { dPrev = null; }
    }
    return null;
  }

  _attachInteraction() {
    const el = this.canvas;
    el.style.touchAction = "none";
    el.tabIndex = 0;

    let moved = false;
    let pinchDist = 0;

    el.addEventListener("pointerdown", (ev) => {
      el.setPointerCapture(ev.pointerId);
      this._pointers.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
      moved = false;
      if (this._pointers.size === 2) {
        const [p1, p2] = [...this._pointers.values()];
        pinchDist = Math.hypot(p1.x - p2.x, p1.y - p2.y);
      }
    });

    el.addEventListener("pointermove", (ev) => {
      const prev = this._pointers.get(ev.pointerId);
      if (!prev) return;
      const dx = ev.clientX - prev.x, dy = ev.clientY - prev.y;
      this._pointers.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
      if (Math.abs(dx) + Math.abs(dy) > 2) moved = true;

      if (this._pointers.size === 1) {
        this.view.yaw -= dx * 0.008;
        this.view.pitch = clamp(this.view.pitch + dy * 0.006, 0.1, 1.45);
        this.onChange();
      } else if (this._pointers.size === 2) {
        const [p1, p2] = [...this._pointers.values()];
        const d = Math.hypot(p1.x - p2.x, p1.y - p2.y);
        if (pinchDist > 0) {
          this.view.dist = clamp(this.view.dist * (pinchDist / d), 1.6, 8);
          this.onChange();
        }
        pinchDist = d;
      }
    });

    const endPointer = (ev) => {
      const had = this._pointers.delete(ev.pointerId);
      if (had && !moved && this._pointers.size === 0 && this.onPick && ev.type === "pointerup") {
        const hit = this.pick(ev.clientX, ev.clientY);
        if (hit) this.onPick(hit[0], hit[1]);
      }
    };
    el.addEventListener("pointerup", endPointer);
    el.addEventListener("pointercancel", endPointer);

    el.addEventListener("wheel", (ev) => {
      ev.preventDefault();
      this.view.dist = clamp(this.view.dist * Math.exp(ev.deltaY * 0.001), 1.6, 8);
      this.onChange();
    }, { passive: false });

    el.addEventListener("keydown", (ev) => {
      const step = 0.12;
      if (ev.key === "ArrowLeft") this.view.yaw += step;
      else if (ev.key === "ArrowRight") this.view.yaw -= step;
      else if (ev.key === "ArrowUp") this.view.pitch = clamp(this.view.pitch + 0.06, 0.1, 1.45);
      else if (ev.key === "ArrowDown") this.view.pitch = clamp(this.view.pitch - 0.06, 0.1, 1.45);
      else if (ev.key === "+" || ev.key === "=") this.view.dist = clamp(this.view.dist * 0.92, 1.6, 8);
      else if (ev.key === "-") this.view.dist = clamp(this.view.dist * 1.08, 1.6, 8);
      else return;
      ev.preventDefault();
      this.onChange();
    });
  }

  resetView() {
    this.view = { yaw: -2.25, pitch: 0.62, dist: 3.4 };
    this.onChange();
  }
}

function clamp(v, lo, hi) { return Math.min(hi, Math.max(lo, v)); }
function cross3(a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }
function normalize3(v) {
  const n = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / n, v[1] / n, v[2] / n];
}
function sub3(arr, i, j) {
  return [arr[i * 3] - arr[j * 3], arr[i * 3 + 1] - arr[j * 3 + 1], arr[i * 3 + 2] - arr[j * 3 + 2]];
}

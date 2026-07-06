// Finite-difference reference solver for the stationary Feynman–Kac /
// Dirichlet problem on the domains of domains.js:
//
//   (σ²/2) Δu + b·∇u − c u + f = 0  in D,     u = g  on ∂D,
//
// discretized on a uniform grid over the domain's bbox with first-order
// upwinding for the drift (which keeps the system an M-matrix, so SOR
// converges for any drift strength). The solve is chunked: call sweep(n)
// from an animation frame until `done` — the tool renders the field as it
// converges.

export function createSolver(domain, { sigma, c, f, gOn, drift }) {
  const [X0, Y0, X1, Y1] = domain.bbox;
  const NMAX = 128;
  const h = Math.max(X1 - X0, Y1 - Y0) / NMAX;
  const nx = Math.round((X1 - X0) / h) + 1;
  const ny = Math.round((Y1 - Y0) / h) + 1;

  const u = new Float64Array(nx * ny);
  const inside = new Uint8Array(nx * ny);
  const bx = new Float32Array(nx * ny);
  const by = new Float32Array(nx * ny);

  for (let j = 0; j < ny; j++) {
    for (let i = 0; i < nx; i++) {
      const idx = j * nx + i;
      const x = X0 + i * h, y = Y0 + j * h;
      if (domain.sdf(x, y) < 0) {
        inside[idx] = 1;
        const b = drift(x, y);
        bx[idx] = b[0];
        by[idx] = b[1];
      } else {
        // Outside nodes carry the Dirichlet data; only the ones adjacent to
        // inside nodes ever matter.
        u[idx] = gOn && domain.target(x, y) ? 1 : 0;
      }
    }
  }

  const D = (sigma * sigma) / 2;
  const ih2 = D / (h * h);
  const OMEGA = 1.8;
  const MAX_SWEEPS = 8000;

  let sweeps = 0;
  let lastDelta = Infinity;
  let done = false;

  function sweep(n) {
    if (done) return 0;
    let maxd = 0;
    for (let s = 0; s < n && !done; s++) {
      maxd = 0;
      for (let j = 1; j < ny - 1; j++) {
        for (let i = 1; i < nx - 1; i++) {
          const idx = j * nx + i;
          if (!inside[idx]) continue;
          const uE = u[idx + 1], uW = u[idx - 1], uN = u[idx + nx], uS = u[idx - nx];
          const bxp = Math.max(bx[idx], 0), bxm = Math.min(bx[idx], 0);
          const byp = Math.max(by[idx], 0), bym = Math.min(by[idx], 0);
          const num =
            ih2 * (uE + uW + uN + uS) +
            (bxp * uE - bxm * uW + byp * uN - bym * uS) / h +
            f;
          const den = 4 * ih2 + (bxp - bxm + byp - bym) / h + c;
          const target = num / den;
          const next = u[idx] + OMEGA * (target - u[idx]);
          const d = Math.abs(next - u[idx]);
          if (d > maxd) maxd = d;
          u[idx] = next;
        }
      }
      sweeps++;
      lastDelta = maxd;
      const range = valueRange();
      if (maxd < 1e-6 * Math.max(range[1] - range[0], 1e-6) || sweeps >= MAX_SWEEPS) {
        done = true;
      }
    }
    return maxd;
  }

  function valueRange() {
    let lo = Infinity, hi = -Infinity;
    for (let idx = 0; idx < u.length; idx++) {
      if (!inside[idx]) continue;
      if (u[idx] < lo) lo = u[idx];
      if (u[idx] > hi) hi = u[idx];
    }
    if (lo === Infinity) { lo = 0; hi = 1; }
    return [lo, hi];
  }

  function interp(x, y) {
    const fx = Math.min(nx - 1.001, Math.max(0, (x - X0) / h));
    const fy = Math.min(ny - 1.001, Math.max(0, (y - Y0) / h));
    const i = Math.floor(fx), j = Math.floor(fy);
    const tx = fx - i, ty = fy - j;
    const a = u[j * nx + i], b = u[j * nx + i + 1];
    const cc = u[(j + 1) * nx + i], d = u[(j + 1) * nx + i + 1];
    return a * (1 - tx) * (1 - ty) + b * tx * (1 - ty) + cc * (1 - tx) * ty + d * tx * ty;
  }

  return {
    sweep,
    interp,
    valueRange,
    get done() { return done; },
    get sweeps() { return sweeps; },
    get progress() { return done ? 1 : Math.min(0.98, sweeps / 1500); },
    get lastDelta() { return lastDelta; },
  };
}

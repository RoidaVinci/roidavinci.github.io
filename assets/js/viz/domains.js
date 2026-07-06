// Library of 2D domains for exit-problem / Feynman–Kac tools. Every domain
// exposes:
//   { name, bbox: [x0, y0, x1, y1],
//     sdf(x, y)        – signed distance-ish function, < 0 inside
//     target(x, y)     – is this (near-boundary) point on the target set Γ?
//     targetLabel      – short human description of Γ
//     start: [x, y]    – default start point x₀
//     exact: {         – closed-form solutions for driftless BM (b = 0, c = 0)
//       exitProb(x, y)         – u = P(B exits through Γ), σ-invariant, or null
//       exitTime(x, y, sigma)  – u = E[τ] for dX = σ dW, or null
//     } }
//
// The classic closed formulas live here: the Poisson kernel on the disk, the
// 2D gambler's-ruin logarithm on the annulus, and eigenfunction series on the
// rectangle. Domains without a formula rely on the tool's finite-difference
// reference solver.

const PI = Math.PI;

/* ---- disk: |x| < 1, target = upper semicircle --------------------------- */

// Harmonic measure of the upper arc seen from x: integral of the Poisson
// kernel P(x, θ) = (1 − |x|²) / (2π |x − e^{iθ}|²) over θ ∈ (0, π).
function diskExitProb(x, y) {
  const r2 = x * x + y * y;
  const N = 2000;
  let s = 0;
  for (let i = 0; i < N; i++) {
    const th = (PI * (i + 0.5)) / N;
    const dx = x - Math.cos(th), dy = y - Math.sin(th);
    s += (1 - r2) / (2 * PI * (dx * dx + dy * dy));
  }
  return (s * PI) / N;
}

/* ---- annulus: r < |x| < R ----------------------------------------------- */

const ANN_R0 = 0.4, ANN_R1 = 1;

// Gambler's ruin in the plane: P(hit outer circle before inner) from radius ρ
// is ln(ρ/r) / ln(R/r) — the harmonic function of the 2D walk.
function annulusExitProb(x, y) {
  const rho = Math.hypot(x, y);
  return Math.log(rho / ANN_R0) / Math.log(ANN_R1 / ANN_R0);
}

// E[τ]: solve (σ²/2)Δu = −1 radially, u(r) = u(R) = 0.
function annulusExitTime(x, y, sigma) {
  const rho = Math.hypot(x, y), s2 = sigma * sigma;
  const B = (ANN_R1 * ANN_R1 - ANN_R0 * ANN_R0) / (2 * s2 * Math.log(ANN_R1 / ANN_R0));
  const A = (ANN_R0 * ANN_R0) / (2 * s2) - B * Math.log(ANN_R0);
  return A + B * Math.log(rho) - (rho * rho) / (2 * s2);
}

/* ---- rectangle: (−1, 1) × (−0.7, 0.7), target = top edge ----------------- */

const RECT_L = 2, RECT_H = 1.4;

// Separation of variables: u = Σ_{n odd} (4/nπ) sin(nπx̃/L) sinh(nπỹ/L)/sinh(nπH/L).
function rectExitProb(x, y) {
  const xt = x + 1, yt = y + 0.7;
  let s = 0;
  for (let n = 1; n <= 79; n += 2) {
    const k = (n * PI) / RECT_L;
    s += ((4 / (n * PI)) * Math.sin(k * xt) * Math.sinh(k * yt)) / Math.sinh(k * RECT_H);
  }
  return s;
}

// Torsion function of the rectangle (Δφ = −2, φ|∂ = 0); E[τ] = φ/σ².
function rectExitTime(x, y, sigma) {
  const xt = x + 1, yt = y + 0.7;
  let phi = yt * (RECT_H - yt);
  for (let n = 1; n <= 79; n += 2) {
    const k = (n * PI) / RECT_H;
    phi -=
      (((8 * RECT_H * RECT_H) / (n * n * n * PI * PI * PI)) *
        (Math.cosh(k * (xt - RECT_L / 2)) / Math.cosh((k * RECT_L) / 2))) *
      Math.sin(k * yt);
  }
  return phi / (sigma * sigma);
}

/* ---- registry ------------------------------------------------------------ */

export const DOMAINS = {
  disk: {
    name: "Disk",
    bbox: [-1.1, -1.1, 1.1, 1.1],
    sdf: (x, y) => Math.hypot(x, y) - 1,
    target: (x, y) => y > 0,
    targetLabel: "the upper semicircle",
    start: [-0.35, -0.3],
    exact: {
      exitProb: diskExitProb,
      exitTime: (x, y, sigma) => (1 - x * x - y * y) / (2 * sigma * sigma),
    },
  },

  annulus: {
    name: "Annulus (gambler's ruin)",
    bbox: [-1.1, -1.1, 1.1, 1.1],
    sdf: (x, y) => Math.max(Math.hypot(x, y) - ANN_R1, ANN_R0 - Math.hypot(x, y)),
    target: (x, y) => Math.hypot(x, y) > (ANN_R0 + ANN_R1) / 2,
    targetLabel: "the outer circle (before the inner one)",
    start: [0.62, 0.1],
    exact: { exitProb: annulusExitProb, exitTime: annulusExitTime },
  },

  rectangle: {
    name: "Rectangle",
    bbox: [-1.1, -0.8, 1.1, 0.8],
    sdf: (x, y) => Math.max(Math.abs(x) - 1, Math.abs(y) - 0.7),
    target: (x, y) => y > 0.66,
    targetLabel: "the top edge",
    start: [0, -0.15],
    exact: { exitProb: rectExitProb, exitTime: rectExitTime },
  },

  sector: {
    name: "Sector (270°, reentrant corner)",
    bbox: [-1.1, -1.1, 1.1, 1.1],
    sdf: (x, y) => Math.max(Math.hypot(x, y) - 1, Math.min(x, -y)),
    target: (x, y) => Math.hypot(x, y) > 0.97,
    targetLabel: "the circular arc (not the straight edges)",
    start: [-0.4, 0.35],
    exact: { exitProb: null, exitTime: null },
  },

  lshape: {
    name: "L-shape",
    bbox: [-1.1, -1.1, 1.1, 1.1],
    sdf: (x, y) => Math.max(Math.abs(x) - 1, Math.abs(y) - 1, Math.min(x, y)),
    target: (x, y) => y < -0.96,
    targetLabel: "the bottom edge",
    start: [-0.45, -0.4],
    exact: { exitProb: null, exitTime: null },
  },

  flower: {
    name: "Flower (5 petals)",
    bbox: [-1.1, -1.1, 1.1, 1.1],
    sdf: (x, y) => Math.hypot(x, y) - (0.72 + 0.24 * Math.cos(5 * Math.atan2(y, x))),
    target: (x, y) => Math.cos(5 * Math.atan2(y, x)) > 0.4,
    targetLabel: "the five petal tips",
    start: [0, 0],
    exact: { exitProb: null, exitTime: null },
  },
};

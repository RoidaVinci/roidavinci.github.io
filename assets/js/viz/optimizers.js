// Optimizer registry. Each module owns its per-particle state, its update
// rule and the schema of its tunable parameters (rendered by the toolkit's
// panel builder). Adding an optimizer = appending one object here; the tool
// UI, colors and loss chart pick it up automatically.
//
// step(ctx) receives:
//   p      – the particle {x, y, ...state}
//   gx, gy – gradient of the landscape at (p.x, p.y)
//   params – current parameter values for this optimizer
//   clamp  – clamps a coordinate to the landscape domain
//   grad   – the landscape gradient function (for look-ahead methods)

const ALPHA = { key: "alpha", label: "α · step size", min: 0.002, max: 0.15, step: 0.001, format: (v) => v.toFixed(3) };
const BETA = { key: "beta", label: "β · momentum", min: 0, max: 0.98, step: 0.01, format: (v) => v.toFixed(2) };

export const OPTIMIZERS = [
  {
    key: "vanilla",
    name: "Gradient descent",
    defaults: { alpha: 0.04 },
    ui: [ALPHA],
    init() {},
    step({ p, gx, gy, params, clamp }) {
      p.x = clamp(p.x - params.alpha * gx);
      p.y = clamp(p.y - params.alpha * gy);
    },
  },

  {
    key: "momentum",
    name: "Momentum",
    defaults: { alpha: 0.04, beta: 0.85 },
    ui: [ALPHA, BETA],
    init(p) { p.vx = 0; p.vy = 0; },
    step({ p, gx, gy, params, clamp }) {
      p.vx = p.vx * params.beta - params.alpha * gx;
      p.vy = p.vy * params.beta - params.alpha * gy;
      p.x = clamp(p.x + p.vx);
      p.y = clamp(p.y + p.vy);
    },
  },

  {
    key: "nesterov",
    name: "Nesterov",
    defaults: { alpha: 0.04, beta: 0.85 },
    ui: [ALPHA, BETA],
    init(p) { p.vx = 0; p.vy = 0; },
    step({ p, params, clamp, grad }) {
      const [gx, gy] = grad(p.x + params.beta * p.vx, p.y + params.beta * p.vy);
      p.vx = params.beta * p.vx - params.alpha * gx;
      p.vy = params.beta * p.vy - params.alpha * gy;
      p.x = clamp(p.x + p.vx);
      p.y = clamp(p.y + p.vy);
    },
  },

  {
    key: "adam",
    name: "Adam",
    defaults: { alpha: 0.04, beta1: 0.9, beta2: 0.999, eps: 1e-8 },
    ui: [
      ALPHA,
      { key: "beta1", label: "β₁ · 1st moment", min: 0.5, max: 0.999, step: 0.001, format: (v) => v.toFixed(3) },
      { key: "beta2", label: "β₂ · 2nd moment", min: 0.9, max: 0.9999, step: 0.0001, format: (v) => v.toFixed(4) },
    ],
    init(p) { p.mx = 0; p.my = 0; p.sx = 0; p.sy = 0; p.t = 0; },
    step({ p, gx, gy, params, clamp }) {
      const { alpha, beta1, beta2, eps } = params;
      p.t += 1;
      p.mx = beta1 * p.mx + (1 - beta1) * gx;
      p.my = beta1 * p.my + (1 - beta1) * gy;
      p.sx = beta2 * p.sx + (1 - beta2) * gx * gx;
      p.sy = beta2 * p.sy + (1 - beta2) * gy * gy;
      const bc1 = 1 - Math.pow(beta1, p.t);
      const bc2 = 1 - Math.pow(beta2, p.t);
      p.x = clamp(p.x - (alpha * (p.mx / bc1)) / (Math.sqrt(p.sx / bc2) + eps));
      p.y = clamp(p.y - (alpha * (p.my / bc1)) / (Math.sqrt(p.sy / bc2) + eps));
    },
  },

  {
    key: "rmsprop",
    name: "RMSProp",
    defaults: { alpha: 0.02, rho: 0.9, eps: 1e-8 },
    ui: [
      { key: "alpha", label: "α · step size", min: 0.001, max: 0.08, step: 0.001, format: (v) => v.toFixed(3) },
      { key: "rho", label: "ρ · decay", min: 0.5, max: 0.999, step: 0.001, format: (v) => v.toFixed(3) },
    ],
    init(p) { p.sx = 0; p.sy = 0; },
    step({ p, gx, gy, params, clamp }) {
      const { alpha, rho, eps } = params;
      p.sx = rho * p.sx + (1 - rho) * gx * gx;
      p.sy = rho * p.sy + (1 - rho) * gy * gy;
      p.x = clamp(p.x - (alpha * gx) / (Math.sqrt(p.sx) + eps));
      p.y = clamp(p.y - (alpha * gy) / (Math.sqrt(p.sy) + eps));
    },
  },

  {
    key: "gravity",
    name: "Gravity (physical ball)",
    defaults: { g: 9.8, mu: 0.5 },
    ui: [
      { key: "g", label: "g · gravity", min: 0.5, max: 30, step: 0.1, format: (v) => v.toFixed(1) },
      { key: "mu", label: "μ · friction", min: 0, max: 2, step: 0.01, format: (v) => v.toFixed(2) },
    ],
    init(p) { p.vx = 0; p.vy = 0; },
    // A ball rolling on the surface z = f(x, y): tangential gravity minus
    // linear friction, integrated with semi-implicit Euler at a fixed dt.
    step({ p, gx, gy, params, clamp }) {
      const dt = 0.02;
      const denom = Math.sqrt(1 + gx * gx + gy * gy);
      const ax = (-params.g * gx) / denom - params.mu * p.vx;
      const ay = (-params.g * gy) / denom - params.mu * p.vy;
      p.vx += ax * dt;
      p.vy += ay * dt;
      let x1 = p.x + p.vx * dt;
      let y1 = p.y + p.vy * dt;
      const xc = clamp(x1), yc = clamp(y1);
      if (xc !== x1) { p.vx = 0; x1 = xc; } // inelastic wall
      if (yc !== y1) { p.vy = 0; y1 = yc; }
      p.x = x1;
      p.y = y1;
    },
  },
];

export const OPTIMIZER_INDEX = Object.fromEntries(OPTIMIZERS.map((o, i) => [o.key, i]));

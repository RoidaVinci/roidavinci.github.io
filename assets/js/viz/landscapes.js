// Library of 2D scalar fields ("loss landscapes") with analytic gradients
// where practical. Every landscape exposes:
//   { name, domain: [lo, hi] (square), f(x,y), grad(x,y) -> [gx, gy],
//     minimum: [x, y] | null }
// Classic test functions whose optimum is away from the origin are shifted so
// the global minimum sits at (0, 0) — it makes runs comparable across
// landscapes and lets a single marker show the target.

// Central-difference gradient for functions whose closed form is unwieldy.
export function numericGrad(f, h = 1e-4) {
  return (x, y) => [
    (f(x + h, y) - f(x - h, y)) / (2 * h),
    (f(x, y + h) - f(x, y - h)) / (2 * h),
  ];
}

const TAU = 2 * Math.PI;

export const LANDSCAPES = {
  bowl: {
    name: "Quadratic Bowl",
    domain: [-6, 6],
    minimum: [0, 0],
    f: (x, y) => 0.15 * (x * x + 0.6 * y * y),
    grad: (x, y) => [0.3 * x, 0.18 * y],
  },

  rosenbrock: {
    name: "Rosenbrock (banana)",
    domain: [-2, 2],
    minimum: [0, 0], // original minimum (1,1), shifted
    f: (x, y) => {
      const u = x + 1, v = y + 1;
      return (1 - u) ** 2 + 100 * (v - u * u) ** 2;
    },
    grad: (x, y) => {
      const u = x + 1, v = y + 1;
      return [-2 * (1 - u) - 400 * u * (v - u * u), 200 * (v - u * u)];
    },
  },

  rastrigin: {
    name: "Rastrigin (non-convex)",
    domain: [-6, 6],
    minimum: [0, 0],
    f: (x, y) =>
      0.1 * (20 + (x * x - 10 * Math.cos(TAU * x)) + (y * y - 10 * Math.cos(TAU * y))),
    grad: (x, y) => [
      0.1 * (2 * x + 10 * TAU * Math.sin(TAU * x)),
      0.1 * (2 * y + 10 * TAU * Math.sin(TAU * y)),
    ],
  },

  ackley: {
    name: "Ackley",
    domain: [-6, 6],
    minimum: [0, 0],
    f: ackley,
    grad: numericGrad(ackley),
  },

  himmelblau: {
    name: "Himmelblau",
    domain: [-6, 6],
    minimum: [0, 0], // one of four minima, (3,2), shifted to the origin
    f: (x, y) => {
      const u = x + 3, v = y + 2;
      return 0.02 * ((u * u + v - 11) ** 2 + (u + v * v - 7) ** 2);
    },
    grad: (x, y) => {
      const u = x + 3, v = y + 2;
      const a = u * u + v - 11;
      const b = u + v * v - 7;
      return [0.02 * (4 * u * a + 2 * b), 0.02 * (2 * a + 4 * v * b)];
    },
  },

  sincos: {
    name: "Sine–Cosine Hills",
    domain: [-8, 8],
    minimum: [0, 0], // convexified by the +0.02 r² term
    f: (x, y) => 2 + Math.sin(0.8 * x) * Math.cos(0.8 * y) + 0.02 * (x * x + y * y),
    grad: (x, y) => [
      0.8 * Math.cos(0.8 * x) * Math.cos(0.8 * y) + 0.04 * x,
      -0.8 * Math.sin(0.8 * x) * Math.sin(0.8 * y) + 0.04 * y,
    ],
  },

  coneSmooth: {
    name: "Smooth Cone",
    domain: [-8, 8],
    minimum: [0, 0],
    f: (x, y) => Math.sqrt(x * x + y * y + 1e-6),
    grad: (x, y) => {
      const r = Math.sqrt(x * x + y * y + 1e-6);
      return [x / r, y / r];
    },
  },

  plateauTanh: {
    name: "Plateau (tanh)",
    domain: [-8, 8],
    minimum: [0, 0],
    f: (x, y) => Math.tanh(0.5 * (x * x + y * y)),
    grad: (x, y) => {
      const sech = 1 / Math.cosh(0.5 * (x * x + y * y));
      const k = sech * sech;
      return [k * x, k * y];
    },
  },

  eggCrate: {
    name: "Egg Crate",
    domain: [-6, 6],
    minimum: [0, 0],
    f: (x, y) => 0.05 * (x * x + y * y + 25 * (Math.sin(x) ** 2 + Math.sin(y) ** 2)),
    grad: (x, y) => [
      0.05 * (2 * x + 25 * Math.sin(2 * x)),
      0.05 * (2 * y + 25 * Math.sin(2 * y)),
    ],
  },

  matyas: {
    name: "Matyas",
    domain: [-10, 10],
    minimum: [0, 0],
    f: (x, y) => 0.26 * (x * x + y * y) - 0.48 * x * y,
    grad: (x, y) => [0.52 * x - 0.48 * y, 0.52 * y - 0.48 * x],
  },

  threeHumpCamel: {
    name: "Three-Hump Camel",
    domain: [-3, 3],
    minimum: [0, 0],
    f: (x, y) => 2 * x * x - 1.05 * x ** 4 + x ** 6 / 6 + x * y + y * y,
    grad: (x, y) => [4 * x - 4.2 * x ** 3 + x ** 5 + y, x + 2 * y],
  },

  booth: {
    name: "Booth",
    domain: [-10, 10],
    minimum: [0, 0], // original minimum (1,3), shifted
    f: (x, y) => {
      const u = x + 1, v = y + 3;
      return 0.05 * ((u + 2 * v - 7) ** 2 + (2 * u + v - 5) ** 2);
    },
    grad: (x, y) => {
      const u = x + 1, v = y + 3;
      const a = u + 2 * v - 7;
      const b = 2 * u + v - 5;
      return [0.05 * (2 * a + 4 * b), 0.05 * (4 * a + 2 * b)];
    },
  },

  mccormick: {
    name: "McCormick",
    domain: [-2, 2],
    minimum: [0, 0], // original minimum (-0.54719, -1.54719), shifted
    f: (x, y) => {
      const u = x - 0.54719, v = y - 1.54719;
      return Math.sin(u + v) + (u - v) ** 2 - 1.5 * u + 2.5 * v + 1;
    },
    grad: (x, y) => {
      const u = x - 0.54719, v = y - 1.54719;
      return [
        Math.cos(u + v) + 2 * (u - v) - 1.5,
        Math.cos(u + v) - 2 * (u - v) + 2.5,
      ];
    },
  },

  bukin6: {
    name: "Bukin N.6",
    domain: [-8, 8],
    minimum: [0, 0], // original minimum (-10, 1), shifted
    f: bukin6,
    grad: numericGrad(bukin6),
  },

  styblinskiTang: {
    name: "Styblinski–Tang",
    domain: [-6, 6],
    minimum: [0, 0], // original minimum (-2.9035, -2.9035), shifted
    f: (x, y) => {
      const g = (t) => t ** 4 - 16 * t * t + 5 * t;
      return 0.015 * (g(x - 2.903534) + g(y - 2.903534));
    },
    grad: (x, y) => {
      const gp = (t) => 4 * t ** 3 - 32 * t + 5;
      return [0.015 * gp(x - 2.903534), 0.015 * gp(y - 2.903534)];
    },
  },

  beale: {
    name: "Beale",
    domain: [-4.5, 4.5],
    minimum: [0, 0], // original minimum (3, 0.5), shifted
    f: beale,
    grad: numericGrad(beale),
  },

  saddle: {
    name: "Saddle (no minimum)",
    domain: [-6, 6],
    minimum: null,
    f: (x, y) => 0.1 * (x * x - y * y),
    grad: (x, y) => [0.2 * x, -0.2 * y],
  },

  ringValleys: {
    name: "Concentric Rings (many minima)",
    domain: [-8, 8],
    minimum: null,
    f: (x, y) => {
      const r = Math.sqrt(x * x + y * y);
      return 0.5 + 0.2 * Math.sin(2.5 * r) + 0.01 * r * r;
    },
    grad: (x, y) => {
      const r = Math.sqrt(x * x + y * y) + 1e-8;
      const dfdr = 0.5 * Math.cos(2.5 * r) + 0.02 * r;
      return [dfdr * (x / r), dfdr * (y / r)];
    },
  },

  tiltedCanyons: {
    name: "Tilted Canyons",
    domain: [-8, 8],
    minimum: null,
    f: (x, y) => 0.02 * (x * x + 10 * Math.sin(0.8 * x + 0.6 * y) ** 2 + 0.3 * y * y),
    grad: (x, y) => {
      const s = Math.sin(0.8 * x + 0.6 * y);
      const c = Math.cos(0.8 * x + 0.6 * y);
      return [
        0.04 * x + 0.32 * s * c,
        0.24 * s * c + 0.012 * y,
      ];
    },
  },
};

function ackley(x, y) {
  const a = 20, b = 0.2, c = TAU;
  const s1 = x * x + y * y;
  const s2 = Math.cos(c * x) + Math.cos(c * y);
  return (-a * Math.exp(-b * Math.sqrt(0.5 * s1)) - Math.exp(0.5 * s2) + a + Math.E) * 0.15;
}

function bukin6(x, y) {
  const u = x - 10, v = y + 1;
  return 0.1 * (100 * Math.sqrt(Math.abs(v - 0.01 * u * u)) + 0.01 * Math.abs(u + 10));
}

function beale(x, y) {
  const u = x + 3, v = y + 0.5;
  const t1 = 1.5 - u + u * v;
  const t2 = 2.25 - u + u * v * v;
  const t3 = 2.625 - u + u * v ** 3;
  return 0.02 * (t1 * t1 + t2 * t2 + t3 * t3);
}

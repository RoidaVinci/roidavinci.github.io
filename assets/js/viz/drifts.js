// Drift-field presets for the Feynman–Kac tool. Each entry builds
// b(x, y) → [bx, by] from a strength (and, for the wind, an angle in
// degrees). The generator being visualized is L = (σ²/2)Δ + b·∇.

export const DRIFTS = {
  none: {
    name: "None (pure Brownian)",
    make: () => () => [0, 0],
  },
  wind: {
    name: "Constant wind",
    hasAngle: true,
    make: (s, angleDeg) => {
      const a = (angleDeg * Math.PI) / 180;
      const bx = s * Math.cos(a), by = s * Math.sin(a);
      return () => [bx, by];
    },
  },
  vortex: {
    name: "Vortex (rotation)",
    make: (s) => (x, y) => [-s * y, s * x],
  },
  inward: {
    name: "Restoring well (inward)",
    make: (s) => (x, y) => [-s * x, -s * y],
  },
  outward: {
    name: "Unstable source (outward)",
    make: (s) => (x, y) => [s * x, s * y],
  },
};

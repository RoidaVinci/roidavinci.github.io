// Library of periodic target waveforms with their Fourier series. Every wave
// exposes:
//   { name, dc,                       – constant (a₀) term
//     harmonic(k) -> { omega, amp, phase } | null,   – k-th harmonic, null if 0
//     target(u) }                     – exact waveform, u in radians
// Harmonics are sine terms amp·sin(omega·u + phase); cosine terms use
// phase = π/2. Adding a waveform here is all the Fourier tool needs.

const TAU = 2 * Math.PI;

// Wrap u to (-π, π].
function wrap(u) {
  const v = ((u + Math.PI) % TAU + TAU) % TAU - Math.PI;
  return v;
}

export const WAVES = {
  square: {
    name: "Square",
    dc: 0,
    // f(u) = (4/π) Σ_{k odd} sin(ku)/k
    harmonic: (k) => (k % 2 ? { omega: k, amp: 4 / (Math.PI * k), phase: 0 } : null),
    target: (u) => (Math.sin(u) >= 0 ? 1 : -1),
  },

  sawtooth: {
    name: "Sawtooth",
    dc: 0,
    // f(u) = u/π on (-π, π) = (2/π) Σ (-1)^{k+1} sin(ku)/k
    harmonic: (k) => ({ omega: k, amp: ((k % 2 ? 1 : -1) * 2) / (Math.PI * k), phase: 0 }),
    target: (u) => wrap(u) / Math.PI,
  },

  triangle: {
    name: "Triangle",
    dc: 0,
    // f(u) = (8/π²) Σ_{k odd} (-1)^{(k-1)/2} sin(ku)/k²
    harmonic: (k) =>
      k % 2
        ? { omega: k, amp: ((((k - 1) / 2) % 2 ? -1 : 1) * 8) / (Math.PI * Math.PI * k * k), phase: 0 }
        : null,
    target: (u) => (2 / Math.PI) * Math.asin(Math.sin(u)),
  },

  pulse: {
    name: "Pulse (25% duty)",
    // Bipolar pulse of duty d = 1/4 centred at u = 0:
    // f(u) = (2d − 1) + Σ (4/(kπ)) sin(kπd) cos(ku)
    dc: -0.5,
    harmonic: (k) => {
      const amp = (4 / (Math.PI * k)) * Math.sin(Math.PI * k * 0.25);
      return Math.abs(amp) < 1e-12 ? null : { omega: k, amp, phase: Math.PI / 2 };
    },
    target: (u) => (Math.abs(wrap(u)) < Math.PI * 0.25 ? 1 : -1),
  },
};

// First n non-zero harmonics of a wave, lowest frequency first.
export function partialSeries(wave, n) {
  const terms = [];
  for (let k = 1; terms.length < n && k <= 4096; k++) {
    const t = wave.harmonic(k);
    if (t) terms.push(t);
  }
  return terms;
}

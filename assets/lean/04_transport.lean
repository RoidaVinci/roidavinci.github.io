import Mathlib

-- uncomment to see the type error:
-- example (n m : ℕ) (v : Fin (n + m) → ℝ) : Fin (m + n) → ℝ := v

-- the repair: transport along a proof of m + n = n + m
example (n m : ℕ) (v : Fin (n + m) → ℝ) : Fin (m + n) → ℝ :=
  fun i => v (Fin.cast (Nat.add_comm m n) i)

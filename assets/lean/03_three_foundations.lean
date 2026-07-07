import Mathlib

def dot {n : ℕ} (u v : Fin n → ℝ) : ℝ := ∑ i, u i * v i

example (u v : Fin 3 → ℝ) : ℝ := dot u v

-- uncomment to see the type error:
-- example (u : Fin 3 → ℝ) (v : Fin 5 → ℝ) : ℝ := dot u v

-- Exercise: replace `sorry`
example : dot ![3, 4] ![3, 4] = (25 : ℝ) := by
  sorry

import Mathlib

def ContinuousAt' (f : ℝ → ℝ) (a : ℝ) : Prop :=
  ∀ ε > 0, ∃ δ > 0, ∀ x, |x - a| < δ → |f x - f a| < ε

#check ContinuousAt'
#check ContinuousAt' (fun x => x ^ 2)
#check ContinuousAt' (fun x => x ^ 2) 3

-- worked example: a constant function is continuous at 0
example : ContinuousAt' (fun _ => (3 : ℝ)) 0 := by
  intro ε hε
  exact ⟨1, one_pos, fun x _ => by simpa using hε⟩

-- Exercise: replace `sorry`
example (a : ℝ) : ContinuousAt' (fun x => x) a := by
  intro ε hε
  sorry

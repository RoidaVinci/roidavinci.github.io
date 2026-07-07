import Mathlib

def ContinuousAt' (f : ℝ → ℝ) (a : ℝ) : Prop :=
  ∀ ε > 0, ∃ δ > 0, ∀ x, |x - a| < δ → |f x - f a| < ε

theorem comp_continuousAt {f g : ℝ → ℝ} {a : ℝ}
    (hf : ContinuousAt' f a) (hg : ContinuousAt' g (f a)) :
    ContinuousAt' (g ∘ f) a := by
  intro ε hε
  obtain ⟨δ₁, hδ₁, hg'⟩ := hg ε hε
  obtain ⟨δ₂, hδ₂, hf'⟩ := hf δ₁ hδ₁
  exact ⟨δ₂, hδ₂, fun x hx => hg' (f x) (hf' x hx)⟩

-- Exercise: replace `sorry`
theorem add_const_continuousAt {f : ℝ → ℝ} {a c : ℝ}
    (hf : ContinuousAt' f a) :
    ContinuousAt' (fun x => f x + c) a := by
  intro ε hε
  obtain ⟨δ, hδ, hf'⟩ := hf ε hε
  refine ⟨δ, hδ, fun x hx => ?_⟩
  have h := hf' x hx
  sorry

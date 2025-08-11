# Gradient Backpropagation

In the article [Neural Networks as Graphs](../articles/nn_graph.html) we explored how neural networks can be represented as graphs, with nodes corresponding to neurons and edges representing synaptic connections. One of the most crucial algorithms in the training of these networks is gradient descent, a fundamental tool in mathematical optimization.

The chain rule is a fundamental tool that allows us to compute gradients efficiently, even in complex network structures.

$$ \frac{\partial \mathcal{R}_\mathcal{D}}{\partial W_{g_0}} = \frac{\partial \mathcal{R}_\mathcal{D}}{\partial \mathcal{RN}} \frac{\partial \mathcal{RN}}{\partial a_{g_0}} \frac{\partial a_{g_0}}{\partial W_{g_0}} $$

... more content to be added ...

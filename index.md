---
layout: default
title: "Roi Vence Personal Website"
---

<main role="main" class="container-sm" style="max-width: 1080px">
    <div class="row">
        <div class="col">
            <p class="h1 mt-5 page-title">
                <img class="profile-img-small d-md-none" src="{{ '/assets/profile.jpg' | relative_url }}" />
                <span style="clear: right">Roi Vence Nogueira</span>
            </p>
            <p class="h4 section-title" style="clear: right">About</p>
            {% capture bio %}{% include bio.md %}{% endcapture %}
            <p>{{ bio | markdownify }}</p>
            <a href="mailto:roi.vence@gmail.com">Email</a>    |    <a href="https://www.linkedin.com/in/roivence">LinkedIn</a>    |    <a href="https://github.com/RoidaVinci">Github</a>
        </div>
        <div class="col-auto d-none d-md-block">
            <img class="profile-img" src="{{ '/assets/profile.jpg' | relative_url }}" />
        </div>
    </div>

    <section id="cv">
      <h3 class="large-h3">Education</h3>
      
        <h4 class="toggle-section"><strong>Oct. 2023 - Jul. 2024: MASt in Applied Math. Part III, University of Cambridge</strong></h4>
            <div class="toggle-content">
                <p>Funded by a 50000€ scholarship by Fundación Barrié de la Maza. Took the following courses:</p>
                <table class="subject-table">
                    <tr>
                      <td>Advanced Probability</td>
                      <td class="grade">Distinction</td>
                    </tr>
                    <tr>
                      <td>Statistical Learning in Practice</td>
                      <td class="grade">Distinction</td>
                    </tr>
                    <tr>
                      <td>Advanced Financial Models</td>
                      <td class="grade">Distinction</td>
                    </tr>
                    <tr>
                        <td>Information Theory</td>
                        <td class="grade">Distinction</td>
                      </tr>
                    <tr>
                      <td>Stochastic Calculus and Applications</td>
                      <td class="grade">Merit</td>
                    </tr>
                                        <tr>
                      <td>Modern Statistical Methods</td>
                      <td class="grade">Merit</td>
                    </tr>
                  </table>
                  <p>Overall Grade: Merit.</p>
            </div>

            <h4 class="toggle-section"><strong>Sep. 2019 - Jul. 2023: Bachelor’s degree in Mathematics, Universidade de Santiago de Compostela</strong></h4>
            <div class="toggle-content">
            <h3 class="toggle-section">1st Year</h3>
                    <div class="toggle-content">
                    <table class="subject-table">
                        <tr>
                        <td>Elements of Probability and Statistics</td>
                        <td class="grade">9.1</td>
                        </tr>
                        <tr>
                        <td>Basic Biology</td>
                        <td class="grade">9.3</td>
                        </tr>
                        <tr>
                        <td>Computer Science</td>
                        <td class="grade">10.0</td>
                        </tr>
                        <tr>
                        <td>Continuity and Derivability of One Real Variable</td>
                        <td class="grade">9.7 (H)</td>
                        </tr>
                        <tr>
                        <td>Introduction to Mathematical Analysis</td>
                        <td class="grade">10.0 (H)</td>
                        </tr>
                        <tr>
                        <td>Vector Spaces and Matrix Calculus</td>
                        <td class="grade">10.0 (H)</td>
                        </tr>
                        <tr>
                        <td>Mathematical Language, Sets and Numbers</td>
                        <td class="grade">9.6 (H)</td>
                        </tr>
                        <tr>
                        <td>Integration of One Real Variable Functions</td>
                        <td class="grade">8.8</td>
                        </tr>
                        <tr>
                        <td>Basic Chemistry</td>
                        <td class="grade">5.1</td>
                        </tr>
                        <tr>
                        <td>Topology of Euclidian Spaces</td>
                        <td class="grade">10.0 (H)</td>
                        </tr>
                    </table>
                    </div>
                <h3 class="toggle-section">2nd Year</h3>
                    <div class="toggle-content">
                    <table class="subject-table">
                        <tr>
                        <td>Basic Physics</td>
                        <td class="grade">9.3</td>
                        </tr>
                        <tr>
                        <td>Linear and Multilinear Algebra</td>
                        <td class="grade">9.3</td>
                        </tr>
                        <tr>
                        <td>Matrix Numerical Analysis</td>
                        <td class="grade">8.6</td>
                        </tr>
                        <tr>
                        <td>Numerical Computing in One Variable</td>
                        <td class="grade">9.2</td>
                        </tr>
                        <tr>
                        <td>Curves and Surfaces</td>
                        <td class="grade">10.0</td>
                        </tr>
                        <tr>
                        <td>Differentiation of Several Real Variables Functions</td>
                        <td class="grade">10.0 (H)</td>
                        </tr>
                        <tr>
                        <td>Introduction to Ordinary Differential Equations</td>
                        <td class="grade">10.0 (H)</td>
                        </tr>
                        <tr>
                        <td>Linear and Integer Programming</td>
                        <td class="grade">9.5</td>
                        </tr>
                        <tr>
                        <td>Functional Series and Riemann Integration in Several Real Variables</td>
                        <td class="grade">10.0 (H)</td>
                        </tr>
                        <tr>
                        <td>Linear Geometry</td>
                        <td class="grade">9.4 (H)</td>
                        </tr>
                    </table>
                    </div>
                <h3 class="toggle-section">3rd Year</h3>
                    <div class="toggle-content">
                        <table class="subject-table">
                            <tr>
                            <td>Vector Calculus and Lebesgue Integration</td>
                            <td class="grade">9.8</td>
                            </tr>
                            <tr>
                            <td>Ordinary Differential Equations</td>
                            <td class="grade">10.0 (H)</td>
                            </tr>
                            <tr>
                            <td>Algebraic Equations</td>
                            <td class="grade">9.2</td>
                            </tr>
                            <tr>
                            <td>Probability and Statistics</td>
                            <td class="grade">8.4</td>
                            </tr>
                            <tr>
                            <td>Statistical Inference</td>
                            <td class="grade">8.8</td>
                            </tr>
                            <tr>
                            <td>Algebraic Structures</td>
                            <td class="grade">10.0 (H)</td>
                            </tr>
                            <tr>
                            <td>Global Theory of Surfaces</td>
                            <td class="grade">9.5</td>
                            </tr>
                            <tr>
                            <td>Numerical Methods in Optimization and Differential Equations</td>
                            <td class="grade">9.0</td>
                            </tr>
                            <tr>
                            <td>Fourier Series and Introduction to Partial Differential Equations</td>
                            <td class="grade">9.7 (H)</td>
                            </tr>
                            <tr>
                            <td>General Topology</td>
                            <td class="grade">9.8 (H)</td>
                            </tr>
                            <tr>
                            <td>Topology of Surfaces</td>
                            <td class="grade">9.3 (H)</td>
                            </tr>
                        </table>
                    </div>
                <h3 class="toggle-section">4th Year</h3>
                    <div class="toggle-content">
                    <table class="subject-table">
                        <tr>
                        <td>Mathematical Modelling</td>
                        <td class="grade">9.0</td>
                        </tr>
                        <tr>
                        <td>Complex Analysis (H)</td>
                        <td class="grade">10.0</td>
                        </tr>
                        <tr>
                        <td>Error-Correcting Codes and Cryptography</td>
                        <td class="grade">9.8 (H)</td>
                        </tr>
                        <tr>
                        <td>Functional Analysis on Hilbert's Spaces</td>
                        <td class="grade">10.0 (H)</td>
                        </tr>
                        <tr>
                        <td>Regression Models and Multivariate Analysis</td>
                        <td class="grade">7.4</td>
                        </tr>
                        <tr>
                        <td>Game Theory</td>
                        <td class="grade">9.0</td>
                        </tr>
                        <tr>
                        <td>Internships in Companies and Other Institutions</td>
                        <td class="grade">10.0</td>
                        </tr>
                        <tr>
                            <td>Artificial Neural Networks and Applications (Undergraduate Dissertation)</td>
                            <td class="grade">10.0 (H)</td>
                        </tr>
                    </table>
                    </div>
                <h3 class="toggle-section">Dissertation: Neural Networks and Applications.</h3>
                <p>(H) stands for Honours/Distinction. Overall grade: 9.4/10.</p>
            </div>
      </section>
</main>

<footer class="footer">
    <div class="container-sm">
        <div class="row">
            <div class="col" style="text-align: center">
                <span class="text-muted">
                    Credits to <a href="https://github.com/TonyLianLong/websitev2">Tony Lian</a> for a version of the source code for this website. 
                </span>
            </div>
        </div>
    </div>
</footer>

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
        </div>
                    <p class="h4 section-title mt-5">Recent Articles</p>
            <div class="article-grid">
                <div class="article-item">
                    <a href="../articles/tfg.html">
                        <img src="../imaxes/perceptron.jpg" alt="Neural Networks and Applications">
                        <div class="article-title">Neural Networks and Applications</div>
                    </a>
                </div>
                <div class="article-item">
                    <a href="../articles/nn_graph.html">
                        <img src="../imaxes/perceptron_activacion.jpg" alt="Neural Networks as Graphs">
                        <div class="article-title">Neural Networks as Graphs</div>
                    </a>
                </div>
                <div class="article-item">
                    <a href="../articles/backpropagation.html">
                        <img src="../imaxes/backpropagation.jpg" alt="Backpropagation Algorithm">
                        <div class="article-title">Backpropagation Algorithm</div>
                    </a>
                </div>
                <div class="article-item">
                    <a href="../articles/idis.html">
                        <img src="../imaxes/segmentadoauto.png" alt="Rodent Brain Segmentation">
                        <div class="article-title">Rodent Brain Segmentation</div>
                    </a>
                </div>
                <div class="article-item">
                    <a href="../articles/fft.html">
                        <img src="../imaxes/convolucion.png" alt="Fast Fourier Transform">
                        <div class="article-title">Fast Fourier Transform</div>
                    </a>
                </div>
                <div class="article-item">
                    <a href="../articles/escape_prison.html">
                        <img src="../imaxes/chessboard.png" alt="Two Prisoners and a Chessboard">
                        <div class="article-title">Two Prisoners and a Chessboard</div>
                    </a>
                </div>
            </div>

            <div class="view-all-button-container">
                <a href="../articles/" class="btn btn-primary">
                    <i class="fas fa-book-open"></i> View All Articles
                </a>
            </div>
        </div>
        <div class="col-auto d-none d-md-block text-center">
            <img class="profile-img" src="{{ '/assets/profile.jpg' | relative_url }}" />
            <div class="social-icons">
                <a href="mailto:roi.vence@gmail.com" title="Email"><i class="fas fa-envelope"></i></a>
                <a href="https://www.linkedin.com/in/roivence" title="LinkedIn"><i class="fab fa-linkedin"></i></a>
                <a href="https://github.com/RoidaVinci" title="GitHub"><i class="fab fa-github"></i></a>
            </div>
        </div>
    </div>

<footer class="footer">
    <div class="container-sm">
        <div class="row">
            <div class="col" style="text-align: center">
                <span class="text-muted small-text">
                    Different versions of this layout can be found <a href="https://github.com/TonyLianLong/websitev2">here</a> or at my <a href="https://github.com/RoidaVinci/web/">own repository</a>.
                </span>
            </div>
        </div>
    </div>
</footer>

</main>

<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css">
<style>
    .social-icons {
        margin-top: 10px;
    }
    .social-icons a {
        margin: 0 10px;
        color: #000;
        font-size: 1.5rem;
    }
    .profile-img-small, .profile-img {
        display: block;
        margin: 0 auto 10px;
    }
</style>


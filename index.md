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
        </div>
        <div class="col-auto d-none d-md-block text-center">
            <img class="profile-img" src="{{ '/assets/profile.jpg' | relative_url }}" />
            <div class="social-icons">
                <a href="mailto:roi.vence@gmail.com" title="Email"><i class="fas fa-envelope"></i></a>
                <a href="https://www.linkedin.com/in/roivence" title="LinkedIn"><i class="fab fa-linkedin"></i></a>
                <a href="https://github.com/RoidaVinci" title="GitHub"><i class="fab fa-github"></i></a>
            </div>
        </div>
    
        <div class="row">
        <div class="col">
            <p class="h1 section-title" style="clear: right">Featured Articles</p>
            <div class="article-grid">
                <div class="article-item">
                    <a href="../articles/tfg.html">
                        <img src="../thumbnail/perceptron.jpg" alt="Neural Networks and Applications">
                        <div class="article-title">Neural Networks and Applications</div>
                    </a>
                </div>
                <div class="article-item">
                    <a href="../articles/nn_graph.html">
                        <img src="../thumbnail/perceptron_activacion.jpg" alt="Neural Networks as Graphs">
                        <div class="article-title">Neural Networks as Graphs</div>
                    </a>
                </div>
                <div class="article-item">
                    <a href="../articles/backpropagation.html">
                        <img src="../thumbnail/backpropagation.jpg" alt="Backpropagation Algorithm">
                        <div class="article-title">Backpropagation Algorithm</div>
                    </a>
                </div>
                <div class="article-item">
                    <a href="../articles/idis.html">
                        <img src="../thumbnail/segmentadoauto.png" alt="Rodent Brain Segmentation">
                        <div class="article-title">Rodent Brain Segmentation</div>
                    </a>
                </div>
                <div class="article-item">
                    <a href="../articles/fft.html">
                        <img src="../thumbnail/convolucion.jpg" alt="Fast Fourier Transform">
                        <div class="article-title">Fast Fourier Transform</div>
                    </a>
                </div>
                <div class="article-item">
                    <a href="../articles/escape_prison.html">
                        <img src="../thumbnail/chessboard.png" alt="Two Prisoners and a Chessboard">
                        <div class="article-title">Two Prisoners and a Chessboard</div>
                    </a>
                </div>
            </div>
            <div class="view-all-button-container">
                <a href="../articles.md" class="btn btn-primary view-all-btn">
                    <i class="fas fa-book-open"></i> View All Articles
                </a>
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
    
    .article-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr); /* Three articles per row */
        gap: 20px; /* Space between articles */
        margin-bottom: 20px;
    }

    .article-item {
        position: relative;
        overflow: hidden;
        transition: transform 0.3s ease, box-shadow 0.3s ease;
        aspect-ratio: 1; /* Keep articles square */
    }

    .article-item:hover {
        transform: scale(1.05);
        box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
    }

    .article-item img {
        width: 100%;
        height: 100%;
        object-fit: contain; /* Ensure the image fits within the container */
    }

    .article-title {
        position: absolute;
        bottom: 0;
        width: 100%;
        background-color: rgba(0, 0, 0, 0.7);
        color: white;
        text-align: center;
        padding: 10px 0;
        font-size: 1em;
        transition: background-color 0.3s ease;
    }

    .article-item:hover .article-title {
        background-color: rgba(0, 0, 0, 0.9);
    }

    .view-all-button-container {
        display: flex;
        justify-content: center;
    }

    .view-all-btn {
        width: 60%; /* Same width as three articles */
        text-align: center;
    }
</style>

---
layout: default
title: "Roi Vence Personal Website"
permalink: /article/
---

<main role="main" class="container-sm" style="max-width: 1080px">
    <div class="row">
        <div class="col">
            <p class="h1 section-title" style="clear: right">Articles</p>
            <div class="article-grid">
                <div class="article-item">
                    <a href="../articles/tfg.html">
                        <img src="../imaxes/tfg_thumbnail.jpg" alt="Neural Networks and Applications">
                        <div class="article-title">Neural Networks and Applications</div>
                    </a>
                </div>
                <div class="article-item">
                    <a href="../articles/nn_graph.html">
                        <img src="../imaxes/nn_graph_thumbnail.jpg" alt="Neural Networks as Graphs">
                        <div class="article-title">Neural Networks as Graphs</div>
                    </a>
                </div>
                <div class="article-item">
                    <a href="../articles/backpropagation.html">
                        <img src="../imaxes/backpropagation_thumbnail.jpg" alt="Backpropagation Algorithm">
                        <div class="article-title">Backpropagation Algorithm</div>
                    </a>
                </div>
                <div class="article-item">
                    <a href="../articles/idis.html">
                        <img src="../imaxes/idis_thumbnail.jpg" alt="Rodent Brain Segmentation">
                        <div class="article-title">Rodent Brain Segmentation</div>
                    </a>
                </div>
                <div class="article-item">
                    <a href="../articles/fft.html">
                        <img src="../imaxes/fft_thumbnail.jpg" alt="Fast Fourier Transform">
                        <div class="article-title">Fast Fourier Transform</div>
                    </a>
                </div>
                <div class="article-item">
                    <a href="../articles/escape_prison.html">
                        <img src="../imaxes/escape_prison_thumbnail.jpg" alt="Two Prisoners and a Chessboard">
                        <div class="article-title">Two Prisoners and a Chessboard</div>
                    </a>
                </div>
                <div class="article-item">
                    <a href="../articles/no_middle_points.html">
                        <img src="../imaxes/no_middle_points_thumbnail.jpg" alt="Uncountable Set with no Middle Points">
                        <div class="article-title">Uncountable Set with no Middle Points</div>
                    </a>
                </div>
            </div>
        </div>
    </div>
</main>
<style>
    .article-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr); /* Tres artículos por línea */
        gap: 20px; /* Espacio entre los artículos */
    }

    .article-item {
        position: relative;
        overflow: hidden;
        transition: transform 0.3s ease, box-shadow 0.3s ease;
        aspect-ratio: 1; /* Mantener los artículos cuadrados */
    }

    .article-item:hover {
        transform: scale(1.05);
        box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
    }

    .article-item img {
        width: 100%;
        height: 100%;
        object-fit: cover; /* Asegurar que la imagen cubra todo el contenedor */
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
</style>


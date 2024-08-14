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
        <div class="col-auto d-none d-md-block text-center">
            <img class="profile-img" src="{{ '/assets/profile.jpg' | relative_url }}" />
            <div class="social-icons">
                <a href="mailto:roi.vence@gmail.com" title="Email"><i class="fas fa-envelope"></i></a>
                <a href="https://www.linkedin.com/in/roivence" title="LinkedIn"><i class="fab fa-linkedin"></i></a>
                <a href="https://github.com/RoidaVinci" title="GitHub"><i class="fab fa-github"></i></a>
            </div>
        </div>
    </div>
    
    <div class="row">
        <div class="col">
            <p class="h1 section-title" style="clear: right">Featured Articles</p>
            <div class="article-grid">
                <div class="article-item">
                    <a href="articles/tfg.html">
                        <img src="thumbnail/perceptron.jpg" alt="Neural Networks and Applications">
                        <div class="article-title">Neural Networks and Applications</div>
                    </a>
                </div>
                <div class="article-item">
                    <a href="articles/nn_graph.html">
                        <img src="thumbnail/perceptron_activacion.jpg" alt="Neural Networks as Graphs">
                        <div class="article-title">Neural Networks as Graphs</div>
                    </a>
                </div>
                <div class="article-item">
                    <a href="articles/backpropagation.html">
                        <img src="thumbnail/backpropagation.jpg" alt="Backpropagation Algorithm">
                        <div class="article-title">Backpropagation Algorithm</div>
                    </a>
                </div>
                <div class="article-item">
                    <a href="articles/idis.html">
                        <img src="thumbnail/segmentadoauto.png" alt="Rodent Brain Segmentation">
                        <div class="article-title">Neural MRI Segmentation with FCNN</div>
                    </a>
                </div>
                <div class="article-item">
                    <a href="articles/fft.html">
                        <img src="thumbnail/convolucion.jpg" alt="Fast Fourier Transform">
                        <div class="article-title">Fast Fourier Transform and Convolutions</div>
                    </a>
                </div>
                <div class="article-item">
                    <a href="articles/escape_prison.html">
                        <img src="thumbnail/chessboard.png" alt="Two Prisoners and a Chessboard">
                        <div class="article-title">Two Prisoners and a Chessboard</div>
                    </a>
                </div>
            </div>
            <div class="view-all-button-container">
                <a href="article" class="btn btn-primary view-all-btn">
                    <i class="fas fa-book-open"></i> View All Articles
                </a>
            </div>
        </div>
    </div>
</main>

<!-- Include the JavaScript here -->
<script>
document.addEventListener("DOMContentLoaded", function() {
    var imgWrapper = document.querySelector('.profile-img-wrapper');
    var img = document.querySelector('.profile-img');
    var audio = new Audio('{{ "/assets/ballade1.mp3" | relative_url }}');
    var isPlaying = false;

    imgWrapper.addEventListener('click', function() {
        if (isPlaying) {
            audio.pause();
            imgWrapper.classList.remove('playing');
        } else {
            audio.play();
            imgWrapper.classList.add('playing');
        }
        isPlaying = !isPlaying;
    });

    audio.addEventListener('ended', function() {
        imgWrapper.classList.remove('playing');
        isPlaying = false;
    });
});
</script>

<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css">
<style>
   /* Minimalistic circular wave animation around the profile image */
    .profile-img-wrapper {
        position: relative;
        display: inline-block;
    }

    .profile-img-wrapper img {
        display: block;
        border-radius: 50%;
    }

    .wave-animation {
        position: absolute;
        top: 50%;
        left: 50%;
        width: 100%;
        height: 100%;
        border-radius: 50%;
        transform: translate(-50%, -50%);
        pointer-events: none; /* Ensure the waves don't interfere with clicks */
    }

    .wave-animation div {
        position: absolute;
        border: 2px solid #007bff;
        opacity: 0;
        border-radius: 50%;
        animation: wave 1.5s infinite ease-out;
    }

    .wave-animation div:nth-child(2) {
        animation-delay: 0.5s;
    }

    .wave-animation div:nth-child(3) {
        animation-delay: 1s;
    }

    @keyframes wave {
        0% {
            transform: scale(0);
            opacity: 1;
        }
        100% {
            transform: scale(1.5);
            opacity: 0;
        }
    }

    /* Hide the waves by default */
    .wave-animation {
        display: none;
    }

    /* Show the waves when the music is playing */
    .playing .wave-animation {
        display: block;
    }
</style>



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
            <div class="wave-container">
                <img class="profile-img" src="{{ '/assets/profile.jpg' | relative_url }}" onclick="playMusic()" />
                <div class="waves"></div>
            </div>
            <div class="social-icons">
                <a href="mailto:roi.vence@gmail.com" title="Email"><i class="fas fa-envelope"></i></a>
                <a href="https://www.linkedin.com/in/roivence" title="LinkedIn"><i class="fab fa-linkedin"></i></a>
                <a href="https://github.com/RoidaVinci" title="GitHub"><i class="fab fa-github"></i></a>
            </div>
            <audio id="myAudio" src="assets/ballade1.mp3"></audio>
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

<!-- JavaScript for playing the music and showing waves -->
<script>
    function playMusic() {
        var audio = document.getElementById('myAudio');
        var waves = document.querySelector('.waves');
        audio.play();
        waves.classList.add('active');
        
        audio.onended = function() {
            waves.classList.remove('active');
        };
    }
</script>

<!-- CSS for the wave effect -->
<style>
    .wave-container {
        position: relative;
        width: 200px;
        height: 200px;
        margin: 0 auto 20px;
    }

    .profile-img {
        display: block;
        width: 100%;
        height: auto;
        border-radius: 50%;
        cursor: pointer;
    }

    .waves {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        border-radius: 50%;
        pointer-events: none;
        overflow: hidden;
        z-index: -1;
    }

    .waves::before, .waves::after {
        content: "";
        position: absolute;
        top: 50%;
        left: 50%;
        width: 300%;
        height: 300%;
        background: rgba(0, 123, 255, 0.5);
        border-radius: 50%;
        transform: translate(-50%, -50%) scale(0);
        animation: ripple 1.5s infinite;
        opacity: 0;
    }

    .waves::after {
        animation-delay: 0.75s;
    }

    .waves.active::before,
    .waves.active::after {
        animation: ripple 1.5s infinite;
        opacity: 1;
    }

    @keyframes ripple {
        0% {
            transform: translate(-50%, -50%) scale(0);
            opacity: 1;
        }
        100% {
            transform: translate(-50%, -50%) scale(1);
            opacity: 0;
        }
    }
</style>


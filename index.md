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
            <!-- Wrap the profile image in a div to handle the wave animation -->
            <div class="profile-img-wrapper">
                <img id="profileImg" class="profile-img" src="{{ '/assets/profile.jpg' | relative_url }}" />

                <!-- Multiple SVG Waves -->
                <svg class="wave" viewBox="0 0 300 300" width="300" height="300">
                    <path id="wavePath1" d="M120,120" fill="none" stroke="#00008B" stroke-width="2"/>
                    <path id="wavePath2" d="M120,120" fill="none" stroke="#00008B" stroke-width="2"/>
                    <path id="wavePath3" d="M120,120" fill="none" stroke="#00008B" stroke-width="2"/>
                </svg>
            </div>
            <!-- Add the audio element here -->
            <audio id="profileAudio" src="{{ '/assets/ballade1.mp3' | relative_url }}"></audio>
            
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
    const profileImg = document.getElementById('profileImg');
    const profileAudio = document.getElementById('profileAudio');
    let isPlaying = false;

    // Wave parameters
    const waves = [
        { R: 100, A: 20, n: 5, element: document.getElementById("wavePath1") },
        { R: 80, A: 15, n: 4, element: document.getElementById("wavePath2") },
        { R: 120, A: 25, n: 3, element: document.getElementById("wavePath3") }
    ];
    const points = 360;

    // Function to generate wave path
    function generateWavePath(R, A, n, element) {
        let d = "M";
        for (let i = 0; i <= points; i++) {
            let t = (i / points) * 2 * Math.PI;
            let x = (R + A * Math.sin(n * t)) * Math.cos(t) + 120;
            let y = (R + A * Math.sin(n * t)) * Math.sin(t) + 120;
            d += `${x},${y} `;
        }
        element.setAttribute("d", d);
    }

    // Initial wave path generation
    waves.forEach(wave => generateWavePath(wave.R, wave.A, wave.n, wave.element));

    // Handle image click for music and wave animation
    profileImg.addEventListener('click', function() {
        if (isPlaying) {
            profileAudio.pause();
        } else {
            profileAudio.play();
        }
        isPlaying = !isPlaying;
    });

    // Reset wave and music when the audio ends
    profileAudio.addEventListener('ended', function() {
        isPlaying = false;
    });

    // Animate wave paths by varying the radius over time
    function animateWaves() {
        if (isPlaying) {
            waves.forEach((wave, index) => {
                let newR = wave.R + 10 * Math.sin(Date.now() / 1000 + index);
                generateWavePath(newR, wave.A, wave.n, wave.element);
            });
        }
        requestAnimationFrame(animateWaves);
    }

    animateWaves();
});
</script>

<!-- CSS for styling -->
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
        border-radius: 50%; /* Ensure the image is round */
    }
    .profile-img-wrapper {
        position: relative;
        display: inline-block;
        width: 240px;
        height: 240px;
    }
    .wave {
        position: absolute;
        top: 50%;
        left: 50%;
        width: 300px;
        height: 300px;
        transform: translate(-50%, -50%);
        z-index: -1;
        pointer-events: none; /* Ensure the waves don't interfere with clicks */
    }
</style>

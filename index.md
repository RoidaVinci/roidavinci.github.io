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
            
            <div class="profile-img-wrapper">
                <img id="profileImg" class="profile-img" src="{{ '/assets/profile.jpg' | relative_url }}" />

                <svg class="wave" viewBox="0 0 300 300" width="300" height="300">
                    <path id="wavePath1" d="M150,150" fill="none" stroke="#00008B" stroke-width="2"/>
                    <path id="wavePath2" d="M150,150" fill="none" stroke="#00008B" stroke-width="2"/>
                    <path id="wavePath3" d="M150,150" fill="none" stroke="#00008B" stroke-width="2"/>
                    <path id="wavePath4" d="M150,150" fill="none" stroke="#00008B" stroke-width="1.5"/>
                    <path id="wavePath5" d="M150,150" fill="none" stroke="#00008B" stroke-width="1.5"/>
                    <path id="wavePath6" d="M150,150" fill="none" stroke="#00008B" stroke-width="1.5"/>
                    <path id="wavePath7" d="M150,150" fill="none" stroke="#00008B" stroke-width="1"/>
                    <path id="wavePath8" d="M150,150" fill="none" stroke="#00008B" stroke-width="1"/>
                    <path id="wavePath9" d="M150,150" fill="none" stroke="#00008B" stroke-width="1"/>
                </svg>
            </div>

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

<script>
document.addEventListener("DOMContentLoaded", function() {
    const profileImg = document.getElementById('profileImg');
    const profileAudio = document.getElementById('profileAudio');
    let isPlaying = false;

    const waves = [
        { R: 120, A: 10, n: 8, element: document.getElementById("wavePath1") },
        { R: 120, A: 10, n: 15, element: document.getElementById("wavePath2") },
        { R: 120, A: 10, n: 20, element: document.getElementById("wavePath3") },
        { R: 120, A: 6, n: 12, element: document.getElementById("wavePath4") },
        { R: 120, A: 6, n: 26, element: document.getElementById("wavePath5") },
        { R: 120, A: 6, n: 40, element: document.getElementById("wavePath6") },
        { R: 120, A: 2, n: 30, element: document.getElementById("wavePath7") },
        { R: 120, A: 2, n: 60, element: document.getElementById("wavePath8") },
        { R: 120, A: 2, n: 90, element: document.getElementById("wavePath9") }
    ];
    const points = 360;

    function generateWavePath(R, A, n, element, rotation=0) {
    let d = "M";
    for (let i = 0; i <= 360; i++) {
        let t = ((i / 360) * 2 * Math.PI) + rotation; 
        let x = 150 + 120 * Math.cos(t) + A * Math.sin(n * t) * Math.cos(t);
        let y = 150 + 120 * Math.sin(t) + A * Math.sin(n * t) * Math.sin(t);
        d += `${x},${y} `;
    }
    element.setAttribute("d", d);
}

    waves.forEach(wave => generateWavePath(wave.R, wave.A, wave.n, wave.element));


    profileImg.addEventListener('click', function() {
        if (isPlaying) {
            profileAudio.pause();
        } else {
            profileAudio.play();
        }
        isPlaying = !isPlaying;
    });


    profileAudio.addEventListener('ended', function() {
        isPlaying = false;
    });

    let rotation = 0
    function animateWaves() {
    if (isPlaying) {
        waves.forEach((wave, index) => {
            let rotation = rotation + 1; // Slow rotation
            generateWavePath(wave.R, wave.A, wave.n, wave.element, rotation);
        });
    }
    requestAnimationFrame(animateWaves);
    }

    animateWaves();
});
</script>

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

.profile-img-wrapper {
    position: relative;
    width: 300px; /* Set wrapper width to 300px */
    height: 300px; /* Set wrapper height to 300px */
    margin: 0 auto; /* Center the wrapper horizontally */
}

.profile-img {
    width: 240px; /* Set image width to 240px */
    height: 240px; /* Set image height to 240px */
    border-radius: 50%; /* Make the image round */
    position: absolute; /* Position it absolutely within the wrapper */
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%); /* Center the image within the wrapper */
    z-index: 0; /* Ensure the image appears on top */
}

.wave {
    position: absolute;
    top: 0;
    left: 0;
    pointer-events: none; /* Ensure the waves don't interfere with clicks */
    z-index: 1; /* Place the waves behind the image */
}

.wave path {
    transition: d 0.5s ease-in-out; /* Smooth transition for wave animation */
}

</style>

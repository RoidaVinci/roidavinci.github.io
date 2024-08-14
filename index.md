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
            <div class="profile-img-wrapper" id="profile-img-wrapper">
                <img class="profile-img" src="{{ '/assets/profile.jpg' | relative_url }}" />
                <!-- SVG Wave with multiple paths -->
                <svg class="wave" viewBox="0 0 240 240" width="300" height="300">
                    <path id="wavePath1" d="M120,120" fill="none" stroke="##00008B" stroke-width="2"/>
                    <path id="wavePath2" d="M120,120" fill="none" stroke="##00008B" stroke-width="2"/>
                    <path id="wavePath3" d="M120,120" fill="none" stroke="##00008B" stroke-width="2"/>
                </svg>
            </div>
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
    const baseR = 100; // Base radius
    const A = 20;      // Amplitude of the wave
    const n = 5;       // Number of oscillations
    const points = 360; // Number of points to calculate
    const duration = 3000; // Duration of the animation in milliseconds

    let startTime = null;

    function animateWave(time) {
        if (!startTime) startTime = time;
        let elapsed = time - startTime;
        let progress = (elapsed % duration) / duration;

        // Animate radius with different offsets
        let R1 = baseR + 20 * Math.sin(progress * 2 * Math.PI);
        let R2 = baseR + 20 * Math.sin((progress + 0.33) * 2 * Math.PI);
        let R3 = baseR + 20 * Math.sin((progress + 0.66) * 2 * Math.PI);

        function generatePath(R, pathId) {
            let d = "M";
            for (let i = 0; i <= points; i++) {
                let t = (i / points) * 2 * Math.PI;
                let x = (R + A * Math.sin(n * t)) * Math.cos(t) + 120;
                let y = (R + A * Math.sin(n * t)) * Math.sin(t) + 120;
                d += `${x},${y} `;
            }
            document.getElementById(pathId).setAttribute("d", d);
        }

        generatePath(R1, "wavePath1");
        generatePath(R2, "wavePath2");
        generatePath(R3, "wavePath3");

        requestAnimationFrame(animateWave);
    }

    requestAnimationFrame(animateWave);
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

    .profile-img-wrapper {
    position: relative;
    display: inline-block;
    width: 240px;
    height: 240px;
}

.profile-img-small,.profile-img {
    display: block;
    width: 100%;
    height: auto;
    border-radius: 50%;
    position: relative; /* Ensure the image is on top */
    z-index: 1; /* Place the image on top of the waves */
}

.wave {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: -1; /* Place the waves behind the image */
    overflow: hidden; /* Hide parts of the waves that are behind the image */
    pointer-events: none; /* Ensure the waves don't interfere with clicks */
}
    .playing .wave {
        display: block;
    }
</style>


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
                <img class="profile-img" src="{{ '/assets/profile.jpg' | relative_url }}" />
                <div class="wave-animation">
                    <svg class="wave" viewBox="0 0 120 120">
                        <path d="M10,60 Q30,20 50,60 T90,60" />
                    </svg>
                    <svg class="wave" viewBox="0 0 120 120">
                        <path d="M10,60 Q30,40 50,60 T90,60" />
                    </svg>
                    <svg class="wave" viewBox="0 0 120 120">
                        <path d="M10,60 Q30,50 50,60 T90,60" />
                    </svg>
                </div>
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
                <!-- Articles content here -->
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
        grid-column: span 3; /* Span the button across all three columns */
        text-align: center;
        margin-top: 20px;
        margin-bottom: 40px; /* Added margin to create space below the button */
    }

    .view-all-button-container .btn {
        width: 100%;
        padding: 15px 0;
        font-size: 1.2em;
    }

    /* Minimalistic sine wave animation around the profile image */
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
        width: 120%; /* Slightly larger than the image */
        height: 120%; /* Slightly larger than the image */
        border-radius: 50%;
        transform: translate(-50%, -50%);
        pointer-events: none; /* Ensure the waves don't interfere with clicks */
    }

    .wave-animation svg {
        position: absolute;
        width: 100%;
        height: 100%;
        stroke: #007bff;
        fill: none;
        stroke-width: 2;
    }

    .wave-animation svg:nth-child(1) {
        animation: wave1 2s infinite ease-in-out;
    }

    .wave-animation svg:nth-child(2) {
        animation: wave2 2s infinite ease-in-out;
    }

    .wave-animation svg:nth-child(3) {
        animation: wave3 2s infinite ease-in-out;
    }

    @keyframes wave1 {
        0% {
            transform: scale(0.9);
            opacity: 1;
        }
        50% {
            transform: scale(1.1);
            opacity: 0.5;
        }
        100% {
            transform: scale(0.9);
            opacity: 1;
        }
    }

    @keyframes wave2 {
        0% {
            transform: scale(1);
            opacity: 0.5;
        }
        50% {
            transform: scale(1.2);
            opacity: 0.3;
        }
        100% {
            transform: scale(1);
            opacity: 0.5;
        }
    }

    @keyframes wave3 {
        0% {
            transform: scale(1.1);
            opacity: 0.3;
        }
        50% {
            transform: scale(1.3);
            opacity: 0.2;
        }
        100% {
            transform: scale(1.1);
            opacity: 0.3;
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

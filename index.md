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
            <!-- Profile Image with Click Event -->
            <img id="profile-img" class="profile-img" src="{{ '/assets/profile.jpg' | relative_url }}" onclick="playMusic()" />
            <audio id="profile-audio" src="{{ '/assets/ballade1.mp3' }}" preload="auto"></audio>
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
                <!-- Your article items here -->
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
    function playMusic() {
        var audio = document.getElementById('profile-audio');
        if (audio.paused) {
            audio.play();
        } else {
            audio.pause();
            audio.currentTime = 0;
        }
    }
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
        cursor: pointer;
        transition: all 0.3s ease;
    }
    
    .profile-img:hover {
        border: 3px solid #007bff;
        border-radius: 50%;
        animation: pulse 1s infinite;
    }

    @keyframes pulse {
        0% {
            box-shadow: 0 0 0 0 rgba(0, 123, 255, 0.7);
        }
        70% {
            box-shadow: 0 0 20px 20px rgba(0, 123, 255, 0);
        }
        100% {
            box-shadow: 0 0 0 0 rgba(0, 123, 255, 0);
        }
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
</style>

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
            <a href="mailto:roi.vence@gmail.com">Email</a>    |    <a href="https://www.linkedin.com/in/roivence">LinkedIn</a>    |    <a href="https://github.com/RoidaVinci">Github</a>
        </div>
        <div class="col-auto d-none d-md-block">
            <img class="profile-img" src="{{ '/assets/profile.jpg' | relative_url }}" />
        </div>
    </div>
<footer class="footer">
    <div class="container-sm">
        <div class="row">
            <div class="col" style="text-align: center">
                <span class="text-muted">
                    Credits to <a href="https://github.com/TonyLianLong/websitev2">Tony Lian</a> for a version of the source code for this website. 
                </span>
            </div>
        </div>
    </div>
</footer>
    
Here are some articles I've written:

- [My First Article](articles/thesisnn.md)
- [My Second Article](articles/idis.md)
</main>


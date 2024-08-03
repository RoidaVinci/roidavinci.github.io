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

    
Here are some articles I've written:

- [My First Article](articles/thesisnn.md)
- [My Second Article](articles/idis.md)
</main>

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

# My CV

## Education

<h4 class="toggle-section"><strong>Oct. 2023 - Jul. 2024: MASt in Applied Math. Part III, University of Cambridge</strong></h4>
<div class="toggle-content">
  <p>Funded by a 50000€ scholarship by Fundación Barrié de la Maza. Took the following courses:</p>
  <table class="subject-table">
    <tr>
      <td>Advanced Probability</td>
      <td class="grade">Distinction</td>
    </tr>
    <tr>
      <td>Statistical Learning in Practice</td>
      <td class="grade">Distinction</td>
    </tr>
    <!-- Add more rows as needed -->
  </table>
  <p>Overall Grade: Merit.</p>
</div>

<!-- Repeat similar structure for other sections -->

<script>
document.addEventListener("DOMContentLoaded", function() {
  const toggleSections = document.querySelectorAll(".toggle-section");

  toggleSections.forEach(section => {
    section.addEventListener("click", function() {
      const content = this.nextElementSibling;
      if (content.style.display === "block") {
        content.style.display = "none";
      } else {
        content.style.display = "block";
      }
    });
  });
});
</script>


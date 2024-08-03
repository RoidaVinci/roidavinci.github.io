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

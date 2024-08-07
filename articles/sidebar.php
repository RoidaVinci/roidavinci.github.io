<?php
$dir = 'articles/'; // Directory containing your articles
$files = scandir($dir); // Get all files in the directory
?>

<div class="sidebar">
  <!-- Back Button -->
  <a href="javascript:history.back()" class="back-button">
    <i class="fas fa-arrow-left"></i> Back
  </a>
  <!-- Article List -->
  <ul class="article-list">
    <?php
    foreach ($files as $file) {
      if ($file != '.' && $file != '..' && pathinfo($file, PATHINFO_EXTENSION) == 'html') {
        $title = pathinfo($file, PATHINFO_FILENAME); // Get the file name without extension
        echo '<li><a href="' . $dir . $file . '">' . $title . '</a></li>';
      }
    }
    ?>
  </ul>
</div>

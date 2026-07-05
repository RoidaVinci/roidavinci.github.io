# roivence.dev — personal website

Personal website and article collection of Roi Vence Nogueira, built with
[Jekyll](https://jekyllrb.com/).

## Local development

```bash
bundle install
bundle exec jekyll serve
# open http://localhost:4000
```

## Project structure

```
_config.yml          Site metadata, collections, plugins
_data/
  navigation.yml     Header navigation links
  social.yml         Social links (footer + home page)
_layouts/
  default.html       Base skeleton (head, header, footer)
  page.html          Simple prose page
  article.html       Article page (title, lead, tags, back links)
_includes/           head, header, footer, article card, SVG icon sprite
_articles/           One file per article (a Jekyll collection)
assets/
  css/main.scss      Single stylesheet — design tokens + components
  js/                theme.js, mathjax-config.js, main.js
  img/               Images (thumbnails under img/thumbnails/)
  fonts/             Self-hosted Computer Modern
  audio/, docs/      Music easter egg, PDFs
```

## Adding an article

Create `_articles/my-article.html` (or `.md`) with front matter:

```yaml
---
title: My Article
description: One-sentence summary shown on cards and in search results.
thumbnail: /assets/img/thumbnails/my-article.jpg
tags: [mathematics]
math: true      # only if the article uses LaTeX
featured: true  # show on the home page
order: 9        # position in listings
---
```

The article automatically appears on `/articles/` (and on the home page if
`featured`). MathJax is only loaded on pages with `math: true`.

## Adding a new content type

Add a collection in `_config.yml` (e.g. `projects`), create `_projects/`,
and loop over `site.projects` in a page — the card include is reusable.

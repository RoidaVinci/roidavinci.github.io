# roivence.dev — personal website

Personal website and article collection of Roi Vence Nogueira, built with
[Jekyll](https://jekyllrb.com/).

## Deployment

The site builds with Jekyll 4 via GitHub Actions (`.github/workflows/deploy.yml`).
In the repository settings, set **Pages → Source → GitHub Actions** once. The
workflow injects the correct `baseurl` automatically, so it works both as a
project site (`/web/`) and behind a custom domain.

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
  article.html       Article page (title, date, lead, tags, back links)
  visualization.html Interactive visualization page (loads the viz toolkit)
_includes/           head, header, footer, article card, SVG icon sprite
_articles/           One file per article (a Jekyll collection)
_visualizations/     One file per interactive visualization (a Jekyll collection)
chinese/             Chinese reader (see below)
script/              Build scripts for generated assets
assets/
  css/main.scss      Single stylesheet — design tokens + components
  js/                theme.js, mathjax-config.js, main.js
  js/viz/            Visualization toolkit (see below)
  js/chinese/        Chinese reader (see below)
  data/              Generated data assets (CC-CEDICT)
  img/               Images (thumbnails under img/thumbnails/)
  fonts/             Self-hosted Computer Modern
  docs/              PDFs
```

## Adding an article

Create `_articles/my-article.html` (or `.md`) with front matter:

```yaml
---
title: My Article
description: One-sentence summary shown on cards and in search results.
thumbnail: /assets/img/thumbnails/my-article.jpg
tags: [mathematics]
math: true        # only if the article uses LaTeX
featured: true    # show on the home page
order: 9          # position in listings
date: 2024-01-15  # shown on cards and on the article page
---
```

The article automatically appears on `/articles/` (and on the home page if
`featured`). MathJax is only loaded on pages with `math: true`.

## Adding an interactive visualization

The visualization toolkit (`assets/js/viz/`) is a small set of dependency-free
ES modules for scientific and mathematical visualizations:

- `toolkit.js` — tool registry + `data-viz` mounting, theme bridge (resolves the
  site's CSS design tokens for canvas code, follows the dark-mode toggle),
  colorblind-safe categorical/sequential palettes, and a schema-driven control
  panel builder.
- `surface3d.js` — canvas 3D renderer for scalar fields `z = f(x, y)`: shaded
  colormapped mesh, orbit camera (pointer/wheel/pinch/keyboard), overlay trails
  and particles, ray-marched click picking.
- `plot2d.js` — `Heatmap` (contour-band top view with picking) and `LinePlot`
  (multi-series chart with crosshair + tooltip).
- `landscapes.js`, `optimizers.js`, `waves.js` — pure-data registries (loss
  landscapes, optimization algorithms, Fourier waveforms) consumed by the
  tools; extending a tool usually means appending one entry to one of these.
- `tools/<name>.js` — one module per tool; it calls `register("<name>", factory)`.

To add a tool: write `assets/js/viz/tools/my-tool.js`, import it from
`assets/js/viz/main.js`, create `_visualizations/my-tool.html` with the usual
front matter (title, description, thumbnail, tags, date, order) and a
`<div class="viz-host" data-viz="my-tool"></div>` mount point. It appears on
`/visualizations/` automatically. New landscapes, optimizers or waveforms are
single entries in their registry files — the UI picks them up automatically.
Current tools: `gradient-descent` (optimizer race on 3D/contour loss
landscapes) and `fourier-series` (epicycle Fourier series builder).

## Adding a new content type

Add a collection in `_config.yml` (e.g. `projects`), create `_projects/`,
and loop over `site.projects` in a page — the card include is reusable.

## The Chinese reader

`/chinese/` annotates pasted Chinese text: each word is set over its pinyin and
its gloss, hovering a word opens its dictionary entry, and selected words export
as `汉字; pīnyīn - english`. It is dependency-free like the rest of the site and
runs entirely in the browser — nothing is sent anywhere.

```
chinese/index.html          The page
_sass/chinese.scss          Styles (imported from assets/css/main.scss)
assets/js/chinese/
  main.js                   Controller: state, controls, persistence
  dict.js                   Fetch, decompress and index the dictionary
  segment.js                Word segmentation
  pinyin.js                 Numbered tones → tone marks
  gloss.js                  Sense cleanup shared by renderer and exporter
  render.js                 Token stacks and the definition card
  export.js                 .txt / .tsv output
assets/data/cedict.tsv.gz   Generated — see script/build-dict.mjs
```

**Segmentation.** Chinese has no spaces, so the text is split before it can be
looked up. Among all the ways of covering a run of characters with CC-CEDICT
headwords, the reader takes the one of highest total corpus log-probability,
found by dynamic programming over the run; the counts come from jieba's
frequency table, which `build-dict.mjs` joins onto the dictionary. The
vocabulary is CC-CEDICT and nothing else, so every word shown has an entry
behind it and a hover never comes up empty. Characters no headword covers are
emitted singly and looked up one at a time.

**Regenerating the dictionary.**

```
node script/build-dict.mjs          # downloads CC-CEDICT and jieba's counts
node script/build-dict.mjs --help   # see the flags for local source files
```

The output is a single gzipped TSV of about 3.6 MB, fetched only when the reader
is first used and then held in the Cache API. Splitting it into a small index
(headword, reading, frequency) plus a lazily fetched gloss file would cut time
to first render by roughly three; it is not worth the complexity yet.

**Licensing.** Dictionary data is [CC-CEDICT](https://cc-cedict.org/), used
under CC BY-SA; word frequencies come from
[jieba](https://github.com/fxsjy/jieba), MIT. Both are credited on the page.
The site's own MIT licence covers the code, not the dictionary file.

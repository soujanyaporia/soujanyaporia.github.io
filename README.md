# Soujanya Poria

The website is available at <https://soujanyaporia.github.io>.

## Design

A standalone Jekyll site with no theme or shared stylesheet. It is set like the
front matter of a monograph: one serif (Newsreader) for reading and titling, a
quiet sans (Instrument Sans) for dates and labels, ink on warm paper, and an
oxblood accent.

- `assets/css/site.css` — the whole stylesheet, plain CSS. Colours, type sizes
  and widths are custom properties at the top of the file. It is deliberately
  not named `style.css`: the GitHub Pages default theme emits a file at that
  path and can overwrite it.
- `assets/js/site.js` — the phone menu.
- `assets/js/publications.js` — publication search, subsets, topics, year jump,
  abstracts, and BibTeX with copy.

Three components carry every page:

- `title-page` — the home introduction, with the portrait set as a plate.
- `folio` — a section whose `h2` sits in the left margin beside its body.
- `activity-list` / `activity-record` — a ledger row: date or venue in a narrow
  column, the entry beside it. `career-list`, `news-ledger` and
  `direction-index` only change the width of that column.

```html
<section class="folio" aria-labelledby="teaching">
  <h2 class="folio__title" id="teaching">Teaching</h2>
  <div class="folio__body">
    <div class="activity-list">
      <article class="activity-record">
        <span>NTU Singapore</span>
        <h3>Course title</h3>
        <p>One line of detail.</p>
      </article>
    </div>
  </div>
</section>
```

## Content

- Home: `index.md`. Research and activities: `_pages/`.
- Publications: `_data/publications.yml`. Citation counts come from
  `_data/scholar.yml`, refreshed with:

```sh
bundle exec ruby scripts/sync_scholar.rb \
  --profile oS6gRc4AAAAJ \
  --publications _data/publications.yml \
  --output _data/scholar.yml \
  --min-year 2019
```

- Menu: `_data/navigation.yml`. Profile links: `author.links` in `_config.yml`.

## Checks

The deploy workflow runs these before publishing:

```sh
bundle exec ruby scripts/sync_scholar_test.rb
node --test scripts/publications_bibtex.test.cjs
bundle exec jekyll build
bundle exec ruby scripts/audit_site.rb _site
bundle exec ruby scripts/audit_content.rb _site
```

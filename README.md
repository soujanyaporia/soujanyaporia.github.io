# Soujanya Poria

The website is available at <https://soujanyaporia.github.io>.

## Design

The site is set like the front matter of a monograph: one serif for reading and
titling, a quiet sans for dates and labels, ink on warm paper, and an oxblood
accent. Palette, type scale and widths are passed to `declare-design-core`
through `declare-customize` in `assets/css/style.scss`; the local stylesheet
only composes layout.

Three local components carry every page:

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

## Page Introductions

Inner pages can define a full-width introduction and optional actions in front
matter. The layout places this composition above the content/section-menu
split, so the introduction can use the available article width without
weakening the sticky navigation.

```yml
intro: "A concise orientation to the page."
intro_actions:
  - label: "Research"
    url: "/research/"
    style: "primary"
    icon: "fa-solid fa-compass"
```

Supported action styles are `primary` and `secondary`. Spacing, responsive
stacking, typography, and controls are owned by `declare-design-core`; page
files provide content only.

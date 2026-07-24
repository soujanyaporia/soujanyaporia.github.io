# Soujanya Poria

The website is available at <https://soujanyaporia.github.io>.

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

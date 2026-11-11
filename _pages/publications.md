---
layout: single
title: "Publications"
permalink: /publications/
body_class: "publications-page"
intro: "More than 55,000 citations and an h-index of 90 on <a href=\"https://scholar.google.co.in/citations?hl=en&user=oS6gRc4AAAAJ&view_op=list_works\">Google Scholar</a>, as of 30 October 2026."
---

{% assign sorted_pubs = site.data.publications | sort: "year" | reverse %}
{% assign grouped = sorted_pubs | group_by: "year" %}

<div class="pub-archive" data-publication-archive>
  <section class="pub-tools" aria-label="Find publications">
    <label class="pub-search">
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true"><circle cx="8" cy="8" r="5.25"/><path d="m12 12 3.5 3.5"/></svg>
      <input type="search" data-pub-search placeholder="Search titles, authors, venues, abstracts" aria-label="Search publications" autocomplete="off">
    </label>
    <div class="pub-tools__row">
      <div class="pub-filters" role="group" aria-label="Publication subsets">
        <button class="chip" type="button" data-pub-filter="all" aria-pressed="true">All</button>
        <button class="chip" type="button" data-pub-filter="hot" aria-pressed="false">Highly cited</button>
        <button class="chip" type="button" data-pub-filter="pdf" aria-pressed="false">Has PDF</button>
      </div>
      <label class="pub-year-jump">
        <span>Jump to</span>
        <select data-year-jump aria-label="Jump to publication year">
          <option value="">Year</option>
          {% for group in grouped %}<option value="pub-year-{{ group.name }}">{{ group.name }}</option>{% endfor %}
        </select>
      </label>
      <span class="pub-count" data-pub-count role="status" aria-live="polite">{{ sorted_pubs | size }} papers</span>
    </div>
    <div class="pub-topics" data-pub-topics>
      <div class="pub-topics__list" data-pub-categories></div>
      <button class="pub-topics__more" type="button" data-pub-topics-toggle aria-expanded="false" hidden>All topics</button>
    </div>
  </section>

  <p class="pub-empty" data-pub-empty hidden>No papers match. Try a broader search or clear the filters.</p>

  {% for group in grouped %}
  <section class="folio pub-year" id="pub-year-{{ group.name }}" data-pub-year aria-labelledby="pub-year-{{ group.name }}-title">
    <h2 class="folio__title pub-year__title" id="pub-year-{{ group.name }}-title">{{ group.name }}</h2>
    <div class="folio__body">
      {% for pub in group.items %}
      {% assign category_string = pub.categories | join: "," %}
      {% assign searchable = pub.title | append: " " | append: pub.scholar_title | append: " " | append: pub.authors | append: " " | append: pub.venue | append: " " | append: pub.year | append: " " | append: pub.abstract | append: " " | append: category_string | downcase %}
      {% assign scholar_paper = site.data.scholar.papers[pub.title] %}
      {% if scholar_paper %}
        {% assign citation_count = scholar_paper.citations %}
        {% assign scholar_url = scholar_paper.scholar_url %}
      {% else %}
        {% assign citation_count = pub.citation_count %}
        {% assign scholar_url = pub.scholar_url %}
      {% endif %}
      {% assign is_hot = false %}{% if citation_count and citation_count >= 50 %}{% assign is_hot = true %}{% endif %}
      <article class="pub-card" data-year="{{ pub.year }}" data-categories="{{ category_string | escape }}" data-has-pdf="{% if pub.pdf %}true{% else %}false{% endif %}" data-hot="{{ is_hot }}" data-searchable="{{ searchable | escape }}">
        <h3 class="pub-title">{% if pub.publication_url %}<a href="{{ pub.publication_url }}" target="_blank" rel="noopener">{{ pub.title }}</a>{% else %}{{ pub.title }}{% endif %}</h3>
        <p class="pub-authors">
          {% assign author_list = pub.authors | split: ", " %}
          {% for author in author_list %}
            {% assign author_lower = author | downcase %}
            {% if author_lower contains "poria" %}<strong>{{ author }}</strong>{% else %}{{ author }}{% endif %}{% unless forloop.last %}, {% endunless %}
          {% endfor %}
        </p>
        <p class="pub-meta">
          {% if pub.venue %}<span class="pub-venue">{{ pub.venue }}</span>{% endif %}
          {% if pub.award %}<span class="pub-award">{{ pub.award }}</span>{% endif %}
          {% if is_hot %}<span class="pub-citations" title="Google Scholar citations">{{ citation_count }} citations</span>{% endif %}
        </p>
        <div class="pub-links" aria-label="Links for {{ pub.title | escape }}">
          {% if pub.pdf %}<a href="{{ pub.pdf }}" target="_blank" rel="noopener">PDF</a>{% endif %}
          {% if pub.code %}<a href="{{ pub.code }}" target="_blank" rel="noopener">Code</a>{% endif %}
          {% if pub.project %}<a href="{{ pub.project }}" target="_blank" rel="noopener">Project</a>{% endif %}
          {% if scholar_url %}<a href="{{ scholar_url }}" target="_blank" rel="noopener">Scholar</a>{% else %}<a href="https://scholar.google.com/scholar?q={{ pub.title | url_encode }}" target="_blank" rel="noopener">Scholar</a>{% endif %}
          {% if pub.abstract %}<button class="pub-abstract-toggle" type="button" aria-expanded="false" aria-controls="abs-{{ group.name }}-{{ forloop.index }}">Abstract</button>{% endif %}
          <button class="pub-bibtex-local" type="button" aria-expanded="false" aria-controls="bib-{{ group.name }}-{{ forloop.index }}" aria-label="Show BibTeX for {{ pub.title | escape }}" title="Generated from the displayed archive metadata" data-bibtex-title="{{ pub.title | escape }}" data-bibtex-authors="{{ pub.authors | escape }}" data-bibtex-venue="{{ pub.venue | escape }}" data-bibtex-year="{{ pub.year }}" data-bibtex-url="{{ pub.publication_url | escape }}">BibTeX</button>
          {% for category in pub.categories %}<button class="pub-topic" type="button" data-pub-category="{{ category | escape }}" aria-pressed="false">{{ category }}</button>{% endfor %}
        </div>
        {% if pub.abstract %}<p class="pub-abstract" id="abs-{{ group.name }}-{{ forloop.index }}" hidden>{{ pub.abstract }}</p>{% endif %}
        <div class="pub-bibtex-panel" id="bib-{{ group.name }}-{{ forloop.index }}" role="region" aria-label="BibTeX for {{ pub.title | escape }}" hidden>
          <button class="copy-button" type="button" data-bibtex-copy aria-label="Copy BibTeX for {{ pub.title | escape }}" title="Copy BibTeX"></button>
          <pre data-bibtex-code tabindex="0" aria-label="BibTeX citation"></pre>
          <p class="pub-bibtex-panel__status" data-bibtex-status role="status" aria-live="polite"></p>
        </div>
      </article>
      {% endfor %}
    </div>
  </section>
  {% endfor %}

  {% if site.data.scholar.last_verified %}
  <p class="pub-verified">Citation counts verified against Google Scholar on {{ site.data.scholar.last_verified | date: "%B %-d, %Y" }}.</p>
  {% endif %}
</div>

<script src="{{ '/assets/js/publications.js' | relative_url }}?v={{ site.time | date: '%s' }}" defer></script>

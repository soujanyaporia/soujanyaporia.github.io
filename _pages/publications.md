---
layout: single
title: "Publications"
permalink: /publications/
author_profile: true
toc: false
---

{% assign sorted_pubs = site.data.publications | sort: "year" | reverse %}
{% assign grouped = sorted_pubs | group_by: "year" %}

<div class="publication-archive" data-publication-archive>
  <section class="pub-toolbar pub-toolbar--sticky" aria-label="Publication filters">
    <input type="search" class="pub-search" data-pub-search placeholder="Search by title, author, venue, topic, or abstract" aria-label="Search publications">
    <div class="pub-toolbar__row">
      <div class="pub-filter-row" aria-label="Publication subsets">
        <button class="pub-filter active" type="button" data-pub-filter="all" aria-pressed="true">All</button>
        <button class="pub-filter" type="button" data-pub-filter="hot" aria-pressed="false">Highly cited ★</button>
        <button class="pub-filter" type="button" data-pub-filter="pdf" aria-pressed="false">Has PDF</button>
      </div>
      <label class="pub-year-jump">
        <span class="pub-year-jump__label">Year</span>
        <select class="pub-year-select" data-year-jump aria-label="Jump to publication year">
          <option value="">All years</option>
          {% for group in grouped %}<option value="pub-year-{{ group.name }}">{{ group.name }}</option>{% endfor %}
        </select>
      </label>
      <span class="pub-count-display" data-pub-count>{{ sorted_pubs | size }} papers</span>
    </div>
    <div class="pub-cat-scroller" data-pub-category-scroller aria-label="Publication topics">
      <button class="pub-cat-scroll" type="button" data-pub-scroll="previous" aria-label="Previous publication topics" title="Previous topics" hidden><i class="fa-solid fa-chevron-left" aria-hidden="true"></i></button>
      <div class="pub-cat-row" data-pub-categories></div>
      <button class="pub-cat-scroll" type="button" data-pub-scroll="next" aria-label="More publication topics" title="More topics" hidden><i class="fa-solid fa-chevron-right" aria-hidden="true"></i></button>
    </div>
    {% if site.data.scholar.last_verified %}
    <span class="data-verification">Citations verified {{ site.data.scholar.last_verified | date: "%B %-d, %Y" }} against Google Scholar</span>
    {% endif %}
  </section>

  {% for group in grouped %}
  <h2 class="pub-year-heading" id="pub-year-{{ group.name }}" data-pub-year-heading>{{ group.name }}</h2>

  {% for pub in group.items %}
  {% assign category_string = pub.categories | join: "," %}
  {% assign searchable = pub.title | append: " " | append: pub.authors | append: " " | append: pub.venue | append: " " | append: pub.year | append: " " | append: pub.abstract | append: " " | append: category_string | downcase %}
  {% assign scholar_paper = site.data.scholar.papers[pub.title] %}
  {% if scholar_paper %}
    {% assign citation_count = scholar_paper.citations %}
    {% assign scholar_url = scholar_paper.scholar_url %}
  {% else %}
    {% assign citation_count = pub.citation_count %}
    {% assign scholar_url = pub.scholar_url %}
  {% endif %}
  <article class="pub-card" data-year="{{ pub.year }}" data-categories="{{ category_string | escape }}" data-has-pdf="{% if pub.pdf %}true{% else %}false{% endif %}" data-hot="{% if citation_count and citation_count > 50 %}true{% else %}false{% endif %}" data-searchable="{{ searchable | escape }}">
    <div class="pub-card__top">
      <div>
        <div class="pub-title-line">
          <h3 class="pub-title">{{ pub.title }}</h3>
          {% if citation_count and citation_count > 50 %}<span class="pub-hot-star" title="{{ citation_count }} Google Scholar citations" aria-label="Highly cited, {{ citation_count }} Google Scholar citations">★</span>{% endif %}
        </div>
        <p class="pub-authors">
          {% assign author_list = pub.authors | split: ", " %}
          {% for author in author_list %}
            {% assign author_lower = author | downcase %}
            {% if author_lower contains "poria" %}<strong>{{ author }}</strong>{% else %}{{ author }}{% endif %}{% unless forloop.last %}, {% endunless %}
          {% endfor %}
        </p>
      </div>
      <div class="pub-links" aria-label="Links for {{ pub.title | escape }}">
        {% if pub.publication_url %}<a class="pub-link-primary" href="{{ pub.publication_url }}" target="_blank" rel="noopener">Paper</a>{% endif %}
        {% if pub.pdf %}<a href="{{ pub.pdf }}" target="_blank" rel="noopener">PDF</a>{% endif %}
        {% if pub.code %}<a href="{{ pub.code }}" target="_blank" rel="noopener">Code</a>{% endif %}
        {% if pub.project %}<a href="{{ pub.project }}" target="_blank" rel="noopener">Project</a>{% endif %}
        {% if scholar_url %}<a href="{{ scholar_url }}" target="_blank" rel="noopener">Scholar</a>{% else %}<a href="https://scholar.google.com/scholar?q={{ pub.title | url_encode }}" target="_blank" rel="noopener">Scholar</a>{% endif %}
        {% if pub.abstract %}<button class="pub-abstract-toggle" type="button" aria-expanded="false" aria-controls="abs-{{ group.name }}-{{ forloop.index }}">Abstract</button>{% endif %}
      </div>
    </div>
    <div class="pub-meta">
      {% if pub.venue %}<span class="pub-venue">{{ pub.venue }}</span>{% endif %}
      <span class="pub-year-tag">{{ pub.year }}</span>
      {% if citation_count and citation_count > 50 %}<span class="pub-citation-badge">{{ citation_count }} citations</span>{% endif %}
      {% if pub.award %}<span class="pub-award">{{ pub.award }}</span>{% endif %}
    </div>
    {% if pub.categories %}
    <div class="pub-cats" aria-label="Topics">
      {% for category in pub.categories %}<button class="pub-cat-badge" type="button" data-pub-category="{{ category | escape }}" aria-pressed="false">{{ category }}</button>{% endfor %}
    </div>
    {% endif %}
    {% if pub.abstract %}<div class="pub-abstract" id="abs-{{ group.name }}-{{ forloop.index }}">{{ pub.abstract }}</div>{% endif %}
  </article>
  {% endfor %}
  {% endfor %}
</div>

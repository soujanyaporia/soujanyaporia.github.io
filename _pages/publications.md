---
layout: single
title: "Publications"
permalink: /publications/
author_profile: true
toc: true
toc_label: "Years"
---

{% assign sorted_pubs = site.data.publications | sort: "year" | reverse %}
{% assign grouped = sorted_pubs | group_by: "year" %}

<div class="pub-toolbar">
  <input type="text" class="pub-search" id="pubSearch" placeholder="Search by title, author, venue, or year..." onkeyup="filterPubs()">
  <button class="pub-filter active" type="button" data-filter="all" onclick="setPubFilter('all', this)">All</button>
  <button class="pub-filter" type="button" data-filter="pdf" onclick="setPubFilter('pdf', this)">Has PDF</button>
</div>

{% for group in grouped %}
<h2 class="pub-year-heading" id="{{ group.name }}">{{ group.name }}</h2>

{% for pub in group.items %}
<div class="pub-card" data-has-pdf="{% if pub.pdf %}true{% else %}false{% endif %}" data-searchable="{{ pub.title | downcase }} {{ pub.authors | downcase }} {{ pub.venue | downcase }} {{ pub.year }}">
  {% if pub.abstract %}
    <div class="pub-title clickable" onclick="toggleAbstract('abs-{{ group.name }}-{{ forloop.index }}')">{{ pub.title }}</div>
  {% else %}
    <div class="pub-title">{{ pub.title }}</div>
  {% endif %}
  <div class="pub-authors">
    {% assign author_list = pub.authors | split: ", " %}
    {% for author in author_list %}
      {% assign a = author | downcase %}
      {% if a contains "poria" %}
        <strong>{{ author }}</strong>{% unless forloop.last %}, {% endunless %}
      {% else %}
        {{ author }}{% unless forloop.last %}, {% endunless %}
      {% endif %}
    {% endfor %}
  </div>
  <div class="pub-meta">
    {% assign venue_text = pub.venue %}
    {% if pub.venue contains "arXiv:" %}
      {% assign arxiv_parts = pub.venue | split: "arXiv:" %}
      {% assign arxiv_id = arxiv_parts[1] | strip %}
      <span class="pub-venue">arXiv preprint</span>
    {% else %}
      <span class="pub-venue">{{ pub.venue }}</span>
    {% endif %}
    <span class="pub-year-tag">{{ pub.year }}</span>
    <span class="pub-links">
      {% if pub.abstract %}
        <button class="pub-abstract-toggle" onclick="event.stopPropagation(); toggleAbstract('abs-{{ group.name }}-{{ forloop.index }}')">Abstract</button>
      {% endif %}
      {% if pub.pdf %}
        <a href="{{ pub.pdf }}" target="_blank" rel="noopener">PDF</a>
      {% endif %}
      {% if pub.publication_url %}
        <a href="{{ pub.publication_url }}" target="_blank" rel="noopener">Publication</a>
      {% endif %}
      {% if pub.venue contains "arXiv:" %}
        {% unless pub.publication_url contains "arxiv.org" %}
          <a href="https://arxiv.org/abs/{{ arxiv_id }}" target="_blank" rel="noopener">arXiv</a>
        {% endunless %}
      {% endif %}
      {% if pub.scholar_url %}
        <a href="{{ pub.scholar_url }}" target="_blank" rel="noopener">Scholar</a>
      {% else %}
        <a href="https://scholar.google.com/scholar?q={{ pub.title | url_encode }}" target="_blank" rel="noopener">Scholar</a>
      {% endif %}
      {% if pub.code %}
        <a href="{{ pub.code }}" target="_blank" rel="noopener">Code</a>
      {% endif %}
      {% if pub.project %}
        <a href="{{ pub.project }}" target="_blank" rel="noopener">Project</a>
      {% endif %}
    </span>
  </div>
  {% if pub.abstract %}
    <div class="pub-abstract" id="abs-{{ group.name }}-{{ forloop.index }}">
      {{ pub.abstract }}
    </div>
  {% endif %}
</div>
{% endfor %}
{% endfor %}

<script>
function toggleAbstract(id) {
  var el = document.getElementById(id);
  if (el) el.classList.toggle('show');
}

function filterPubs() {
  var q = document.getElementById('pubSearch').value.toLowerCase();
  var cards = document.querySelectorAll('.pub-card');
  var headings = document.querySelectorAll('.pub-year-heading');
  var filter = document.body.getAttribute('data-pub-filter') || 'all';

  cards.forEach(function(c) {
    var matchesQuery = c.getAttribute('data-searchable').includes(q);
    var matchesFilter = filter === 'all' || c.getAttribute('data-has-pdf') === 'true';
    c.style.display = matchesQuery && matchesFilter ? '' : 'none';
  });

  headings.forEach(function(h) {
    var next = h.nextElementSibling;
    var vis = false;
    while (next && !next.classList.contains('pub-year-heading')) {
      if (next.classList.contains('pub-card') && next.style.display !== 'none') vis = true;
      next = next.nextElementSibling;
    }
    h.style.display = vis ? '' : 'none';
  });
}

function setPubFilter(filter, button) {
  document.body.setAttribute('data-pub-filter', filter);
  document.querySelectorAll('.pub-filter').forEach(function(b) {
    b.classList.remove('active');
  });
  button.classList.add('active');
  filterPubs();
}
</script>

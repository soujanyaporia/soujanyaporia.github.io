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
  <div class="pub-toolbar__row">
    <div class="pub-filter-row">
      <button class="pub-filter active" type="button" data-filter="all" onclick="setPubFilter('all', this)">All</button>
      <button class="pub-filter" type="button" data-filter="pdf" onclick="setPubFilter('pdf', this)">Has PDF</button>
    </div>
    <span id="pubCount" class="pub-count-display">{{ sorted_pubs | size }} papers</span>
  </div>
  <div class="pub-cat-row" id="categoryButtons"></div>
</div>

{% for group in grouped %}
<h2 class="pub-year-heading" id="{{ group.name }}">{{ group.name }}</h2>

{% for pub in group.items %}
<div class="pub-card" data-categories="{% if pub.categories %}{{ pub.categories | join:',' }}{% endif %}" data-has-pdf="{% if pub.pdf %}true{% else %}false{% endif %}" data-searchable="{{ pub.title | downcase }} {{ pub.authors | downcase }} {{ pub.venue | downcase }} {{ pub.year }} {% if pub.categories %}{{ pub.categories | join:' ' | downcase }}{% endif %}">
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
        <a class="pub-link-primary" href="{{ pub.publication_url }}" target="_blank" rel="noopener">Publication</a>
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
    {% if pub.categories %}
      <div class="pub-cats">
        {% for c in pub.categories %}
          <span class="pub-cat-badge" onclick="toggleCatFilter('{{ c }}')">{{ c }}</span>
        {% endfor %}
      </div>
    {% endif %}
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

var activeCategories = new Set();

function filterPubs() {
  var q = document.getElementById('pubSearch').value.toLowerCase();
  var cards = document.querySelectorAll('.pub-card');
  var headings = document.querySelectorAll('.pub-year-heading');
  var filter = document.body.getAttribute('data-pub-filter') || 'all';

  cards.forEach(function(c) {
    var matchesQuery = c.getAttribute('data-searchable').includes(q);
    var matchesFilter = false;

    if (filter === 'all' && activeCategories.size === 0) {
      matchesFilter = true;
    } else if (filter === 'pdf') {
      matchesFilter = c.getAttribute('data-has-pdf') === 'true';
    } else if (activeCategories.size > 0) {
      // AND logic: paper must match ALL selected categories
      var cardCats = (c.getAttribute('data-categories') || '').split(',').map(function(x){ return x.trim().toLowerCase(); });
      var matchAll = true;
      activeCategories.forEach(function(ac) {
        if (cardCats.indexOf(ac.toLowerCase()) === -1) matchAll = false;
      });
      matchesFilter = matchAll;
    }

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

  updateCount();
}

function setPubFilter(filter, button) {
  document.body.setAttribute('data-pub-filter', filter);
  activeCategories.clear();
  document.querySelectorAll('.pub-cat-btn').forEach(function(b) { b.classList.remove('active'); });
  document.querySelectorAll('.pub-filter').forEach(function(b) { b.classList.remove('active'); });
  button.classList.add('active');
  filterPubs();
}

function toggleCatFilter(cat) {
  if (activeCategories.has(cat)) {
    activeCategories.delete(cat);
  } else {
    activeCategories.add(cat);
  }
  // Clear All/PDF buttons when categories are active
  if (activeCategories.size > 0) {
    document.body.setAttribute('data-pub-filter', 'cat');
    document.querySelectorAll('.pub-filter').forEach(function(b) { b.classList.remove('active'); });
  } else {
    document.body.setAttribute('data-pub-filter', 'all');
    document.querySelector('.pub-filter[data-filter="all"]').classList.add('active');
  }
  // Update button highlights
  document.querySelectorAll('.pub-cat-btn').forEach(function(b) {
    b.classList.toggle('active', activeCategories.has(b.getAttribute('data-cat')));
  });
  filterPubs();
}

function updateCount() {
  var visible = document.querySelectorAll('.pub-card[style=""], .pub-card:not([style])');
  var count = 0;
  document.querySelectorAll('.pub-card').forEach(function(c) {
    if (c.style.display !== 'none') count++;
  });
  var el = document.getElementById('pubCount');
  if (el) el.textContent = count + ' papers';
}

// Build category filter buttons dynamically
document.addEventListener('DOMContentLoaded', function() {
  var container = document.getElementById('categoryButtons');
  if (!container) return;
  var cards = document.querySelectorAll('.pub-card');
  var catCounts = {};
  cards.forEach(function(c) {
    var cats = (c.getAttribute('data-categories') || '').split(',').map(function(x){ return x.trim(); }).filter(Boolean);
    cats.forEach(function(ct) { catCounts[ct] = (catCounts[ct] || 0) + 1; });
  });

  // Sort by count descending
  var sorted = Object.keys(catCounts).sort(function(a, b) { return catCounts[b] - catCounts[a]; });

  sorted.forEach(function(cat) {
    var btn = document.createElement('button');
    btn.className = 'pub-cat-btn';
    btn.type = 'button';
    btn.setAttribute('data-cat', cat);
    btn.innerHTML = cat + ' <span class="pub-cat-count">' + catCounts[cat] + '</span>';
    btn.onclick = function() { toggleCatFilter(cat); };
    container.appendChild(btn);
  });

});
</script>

---
layout: single
permalink: /
title: ""
---

<section class="title-page" aria-labelledby="home-title">
  <div class="title-page__name">
    <h1 id="home-title">Soujanya Poria</h1>
    <p class="title-page__native" lang="bn">সৌজন্য পড়িয়া</p>
  </div>

  <div class="title-page__post">
    <p class="title-page__position">{{ site.author.position }}, <a href="{{ site.author.institution_url }}">{{ site.author.institution }}</a></p>
    {% for appointment in site.author.appointments %}
    <p>{{ appointment.name }}{% if appointment.courtesy %} <em>(courtesy appointment)</em>{% endif %}</p>
    {% endfor %}
  </div>

  <div class="title-page__plate">
    <figure class="portrait-plate">
      <img src="{{ '/assets/images/portrait-640.jpg' | relative_url }}" srcset="{{ '/assets/images/portrait-320.jpg' | relative_url }} 320w, {{ '/assets/images/portrait-640.jpg' | relative_url }} 640w" sizes="(max-width: 560px) 100px, (max-width: 860px) 190px, 304px" alt="Pencil portrait of {{ site.author.name }} writing at a desk" width="640" height="640" fetchpriority="high" decoding="async">
    </figure>
    <div class="plate-marks">
      <img class="affiliation-logo affiliation-ntu" src="{{ '/assets/images/logos/ntu-crest.png' | relative_url }}" alt="Nanyang Technological University" width="119" height="152">
      <a class="plate-marks__lab" href="https://declare-lab.github.io/" aria-label="DeCLaRe Lab">{% include brand/logo-icon.html class="affiliation-logo affiliation-dec" uid="profilemark" %}</a>
      <p class="plate-marks__place">{{ site.author.location }}</p>
    </div>
  </div>

  <div class="title-page__statement">
    <p>I lead the <a href="https://declare-lab.github.io/">DeCLaRe Lab</a> (Deep Cognition and Language Research). My current research focuses on memory for AI agents, continual learning, reliable multi-agent systems, and efficiency.</p>
    <p>These questions run through the lab’s work on AI safety and trustworthiness, multimodality, AI for science, and embodied AI.</p>
  </div>

  <p class="profile-links">
    {% for link in site.author.links %}
    <a href="{% if link.url contains ':' %}{{ link.url }}{% else %}{{ link.url | relative_url }}{% endif %}" {% unless link.url contains 'mailto:' %}target="_blank" rel="noopener"{% endunless %}>{% assign icon_path = link.icon | prepend: 'icons/' | append: '.svg' %}{% include {{ icon_path }} %}<span>{{ link.label }}</span></a>
    {% endfor %}
  </p>
</section>

<section class="folio" aria-labelledby="research-directions">
  <h2 class="folio__title" id="research-directions">Research</h2>
  <div class="folio__body">
    <div class="activity-list direction-index">
      <article class="activity-record">
        <span>01</span>
        <h3><a href="/research/#memory-for-ai-agents">Memory for AI agents</a></h3>
        <p>What an agent should retain, how that memory updates, and how it shapes the next action.</p>
      </article>
      <article class="activity-record">
        <span>02</span>
        <h3><a href="/research/#continual-learning">Continual learning</a></h3>
        <p>How a deployed model keeps learning without losing what it already had.</p>
      </article>
      <article class="activity-record">
        <span>03</span>
        <h3><a href="/research/#reliable-multi-agent-systems">Reliable multi-agent systems</a></h3>
        <p>How agents learn whom to trust and when to ask for advice.</p>
      </article>
      <article class="activity-record">
        <span>04</span>
        <h3><a href="/research/#efficiency">Efficiency</a></h3>
        <p>How much computation a model needs to learn and to retain what is useful.</p>
      </article>
    </div>
    <p class="link-row"><a href="/research/">Research overview</a><a href="/publications/">All publications</a></p>
  </div>
</section>

<section class="folio" id="recent-updates" aria-labelledby="news">
  <h2 class="folio__title" id="news">News</h2>
  <div class="folio__body">
    <div class="activity-list news-ledger">
      <article class="activity-record">
        <span>EMNLP</span>
        <h3>I’m excited to be one of the PC Chairs for EMNLP 2027.</h3>
        <p>I will also co-chair the Demonstration Track at ACL 2027.</p>
      </article>
      <article class="activity-record">
        <span>Talk</span>
        <h3>Beyond Better Actions: What Generalist Physical Agents Still Need</h3>
        <p>Invited talk at the IMDA Technical Sharing Session and AI Wednesdays, Singapore. October 2026.</p>
      </article>
      <article class="activity-record">
        <span>Grant</span>
        <h3>Embodied AI for Human-Robot Collaborative Task Execution</h3>
        <p>A new project with CNRS@CREATE and the National Research Foundation, 2026–29.</p>
      </article>
      <article class="activity-record">
        <span>NeurIPS</span>
        <h3>2 papers accepted to NeurIPS 2026, including 1 Spotlight</h3>
        <p class="news-paper-links">
          <a href="https://arxiv.org/abs/2512.12602">EFLA (Spotlight)</a>
          <a href="https://arxiv.org/abs/2605.12357">δ-mem</a>
        </p>
      </article>
      <article class="activity-record">
        <span>ICML</span>
        <h3>2 papers accepted to ICML 2026</h3>
        <p class="news-paper-links">
          <a href="https://arxiv.org/abs/2603.07433">Data Agent</a>
          <a href="https://arxiv.org/abs/2604.14692">Chain-of-Glimpse</a>
        </p>
      </article>
      <article class="activity-record">
        <span>ICLR</span>
        <h3>4 papers accepted to ICLR 2026</h3>
        <p class="news-paper-links">
          <a href="https://arxiv.org/abs/2412.21037">TangoFlux</a>
          <a href="https://arxiv.org/abs/2509.26495">OffTopicEval</a>
          <a href="https://arxiv.org/abs/2508.18321">Peer Pressure</a>
          <a href="https://arxiv.org/abs/2510.05137">Deep Search</a>
        </p>
      </article>
      <article class="activity-record">
        <span>Award</span>
        <h3>Highly Cited Researcher</h3>
        <p>Recognized by Web of Science, 2026.</p>
      </article>
      <article class="activity-record">
        <span>Media</span>
        <h3><a href="https://venturebeat.com/orchestration/a-0-12-parameter-add-on-gives-ai-agents-the-working-memory-rag-cant">VentureBeat features &delta;-mem</a></h3>
        <p>An interview on working memory for long-running AI agents. May 2026.</p>
      </article>
    </div>
    <p class="link-row"><a href="/activities/">Talks and service</a><a href="/about/">About me</a></p>
  </div>
</section>

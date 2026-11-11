---
layout: single
permalink: /
title: ""
---

<section class="title-page" aria-labelledby="home-title">
  <div class="title-page__name">
    <h1 id="home-title">Soujanya Poria</h1>
    <p class="hero-native-name" lang="bn">সৌজন্য পড়িয়া</p>
  </div>

  <div class="title-page__post">
    <p class="hero-greeting-intro">{{ site.author.position }}, <a href="{{ site.author.institution_url }}">{{ site.author.institution }}</a></p>
    {% for appointment in site.author.appointments %}
    <p class="author-bio">{{ appointment.name }}{% if appointment.joint %} <em>(joint appointment)</em>{% endif %}</p>
    {% endfor %}
  </div>

  <div class="title-page__plate">
    <figure class="portrait-plate">
      <img src="{{ site.author.avatar | relative_url }}" alt="Pencil portrait of {{ site.author.name }} writing at a desk" width="900" height="900">
    </figure>
    <div class="plate-marks">
      <img class="affiliation-logo affiliation-ntu" src="{{ '/assets/images/logos/NTU-transparent-new.png' | relative_url }}" alt="Nanyang Technological University" width="650" height="833">
      <a class="plate-marks__lab" href="https://declare-lab.github.io/" aria-label="DeCLaRe Lab">{% include brand/logo-icon.html class="affiliation-logo affiliation-dec" uid="profilemark" %}</a>
      <p class="author-location">{{ site.author.location }}</p>
    </div>
  </div>

  <div class="title-page__statement">
    <p>I lead the <a href="https://declare-lab.github.io/">DeCLaRe Lab</a> (Deep Cognition and Language Research). My current research focuses on memory for AI agents, efficient and reliable multi-agent systems, and reasoning.</p>
    <p>Our lab also works on AI safety and trustworthiness, multimodality, AI for science, efficiency, and embodied AI.</p>
  </div>

  <p class="profile-links author-bio">
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
        <h3><a href="/research/#multi-agent-systems-and-reliability">Multi-agent systems and reliability</a></h3>
        <p>How agents learn whom to trust and when to ask for advice.</p>
      </article>
      <article class="activity-record">
        <span>03</span>
        <h3><a href="/research/#efficient-learning-and-attention">Efficient learning and attention</a></h3>
        <p>How much computation a model needs to learn and to retain what is useful.</p>
      </article>
      <article class="activity-record">
        <span>04</span>
        <h3><a href="/research/#embodied-agents-and-grounded-reasoning">Embodied agents and grounded reasoning</a></h3>
        <p>Connecting visual reasoning to looking, moving, and testing in the world.</p>
      </article>
      <article class="activity-record">
        <span>05</span>
        <h3><a href="/research/#safety-and-evaluation">Safety and evaluation</a></h3>
        <p>Whether agents stay within their intended role, and how to measure it.</p>
      </article>
    </div>
    <p class="section-link section-link--row"><a href="/research/">Research overview</a><a href="/publications/">All publications</a></p>
  </div>
</section>

<section class="folio" id="recent-updates" aria-labelledby="news">
  <h2 class="folio__title" id="news">News</h2>
  <div class="folio__body">
    <div class="activity-list news-ledger">
      <article class="activity-record">
        <span>EMNLP</span>
        <h3>I’m excited to be one of the PC Chairs for EMNLP 2027.</h3>
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
        <span>AAAI</span>
        <h3>2 papers accepted to AAAI 2026</h3>
        <p class="news-paper-links">
          <a href="https://ui.adsabs.harvard.edu/abs/2025arXiv250517795A/abstract">DialogXpert</a>
          <a href="https://ojs.aaai.org/index.php/AAAI/article/view/41333">10 Open Challenges</a>
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
    <p class="section-link"><a href="/activities/">Academic activities</a></p>
  </div>
</section>

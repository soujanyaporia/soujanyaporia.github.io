---
layout: single
title: "Research"
permalink: /research/
author_profile: true
research_section: true
toc: false
body_class: "research-profile-page"
---

<div class="research-profile-intro">
  <p>I study how AI agents learn from experience, work with other agents, and act reliably. My recent work brings together persistent memory, efficient learning, and evaluation in settings where an agent must gather evidence before making a decision.</p>
  <p>I lead the <a href="https://declare-lab.github.io/">DeCLaRe Lab</a> at Nanyang Technological University. Below is a personal overview of my research directions and selected papers. My <a href="/assets/files/Soujanya_Poria_CV_2026-10-30.pdf?v=c88896be9fe4">curriculum vitae (PDF, October 2026)</a> includes the full academic record.</p>
</div>

## Recent research

### Memory for AI agents

I am interested in memory that changes as an agent gains experience: what it should retain, how it should update, and how that state should affect its next action. Recent work develops compact, recurrent memories for language models and robot policies.

<ul class="research-papers">
  <li><p><a href="https://arxiv.org/abs/2605.12357"><strong>δ-mem: Efficient Online Memory for Large Language Models</strong></a> — NeurIPS 2026. An associative memory updates online and adapts a frozen language model through low-rank attention corrections.</p></li>
  <li><p><a href="https://arxiv.org/abs/2609.28256"><strong>MemBodied</strong></a> — Preprint, 2026. A fixed-size episodic memory lets vision-language-action models use information from earlier observations during manipulation.</p></li>
</ul>

### Multi-agent systems and reliability

Collaboration depends on knowing when another agent is helpful. I study how agents learn whom to trust, when to ask for advice, and how to avoid being persuaded by unreliable peers.

<ul class="research-papers">
  <li><p><a href="https://arxiv.org/abs/2609.35551"><strong>BaRe-Mem</strong></a> — Preprint, 2026. Bayesian reliability memory learns from verified interactions to guide advice use and consultation in multi-agent systems.</p></li>
  <li><p><a href="https://arxiv.org/abs/2508.18321"><strong>Measuring and Mitigating Rapport Bias</strong></a> — ICLR 2026. We examine how prior social interactions influence an agent’s judgment of its peers and its willingness to follow their answers.</p></li>
</ul>

### Efficient learning and attention

My work on efficiency asks how much computation a model needs to learn and retain useful information. This includes the dynamics of linear attention and the choice of training examples as learning progresses.

<ul class="research-papers">
  <li><p><a href="https://arxiv.org/abs/2512.12602"><strong>Exact Flow Linear Attention (EFLA)</strong></a> — NeurIPS 2026, Spotlight. An exact solution to continuous-time memory dynamics provides a stable, parallelizable update for linear attention.</p></li>
  <li><p><a href="https://arxiv.org/abs/2603.07433"><strong>Data Agent: Learning to Select Data via End-to-End Dynamic Optimization</strong></a> — ICML 2026. A learned selection policy adapts the training data to the model’s changing needs.</p></li>
</ul>

### Embodied agents and grounded reasoning

For an agent acting in the world, a good answer often requires looking, moving, or testing something first. I study how visual reasoning connects to these actions and how to evaluate whether agents gather the evidence a task requires.

<ul class="research-papers">
  <li><p><a href="https://arxiv.org/abs/2610.10388"><strong>RoboQuest</strong></a> — Preprint, 2026. A benchmark for goal-directed embodied exploration, covering search, inspection through manipulation, and interactive testing.</p></li>
  <li><p><a href="https://arxiv.org/abs/2604.14692"><strong>Chain-of-Glimpse</strong></a> — ICML 2026. Search-guided video reasoning connects intermediate reasoning steps to specific objects and visual evidence.</p></li>
</ul>

### Safety and evaluation

I also study whether agents stay within their intended role and how to evaluate safety alongside useful capability. These questions matter when moving from general demonstrations to systems with a defined purpose and operating constraints.

<ul class="research-papers">
  <li><p><a href="https://arxiv.org/abs/2509.26495"><strong>OffTopicEval: When Large Language Models Enter the Wrong Chat, Almost Always!</strong></a> — ICLR 2026. We evaluate whether an assistant respects the scope of its assigned role when a request falls outside it.</p></li>
  <li><p><a href="https://aclanthology.org/2025.naacl-demo.23/"><strong>Libra-Leaderboard</strong></a> — NAACL 2025. A framework for evaluating language-model capabilities and safety together.</p></li>
</ul>

### Earlier work

My earlier research on sentiment analysis, affective computing, and multimodal representation learning examined how language, vision, and conversational context work together. Papers and resources from this period include <a href="https://aclanthology.org/2020.findings-emnlp.224/">COSMIC</a>, <a href="https://aclanthology.org/D19-1015/">DialogueGCN</a>, <a href="https://ojs.aaai.org/index.php/AAAI/article/view/4657">DialogueRNN</a>, <a href="https://aclanthology.org/P19-1050/">MELD</a>, <a href="https://dl.acm.org/doi/10.1145/3394171.3413678">MISA</a>, <a href="https://aclanthology.org/2021.emnlp-main.723/">Multimodal-Infomax</a>, and <a href="https://aclanthology.org/D17-1115/">Tensor Fusion Network</a>.

<p class="section-link"><a href="/publications/">Browse all publications</a></p>

## Appointments and education

<div class="activity-list career-list">
  <article class="activity-record activity-record--wide">
    <span>2025–present</span>
    <h3>Nanyang Technological University</h3>
    <p>Associate Professor with tenure, School of Electrical and Electronic Engineering, since August 2025. Joint appointment in the College of Computing and Data Science (CCDS) since October 2026.</p>
  </article>
  <article class="activity-record activity-record--wide">
    <span>2019–25</span>
    <h3>Singapore University of Technology and Design</h3>
    <p>Assistant Professor, Provost’s Chair Assistant Professor, and Associate Professor with tenure. Deputy Director of the AI Mega Centre and founder of DeCLaRe Lab.</p>
  </article>
  <article class="activity-record activity-record--wide">
    <span>2019–22</span>
    <h3>A*STAR Institute of High Performance Computing</h3>
    <p>Joint appointment with SUTD.</p>
  </article>
  <article class="activity-record activity-record--wide">
    <span>2018–19</span>
    <h3>NTU Presidential Postdoctoral Fellow</h3>
    <p>Research on multimodal and personalized affective dialogue systems.</p>
  </article>
  <article class="activity-record activity-record--wide">
    <span>2014–17</span>
    <h3>PhD, University of Stirling</h3>
    <p>Computer Science and Mathematics.</p>
  </article>
  <article class="activity-record activity-record--wide">
    <span>2009–13</span>
    <h3>Bachelor of Engineering, Jadavpur University</h3>
    <p>Computer Science and Engineering.</p>
  </article>
</div>

## Honours and awards

<div class="award-grid recognition-grid">
  <div><strong>Highly Cited Researcher</strong><span>Web of Science, 2026</span></div>
  <div><strong>President's Young Scientist Award</strong><span>Singapore, 2023</span></div>
  <div><strong>MIT Technology Review 35 Under 35</strong><span>Asia Pacific, 2023</span></div>
  <div><strong>IEEE CIS Outstanding Early Career Award</strong><span>2024</span></div>
  <div><strong>NAACL Social Impact Award</strong><span>2024</span></div>
  <div><strong>IEEE Intelligent Systems AI's 10 to Watch</strong><span>2022</span></div>
  <div><strong>IEEE CIM Outstanding Paper Award</strong><span>2021</span></div>
  <div><strong>Presidential Postdoctoral Fellowship</strong><span>NTU Singapore, 2018</span></div>
</div>

<p class="section-link">See <a href="/activities/">Academic Activities</a> for conference leadership, editorial service, teaching, and invited talks, or <a href="/assets/files/Soujanya_Poria_CV_2026-10-30.pdf?v=c88896be9fe4">download my full CV</a>.</p>

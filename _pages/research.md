---
layout: single
title: "Research"
permalink: /research/
author_profile: true
toc: true
toc_label: "Contents"
toc_max: 2
body_class: "research-profile-page"
---

## Research Agenda
{: data-section-label="01"}

<div class="research-area-grid">
  <a class="research-area-card" href="https://declare-lab.github.io/research/#safety"><span>01</span><h3>Safety</h3><p>Operational evaluation, red-teaming, refusal behavior, alignment, and test-time interventions.</p></a>
  <a class="research-area-card" href="https://declare-lab.github.io/research/#trustworthiness"><span>02</span><h3>Trustworthiness</h3><p>Grounded attribution, trustworthy RAG, hallucination mitigation, uncertainty, and calibrated reliance.</p></a>
  <a class="research-area-card" href="https://declare-lab.github.io/research/#multimodality"><span>03</span><h3>Multimodality</h3><p>Language, vision, audio, and video models for reasoning, generation, and social understanding.</p></a>
  <a class="research-area-card" href="https://declare-lab.github.io/research/#ai-for-science"><span>04</span><h3>AI for Science</h3><p>Scientific hypothesis discovery, chemistry, evidence synthesis, and literature-grounded reasoning.</p></a>
  <a class="research-area-card" href="https://declare-lab.github.io/research/#efficiency"><span>05</span><h3>Efficiency</h3><p>Online memory, dynamic data selection, efficient attention, adaptation, and compact training.</p></a>
  <a class="research-area-card" href="https://declare-lab.github.io/research/#embodied-ai"><span>06</span><h3>Embodied AI</h3><p>Vision-language-action models, action grounding, embodied planning, and interactive evaluation.</p></a>
</div>

## Current Programs
{: data-section-label="02"}

<div class="contribution-index research-programs">
  <article class="contribution-row">
    <div class="contribution-meta"><span>2026</span><span>Memory</span></div>
    <div class="contribution-copy">
      <h3>Online memory for language models</h3>
      <p>δ-mem asks whether frozen language models can maintain a compact, continually updated state instead of repeatedly rereading an expanding context.</p>
      <div class="program-links"><a href="https://arxiv.org/abs/2605.12357">Paper</a><a href="https://declare-lab.github.io/lab-notes/delta-mem/">Lab note</a><a href="https://github.com/declare-lab/delta-Mem">Code</a></div>
    </div>
    <a class="contribution-arrow" href="https://declare-lab.github.io/research/#efficiency" aria-label="Explore efficiency research">→</a>
  </article>

  <article class="contribution-row">
    <div class="contribution-meta"><span>2026</span><span>Data-centric ML</span></div>
    <div class="contribution-copy">
      <h3>Learning what data to use, and how much</h3>
      <p>Data Agent learns sample-wise selection policies; PODS treats the selected data volume as a dynamic training signal under a fixed budget.</p>
      <div class="program-links"><a href="https://arxiv.org/abs/2603.07433">Data Agent</a><a href="https://arxiv.org/abs/2605.14773">PODS</a><a href="https://declare-lab.github.io/lab-notes/data-centric-training-part-i/">Part I</a><a href="https://declare-lab.github.io/lab-notes/data-centric-training-part-ii/">Part II</a></div>
    </div>
    <a class="contribution-arrow" href="https://declare-lab.github.io/research/#efficiency" aria-label="Explore efficiency research">→</a>
  </article>

  <article class="contribution-row">
    <div class="contribution-meta"><span>2025–26</span><span>Embodied AI</span></div>
    <div class="contribution-copy">
      <h3>Compact vision-language-action models</h3>
      <p>NORA and NORA 1.5 study efficient action grounding, preference optimization, and dependable behavior in generalist embodied agents.</p>
      <div class="program-links"><a href="https://declare-lab.github.io/nora/">NORA</a><a href="https://declare-lab.github.io/nora-1.5/">NORA 1.5</a><a href="https://arxiv.org/abs/2504.19854">Paper</a></div>
    </div>
    <a class="contribution-arrow" href="https://declare-lab.github.io/research/#embodied-ai" aria-label="Explore embodied AI research">→</a>
  </article>

  <article class="contribution-row">
    <div class="contribution-meta"><span>2024–26</span><span>Safe &amp; trustworthy AI</span></div>
    <div class="contribution-copy">
      <h3>Operational safety and trustworthy generation</h3>
      <p>Recent work evaluates off-topic behavior, restores safety after fine-tuning, and improves grounding, citation, and refusal in retrieval-augmented generation.</p>
      <div class="program-links"><a href="https://arxiv.org/abs/2509.26495">OffTopicEval</a><a href="https://aclanthology.org/2024.acl-long.762">RESTA</a><a href="https://proceedings.iclr.cc/paper_files/paper/2025/hash/4c88827decab6c046b881a2c3a99c76f-Abstract-Conference.html">Trust-Align</a></div>
    </div>
    <a class="contribution-arrow" href="https://declare-lab.github.io/research/#safety" aria-label="Explore safety research">→</a>
  </article>

  <article class="contribution-row">
    <div class="contribution-meta"><span>2024–25</span><span>Generation &amp; science</span></div>
    <div class="contribution-copy">
      <h3>Generative audio and scientific discovery</h3>
      <p>TangoFlux develops fast preference-optimized text-to-audio generation, while MOOSE-Chem tests literature-grounded hypothesis rediscovery in chemistry.</p>
      <div class="program-links"><a href="https://arxiv.org/abs/2412.21037">TangoFlux</a><a href="https://proceedings.iclr.cc/paper_files/paper/2025/hash/51fd9a7d1706023cb9f8210cc6ac357c-Abstract-Conference.html">MOOSE-Chem</a></div>
    </div>
    <a class="contribution-arrow" href="https://declare-lab.github.io/research/#ai-for-science" aria-label="Explore AI for Science research">→</a>
  </article>
</div>

## Foundational Contributions
{: data-section-label="03"}

Earlier work on multimodal fusion and conversational intelligence established several of the questions that continue to shape our lab’s research.

<div class="contribution-index foundational-index">
  <article class="contribution-row">
    <div class="contribution-meta"><span>2017</span><span>Multimodal fusion</span></div>
    <div class="contribution-copy"><h3><a href="https://aclanthology.org/D17-1115/">Tensor Fusion Network</a></h3><p>Models unimodal, bimodal, and trimodal interactions explicitly for multimodal sentiment analysis.</p></div>
    <a class="contribution-arrow" href="https://aclanthology.org/D17-1115/" aria-label="Read Tensor Fusion Network">→</a>
  </article>
  <article class="contribution-row">
    <div class="contribution-meta"><span>2019</span><span>Conversation</span></div>
    <div class="contribution-copy"><h3><a href="https://ojs.aaai.org/index.php/AAAI/article/view/4657">DialogueRNN</a></h3><p>Tracks speaker states and conversational context for emotion recognition in multiparty dialogue.</p></div>
    <a class="contribution-arrow" href="https://ojs.aaai.org/index.php/AAAI/article/view/4657" aria-label="Read DialogueRNN">→</a>
  </article>
  <article class="contribution-row">
    <div class="contribution-meta"><span>2019</span><span>Dataset</span></div>
    <div class="contribution-copy"><h3><a href="https://aclanthology.org/P19-1050/">MELD</a></h3><p>A multimodal, multiparty benchmark for emotion recognition and sentiment analysis in conversation.</p></div>
    <a class="contribution-arrow" href="https://aclanthology.org/P19-1050/" aria-label="Read MELD">→</a>
  </article>
  <article class="contribution-row">
    <div class="contribution-meta"><span>2019</span><span>Graph reasoning</span></div>
    <div class="contribution-copy"><h3><a href="https://aclanthology.org/D19-1015/">DialogueGCN</a></h3><p>Represents dialogue as a graph to reason over speaker dependencies and conversational structure.</p></div>
    <a class="contribution-arrow" href="https://aclanthology.org/D19-1015/" aria-label="Read DialogueGCN">→</a>
  </article>
</div>

<p class="section-link"><a href="https://declare-lab.github.io/publications/">Browse the complete DeCLaRe publication archive →</a></p>

## Research Support
{: data-section-label="04"}

Selected active grants support longer research programs across embodied intelligence, trustworthy AI, and efficient learning. The [DeCLaRe funded-projects page](https://declare-lab.github.io/funded-projects/) maintains the complete active and completed portfolio.

<div class="research-support-list funding-list">
  <article><span>Principal Investigator · 2026–29</span><h3>Embodied Foundational Models</h3><p>CNRS@CREATE and Singapore’s National Research Foundation · S$10M program; S$3.33M awarded.</p></article>
  <article><span>Principal Investigator · 2026–28</span><h3>Toward Generalist Vision-Language-Action Models</h3><p>KLASS · S$1.5M.</p></article>
  <article><span>Principal Investigator · 2026</span><h3>Google DeepMind GCP Research Grant</h3><p>Google DeepMind · S$100K.</p></article>
  <article><span>Principal Investigator · 2023–26</span><h3>Detecting, Measuring and Mitigating Hallucinations in LLMs</h3><p>DSO · S$800K.</p></article>
  <article><span>Principal Investigator · 2024–26</span><h3>Trustworthy and Responsible LLMs for Singapore Governance</h3><p>AI Singapore · S$500K.</p></article>
  <article><span>Co-Principal Investigator · 2025–28</span><h3>Language Models with Linear Transformers</h3><p>AI Singapore · S$4.9M program.</p></article>
</div>

## Mentorship
{: data-section-label="05"}

Our current DeCLaRe team includes **12 PhD students, 3 research scientists, 1 research assistant, and 1 visiting student**. The lab's People page maintains the current roster, research interests, and affiliations of 19 alumni.

<p class="section-link"><a href="https://declare-lab.github.io/people/">Meet current members and alumni at DeCLaRe Lab →</a></p>

## Recognition
{: data-section-label="06"}

<div class="award-grid recognition-grid">
  <div><strong>Highly Cited Researcher</strong><span>Web of Science, 2026</span></div>
  <div><strong>President’s Young Scientist Award</strong><span>Singapore, 2023</span></div>
  <div><strong>MIT Technology Review 35 Under 35</strong><span>Asia Pacific, 2023</span></div>
  <div><strong>IEEE CIS Outstanding Early Career Award</strong><span>2024</span></div>
  <div><strong>NAACL Social Impact Award</strong><span>2024</span></div>
  <div><strong>IEEE Intelligent Systems AI’s 10 to Watch</strong><span>2022</span></div>
  <div><strong>IEEE CIM Outstanding Paper Award</strong><span>2021</span></div>
  <div><strong>Presidential Postdoctoral Fellowship</strong><span>NTU Singapore, 2018</span></div>
</div>

<p class="section-link"><a href="/activities/">Keynotes, editorial service, teaching, and other academic activities →</a></p>
<p class="section-link"><a href="https://scholar.google.com/citations?user=oS6gRc4AAAAJ&amp;hl=en">View the full research record on Google Scholar →</a></p>

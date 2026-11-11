---
layout: single
title: "Research"
permalink: /research/
body_class: "research-profile-page"
---

<section class="folio" aria-labelledby="overview">
  <h2 class="folio__title" id="overview">Overview</h2>
  <div class="folio__body research-profile-intro">
    <p>I study how AI agents learn from experience, work with other agents, and act reliably. My current work is on memory for AI agents, continual learning, reliable multi-agent systems, and efficiency.</p>
  </div>
</section>

<section class="folio" aria-labelledby="current-questions">
  <h2 class="folio__title" id="current-questions">Current questions</h2>
  <div class="folio__body">
    <section class="research-theme" aria-labelledby="memory-for-ai-agents">
      <h3 id="memory-for-ai-agents">Memory for AI agents</h3>
      <p>I am interested in memory that changes as an agent gains experience: what it should retain, how it should update, and how that state should affect its next action. Recent work develops compact, recurrent memories for language models and robot policies.</p>
      <ul class="research-papers">
        <li class="paper"><a class="paper__title" href="https://arxiv.org/abs/2605.12357">δ-mem: Efficient Online Memory for Large Language Models</a> <span class="paper__venue">NeurIPS 2026</span><p>An associative memory updates online and adapts a frozen language model through low-rank attention corrections.</p></li>
        <li class="paper"><a class="paper__title" href="https://arxiv.org/abs/2609.28256">MemBodied</a> <span class="paper__venue">Preprint, 2026</span><p>A fixed-size episodic memory lets vision-language-action models use information from earlier observations during manipulation.</p></li>
      </ul>
    </section>
    <section class="research-theme" aria-labelledby="continual-learning">
      <h3 id="continual-learning">Continual learning</h3>
      <p>How a deployed model keeps learning from new experience without retraining from scratch or losing what it already had.</p>
      <ul class="research-papers">
        <li class="paper"><a class="paper__title" href="https://arxiv.org/abs/2607.27958">Σ-Mem</a> <span class="paper__venue">Preprint, 2026</span><p>An online memory of which peers have been reliable adapts as new feedback arrives, without retraining the underlying agents.</p></li>
        <li class="paper"><a class="paper__title" href="https://aclanthology.org/2024.acl-long.762">Safety Re-Alignment of Fine-tuned Language Models (RESTA)</a> <span class="paper__venue">ACL 2024</span><p>Adding a safety vector to a model’s weights restores the safety that downstream fine-tuning compromises.</p></li>
      </ul>
    </section>
    <section class="research-theme" aria-labelledby="reliable-multi-agent-systems">
      <h3 id="reliable-multi-agent-systems">Reliable multi-agent systems</h3>
      <p>Collaboration depends on knowing when another agent is helpful. I study how agents learn whom to trust, when to ask for advice, and how to avoid being persuaded by unreliable peers.</p>
      <ul class="research-papers">
        <li class="paper"><a class="paper__title" href="https://arxiv.org/abs/2609.35551">BaRe-Mem</a> <span class="paper__venue">Preprint, 2026</span><p>Bayesian reliability memory learns from verified interactions to guide advice use and consultation in multi-agent systems.</p></li>
        <li class="paper"><a class="paper__title" href="https://arxiv.org/abs/2508.18321">Measuring and Mitigating Rapport Bias</a> <span class="paper__venue">ICLR 2026</span><p>We examine how prior social interactions influence an agent’s judgment of its peers and its willingness to follow their answers.</p></li>
        <li class="paper"><a class="paper__title" href="https://arxiv.org/abs/2601.21742">Epistemic Context Learning</a> <span class="paper__venue">Preprint, 2026</span><p>Agents use the history of their peers’ answers to judge reliability instead of conforming to them.</p></li>
      </ul>
    </section>
    <section class="research-theme" aria-labelledby="efficiency">
      <h3 id="efficiency">Efficiency</h3>
      <p>My work on efficiency asks how much computation a model needs to learn and retain useful information. This includes the dynamics of linear attention and the choice of training examples as learning progresses.</p>
      <ul class="research-papers">
        <li class="paper"><a class="paper__title" href="https://arxiv.org/abs/2512.12602">Exact Flow Linear Attention (EFLA)</a> <span class="paper__venue">NeurIPS 2026, Spotlight</span><p>An exact solution to continuous-time memory dynamics provides a stable, parallelizable update for linear attention.</p></li>
        <li class="paper"><a class="paper__title" href="https://arxiv.org/abs/2603.07433">Data Agent: Learning to Select Data via End-to-End Dynamic Optimization</a> <span class="paper__venue">ICML 2026</span><p>A learned selection policy adapts the training data to the model’s changing needs.</p></li>
      </ul>
    </section>
    <p class="folio__note"><a href="/publications/">Browse all publications</a></p>
  </div>
</section>

<section class="folio" aria-labelledby="selected-contributions">
  <h2 class="folio__title" id="selected-contributions">Selected contributions</h2>
  <div class="folio__body">
    <p>DeCLaRe Lab models have been downloaded more than two million times on <a href="https://huggingface.co/declare-lab">Hugging Face</a>, and code is on <a href="https://github.com/declare-lab">GitHub</a>.</p>
    <div class="activity-list contribution-list">
      <article class="activity-record">
        <span>Multimodal learning</span>
        <h3><a href="https://aclanthology.org/D17-1115/">Tensor Fusion Network</a>, <a href="https://dl.acm.org/doi/10.1145/3394171.3413678">MISA</a>, <a href="https://aclanthology.org/2021.emnlp-main.723/">Multimodal-Infomax</a></h3>
        <p>Tensor fusion, modality-invariant and modality-specific representations, and fusion based on mutual information.</p>
      </article>
      <article class="activity-record">
        <span>Dialogue understanding</span>
        <h3><a href="https://ojs.aaai.org/index.php/AAAI/article/view/4657">DialogueRNN</a>, <a href="https://aclanthology.org/D19-1015/">DialogueGCN</a>, <a href="https://aclanthology.org/P19-1050/">MELD</a>, <a href="https://aclanthology.org/2020.findings-emnlp.224/">COSMIC</a></h3>
        <p>Speaker- and context-aware emotion recognition, with a multimodal dataset of multi-party conversations.</p>
      </article>
      <article class="activity-record">
        <span>Affective computing</span>
        <h3>MUStARD</h3>
        <p>Multimodal sarcasm detection using language, visual and acoustic cues.</p>
      </article>
      <article class="activity-record">
        <span>Audio generation</span>
        <h3>Tango, Tango 2, <a href="https://arxiv.org/abs/2412.21037">TangoFlux</a></h3>
        <p>Text-to-audio generation through latent diffusion, preference alignment and flow matching.</p>
      </article>
      <article class="activity-record">
        <span>Embodied AI</span>
        <h3>NORA</h3>
        <p>A compact, open-source vision-language-action model for robotic tasks.</p>
      </article>
      <article class="activity-record">
        <span>Memory and efficiency</span>
        <h3><a href="https://arxiv.org/abs/2605.12357">δ-mem</a>, <a href="https://arxiv.org/abs/2512.12602">EFLA</a></h3>
        <p>Online memory for language models, and exact flow linear attention derived from continuous-time dynamics.</p>
      </article>
    </div>
    <p class="folio__note">Appointments, education and honours are on the <a href="/about/">About</a> page.</p>
  </div>
</section>

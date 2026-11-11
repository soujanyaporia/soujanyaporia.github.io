(function () {
  "use strict";

  /* ----- Clipboard ----- */
  var copyIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><rect x="8" y="8" width="12" height="12" rx="1.5"/><path d="M16 8V4H4v12h4"/></svg>';
  var copiedIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="m5 12 4 4L19 6"/></svg>';

  function copyText(button, text, status, successMessage) {
    if (button.disabled) return;
    var label = button.copyOriginalLabel || button.getAttribute("aria-label");
    var title = button.copyOriginalTitle || button.getAttribute("title");
    var failure = "Could not copy. Select the text and copy it manually.";
    button.copyOriginalLabel = label;
    button.copyOriginalTitle = title;

    function reset() {
      button.innerHTML = copyIcon;
      button.setAttribute("aria-label", label);
      button.setAttribute("title", title || label);
    }

    status.textContent = "";
    clearTimeout(button.copyResetTimer);
    reset();
    if (!navigator.clipboard || !navigator.clipboard.writeText) {
      status.textContent = failure;
      return;
    }
    button.disabled = true;
    // The clipboard call stays inside the click gesture, which Safari requires.
    try {
      return navigator.clipboard.writeText(text).then(function () {
        status.textContent = successMessage || "Copied.";
        button.innerHTML = copiedIcon;
        button.setAttribute("aria-label", "Copied");
        button.setAttribute("title", "Copied");
        button.copyResetTimer = setTimeout(reset, 2000);
      }).catch(function () {
        reset();
        status.textContent = failure;
      }).finally(function () {
        button.disabled = false;
      });
    } catch (error) {
      reset();
      status.textContent = failure;
      button.disabled = false;
    }
  }

  /* ----- BibTeX ----- */
  function escapeText(value) {
    return String(value || "").replace(/([%&#_])/g, "\\$1");
  }

  function generateBibtex(button) {
    var title = button.getAttribute("data-bibtex-title") || "";
    var authors = button.getAttribute("data-bibtex-authors") || "";
    var venue = button.getAttribute("data-bibtex-venue") || "";
    var year = button.getAttribute("data-bibtex-year") || "";
    var url = button.getAttribute("data-bibtex-url") || "";
    var firstAuthor = (authors.split(",")[0] || "author")
      .trim().split(" ").pop().toLowerCase().replace(/[^a-z]/g, "");
    var firstTitleWord = title.trim().split(" ")[0]
      .toLowerCase().replace(/[^a-z0-9]/g, "");
    var citeKey = (firstAuthor || "paper") + year + (firstTitleWord || "work");
    var authorValue = authors.split(/\s*,\s*/).filter(Boolean).join(" and ");
    var fields = [
      "@misc{" + citeKey + ",",
      "  title={" + escapeText(title) + "},",
      "  author={" + escapeText(authorValue) + "},"
    ];

    if (venue) fields.push("  note={" + escapeText(venue) + "},");
    fields.push("  year={" + year + "}" + (url ? "," : ""));
    if (url) fields.push("  url={" + escapeText(url) + "}");
    fields.push("}");
    return fields.join("\n");
  }

  document.addEventListener("click", function (event) {
    var button = event.target.closest(".pub-bibtex-local");
    if (button) {
      var panel = document.getElementById(button.getAttribute("aria-controls"));
      if (!panel) return;
      var opening = button.getAttribute("aria-expanded") !== "true";
      if (opening) panel.querySelector("[data-bibtex-code]").textContent = generateBibtex(button);
      panel.hidden = !opening;
      button.setAttribute("aria-expanded", String(opening));
      button.setAttribute("aria-label", (opening ? "Hide" : "Show") + " BibTeX for " + button.getAttribute("data-bibtex-title"));
      return;
    }

    var copyButton = event.target.closest("[data-bibtex-copy]");
    if (!copyButton || copyButton.disabled) return;
    var copyPanel = copyButton.closest(".pub-bibtex-panel");
    var status = copyPanel.querySelector("[data-bibtex-status]");
    var citation = copyPanel.querySelector("[data-bibtex-code]").textContent;
    copyText(copyButton, citation, status, "BibTeX copied.");
  });

  /* ----- Abstracts ----- */
  document.addEventListener("click", function (event) {
    var button = event.target.closest(".pub-abstract-toggle");
    if (!button) return;
    var panel = document.getElementById(button.getAttribute("aria-controls"));
    if (!panel) return;
    var opening = button.getAttribute("aria-expanded") !== "true";
    panel.hidden = !opening;
    button.setAttribute("aria-expanded", String(opening));
  });

  /* ----- Search, subsets, topics and years ----- */
  function initializeArchive(archive) {
    var search = archive.querySelector("[data-pub-search]");
    var count = archive.querySelector("[data-pub-count]");
    var empty = archive.querySelector("[data-pub-empty]");
    var topicList = archive.querySelector("[data-pub-categories]");
    var topicToggle = archive.querySelector("[data-pub-topics-toggle]");
    var yearSelect = archive.querySelector("[data-year-jump]");
    var subsetButtons = Array.prototype.slice.call(archive.querySelectorAll("[data-pub-filter]"));
    var years = Array.prototype.slice.call(archive.querySelectorAll("[data-pub-year]"));
    var cards = Array.prototype.slice.call(archive.querySelectorAll(".pub-card"));
    var visibleTopics = window.matchMedia("(max-width: 640px)").matches ? 6 : 10;
    var subset = "all";
    var topics = new Set();

    if (!cards.length) return;

    cards.forEach(function (card) {
      card.pubTopics = (card.getAttribute("data-categories") || "")
        .split(",").map(function (topic) { return topic.trim(); }).filter(Boolean);
      card.pubText = (card.getAttribute("data-searchable") || "").toLowerCase();
    });

    function setPressed(button, pressed) {
      button.setAttribute("aria-pressed", String(pressed));
    }

    function apply() {
      var query = (search ? search.value : "").toLowerCase().trim();
      var terms = query ? query.split(/\s+/) : [];
      var visible = 0;

      cards.forEach(function (card) {
        var show = terms.every(function (term) { return card.pubText.indexOf(term) !== -1; });
        if (show && subset === "pdf") show = card.getAttribute("data-has-pdf") === "true";
        if (show && subset === "hot") show = card.getAttribute("data-hot") === "true";
        if (show) {
          topics.forEach(function (topic) {
            if (card.pubTopics.indexOf(topic) === -1) show = false;
          });
        }
        card.hidden = !show;
        if (show) visible += 1;
      });

      years.forEach(function (year) {
        var any = year.querySelector(".pub-card:not([hidden])") !== null;
        year.hidden = !any;
        if (yearSelect) {
          var option = yearSelect.querySelector('option[value="' + year.id + '"]');
          if (option) option.disabled = !any;
        }
      });

      subsetButtons.forEach(function (button) {
        var name = button.getAttribute("data-pub-filter");
        setPressed(button, name === "all" ? subset === "all" && !topics.size && !terms.length : name === subset);
      });
      archive.querySelectorAll("[data-pub-category]").forEach(function (button) {
        setPressed(button, topics.has(button.getAttribute("data-pub-category")));
      });

      if (count) count.textContent = visible + (visible === 1 ? " paper" : " papers");
      if (empty) empty.hidden = visible !== 0;
    }

    function buildTopics() {
      if (!topicList) return;
      var counts = {};
      cards.forEach(function (card) {
        card.pubTopics.forEach(function (topic) { counts[topic] = (counts[topic] || 0) + 1; });
      });
      var names = Object.keys(counts).sort(function (a, b) {
        return counts[b] - counts[a] || a.localeCompare(b);
      });
      names.forEach(function (topic, index) {
        var button = document.createElement("button");
        var number = document.createElement("span");
        button.className = "chip chip--topic";
        button.type = "button";
        button.setAttribute("data-pub-category", topic);
        button.setAttribute("aria-pressed", "false");
        if (index >= visibleTopics) button.setAttribute("data-topic-extra", "");
        number.textContent = counts[topic];
        button.appendChild(document.createTextNode(topic + " "));
        button.appendChild(number);
        topicList.appendChild(button);
      });
      if (topicToggle && names.length > visibleTopics) {
        topicToggle.hidden = false;
        topicToggle.textContent = "All " + names.length + " topics";
        topicToggle.addEventListener("click", function () {
          var open = topicToggle.getAttribute("aria-expanded") !== "true";
          topicToggle.setAttribute("aria-expanded", String(open));
          topicList.classList.toggle("is-expanded", open);
          topicToggle.textContent = open ? "Fewer topics" : "All " + names.length + " topics";
        });
      }
    }

    function revealTopic(topic) {
      if (!topicList || !topicToggle) return;
      var chip = Array.prototype.filter.call(
        topicList.querySelectorAll("[data-topic-extra]"),
        function (button) { return button.getAttribute("data-pub-category") === topic; }
      )[0];
      if (chip && topicToggle.getAttribute("aria-expanded") !== "true") topicToggle.click();
    }

    buildTopics();

    if (search) search.addEventListener("input", apply);

    archive.addEventListener("click", function (event) {
      var subsetButton = event.target.closest("[data-pub-filter]");
      var topicButton = event.target.closest("[data-pub-category]");
      if (subsetButton) {
        subset = subsetButton.getAttribute("data-pub-filter") || "all";
        if (subset === "all") {
          topics.clear();
          if (search) search.value = "";
        }
        apply();
      } else if (topicButton) {
        var topic = topicButton.getAttribute("data-pub-category");
        if (topics.has(topic)) topics.delete(topic);
        else topics.add(topic);
        revealTopic(topic);
        apply();
      }
    });

    if (yearSelect) {
      yearSelect.addEventListener("change", function () {
        var target = yearSelect.value && document.getElementById(yearSelect.value);
        if (target) {
          var calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
          target.scrollIntoView({ behavior: calm ? "auto" : "smooth", block: "start" });
        }
        yearSelect.value = "";
      });
    }

    var params = new URLSearchParams(window.location.search);
    if (search && params.get("q")) search.value = params.get("q");
    if (params.get("topic")) {
      topics.add(params.get("topic"));
      revealTopic(params.get("topic"));
    }
    apply();
  }

  function initialize() {
    document.querySelectorAll("[data-bibtex-copy]").forEach(function (button) {
      button.innerHTML = copyIcon;
    });
    document.querySelectorAll("[data-publication-archive]").forEach(initializeArchive);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initialize);
  else initialize();
}());

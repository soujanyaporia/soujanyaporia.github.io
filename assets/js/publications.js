(function () {
  "use strict";

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

  function initializePagination() {
    var archive = document.querySelector("[data-publication-archive]");
    if (!archive) return;

    var cards = Array.prototype.slice.call(archive.querySelectorAll(".pub-card"));
    var headings = Array.prototype.slice.call(
      archive.querySelectorAll("[data-pub-year-heading]")
    );
    var pagination = archive.querySelector("[data-pub-pagination]");
    var moreButton = archive.querySelector("[data-pub-more]");
    var status = archive.querySelector("[data-pub-page-status]");
    var yearSelect = archive.querySelector("[data-year-jump]");
    var pageSize = 24;
    var limit = pageSize;

    if (!cards.length || !pagination || !moreButton) return;

    archive.classList.add("has-publication-pagination");
    pagination.hidden = false;

    function updateHeadings() {
      headings.forEach(function (heading) {
        var next = heading.nextElementSibling;
        var hasVisiblePaper = false;
        while (next && !next.hasAttribute("data-pub-year-heading")) {
          if (
            next.classList.contains("pub-card") &&
            !next.hidden &&
            !next.classList.contains("is-page-hidden")
          ) {
            hasVisiblePaper = true;
            break;
          }
          next = next.nextElementSibling;
        }
        if (hasVisiblePaper) heading.removeAttribute("data-page-hidden");
        else heading.setAttribute("data-page-hidden", "true");
      });
    }

    function updateYearOptions(matches) {
      if (!yearSelect) return;
      var available = new Set(matches.map(function (card) {
        return "pub-year-" + card.getAttribute("data-year");
      }));
      Array.prototype.forEach.call(yearSelect.options, function (option) {
        if (!option.value) option.disabled = false;
        else option.disabled = !available.has(option.value);
      });
    }

    function applyPagination() {
      var matches = cards.filter(function (card) { return !card.hidden; });
      matches.forEach(function (card, index) {
        card.classList.toggle("is-page-hidden", index >= limit);
      });
      cards.filter(function (card) { return card.hidden; }).forEach(function (card) {
        card.classList.remove("is-page-hidden");
      });

      var shown = Math.min(limit, matches.length);
      var remaining = Math.max(0, matches.length - shown);
      moreButton.hidden = remaining === 0;
      moreButton.textContent = remaining > pageSize
        ? "Show " + pageSize + " more papers"
        : "Show " + remaining + " more " + (remaining === 1 ? "paper" : "papers");
      if (status) {
        status.textContent = matches.length
          ? "Showing " + shown + " of " + matches.length + " matching papers"
          : "No matching papers";
      }
      updateHeadings();
      updateYearOptions(matches);
    }

    moreButton.addEventListener("click", function () {
      limit += pageSize;
      applyPagination();
    });

    if (yearSelect) {
      yearSelect.addEventListener("change", function () {
        if (!yearSelect.value) return;
        var requestedYear = yearSelect.value.replace("pub-year-", "");
        var matches = cards.filter(function (card) { return !card.hidden; });
        var targetIndex = matches.findIndex(function (card) {
          return card.getAttribute("data-year") === requestedYear;
        });
        if (targetIndex >= limit) {
          limit = Math.ceil((targetIndex + 1) / pageSize) * pageSize;
          applyPagination();
        }
      }, true);
    }

    document.addEventListener("declare:publications-filtered", function () {
      limit = pageSize;
      window.requestAnimationFrame(applyPagination);
    });

    applyPagination();
  }

  function initializeLazyAbstracts() {
    var archive = document.querySelector("[data-publication-archive]");
    if (!archive) return;

    var source = archive.getAttribute("data-abstract-index");
    var abstractIndex = null;
    var request = null;
    if (!source) return;

    function loadIndex() {
      if (abstractIndex) return Promise.resolve(abstractIndex);
      if (request) return request;
      request = fetch(source, { credentials: "same-origin" })
        .then(function (response) {
          if (!response.ok) throw new Error(String(response.status));
          return response.json();
        })
        .then(function (data) {
          abstractIndex = data;
          return data;
        })
        .catch(function (error) {
          request = null;
          throw error;
        });
      return request;
    }

    document.addEventListener("click", function (event) {
      var button = event.target.closest(".pub-abstract-toggle");
      if (!button || !archive.contains(button)) return;
      var panelId = button.getAttribute("aria-controls");
      var panel = panelId && document.getElementById(panelId);
      if (!panel || panel.hasAttribute("data-abstract-loaded")) return;

      panel.setAttribute("aria-busy", "true");
      panel.textContent = "Loading abstract…";
      loadIndex().then(function (data) {
        panel.textContent = data[panelId] || "Abstract unavailable.";
        panel.setAttribute("data-abstract-loaded", "true");
        panel.removeAttribute("aria-busy");
      }).catch(function () {
        panel.textContent = "The abstract could not be loaded. Use the paper link instead.";
        panel.removeAttribute("aria-busy");
      });
    }, true);
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
    window.DeclareCopy.copy(copyButton, citation, status, "BibTeX copied.");
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      initializePagination();
      initializeLazyAbstracts();
    });
  } else {
    initializePagination();
    initializeLazyAbstracts();
  }
}());

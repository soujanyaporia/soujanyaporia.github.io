(function () {
  "use strict";

  var toggle = document.querySelector(".menu-toggle");
  var nav = document.getElementById("primary-navigation");
  if (!toggle || !nav) return;

  function setOpen(open) {
    nav.classList.toggle("is-open", open);
    toggle.setAttribute("aria-expanded", String(open));
    toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
  }

  toggle.addEventListener("click", function () {
    setOpen(toggle.getAttribute("aria-expanded") !== "true");
  });

  nav.addEventListener("click", function (event) {
    if (event.target.closest("a")) setOpen(false);
  });

  document.addEventListener("click", function (event) {
    if (toggle.getAttribute("aria-expanded") !== "true") return;
    if (!nav.contains(event.target) && !toggle.contains(event.target)) setOpen(false);
  });

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && toggle.getAttribute("aria-expanded") === "true") {
      setOpen(false);
      toggle.focus();
    }
  });

  window.matchMedia("(min-width: 761px)").addEventListener("change", function (event) {
    if (event.matches) setOpen(false);
  });
}());

document.querySelectorAll('.research-menu').forEach(function (menu) {
  document.addEventListener('click', function (event) {
    if (!menu.contains(event.target)) menu.open = false;
  });
  menu.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && menu.open) {
      menu.open = false;
      menu.querySelector('summary').focus();
      event.stopPropagation();
    }
  });
  menu.querySelectorAll('a').forEach(function (link) {
    link.addEventListener('click', function () { menu.open = false; });
  });
});

// Keep the public directory on the learning home, without interrupting a lesson or account page.
// It stays readable when JavaScript is unavailable, exactly like the standalone reading pages.
function syncPublicDirectory() {
  const directory = document.getElementById('public-maths-resources');
  if (directory) directory.hidden = !['', '#', '#/', '#/home'].includes(window.location.hash);
}
syncPublicDirectory();
window.addEventListener('hashchange', syncPublicDirectory);

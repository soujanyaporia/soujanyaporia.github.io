// The key is supplied only in the share URL's fragment; never commit it.
window.addEventListener('hashchange', () => location.reload());
(async () => {
  const status = document.getElementById('status');
  const encodedKey = new URLSearchParams(location.hash.slice(1)).get('key');

  if (!encodedKey || !/^[A-Za-z0-9_-]{43}$/.test(encodedKey)) {
    status.textContent = 'This link is incomplete. Please use the full share link.';
    return;
  }

  try {
    const bytes = Uint8Array.from(
      atob(encodedKey.replace(/-/g, '+').replace(/_/g, '/') + '='),
      character => character.charCodeAt(0)
    );
    const key = await crypto.subtle.importKey('raw', bytes, 'AES-GCM', false, ['decrypt']);
    const response = await fetch('./document.enc', { credentials: 'omit', referrerPolicy: 'no-referrer' });
    if (!response.ok) throw new Error('Document unavailable');
    const payload = new Uint8Array(await response.arrayBuffer());
    const pdf = await crypto.subtle.decrypt({
      name: 'AES-GCM',
      iv: payload.slice(0, 12),
      additionalData: new TextEncoder().encode('Soujanya Poria CV share v1')
    }, key, payload.slice(12));
    const url = URL.createObjectURL(new Blob([pdf], { type: 'application/pdf' }));

    document.getElementById('open').href = url;
    document.getElementById('download').href = url;
    document.getElementById('actions').hidden = false;
    const viewer = document.getElementById('viewer');
    viewer.src = url;
    viewer.hidden = false;
    status.textContent = 'If the preview does not appear, use Open PDF or Download PDF.';
  } catch {
    status.textContent = 'Unable to open this document. Check that you have the full share link and try again.';
  }
})();

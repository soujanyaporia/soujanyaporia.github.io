const assert = require('node:assert/strict');
const { test } = require('node:test');
const { readFileSync } = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const source = readFileSync(path.join(__dirname, '../assets/js/publications.js'), 'utf8');

function setup(clipboard) {
  const listeners = {};
  const panels = {};
  const document = {
    readyState: 'loading',
    addEventListener(name, handler) { (listeners[name] ||= []).push(handler); },
    getElementById(id) { return panels[id]; }
  };
  const context = { document, navigator: { clipboard }, window: {}, setTimeout, clearTimeout };
  vm.runInNewContext(source, context);
  function paper(id, title) {
    const attrs = {
      'aria-controls': id, 'aria-expanded': 'false',
      'data-bibtex-title': title, 'data-bibtex-authors': 'First Author, Second Author',
      'data-bibtex-year': '2026', 'data-bibtex-venue': 'Conference',
      'data-bibtex-url': 'https://example.org/paper'
    };
    const code = { textContent: '' };
    const status = { textContent: '' };
    const panel = {
      hidden: true,
      querySelector(selector) { return selector === '[data-bibtex-code]' ? code : status; }
    };
    panels[id] = panel;
    const toggle = {
      getAttribute(name) { return attrs[name]; },
      setAttribute(name, value) { attrs[name] = value; },
      closest(selector) { return selector === '.pub-bibtex-local' ? toggle : null; }
    };
    const copy = {
      disabled: false,
      innerHTML: '',
      getAttribute(name) { return attrs['copy-' + name] || 'Copy BibTeX'; },
      setAttribute(name, value) { attrs['copy-' + name] = value; },
      closest(selector) {
        if (selector === '[data-bibtex-copy]') return copy;
        if (selector === '.pub-bibtex-panel') return panel;
        return null;
      }
    };
    return { attrs, panel, toggle, copy, code, status };
  }
  function click(target) { listeners.click.forEach(handler => handler({ target })); }
  return { paper, click };
}

test('BibTeX toggles only its own panel without copying; preserves citation text', () => {
  let writes = 0;
  const app = setup({ writeText() { writes++; return Promise.resolve(); } });
  const first = app.paper('bib-2026-1', 'Research & Results');
  const second = app.paper('bib-2026-2', 'Another paper');
  app.click(first.toggle);
  assert.equal(writes, 0);
  assert.equal(first.panel.hidden, false);
  assert.equal(second.panel.hidden, true);
  assert.equal(first.attrs['aria-expanded'], 'true');
  assert.equal(first.attrs['aria-label'], 'Hide BibTeX for Research & Results');
  assert.match(first.code.textContent, /title=\{Research \\& Results\}/);
  assert.match(first.code.textContent, /First Author and Second Author/);
  const citation = first.code.textContent;
  app.click(first.toggle);
  assert.equal(first.panel.hidden, true);
  assert.equal(first.attrs['aria-expanded'], 'false');
  app.click(first.toggle);
  assert.equal(first.code.textContent, citation);
});

test('Copy writes exactly the displayed citation and announces success', async () => {
  let copied;
  const app = setup({ writeText(text) { copied = text; return Promise.resolve(); } });
  const paper = app.paper('bib-2026-1', 'A paper');
  app.click(paper.toggle);
  // A click on the nested SVG/path must resolve to the same copy button.
  app.click({ closest: selector => paper.copy.closest(selector) });
  assert.equal(paper.copy.disabled, true);
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(copied, paper.code.textContent);
  assert.equal(paper.status.textContent, 'BibTeX copied.');
  assert.equal(paper.copy.disabled, false);
  assert.match(paper.copy.innerHTML, /m5 12/);
  assert.equal(paper.copy.getAttribute('aria-label'), 'Copied');
});

for (const [name, clipboard] of [
  ['unavailable', undefined],
  ['rejected', { writeText() { return Promise.reject(new Error('Denied')); } }],
  ['synchronous error', { writeText() { throw new Error('Denied'); } }]
]) {
  test(`Clipboard ${name} leaves text available for manual copying`, async () => {
    const app = setup(clipboard);
    const paper = app.paper('bib-2026-1', 'A paper');
    app.click(paper.toggle);
    const citation = paper.code.textContent;
    app.click(paper.copy);
    await new Promise(resolve => setImmediate(resolve));
    assert.match(paper.status.textContent, /copy it manually/);
    assert.equal(paper.panel.hidden, false);
    assert.equal(paper.code.textContent, citation);
    assert.equal(paper.copy.disabled, false);
  });
}

const assert = require('node:assert/strict');
const { test } = require('node:test');
const { readFileSync } = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const source = readFileSync(path.join(__dirname, '../assets/js/publications.js'), 'utf8');
const sharedSource = readFileSync(path.join(__dirname, '../assets/declare-core/js/site.js'), 'utf8');
const clipboardSource = sharedSource.slice(sharedSource.indexOf('  var copyIcon ='), sharedSource.indexOf('  /* Code block snippet copy button */'));

function setup(clipboard) {
  const listeners = {};
  const panels = {};
  const document = {
    readyState: 'loading',
    addEventListener(name, handler) { (listeners[name] ||= []).push(handler); },
    getElementById(id) { return panels[id]; }
  };
  const context = { document, navigator: { clipboard }, window: {}, setTimeout, clearTimeout };
  vm.runInNewContext(clipboardSource, context);
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

test('Lab-note code blocks and citations use the same copy icon and clipboard helper', async () => {
  const code = { textContent: '  print("hello")\n' };
  let button, status, copied;
  const pre = {
    classList: { add(name) { assert.equal(name, 'has-copy-control'); } },
    querySelector(selector) { return selector === 'code' ? code : null; },
    appendChild(value) { button = value; },
    insertAdjacentElement(position, value) { status = value; }
  };
  const document = {
    querySelectorAll() { return [pre]; },
    createElement() {
      const attrs = {};
      return {
        setAttribute(key, value) { attrs[key] = value; },
        getAttribute(key) { return attrs[key]; },
        addEventListener(name, handler) { this[name] = handler; }
      };
    }
  };
  const context = { document, window: {}, navigator: { clipboard: { writeText(text) { copied = text; return Promise.resolve(); } } }, setTimeout, clearTimeout };
  const codeBlockSource = sharedSource.slice(sharedSource.indexOf('  function initializeCodeBlockCopy()'), sharedSource.indexOf('  initializeTheme();'));
  vm.runInNewContext(clipboardSource + codeBlockSource + '\ninitializeCodeBlockCopy();', context);
  const citationButton = {};
  context.window.DeclareCopy.initialize(citationButton);
  assert.equal(button.innerHTML, citationButton.innerHTML);
  assert.equal(button.className, 'copy-icon-button code-copy-btn');
  assert.equal(button.getAttribute('aria-label'), 'Copy code snippet');
  button.click();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(copied, code.textContent);
  assert.equal(status.textContent, 'Copied.');
  assert.match(button.innerHTML, /m5 12/);
});

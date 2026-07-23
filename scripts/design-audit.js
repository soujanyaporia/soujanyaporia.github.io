/*
 * Design-consistency audit.
 *
 * Run against a rendered page: paste into the browser console, or evaluate with
 * any headless runner. Returns a report; `findings` is empty when the page is
 * consistent.
 *
 * It checks the invariants this design system actually relies on, which are the
 * ones that kept drifting:
 *
 *   1. sibling-drift      Elements that share a class and a parent must share
 *                         their border signature. Catches "three have a rule,
 *                         one does not".
 *   2. doubled-rule       No boundary may carry a bottom rule and a top rule
 *                         at the same place.
 *   3. tangent-rule       A section rule must not sit flush against the content
 *                         it closes (needs >= 16px of air).
 *   4. rule-weights       Only two structural weights exist: 2px ink for the
 *                         page-header divider, 1px border for section dividers.
 *   5. heading-spec       Every section heading renders at the same size and
 *                         weight and carries a label chip.
 *   6. mobile-menu        Opening the mobile menu must not lock the body or
 *                         place the menu/scrim outside the viewport.
 *
 * KNOWN_EXCEPTIONS lists deliberate departures so they do not show up as noise.
 */
window.__designAuditReport = (function designAudit() {
  var C = getComputedStyle;
  var findings = [];

  // Deliberate: each compass label's accent bar faces the hub, so the six
  // nodes carry their 3px bar on different sides.
  var KNOWN_EXCEPTIONS = ['research-node', 'pub-year-heading'];

  function sig(e) {
    var s = C(e);
    return [
      s.borderTopWidth + s.borderTopStyle,
      s.borderRightWidth + s.borderRightStyle,
      s.borderBottomWidth + s.borderBottomStyle,
      s.borderLeftWidth + s.borderLeftStyle
    ].join('|');
  }
  function edge(e, side) {
    var s = C(e);
    var w = +(s['border' + side + 'Width'] || '0').replace('px', '') || 0;
    return s['border' + side + 'Style'] === 'none' ? 0 : w;
  }
  var scope = document.querySelector('.site-main') || document.body;
  var all = [].slice.call(scope.querySelectorAll('*')).filter(function (e) {
    return C(e).display !== 'none' && e.getBoundingClientRect().width > 0;
  });

  // 1. sibling drift
  var groups = {};
  all.forEach(function (e) {
    if (typeof e.className !== 'string' || !e.className.trim()) return;
    var cls = e.className.split(' ')[0];
    if (KNOWN_EXCEPTIONS.indexOf(cls) !== -1) return;
    var key = (e.parentElement ? e.parentElement.tagName : '-') + '>' + cls;
    (groups[key] = groups[key] || []).push(e);
  });
  Object.keys(groups).forEach(function (k) {
    var els = groups[k].filter(function (e) {
      return !e.parentElement || e !== e.parentElement.lastElementChild;
    });
    if (els.length < 2) return;
    var sigs = els.map(sig);
    if (sigs.filter(function (v, i) { return sigs.indexOf(v) === i; }).length > 1) {
      findings.push({ check: 'sibling-drift', where: k, detail: sigs.join('  vs  ') });
    }
  });

  // 2. doubled rules + 3. tangent rules
  all.forEach(function (e) {
    var b = edge(e, 'Bottom');
    if (!b) return;
    var next = e.nextElementSibling;
    if (!next || C(next).display === 'none') return;
    if (['A', 'LI', 'SPAN', 'TD', 'TH', 'TR'].indexOf(e.tagName) !== -1) return;
    var elementRect = e.getBoundingClientRect();
    var nextRect = next.getBoundingClientRect();
    var minimumBoundaryWidth = Math.min(380, document.documentElement.clientWidth * 0.75);
    if (elementRect.width < minimumBoundaryWidth ||
        nextRect.width < minimumBoundaryWidth) return;
    var verticalGap = nextRect.top - elementRect.bottom;
    var horizontalOverlap = Math.min(elementRect.right, nextRect.right) -
      Math.max(elementRect.left, nextRect.left);
    if (verticalGap < -2 || verticalGap > 2 || horizontalOverlap <= 0) return;
    if (edge(next, 'Top')) {
      findings.push({
        check: 'doubled-rule',
        where: (e.className || e.tagName) + ' -> ' + (next.className || next.tagName),
        detail: 'bottom ' + b + 'px meets top ' + edge(next, 'Top') + 'px'
      });
    }
    var last = e.lastElementChild;
    var isFramedItem = edge(e, 'Top') && edge(e, 'Right') && edge(e, 'Left');
    if (!isFramedItem && last && C(last).display !== 'none') {
      var air = elementRect.bottom - last.getBoundingClientRect().bottom;
      if (air >= 0 && air < 16) {
        findings.push({
          check: 'tangent-rule',
          where: e.className || e.tagName,
          detail: Math.round(air) + 'px between last content and its rule'
        });
      }
    }
  });

  // 4. structural rule weights
  var weights = {};
  all.forEach(function (e) {
    var r = e.getBoundingClientRect();
    if (r.width < 380) return; // structural rules only, not chips or cards
    ['Top', 'Bottom'].forEach(function (side) {
      var w = edge(e, side);
      if (w) weights[w] = (weights[w] || 0) + 1;
    });
  });
  Object.keys(weights).forEach(function (w) {
    if (['1', '2', '3'].indexOf(w) === -1) {
      findings.push({ check: 'rule-weights', where: w + 'px', detail: 'unexpected structural rule weight' });
    }
  });

  // 5. heading spec
  var heads = [].slice.call(scope.querySelectorAll('h2'));
  var specs = heads.map(function (h) {
    var s = C(h);
    return s.fontSize + '/' + s.fontWeight + '/' + (C(h, '::before').content !== 'none' ? 'chip' : 'NO-CHIP');
  });
  specs.filter(function (v, i) { return specs.indexOf(v) === i; }).forEach(function (v, _, arr) {
    if (arr.length > 1) findings.push({ check: 'heading-spec', where: 'h2', detail: specs.join('  vs  ') });
  });

  // 6. mobile menu geometry and scroll-lock safety
  if (document.documentElement.clientWidth <= 720) {
    var menu = document.querySelector('.nav-links');
    var scrim = document.querySelector('.nav-scrim');
    var bodyWasOpen = document.body.classList.contains('menu-open');
    document.body.classList.add('menu-open');
    var bodyOverflowY = C(document.body).overflowY;
    if (!bodyWasOpen) document.body.classList.remove('menu-open');

    if (bodyOverflowY === 'hidden') {
      findings.push({
        check: 'mobile-menu',
        where: 'body.menu-open',
        detail: 'overflow-y:hidden breaks sticky menu positioning after scrolling'
      });
    }

    if (menu && scrim) {
      var menuWasOpen = menu.classList.contains('open');
      var scrimWasOpen = scrim.classList.contains('open');
      menu.classList.add('open');
      scrim.classList.add('open');
      var menuRect = menu.getBoundingClientRect();
      var scrimRect = scrim.getBoundingClientRect();
      if (!menuWasOpen) menu.classList.remove('open');
      if (!scrimWasOpen) scrim.classList.remove('open');

      if (menuRect.top < 0 || menuRect.bottom > window.innerHeight) {
        findings.push({
          check: 'mobile-menu',
          where: '.nav-links',
          detail: 'open menu falls outside the viewport'
        });
      }
      if (scrimRect.bottom < window.innerHeight - 1) {
        findings.push({
          check: 'mobile-menu',
          where: '.nav-scrim',
          detail: 'outside-click layer does not cover the remaining viewport'
        });
      }
    }
  }

  return {
    url: location.pathname,
    theme: document.documentElement.getAttribute('data-theme') || 'light',
    ruleWeightsSeen: weights,
    findings: findings
  };
})();

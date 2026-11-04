import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { AdventureScene } from './AdventureScene';

describe('illustrated question scenes', () => {
  it.each([3, 6, 12, 20])('renders exactly %i countable fireflies', count => {
    const html = renderToStaticMarkup(createElement(AdventureScene, {kind:'count',model:{type:'counters',count}}));
    expect(html.match(/class="counting-firefly"/g)).toHaveLength(count);
    expect(html).toContain(`aria-label="${count} fireflies"`);
    expect(html).not.toContain('play-counters');
  });
  it('preserves grouping when the question teaches equal groups', () => {
    const html = renderToStaticMarkup(createElement(AdventureScene, {kind:'groups',model:{type:'counters',count:12,group:4}}));
    expect(html.match(/class="play-counter-group"/g)).toHaveLength(3);
    expect(html).toContain('12 objects, in groups of 4');
    expect(html).not.toContain('counting-firefly');
  });
  it('preserves mathematical diagram semantics', () => {
    const html = renderToStaticMarkup(createElement(AdventureScene, {kind:'fractionShade',model:{type:'fraction',parts:8,filled:3}}));
    expect(html).toContain('3 of 8 equal parts shaded');
    expect(html.match(/class="filled"/g)).toHaveLength(3);
  });
});

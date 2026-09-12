import { describe, expect, it } from 'vitest';
import { href, parseRoute, type Route } from '../router';

describe('routes added for learning, the lab and transparency', () => {
  it('round-trips every new route and keeps existing lesson routes unchanged', () => {
    const routes: Route[] = [
      { name: 'about' }, { name: 'about', section: 'passport' }, { name: 'coverage' },
      { name: 'teach' }, { name: 'teach', id: 'p3s-equivalent-fractions' }, { name: 'teach', id: 'p6s-ratio-meaning', mode: 'challenge' }, { name: 'teach', id: 'p1-missing-parts', mode: 'review' }, { name: 'guide', id: 'p6s-ratio-meaning' },
      { name: 'lab' }, { name: 'lab', tool: 'fraction-wall' }, { name: 'learn' }, { name: 'lesson', id: 'add-10' },
    ];
    for (const route of routes) expect(parseRoute(href(route))).toEqual(route);
    expect(parseRoute('#/privacy')).toEqual({ name: 'about' });
    expect(parseRoute('#/guide')).toEqual({ name: 'teach' });
  });
});

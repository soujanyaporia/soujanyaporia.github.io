import { expect, it } from 'vitest';
import { makeRagQuestion } from './ragTwoRateAllocation';

function solveVisibleBags(context: string[]) {
  const text = context.join(' ');
  const bagMatch = /filled (\d+) bags with buttons/.exec(text);
  const rateMatch = /(\d+) buttons in each blue bag and (\d+) buttons in each yellow bag/.exec(text);
  const totalMatch = /used (\d+) buttons in all/.exec(text);
  if (!bagMatch || !rateMatch || !totalMatch) throw new Error('Missing a bag count, a rate or the button total');
  const bags = Number(bagMatch[1]);
  const blueRate = Number(rateMatch[1]);
  const yellowRate = Number(rateMatch[2]);
  const buttons = Number(totalMatch[1]);
  expect(blueRate).toBeGreaterThan(0);
  expect(yellowRate).toBeGreaterThan(blueRate);
  expect(yellowRate).toBeLessThan(10);
  expect(bags * yellowRate).toBeLessThan(1000);

  // Try every split, including the endpoints, using only the printed givens.
  const solutions: { blue: number; yellow: number }[] = [];
  for (let blue = 0; blue <= bags; blue++) {
    const yellow = bags - blue;
    if (blue * blueRate + yellow * yellowRate === buttons) solutions.push({ blue, yellow });
  }
  expect(solutions).toHaveLength(1);
  const { blue, yellow } = solutions[0];
  expect(blue).toBeGreaterThan(0);
  expect(yellow).toBeGreaterThan(0);
  return { blue, yellow, bags, blueRate, yellowRate, buttons };
}

it('matches the requested count or ordered pair to the unique split of the visible totals', () => {
  const routes = new Set<string>();
  const contexts = new Set<string>();
  for (let seed = 0; seed < 64; seed++) {
    for (let index = 0; index < 4; index++) {
      const q = makeRagQuestion(seed, index);
      const { blue, yellow, bags, blueRate, yellowRate, buttons } = solveVisibleBags(q.context ?? []);
      contexts.add((q.context ?? []).join(' '));
      expect(q.unit).toBe('bags');
      expect(q.choices).toBeUndefined();
      let target: string;
      if (q.prompt === 'How many blue bags and how many yellow bags did Mei fill?') {
        target = 'both';
        expect(q.structuredResponse).toEqual({ kind: 'number-pair', firstLabel: 'Blue bags', secondLabel: 'Yellow bags' });
        expect(JSON.parse(q.answer)).toEqual([String(blue), String(yellow)]);
      } else {
        const match = /^How many (blue|yellow) bags did Mei fill\?$/.exec(q.prompt);
        if (!match) throw new Error(`Unclear target in ${q.prompt}`);
        target = match[1];
        expect(q.structuredResponse).toBeUndefined();
        expect(q.answer).toBe(String(target === 'blue' ? blue : yellow));
      }

      const first = q.workedSteps?.[0]?.equation;
      const allBlue = `${bags} × ${blueRate} = ${bags * blueRate} buttons`;
      const allYellow = `${bags} × ${yellowRate} = ${bags * yellowRate} buttons`;
      expect([allBlue, allYellow]).toContain(first);
      const startsBlue = first === allBlue;
      routes.add(`${target}/${startsBlue ? 'blue' : 'yellow'}`);
      const found = startsBlue ? yellow : blue;
      const foundColour = startsBlue ? 'yellow' : 'blue';
      const gap = yellowRate - blueRate;
      const equations = q.workedSteps?.map(step => step.equation) ?? [];
      expect(equations).toContain(`${found * gap} ÷ ${gap} = ${found} ${foundColour} bags`);
      expect(equations).toContain(`${blue} × ${blueRate} + ${yellow} × ${yellowRate} = ${buttons} buttons`);
    }
  }
  expect(routes).toEqual(new Set(['blue/yellow', 'yellow/blue', 'blue/blue', 'both/blue']));
  expect(contexts.size).toBeGreaterThan(32);
});

it('reproduces a variation from its seed and index', () => {
  expect(makeRagQuestion(17)).toEqual(makeRagQuestion(17, 0));
  expect(makeRagQuestion(17, 3)).toEqual(makeRagQuestion(17, 3));
  expect(makeRagQuestion(17, 3).key).not.toBe(makeRagQuestion(17, 4).key);
});

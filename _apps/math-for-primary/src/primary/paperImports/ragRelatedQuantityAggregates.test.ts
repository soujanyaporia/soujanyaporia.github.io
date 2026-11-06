import {describe, expect, it} from 'vitest';
import type {Question} from '../generate';
import {makeRagQuestion, RAG_PATTERN} from './ragRelatedQuantityAggregates';

type VisibleQuestion = Pick<Question, 'context' | 'prompt'>;
type VisibleProblem = {
  kind: 'three-total' | 'repeated-price' | 'repeated-mass';
  variable: string;
  unit: string;
  values: number[];
  total: (base: number) => number;
};

function capture(pattern: RegExp, text: string): RegExpExecArray {
  const match = pattern.exec(text);
  if (!match) throw new Error(`Missing visible given matching ${pattern}`);
  return match;
}

// This solver receives only the displayed context and prompt. It computes
// concrete quantities from the story, without reading answers or worked steps.
function solveVisible(q: VisibleQuestion): VisibleProblem {
  const text = (q.context ?? []).join(' ');
  if (text.includes('Nila has')) {
    const variable = capture(/Nila has ([a-z]) beads\./, text)[1];
    const denominator = Number(capture(/Jaya has 1\/(\d+) as many beads as Nila\./, text)[1]);
    const extra = Number(capture(/Jaya has (\d+) fewer beads than Omar\./, text)[1]);
    expect(q.prompt).toBe('Which expression gives the total number of beads the three children have?');
    expect(text).toContain(`${variable} is a positive multiple of ${denominator}.`);
    expect(denominator).toBeGreaterThan(1);
    expect(denominator).toBeLessThanOrEqual(12);
    expect(denominator).not.toBe(3);
    expect(extra).toBeGreaterThan(0);
    expect(extra).not.toBe(5);
    return {
      kind: 'three-total', variable, unit: 'beads',
      values: [denominator, denominator * 4, denominator * 11],
      total: base => {
        const nila = base;
        const jaya = nila / denominator;
        const omar = jaya + extra;
        expect(Number.isInteger(jaya)).toBe(true);
        return nila + jaya + omar;
      },
    };
  }
  if (text.includes('Each notebook costs')) {
    const variable = capture(/Each notebook costs \$([a-z])\./, text)[1];
    const relation = capture(/The price of each board game is \$(\d+) more than the total price of (\d+) notebooks\./, text);
    const extra = Number(relation[1]);
    const notebooks = Number(relation[2]);
    const games = Number(capture(/^Which expression gives the cost of (\d+) board games, in dollars\?$/, q.prompt)[1]);
    expect(text).toContain(`${variable} is a positive whole number.`);
    expect(notebooks).toBeGreaterThan(1);
    expect(games).toBeGreaterThan(1);
    expect(extra).toBeGreaterThan(0);
    expect(notebooks).not.toBe(3);
    expect(games).not.toBe(3);
    expect(extra).not.toBe(25);
    return {
      kind: 'repeated-price', variable, unit: 'dollars', values: [1, 7, 19],
      total: base => {
        let notebookTotal = 0;
        for (let i = 0; i < notebooks; i++) notebookTotal += base;
        const oneGame = notebookTotal + extra;
        let purchase = 0;
        for (let i = 0; i < games; i++) purchase += oneGame;
        return purchase;
      },
    };
  }
  const variable = capture(/One red parcel has a mass of ([a-z]) kg\./, text)[1];
  const extra = Number(capture(/One blue parcel is (\d+) kg heavier than one red parcel\./, text)[1]);
  const count = Number(capture(/^Which expression gives the total mass of (\d+) red parcels and 1 blue parcel, in kg\?$/, q.prompt)[1]);
  expect(text).toContain('All parcels of the same colour have the same mass.');
  expect(text).toContain(`${variable} is positive.`);
  expect(count).toBeGreaterThan(1);
  expect(count).not.toBe(4);
  expect(extra).toBeGreaterThan(0);
  expect(extra).not.toBe(2);
  return {
    kind: 'repeated-mass', variable, unit: 'kg', values: [0.5, 3, 12],
    total: base => {
      const masses = Array.from({length: count}, () => base);
      masses.push(base + extra);
      return masses.reduce((sum, mass) => sum + mass, 0);
    },
  };
}

// A small expression reader independent of the generator's formatter.
function evaluateChoice(text: string, variable: string, value: number): number {
  const m = capture(/^(\d*)([a-z])(?:\/(\d+))? ([+−]) (\d+)$/, text);
  expect(m[2]).toBe(variable);
  const numerator = m[1] === '' ? 1 : Number(m[1]);
  const denominator = m[3] === undefined ? 1 : Number(m[3]);
  expect(numerator).toBeGreaterThan(0);
  expect(denominator).toBeGreaterThan(0);
  return numerator * value / denominator + (m[4] === '+' ? 1 : -1) * Number(m[5]);
}

function visibleOnly(q: Question): VisibleQuestion {
  return {context: q.context, prompt: q.prompt};
}

describe('related quantity aggregate candidate', () => {
  it('has exactly one mathematically correct choice from visible givens across varied seeds', () => {
    const seeds = [...Array.from({length: 80}, (_, i) => i * 37 - 500), 0, 1, 2, 2147483647, 4294967295];
    const seenKinds = new Set<string>();
    const answerPositions = new Set<number>();
    const variations = new Map<string, Set<string>>();
    for (const seed of seeds) {
      for (let index = 0; index < 6; index++) {
        const q = makeRagQuestion(seed, index);
        const visible = visibleOnly(q);
        const problem = solveVisible(visible);
        seenKinds.add(problem.kind);
        const variants = variations.get(problem.kind) ?? new Set<string>();
        variants.add(JSON.stringify(visible));
        variations.set(problem.kind, variants);
        expect(q.unit).toBe(problem.unit);
        expect(q.picture).toBeUndefined();
        expect(q.structuredResponse).toBeUndefined();
        expect(q.choices).toHaveLength(4);
        const choices = q.choices!;
        expect(new Set(choices).size).toBe(4);
        const expected = problem.values.map(value => problem.total(value));
        const signatures = choices.map(choice => problem.values.map(value => evaluateChoice(choice, problem.variable, value)));
        // Distinct strings must also be mathematically distinct linear expressions.
        expect(new Set(signatures.map(values => values.join('|'))).size).toBe(4);
        const matchingChoices = choices.filter((_, at) => signatures[at].every((value, i) => Math.abs(value - expected[i]) < 1e-9));
        expect(matchingChoices).toHaveLength(1);
        expect(q.answer).toBe(matchingChoices[0]);
        answerPositions.add(choices.indexOf(matchingChoices[0]));
        expect(q.hint.length).toBeGreaterThan(20);
        expect(q.workedSteps!.length).toBeGreaterThanOrEqual(3);
        expect(q.workedSteps!.every(step => step.text.trim().length > 0)).toBe(true);
        expect(q.explanation).toBe(q.workedSteps!.map(step => step.text).join(' '));
        const finalStep = q.workedSteps![q.workedSteps!.length - 1].text;
        expect(finalStep).toContain(matchingChoices[0]);
      }
    }
    expect([...seenKinds].sort()).toEqual(['repeated-mass', 'repeated-price', 'three-total']);
    expect(answerPositions.size).toBe(4);
    for (const variants of variations.values()) expect(variants.size).toBeGreaterThan(15);
  });

  it('independently handles comparison direction and applies an offset the correct number of times', () => {
    const beads = solveVisible({
      context: [
        'At a craft club, Nila has n beads.',
        'Jaya has 1/4 as many beads as Nila.',
        'Jaya has 6 fewer beads than Omar.',
        'n is a positive multiple of 4.',
      ],
      prompt: 'Which expression gives the total number of beads the three children have?',
    });
    // 12, 3 and 9 beads; the comparison must be reversed to find Omar.
    expect(beads.total(12)).toBe(24);
    expect(evaluateChoice('3n/2 + 6', 'n', 12)).toBe(24);
    expect(evaluateChoice('3n/2 − 6', 'n', 12)).not.toBe(24);

    const prices = solveVisible({
      context: [
        'Each notebook costs $a.',
        'The price of each board game is $9 more than the total price of 5 notebooks.',
        'a is a positive whole number.',
      ],
      prompt: 'Which expression gives the cost of 4 board games, in dollars?',
    });
    // Each game costs 19 dollars; all four games include the extra charge.
    expect(prices.total(2)).toBe(76);
    expect(evaluateChoice('20a + 36', 'a', 2)).toBe(76);
    expect(evaluateChoice('20a + 9', 'a', 2)).not.toBe(76);

    const masses = solveVisible({
      context: [
        'One red parcel has a mass of b kg.',
        'One blue parcel is 3 kg heavier than one red parcel.',
        'All parcels of the same colour have the same mass.',
        'b is positive.',
      ],
      prompt: 'Which expression gives the total mass of 6 red parcels and 1 blue parcel, in kg?',
    });
    // Six 2 kg parcels plus one 5 kg parcel; the excess occurs only once.
    expect(masses.total(2)).toBe(17);
    expect(evaluateChoice('7b + 3', 'b', 2)).toBe(17);
    expect(evaluateChoice('7b + 18', 'b', 2)).not.toBe(17);
  });

  it('is reproducible and visits all three variants through consecutive indices', () => {
    for (const seed of [-19, 0, 5, 73, 4294967295]) {
      expect(makeRagQuestion(seed)).toEqual(makeRagQuestion(seed, 0));
      const questions = [0, 1, 2].map(index => makeRagQuestion(seed, index));
      for (let index = 0; index < questions.length; index++) {
        expect(questions[index]).toEqual(makeRagQuestion(seed, index));
      }
      expect(new Set(questions.map(q => q.key)).size).toBe(3);
      expect(new Set(questions.map(q => solveVisible(visibleOnly(q)).kind)).size).toBe(3);
    }
    expect(RAG_PATTERN.level).toBe(6);
    expect(RAG_PATTERN.canonicalPatternId).toBe('p6-repeated-or-related-quantity-aggregates');
    expect(RAG_PATTERN.skillIds).toEqual(['P6.S.ALG.01', 'P6.S.ALG.02', 'P6.S.ALG.03']);
  });
});

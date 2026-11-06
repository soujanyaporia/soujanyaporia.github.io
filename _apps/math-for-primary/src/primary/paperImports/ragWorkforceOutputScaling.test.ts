import {describe, expect, it} from 'vitest';
import type {Question} from '../generate';
import {makeRagQuestion, RAG_PATTERN} from './ragWorkforceOutputScaling';

type Fraction = {n: number; d: number};
type Visible = Pick<Question, 'context' | 'prompt'>;
type Kind = 'machines' | 'stock' | 'cleaners' | 'workers';
type Solution = {
  kind: Kind;
  expected: Fraction;
  unit: string;
  inputs: number[];
  increased?: boolean;
};

function captures(text: string, pattern: RegExp): string[] {
  const match = pattern.exec(text);
  if (!match) throw new Error(`Missing visible givens for ${pattern}`);
  return match.slice(1);
}

function readFraction(text: string): Fraction {
  const match = /^(\d+)(?:\/([1-9]\d*))?$/.exec(text);
  if (!match) throw new Error(`Invalid numerical response: ${text}`);
  return {n: Number(match[1]), d: Number(match[2] ?? 1)};
}

function equal(a: Fraction, b: Fraction): boolean {
  return a.n * b.d === b.n * a.d;
}

function reduced(value: Fraction): boolean {
  for (let divisor = 2; divisor <= Math.min(value.n, value.d); divisor++) {
    if (value.n % divisor === 0 && value.d % divisor === 0) return false;
  }
  return true;
}

// Only pupil-visible statements enter this solver. It cannot access the answer,
// key, worked solution, random seed or generation parameters.
function solveVisible(q: Visible): Solution {
  const text = [...(q.context ?? []), q.prompt].join(' ');
  if (text.includes('One bottling machine')) {
    const [batch, duration] = captures(text, /One bottling machine fills (\d+) bottles in (\d+) minutes\./).map(Number);
    const [machines] = captures(text, /(\d+) of these machines begin together/).map(Number);
    const [target] = captures(q.prompt, /fill (\d+) bottles altogether/).map(Number);
    const perMinute = batch / duration;
    let output = 0;
    let minutes = 0;
    while (output < target && minutes < 1000) {
      for (let machine = 0; machine < machines; machine++) output += perMinute;
      minutes++;
    }
    if (output !== target) throw new Error('Output is not reached in whole minutes');
    return {kind: 'machines', expected: {n: minutes, d: 1}, unit: 'min', inputs: [batch, duration, machines, target]};
  }
  if (text.includes('Each bracelet uses')) {
    const [beads] = captures(text, /Each bracelet uses (\d+) beads/).map(Number);
    const [originalDays, originalRate] = captures(text, /used up after (\d+) days when the club makes (\d+) bracelets each day/).map(Number);
    const [newRate] = captures(q.prompt, /makes (\d+) bracelets each day/).map(Number);
    let stock = 0;
    for (let day = 0; day < originalDays; day++) stock += originalRate * beads;
    let days = 0;
    while (stock > 0 && days < 1000) {
      stock -= newRate * beads;
      days++;
    }
    if (stock !== 0) throw new Error('The stock does not last an exact number of days');
    return {kind: 'stock', expected: {n: days, d: 1}, unit: 'days', inputs: [beads, originalDays, originalRate, newRate], increased: newRate > originalRate};
  }
  if (text.includes('cleaners finishes cleaning')) {
    const [workersText, timeText] = captures(text, /A team of (\d+) cleaners finishes cleaning a hall in (\d+\/\d+) hour/);
    const originalWorkers = Number(workersText);
    const originalTime = readFraction(timeText);
    const [newWorkers] = captures(q.prompt, /How long would (\d+) cleaners need/).map(Number);
    // Equate the total cleaner-hours for the unchanged job.
    const expected = {n: originalWorkers * originalTime.n, d: newWorkers * originalTime.d};
    return {kind: 'cleaners', expected, unit: 'h', inputs: [originalWorkers, originalTime.n, originalTime.d, newWorkers], increased: newWorkers > originalWorkers};
  }
  if (text.includes('At a packing table')) {
    const [referenceWorkers, referenceOutput, referenceHours] = captures(text, /At a packing table, (\d+) workers pack (\d+) boxes in (\d+) hours/).map(Number);
    const [targetHours, targetOutput] = captures(q.prompt, /full (\d+) hours to pack (\d+) boxes/).map(Number);
    const oneWorkerContribution = referenceOutput / referenceWorkers / referenceHours * targetHours;
    let workers = 0;
    let output = 0;
    while (output < targetOutput && workers < 100) {
      output += oneWorkerContribution;
      workers++;
    }
    if (output !== targetOutput) throw new Error('No exact whole-worker solution');
    return {kind: 'workers', expected: {n: workers, d: 1}, unit: 'workers', inputs: [referenceWorkers, referenceOutput, referenceHours, targetHours, targetOutput]};
  }
  throw new Error('Unrecognised visible question');
}

const visible = (q: Question): Visible => ({context: q.context, prompt: q.prompt});

const fixtures: {question: Visible; expected: string; kind: Kind}[] = [
  {
    question: {
      context: ['One bottling machine fills 60 bottles in 5 minutes.', '3 of these machines begin together and run without a break. Each fills bottles at the same steady rate.'],
      prompt: 'How many minutes will they need to fill 252 bottles altogether?',
    },
    expected: '7',
    kind: 'machines',
  },
  {
    question: {
      context: ['A craft club starts with a full box of beads. Each bracelet uses 4 beads.', 'The box is used up after 9 days when the club makes 20 bracelets each day. No beads are wasted.'],
      prompt: 'If the club starts with the same full box and makes 12 bracelets each day, how many days will the beads last?',
    },
    expected: '15',
    kind: 'stock',
  },
  {
    question: {
      context: ['A team of 4 cleaners finishes cleaning a hall in 3/8 hour.', 'Each cleaner works at the same steady rate. In either team, all cleaners start together and work without a break.'],
      prompt: 'How long would 6 cleaners need for that hall? Choose the time in hours.',
    },
    expected: '1/4',
    kind: 'cleaners',
  },
  {
    question: {
      context: ['At a packing table, 3 workers pack 270 boxes in 5 hours.', 'Every worker packs boxes at the same steady rate. All workers start together and work without a break.'],
      prompt: 'How many workers must work for the full 3 hours to pack 432 boxes?',
    },
    expected: '8',
    kind: 'workers',
  },
];

describe('workforce-output scaling candidate', () => {
  it('checks the independent solver against hand-calculated visible examples', () => {
    for (const fixture of fixtures) {
      const solved = solveVisible(fixture.question);
      expect(solved.kind).toBe(fixture.kind);
      expect(equal(solved.expected, readFraction(fixture.expected))).toBe(true);
    }
  });

  it('solves generated visible givens and validates response constraints across varied seeds', () => {
    const seenKinds = new Set<Kind>();
    for (let seed = -20; seed < 100; seed++) {
      for (let index = 0; index < 8; index++) {
        const q = makeRagQuestion(seed, index);
        const solved = solveVisible(visible(q));
        seenKinds.add(solved.kind);
        expect(equal(readFraction(q.answer), solved.expected)).toBe(true);
        expect(q.unit).toBe(solved.unit);
        expect(solved.inputs.every(n => Number.isSafeInteger(n) && n > 0 && n <= 10000)).toBe(true);
        expect(q.picture).toBeUndefined();
        expect(q.structuredResponse).toBeUndefined();
        expect(q.workedSteps?.length).toBeGreaterThanOrEqual(2);
        expect(q.workedSteps?.every(step => step.text.length > 0 && Boolean(step.equation))).toBe(true);
        expect(q.hint.length).toBeGreaterThan(0);
        expect(q.explanation.length).toBeGreaterThan(0);

        if (solved.kind === 'cleaners') {
          expect(solved.expected.n).toBeGreaterThan(0);
          expect(solved.expected.n).toBeLessThan(solved.expected.d);
          expect(q.choices).toHaveLength(4);
          const choices = q.choices ?? [];
          expect(choices).toContain(q.answer);
          const values = choices.map(readFraction);
          expect(values.every(reduced)).toBe(true);
          expect(values.filter(value => equal(value, solved.expected))).toHaveLength(1);
          for (let a = 0; a < values.length; a++) {
            for (let b = a + 1; b < values.length; b++) expect(equal(values[a], values[b])).toBe(false);
          }
          const [originalWorkers, numerator, denominator, newWorkers] = solved.inputs;
          const originalTime = numerator / denominator;
          const newTime = solved.expected.n / solved.expected.d;
          expect(newWorkers > originalWorkers ? newTime < originalTime : newTime > originalTime).toBe(true);
        } else {
          expect(q.choices).toBeUndefined();
          expect(q.answer).toMatch(/^[1-9]\d*$/);
          if (solved.kind === 'machines') expect(Number(q.answer)).toBeLessThanOrEqual(19);
          if (solved.kind === 'workers') expect(Number(q.answer)).toBeLessThanOrEqual(9);
          if (solved.kind === 'stock') {
            expect(Number(q.answer)).toBeLessThanOrEqual(25);
            const [, originalDays, originalRate, newRate] = solved.inputs;
            expect(newRate > originalRate ? Number(q.answer) < originalDays : Number(q.answer) > originalDays).toBe(true);
          }
        }
      }
    }
    expect([...seenKinds].sort()).toEqual(['cleaners', 'machines', 'stock', 'workers']);
  });

  it('is reproducible and supplies diverse visible questions in all four forms', () => {
    const signatures = new Map<Kind, Set<string>>();
    const directions = new Set<string>();
    for (let seed = 0; seed < 64; seed++) {
      const kindsForSeed = new Set<Kind>();
      for (let index = 0; index < 4; index++) {
        const q = makeRagQuestion(seed, index);
        expect(makeRagQuestion(seed, index)).toEqual(q);
        const solved = solveVisible(visible(q));
        kindsForSeed.add(solved.kind);
        const group = signatures.get(solved.kind) ?? new Set<string>();
        group.add(JSON.stringify(visible(q)));
        signatures.set(solved.kind, group);
        if (solved.increased !== undefined) directions.add(`${solved.kind}:${solved.increased}`);
      }
      expect(kindsForSeed.size).toBe(4);
    }
    for (const group of signatures.values()) expect(group.size).toBeGreaterThan(20);
    expect([...directions].sort()).toEqual(['cleaners:false', 'cleaners:true', 'stock:false', 'stock:true']);
    for (const seed of [-2147483648, -1, 0, 2147483647]) {
      for (const index of [0, 1, 2, 3, 100]) {
        const q = makeRagQuestion(seed, index);
        expect(equal(readFraction(q.answer), solveVisible(visible(q)).expected)).toBe(true);
        expect(makeRagQuestion(seed, index)).toEqual(q);
      }
    }
    expect(makeRagQuestion(12)).toEqual(makeRagQuestion(12, 0));
    expect(RAG_PATTERN.level).toBe(5);
    expect(RAG_PATTERN.canonicalPatternId).toBe('p5-workforce-output-scaling');
  });

  it('recomputes from changed visible givens without any stored answer', () => {
    const machineExample = fixtures[0].question;
    const changedMachine = {...machineExample, prompt: machineExample.prompt.replace('252', '504')};
    expect(equal(solveVisible(changedMachine).expected, readFraction('14'))).toBe(true);
    const stockExample = fixtures[1].question;
    const changedStock = {...stockExample, prompt: stockExample.prompt.replace('12 bracelets', '6 bracelets')};
    expect(equal(solveVisible(changedStock).expected, readFraction('30'))).toBe(true);
    const workerExample = fixtures[3].question;
    const changedWorkers = {...workerExample, prompt: workerExample.prompt.replace('432 boxes', '216 boxes')};
    expect(equal(solveVisible(changedWorkers).expected, readFraction('4'))).toBe(true);
  });
});

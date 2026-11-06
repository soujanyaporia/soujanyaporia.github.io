import {describe, expect, it} from 'vitest';
import type {Question} from '../generate';
import {makeRagQuestion, RAG_PATTERN} from './ragInstalmentRepayment';

type VisibleQuestion = Pick<Question, 'prompt' | 'context' | 'unit'>;

function cents(text: string): number {
  const clean = text.replace(/,/g, '');
  if (!/^\d+\.\d{2}$/.test(clean)) throw new Error('Expected dollars and two cent digits');
  const [whole, fraction] = clean.split('.');
  return Number(whole) * 100 + Number(fraction);
}

// Only pupil-visible givens are accepted: no answer, proof or generator parameters.
function solveVisible(q: VisibleQuestion) {
  const text = (q.context ?? []).join(' ');
  const priceMatch = /priced at \$(\d[\d,]*\.\d{2})\./.exec(text);
  const depositMatch = /deposit of \$(\d[\d,]*\.\d{2})\./.exec(text);
  const yearsMatch = /equal monthly instalments for ([1-9]\d*) years\./.exec(text);
  if (!priceMatch || !depositMatch || !yearsMatch) throw new Error('Missing repayment givens');
  if (!text.includes('There is no interest or extra charge.')) throw new Error('Unspecified charges');
  const priceCents = cents(priceMatch[1]);
  const depositCents = cents(depositMatch[1]);
  const years = Number(yearsMatch[1]);
  // Count the twelve payment periods in each visible year independently.
  let months = 0;
  for (let year = 0; year < years; year++) months += 12;
  const balanceCents = priceCents - depositCents;
  if (depositCents <= 0 || balanceCents <= 0 || balanceCents % months !== 0) {
    throw new Error('Invalid or inexact repayment plan');
  }
  return {priceCents, depositCents, years, months, monthlyCents: balanceCents / months};
}

function visible(q: Question): VisibleQuestion {
  return {prompt: q.prompt, context: q.context, unit: q.unit};
}

const cashAnswer = (amountCents: number): string =>
  `${Math.floor(amountCents / 100)}.${String(amountCents % 100).padStart(2, '0')}`;

describe('monthly instalments from repayment years', () => {
  it('checks the independent solver against a hand-calculated visible example', () => {
    const solved = solveVisible({
      prompt: 'How much will the family pay each month after the deposit?',
      context: [
        'A family is buying a car priced at $84,600.00.',
        'Their first payment is a deposit of $16,200.00.',
        'They will pay the balance in equal monthly instalments for 3 years.',
        'There is no interest or extra charge.',
      ],
      unit: 'dollars',
    });
    expect(solved.months).toBe(36);
    expect(solved.monthlyCents).toBe(190000);
  });

  it('independently solves visible givens across varied seeds and indices', () => {
    const yearsSeen = new Set<number>();
    const settingsSeen = new Set<string>();
    const statementsSeen = new Set<string>();
    for (let seed = -20; seed < 80; seed++) {
      for (let index = 0; index < 12; index++) {
        const q = makeRagQuestion(seed, index);
        const solved = solveVisible(visible(q));
        expect(q.answer).toBe(cashAnswer(solved.monthlyCents));
        expect(cents(q.answer) * solved.months + solved.depositCents).toBe(solved.priceCents);
        expect(solved.monthlyCents % 100).toBe(0);
        expect(solved.priceCents).toBeLessThanOrEqual(10000000 * 100);
        expect(solved.years).toBeGreaterThanOrEqual(3);
        expect(solved.years).toBeLessThanOrEqual(25);
        expect(q.unit).toBe('dollars');
        expect(q.prompt).toContain('each month after the deposit');
        expect(q.choices).toBeUndefined();
        expect(q.structuredResponse).toBeUndefined();
        expect(q.picture).toBeUndefined();
        expect(q.workedSteps).toHaveLength(3);
        for (const step of q.workedSteps ?? []) {
          expect(step.text.length).toBeGreaterThan(10);
          expect(step.equation).toContain('=');
          expect(q.explanation).toContain(step.text);
        }
        yearsSeen.add(solved.years);
        settingsSeen.add(q.context?.[0]?.includes('flat') ? 'flat' : 'car');
        statementsSeen.add(JSON.stringify(q.context));
      }
    }
    expect(yearsSeen.size).toBeGreaterThanOrEqual(6);
    expect(settingsSeen.size).toBe(2);
    expect(statementsSeen.size).toBeGreaterThan(100);
  });

  it('is deterministic and supports large and negative seeds', () => {
    for (const seed of [-2147483648, -1, 0, 42, 2147483647, Number.MAX_SAFE_INTEGER]) {
      for (const index of [0, 1, 17]) {
        const q = makeRagQuestion(seed, index);
        expect(makeRagQuestion(seed, index)).toEqual(q);
        expect(q.answer).toBe(cashAnswer(solveVisible(visible(q)).monthlyCents));
      }
    }
    expect(makeRagQuestion(19)).toEqual(makeRagQuestion(19, 0));
    expect(new Set(Array.from({length: 20}, (_, index) =>
      JSON.stringify(makeRagQuestion(19, index).context))).size).toBeGreaterThan(1);
    expect(RAG_PATTERN.level).toBe(5);
    expect(RAG_PATTERN.canonicalPatternId).toBe('p5-instalment-repayment');
    expect(RAG_PATTERN.id).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    expect(RAG_PATTERN.skillIds).toEqual(['P5.S.RATE.01', 'P5.S.RATE.02']);
  });
});

import { describe, expect, it } from 'vitest';
import { correctAnswer, type Question } from '../generate';
import { makeRagQuestion, RAG_PATTERN } from './ragRateComparison';

type VisibleQuestion = Pick<Question, 'prompt' | 'context'>;

type Solution =
  | {
      kind: 'statements';
      answer: string;
      firstJudgement: string;
      secondJudgement: string;
      interval: number;
      duration: number;
      rateR: number;
      rateS: number;
      total: number;
    }
  | {
      kind: 'difference';
      answer: string;
      winner: string;
      rates: number[];
      durations: number[];
      difference: number;
    }
  | {
      kind: 'completion';
      answer: string;
      winner: string;
      denominators: number[];
      partTimes: number[];
      totalTimes: number[];
    };

function matchRequired(pattern: RegExp, text: string): RegExpExecArray {
  const match = pattern.exec(text);
  if (!match) throw new Error(`Missing visible information matching ${pattern}`);
  return match;
}

// This solver receives only the displayed context and prompt.
// It cannot read an answer, hint, worked solution, seed or generation parameters.
function solveVisible(question: VisibleQuestion): Solution {
  const context = (question.context ?? []).join('\n');

  if (question.prompt.startsWith('Judge both statements.')) {
    const printerR = matchRequired(/Printer R makes (\d+) pages every second\./, context);
    const printerS = matchRequired(/Printer S makes (\d+) pages every (\d+) seconds\./, context);
    const run = matchRequired(/run at steady rates for (\d+) seconds\./, context);
    const claim = matchRequired(/produce (\d+) pages in (\d+) seconds\./, question.prompt);
    const pagesR = Number(printerR[1]);
    const pagesS = Number(printerS[1]);
    const interval = Number(printerS[2]);
    const duration = Number(run[1]);
    if (duration !== Number(claim[2])) throw new Error('The claim uses a different printing duration.');
    const total = pagesR * duration + pagesS * duration / interval;
    const firstJudgement = pagesS > pagesR * interval ? 'True' : 'False';
    const secondJudgement = total === Number(claim[1]) ? 'True' : 'False';
    return {
      kind: 'statements',
      answer: `(a) ${firstJudgement}, (b) ${secondJudgement}`,
      firstJudgement,
      secondJudgement,
      interval,
      duration,
      rateR: pagesR,
      rateS: pagesS / interval,
      total,
    };
  }

  if (question.prompt.startsWith('(a) Which printer works faster?')) {
    const printerP = matchRequired(/Printer P makes (\d+) copies in (\d+) minutes\./, context);
    const printerQ = matchRequired(/Printer Q makes (\d+) copies in (\d+) minutes\./, context);
    const amountP = Number(printerP[1]);
    const durationP = Number(printerP[2]);
    const amountQ = Number(printerQ[1]);
    const durationQ = Number(printerQ[2]);
    const winner = amountP * durationQ > amountQ * durationP ? 'Printer P' : 'Printer Q';
    const difference = Math.abs(amountP * durationQ - amountQ * durationP) / (durationP * durationQ);
    return {
      kind: 'difference',
      answer: `(a) ${winner}, (b) ${difference} copies`,
      winner,
      rates: [amountP / durationP, amountQ / durationQ],
      durations: [durationP, durationQ],
      difference,
    };
  }

  if (question.prompt === 'Who finishes painting a whole board first?') {
    const painters = [...context.matchAll(/([A-Za-z]+) paints 1\/(\d+) of a board in (\d+) minutes\./g)];
    if (painters.length !== 2) throw new Error('Expected two visible painting rates.');
    const denominators = painters.map(painter => Number(painter[2]));
    const partTimes = painters.map(painter => Number(painter[3]));
    // Repeated addition independently reconstructs the time for all equal parts.
    const totalTimes = denominators.map((parts, painterIndex) =>
      Array.from({ length: parts }, () => partTimes[painterIndex]).reduce((sum, minutes) => sum + minutes, 0),
    );
    if (totalTimes[0] === totalTimes[1]) throw new Error('Expected one person to finish first.');
    const winner = painters[totalTimes[0] < totalTimes[1] ? 0 : 1][1];
    return { kind: 'completion', answer: winner, winner, denominators, partTimes, totalTimes };
  }

  throw new Error('Unrecognised visible question.');
}

describe('rate comparison candidate', () => {
  it('checks the independent solver against hand-calculated visible examples', () => {
    expect(solveVisible({
      context: [
        'Printer R makes 6 pages every second.',
        'Printer S makes 14 pages every 4 seconds.',
        'Both printers start together and run at steady rates for 12 seconds.',
      ],
      prompt: 'Judge both statements. (a) Printer S works faster than Printer R. (b) Together, the printers produce 114 pages in 12 seconds. Choose True, False or Not possible to tell for each statement.',
    }).answer).toBe('(a) False, (b) True');

    expect(solveVisible({
      context: [
        'Printer P makes 84 copies in 3 minutes.',
        'Printer Q makes 200 copies in 5 minutes.',
      ],
      prompt: '(a) Which printer works faster? (b) How many extra copies does the faster printer make in one minute? Choose the answer that gives both parts.',
    }).answer).toBe('(a) Printer Q, (b) 12 copies');

    expect(solveVisible({
      context: [
        'Lina and Omar each have an unpainted board of the same size. They start together and each paints at a steady rate.',
        'Lina paints 1/5 of a board in 3 minutes.',
        'Omar paints 1/8 of a board in 2 minutes.',
      ],
      prompt: 'Who finishes painting a whole board first?',
    }).answer).toBe('Lina');
  });

  it('solves visible givens across varied seeds and indices through the existing answer checker', () => {
    const seeds = [...Array.from({ length: 120 }, (_, offset) => offset - 40), -2147483648, 2147483647];
    const variants = new Set<string>();
    const statementAnswers = new Set<string>();
    const differenceWinners = new Set<string>();
    const completionWinnerPositions = new Set<number>();
    const visibleQuestions = new Set<string>();
    const keys = new Set<string>();

    for (const seed of seeds) {
      for (let index = 0; index < 6; index += 1) {
        const question = makeRagQuestion(seed, index);
        const visible = { prompt: question.prompt, context: question.context };
        const solved = solveVisible(visible);
        variants.add(solved.kind);
        visibleQuestions.add(JSON.stringify(visible));
        expect(keys.has(question.key)).toBe(false);
        keys.add(question.key);
        expect(question.answer).toBe(solved.answer);
        expect(correctAnswer(question, solved.answer)).toBe(true);
        expect(question.choices).toBeDefined();
        const choices = question.choices ?? [];
        expect(new Set(choices).size).toBe(choices.length);
        expect(choices.filter(choice => choice === solved.answer)).toHaveLength(1);
        for (const choice of choices) {
          expect(correctAnswer(question, choice)).toBe(choice === solved.answer);
        }
        expect(correctAnswer(question, '')).toBe(false);
        expect(question.hint.length).toBeGreaterThan(20);
        expect(question.workedSteps?.length ?? 0).toBeGreaterThanOrEqual(4);
        expect(question.explanation).toBe(
          question.workedSteps?.map(step => [step.text, step.equation].filter(Boolean).join(' ')).join(' '),
        );
        expect(question.picture).toBeUndefined();

        if (solved.kind === 'statements') {
          expect(choices).toHaveLength(9);
          expect(choices).toContain('(a) Not possible to tell, (b) Not possible to tell');
          expect(solved.duration % solved.interval).toBe(0);
          expect(Number.isInteger(solved.total)).toBe(true);
          expect(Number.isInteger(solved.rateS)).toBe(false);
          expect(solved.rateR).toBeGreaterThan(0);
          expect(solved.rateS).toBeGreaterThan(0);
          expect(solved.rateR).not.toBe(solved.rateS);
          statementAnswers.add(solved.answer);
        } else if (solved.kind === 'difference') {
          expect(choices).toHaveLength(4);
          expect(solved.rates.every(rate => Number.isInteger(rate) && rate >= 15 && rate <= 80)).toBe(true);
          expect(solved.durations.every(duration => duration >= 2 && duration <= 8)).toBe(true);
          expect(solved.durations[0]).not.toBe(solved.durations[1]);
          expect(solved.difference).toBeGreaterThanOrEqual(5);
          expect(solved.difference).toBeLessThanOrEqual(30);
          expect(Number.isInteger(solved.difference)).toBe(true);
          differenceWinners.add(solved.winner);
        } else {
          expect(choices).toHaveLength(3);
          expect(choices).toContain('They finish together');
          expect(solved.denominators.every(value => value >= 3 && value <= 12)).toBe(true);
          expect(solved.partTimes.every(value => value >= 2 && value <= 6)).toBe(true);
          expect(solved.totalTimes.every(value => Number.isInteger(value) && value > 0 && value <= 72)).toBe(true);
          expect(solved.totalTimes[0]).not.toBe(solved.totalTimes[1]);
          expect(question.context?.[0]).toContain('same size');
          expect(question.context?.[0]).toContain('start together');
          expect(question.context?.[0]).toContain('steady rate');
          completionWinnerPositions.add(solved.totalTimes[0] < solved.totalTimes[1] ? 0 : 1);
        }
      }
    }

    expect([...variants].sort()).toEqual(['completion', 'difference', 'statements']);
    expect(statementAnswers.size).toBe(4);
    expect([...differenceWinners].sort()).toEqual(['Printer P', 'Printer Q']);
    expect([...completionWinnerPositions].sort()).toEqual([0, 1]);
    expect(visibleQuestions.size).toBeGreaterThan(150);
  });

  it('keeps metadata and repeated generation deterministic', () => {
    expect(RAG_PATTERN.id).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    expect(RAG_PATTERN.level).toBe(5);
    expect(RAG_PATTERN.canonicalPatternId).toBe('p5-rate-comparison');
    expect(RAG_PATTERN.skillIds).toEqual(['P5.S.RATE.01', 'P5.S.RATE.02']);
    for (const seed of [-991, 0, 8, 123456]) {
      expect(makeRagQuestion(seed)).toEqual(makeRagQuestion(seed, 0));
      for (let index = 0; index < 12; index += 1) {
        expect(makeRagQuestion(seed, index)).toEqual(makeRagQuestion(seed, index));
      }
    }
  });
});

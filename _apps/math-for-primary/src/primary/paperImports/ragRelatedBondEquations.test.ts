import { expect, it } from 'vitest';
import { correctAnswer } from '../generate';
import { makeRagQuestion } from './ragRelatedBondEquations';

const questions = Array.from({ length: 40 }, (_, seed) =>
  Array.from({ length: 4 }, (_, index) => makeRagQuestion(seed, index))
).flat();

function readEquation(text: string) {
  const match = /^(\d+)\s*([+−-])\s*(\d+)\s*=\s*(\d+)$/.exec(text);
  if (!match) throw new Error(`Unreadable equation: ${text}`);
  const left = Number(match[1]);
  const right = Number(match[3]);
  const result = Number(match[4]);
  const addition = match[2] === '+';
  return { left, right, result, addition, trueEquation: (addition ? left + right : left - right) === result };
}

it('counts the two visible trays and checks every box in both equations', () => {
  const pictured = questions.filter(q => q.picture?.type === 'paper' && q.picture.layout === 'cards');
  expect(pictured).toHaveLength(40);
  for (const q of pictured) {
    const p = q.picture;
    if (p?.type !== 'paper' || p.layout !== 'cards') throw new Error('Missing trays');
    expect(p.cards.map(c => c.label)).toEqual(['Tray A', 'Tray B']);
    const [a, b] = p.cards.map(c => {
      if (c.icon !== 'fruit' || !c.count || c.removed) throw new Error('Expected a tray of whole apples');
      return c.count;
    });
    expect(q.context?.join(' ')).toContain('Start with Tray A, then add Tray B');
    expect(q.context?.join(' ')).toContain('take away Tray B');
    const slots = [a, b, a + b, a + b, b, a].map(String);
    const solution = JSON.stringify(slots);
    expect(q.answer).toBe(solution);
    expect(correctAnswer(q, solution)).toBe(true);
    expect(correctAnswer(q, JSON.stringify(slots.slice(0, 3)))).toBe(false);
    for (let i = 0; i < slots.length; i++) {
      const changed = slots.slice();
      changed[i] = String(Number(changed[i]) + 1);
      expect(correctAnswer(q, JSON.stringify(changed))).toBe(false);
    }
  }
});

it('reverses the displayed subtraction and accepts either order of addition', () => {
  const constructed = questions.filter(q => q.numberSentence);
  expect(constructed).toHaveLength(40);
  for (const q of constructed) {
    const e = readEquation(q.display ?? '');
    expect(e.addition).toBe(false);
    expect(e.trueEquation).toBe(true);
    expect(e.left).toBeLessThanOrEqual(100);
    expect(e.result).toBeGreaterThan(0);
    const answers = [
      `${e.result} + ${e.right} = ${e.left}`,
      `${e.right} + ${e.result} = ${e.left}`,
    ];
    expect(answers).toContain(q.answer);
    for (const answer of answers) expect(correctAnswer(q, answer)).toBe(true);
    expect(correctAnswer(q, q.display!)).toBe(false);
    expect(correctAnswer(q, `0 + ${e.left} = ${e.left}`)).toBe(false);
    expect(correctAnswer(q, String(e.left))).toBe(false);
  }
});

it('uses the printed bond labels to find exactly one incorrect equation', () => {
  const bonds = questions.filter(q => q.picture?.type === 'paper' && q.picture.layout === 'bars');
  expect(bonds).toHaveLength(40);
  for (const q of bonds) {
    const p = q.picture;
    if (p?.type !== 'paper' || p.layout !== 'bars') throw new Error('Missing bond');
    const heading = /^Whole: (\d+)$/.exec(p.totalLabel ?? '');
    if (!heading) throw new Error('Missing whole');
    const whole = Number(heading[1]);
    expect(p.rows).toHaveLength(1);
    const parts = p.rows[0].parts.map(part => Number(part.label));
    expect(parts).toHaveLength(2);
    expect(parts[0] + parts[1]).toBe(whole);
    expect(parts[0]).not.toBe(parts[1]);
    expect(Math.min(...parts)).toBeGreaterThan(0);
    expect(whole).toBeLessThanOrEqual(10);
    const givens = [whole, ...parts].sort((a, b) => a - b);
    const choices = q.choices ?? [];
    expect(new Set(choices).size).toBe(4);
    const wrong = choices.filter(choice => {
      const e = readEquation(choice);
      expect([e.left, e.right, e.result].sort((a, b) => a - b)).toEqual(givens);
      return !e.trueEquation;
    });
    expect(wrong).toHaveLength(1);
    expect(q.answer).toBe(wrong[0]);
    for (const choice of choices) expect(correctAnswer(q, choice)).toBe(wrong.includes(choice));
  }
});

it('distinguishes a related subtraction from true subtractions using other parts', () => {
  const selections = questions.filter(q => q.display && q.choices);
  expect(selections).toHaveLength(40);
  for (const q of selections) {
    const given = readEquation(q.display!);
    expect(given.addition && given.trueEquation).toBe(true);
    const choices = q.choices ?? [];
    expect(new Set(choices).size).toBe(4);
    const matches = choices.filter(choice => {
      const e = readEquation(choice);
      expect(e.addition).toBe(false);
      expect(e.trueEquation).toBe(true);
      return e.left === given.result && ((e.right === given.left && e.result === given.right)
        || (e.right === given.right && e.result === given.left));
    });
    expect(matches).toHaveLength(1);
    expect(q.answer).toBe(matches[0]);
    for (const choice of choices) expect(correctAnswer(q, choice)).toBe(matches.includes(choice));
  }
});

it('replays each item and varies the visible numbers within each task', () => {
  const seen = new Map<string, Set<string>>();
  for (const seed of [-8, 0, 17, 29, 52, 103, 304, 502]) {
    for (let i = 0; i < 4; i++) {
      const q = makeRagQuestion(seed, i);
      expect(makeRagQuestion(seed, i)).toEqual(q);
      const values = seen.get(q.prompt) ?? new Set<string>();
      values.add(JSON.stringify(q.picture ?? q.display));
      seen.set(q.prompt, values);
    }
  }
  expect(seen.size).toBe(4);
  for (const values of seen.values()) expect(values.size).toBeGreaterThan(1);
});

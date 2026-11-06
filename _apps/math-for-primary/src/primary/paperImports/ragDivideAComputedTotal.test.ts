import { expect, it } from 'vitest';
import { correctAnswer } from '../generate';
import { makeRagQuestion } from './ragDivideAComputedTotal';

function read(text: string, clue: RegExp): number {
  const match = clue.exec(text);
  if (!match) throw new Error(`Missing visible clue ${clue} in ${text}`);
  return Number(match[1]);
}

it('solves each story from the printed quantities and deals out one whole object at a time', () => {
  const forms = new Set<string>();
  const stories = new Set<string>();
  for (let seed = -8; seed < 32; seed++) {
    for (let index = 0; index < 10; index++) {
      const q = makeRagQuestion(seed, index);
      const story = (q.context ?? []).join(' ');
      stories.add(story);
      const groups = read(story, /(\d+) (?:children|cups)\b/);
      let total: number;
      let firstEquation: string;
      let item: string;
      if (story.includes('packets of stickers')) {
        item = 'stickers';
        const packets = read(story, /(\d+) packets/);
        const size = read(story, /packet holds (\d+) stickers/);
        expect(packets).not.toBe(groups);
        total = packets * size;
        firstEquation = `${packets} × ${size} = ${total}`;
      } else if (story.includes('tray')) {
        item = 'beads';
        const first = read(story, /One tray holds (\d+) beads/);
        const second = read(story, /Another tray holds (\d+) beads/);
        total = first + second;
        firstEquation = `${first} + ${second} = ${total}`;
      } else {
        const cups = story.includes('cups');
        item = cups ? 'counters' : 'buttons';
        const start = read(story, cups ? /sets (\d+) counters/ : /has (\d+) buttons/);
        const removed = read(story, cups ? /puts (\d+) counters in his pocket/ : /uses (\d+) buttons/);
        expect(start).toBeLessThanOrEqual(100);
        total = start - removed;
        firstEquation = `${start} − ${removed} = ${total}`;
      }
      expect(groups).toBeGreaterThan(1);
      expect(total).toBeGreaterThan(0);
      expect(total).toBeLessThanOrEqual(20);
      const shares = Array<number>(groups).fill(0);
      for (let object = 0; object < total; object++) shares[object % groups]++;
      expect(new Set(shares).size).toBe(1);
      const each = shares[0];
      expect(q.workedSteps?.[0].equation).toBe(firstEquation);

      if (q.prompt.startsWith('(a)')) {
        forms.add('equation');
        expect(q.numberSentence?.chooseOperation).toBe(true);
        expect(q.answer).toBe(firstEquation);
        expect(correctAnswer(q, firstEquation)).toBe(true);
        expect(correctAnswer(q, firstEquation.replace('−', '+'))).toBe(false);
        expect(correctAnswer(q, String(total))).toBe(false);
        continue;
      }
      expect(q.workedSteps?.[1].equation).toBe(`${total} ÷ ${groups} = ${each}`);
      if (q.prompt.startsWith('(b)')) {
        forms.add('linked counts');
        expect(q.structuredResponse).toEqual({ kind: 'number-pair', firstLabel: 'Counters left before sharing', secondLabel: 'Counters in each cup' });
        const pair = (left: number, perCup: number) => JSON.stringify([String(left), String(perCup)]);
        expect(correctAnswer(q, pair(total, each))).toBe(true);
        expect(correctAnswer(q, pair(total + 1, each))).toBe(false);
        expect(correctAnswer(q, pair(each, total))).toBe(false);
      } else {
        forms.add(item);
        expect(q.prompt).toBe(`How many ${item} does each child get?`);
        expect(q.unit).toBe(item);
        expect(q.answer).toBe(String(each));
        expect(correctAnswer(q, String(each))).toBe(true);
        expect(correctAnswer(q, String(total))).toBe(false);
      }
    }
  }
  expect(forms).toEqual(new Set(['stickers', 'beads', 'buttons', 'equation', 'linked counts']));
  expect(stories.size).toBeGreaterThan(30);
});

it('keeps the equation and both counts on the same story at consecutive indices', () => {
  for (let seed = 0; seed < 20; seed++) {
    const questions = Array.from({ length: 10 }, (_, index) => makeRagQuestion(seed, index));
    expect(questions).toEqual(Array.from({ length: 10 }, (_, index) => makeRagQuestion(seed, index)));
    expect(questions.filter(q => q.prompt.startsWith('(a)'))).toHaveLength(2);
    questions.forEach((q, index) => {
      if (!q.prompt.startsWith('(a)')) return;
      const next = questions[index + 1];
      expect(next.prompt.startsWith('(b)')).toBe(true);
      expect(next.context).toEqual(q.context);
      expect(next.key).not.toBe(q.key);
    });
  }
});

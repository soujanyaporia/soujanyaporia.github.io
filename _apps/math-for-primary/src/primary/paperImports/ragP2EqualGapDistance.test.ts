import { expect, it } from 'vitest';
import { correctAnswer } from '../generate';
import { makeRagQuestion } from './ragP2EqualGapDistance';

it('walks between the two printed flag numbers using the labelled gap', () => {
  const forms = new Set<string>();
  const lengths = new Set<number>();
  for (let seed = 0; seed < 60; seed++) {
    for (let index = 0; index < 4; index++) {
      const q = makeRagQuestion(seed, index);
      const endpoints = /from flag (\d+) to flag (\d+)\?/.exec(q.prompt);
      if (!endpoints || q.picture?.type !== 'batch11-upper') throw new Error('Missing endpoints or row');
      const start = Number(endpoints[1]);
      const end = Number(endpoints[2]);
      expect(start).toBeGreaterThanOrEqual(1);
      expect(end).toBeGreaterThan(start);
      expect(end).toBeLessThanOrEqual(10);

      const marks = q.picture.marks;
      const labels = marks.flatMap(mark => mark.kind === 'text' ? [mark.text] : []);
      const gapLabels = labels.filter(label => /^\d+ m$/.test(label));
      expect(gapLabels).toHaveLength(1);
      const metres = Number.parseInt(gapLabels[0], 10);
      expect([4, 5]).toContain(metres);
      lengths.add(metres);
      const positions = labels.filter(label => /^\d+$/.test(label)).map(Number);
      const dots = marks.flatMap(mark => mark.kind === 'circle' ? [mark] : []);
      expect(dots).toHaveLength(positions.length);
      expect(positions.slice(0, 2)).toEqual([1, 2]);
      expect(positions).toContain(start);
      expect(positions.at(-1)).toBe(end);
      const pitch = dots[1].cx - dots[0].cx;
      expect(pitch).toBeGreaterThan(0);
      positions.forEach((p, i) => expect(dots[i].cx - dots[0].cx).toBeCloseTo((p - 1) * pitch));
      expect(q.picture.label).toContain(`flag 1 to flag 2 is labelled ${metres} m`);

      let moves = 0;
      let walked = 0;
      for (let flag = start; flag < end; flag++) {
        moves++;
        walked += metres;
      }
      expect(q.unit).toBe('m');
      expect(q.workedSteps?.map(step => step.equation)).toEqual([
        `${end} − ${start} = ${moves}`, `${moves} × ${metres} m = ${walked} m`,
      ]);
      if (q.prompt.includes('multiplication sentence')) {
        forms.add('sentence');
        expect(start).toBe(1);
        expect(positions).toHaveLength(end);
        expect(q.numberSentence).toMatchObject({ freeEntry: true, chooseOperation: true, missingResult: true });
        const equation = `${moves} * ${metres} = ${walked}`;
        expect(q.answer).toBe(equation);
        expect(correctAnswer(q, equation)).toBe(true);
        expect(correctAnswer(q, `${metres} × ${moves} = ${walked}`)).toBe(true);
        expect(correctAnswer(q, `${moves + 1} × ${metres} = ${walked + metres}`)).toBe(false);
      } else {
        forms.add(start === 1 ? 'from-first' : 'from-inside');
        expect(q.numberSentence).toBeUndefined();
        expect(positions.length).toBeLessThan(end);
        expect(marks.some(mark => mark.kind === 'line' && mark.dashed)).toBe(true);
        expect(q.answer).toBe(String(walked));
        expect(correctAnswer(q, String(walked))).toBe(true);
        expect(correctAnswer(q, String(walked + metres))).toBe(false);
      }
    }
  }
  expect(forms.size).toBe(3);
  expect(lengths.size).toBe(2);
});

it('repeats a seed and index and varies the visible task across indices', () => {
  expect(makeRagQuestion(-12)).toEqual(makeRagQuestion(-12, 0));
  const tasks = new Set<string>();
  for (let index = 0; index < 24; index++) {
    const q = makeRagQuestion(51, index);
    expect(makeRagQuestion(51, index)).toEqual(q);
    tasks.add(JSON.stringify([q.prompt, q.picture]));
  }
  expect(tasks.size).toBeGreaterThan(4);
});

import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import { Picture } from '../Picture';
import { correctAnswer, type Question } from '../generate';
import { makeRagQuestion } from './ragP3MissingPartFromTotal';

type Givens = Pick<Question, 'context' | 'picture' | 'prompt' | 'unit'>;

function solve({ context, picture, prompt, unit }: Givens) {
  const numbers = context?.[0].match(/\d+/g);
  if (!numbers || numbers.length !== 1 || !picture) throw new Error('Expected one overall total and a figure');
  const total = Number(numbers[0]);
  expect(total).toBeLessThan(10000);

  if (picture.type === 'bars' && picture.pictures) {
    expect(unit).toBe('children');
    expect(prompt).toContain('watched without playing');
    expect(context?.[0]).toContain('one game or watch');
    expect(new Set(picture.labels).size).toBe(4);
    const html = renderToStaticMarkup(createElement(Picture, { model: picture }));
    const key = /Each ● = (\d+)/.exec(html);
    if (!key) throw new Error('Missing picture graph key');
    const scale = Number(key[1]);
    expect(scale).toBeGreaterThan(1);
    const dots = (html.match(/>●<\/i>/g) ?? []).length;
    expect(dots).toBeGreaterThan(0);
    return { form: 'dots', expected: total - dots * scale, subtotal: dots * scale };
  }

  let values: number[];
  let form: string;
  if (picture.type === 'bars') {
    expect(unit).toBe('dollars');
    expect(prompt).toContain('October');
    expect(context?.[0]).toContain('June to October');
    expect(picture.labels).toEqual(['Jun', 'Jul', 'Aug', 'Sep']);
    expect(picture.values).toHaveLength(4);
    expect(picture.scale).toBeGreaterThan(0);
    for (const amount of picture.values) {
      expect(amount).toBeGreaterThan(0);
      expect(amount % picture.scale).toBe(0);
    }
    values = picture.values;
    form = 'bars';
  } else if (picture.type === 'nanyang-p4' && picture.layout === 'table') {
    expect(unit).toBe('seed packets');
    expect(prompt).toContain('Day 4');
    expect(picture.rows.map(row => row.label)).toEqual(['Day 1', 'Day 2', 'Day 3', 'Day 4']);
    expect(picture.rows[3].values).toEqual([null]);
    values = picture.rows.slice(0, 3).map(row => {
      const [value] = row.values;
      if (row.values.length !== 1 || value === null || !Number.isInteger(value) || value <= 0) throw new Error('Unreadable sales count');
      return value;
    });
    form = 'table';
  } else {
    throw new Error('Unexpected data display');
  }
  const expected = values.reduce((left, amount) => left - amount, total);
  return { form, expected, subtotal: total - expected };
}

it('recovers the missing part from the pupil’s total and figure', () => {
  const forms = new Set<string>();
  for (let seed = -6; seed < 36; seed++) {
    for (let index = 0; index < 5; index++) {
      const q = makeRagQuestion(seed, index);
      const { form, expected, subtotal } = solve(q);
      forms.add(form);
      expect(Number.isSafeInteger(expected) && expected > 0).toBe(true);
      expect(q.answer).toBe(String(expected));
      expect(correctAnswer(q, String(expected))).toBe(true);
      expect(correctAnswer(q, String(expected + 1))).toBe(false);
      expect(q.workedSteps?.at(-1)?.equation).toBe(`${subtotal + expected} − ${subtotal} = ${expected} ${q.unit}`);
      if (form === 'table') {
        expect(q.choices).toHaveLength(4);
        expect(new Set(q.choices).size).toBe(4);
        expect(q.choices).toContain(String(expected));
      } else {
        expect(q.choices).toBeUndefined();
      }
    }
  }
  expect(forms).toEqual(new Set(['dots', 'bars', 'table']));
});

it('reproduces a seed and index and varies the visible data', () => {
  expect(makeRagQuestion(28)).toEqual(makeRagQuestion(28, 0));
  const forms = new Map<string, Set<string>>();
  for (let i = 0; i < 48; i++) {
    const q = makeRagQuestion(28, i);
    expect(makeRagQuestion(28, i)).toEqual(q);
    const { form } = solve(q);
    const data = forms.get(form) ?? new Set<string>();
    data.add(JSON.stringify([q.context, q.picture]));
    forms.set(form, data);
  }
  for (const form of ['dots', 'bars', 'table']) {
    expect(forms.get(form)?.size ?? 0).toBeGreaterThan(2);
  }
});

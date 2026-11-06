import {expect, it} from 'vitest';
import {makeRagQuestion} from './ragLengthAndHeightExtremes';
import type {Batch11UpperPicture} from './batch11UpperPicture';

function readItems(picture: Batch11UpperPicture, vertical: boolean) {
  const labels = picture.marks.flatMap(mark => mark.kind === 'text' ? [mark] : []);
  const paths = picture.marks.flatMap(mark => mark.kind === 'path' ? [mark] : []);
  expect(labels).toHaveLength(paths.length);
  return paths.map(path => {
    const tokens = path.d.trim().split(/\s+/);
    expect(tokens.length % 3).toBe(0);
    const points: {x: number; y: number}[] = [];
    for (let i = 0; i < tokens.length; i += 3) {
      expect(tokens[i]).toBe(i === 0 ? 'M' : 'L');
      const x = Number(tokens[i + 1]), y = Number(tokens[i + 2]);
      expect(x >= 0 && x <= 320 && y >= 0 && y <= 200).toBe(true);
      points.push({x, y});
    }
    expect(points.length).toBeGreaterThanOrEqual(2);
    const start = points[0], end = points[points.length - 1];
    const matches = labels.filter(label => vertical
      ? Math.abs(label.x - start.x) <= 10 && label.y > start.y && label.y - start.y <= 30
      : label.x < start.x && start.x - label.x <= 40 && Math.abs(label.y - start.y) <= 8);
    expect(matches).toHaveLength(1);
    let length = 0;
    for (let i = 1; i < points.length; i++) {
      const dx = points[i].x - points[i - 1].x;
      const dy = points[i].y - points[i - 1].y;
      expect(vertical ? dx === 0 && dy < 0 : dx > 0).toBe(true);
      length += Math.hypot(dx, dy);
    }
    return {letter: matches[0].text, start, end, length};
  });
}

it('traces the printed objects and solves each comparison from its prompt', () => {
  const forms = new Set<string>(), answers = new Set<string>();
  let sawEqualWidthWithBends = false;
  for (let seed = 0; seed < 80; seed++) {
    for (let index = 0; index < 4; index++) {
      const q = makeRagQuestion(seed, index);
      if (q.picture?.type !== 'batch11-upper') throw Error('Expected a labelled diagram');
      const match = /^Which (string|pole) is (taller|tallest|longer|longest|shorter|shortest)\? Write its letter\.$/.exec(q.prompt);
      if (!match) throw Error('Missing comparison or response instruction');
      const vertical = match[1] === 'pole', word = match[2];
      const items = readItems(q.picture, vertical);
      const pair = word.endsWith('er');
      expect(items).toHaveLength(pair ? 2 : 3);
      expect(items.map(item => item.letter).sort()).toEqual(pair ? ['A', 'B'] : ['A', 'B', 'C']);
      const aligned = items.map(item => vertical ? item.start.y : item.start.x);
      expect(new Set(aligned).size).toBe(1);
      expect(new Set(items.map(item => vertical ? item.start.x : item.start.y)).size).toBe(items.length);
      if (vertical) {
        const base = q.picture.marks.find(mark => mark.kind === 'line');
        if (base?.kind !== 'line') throw Error('Missing ground line');
        expect([base.y1, base.y2]).toEqual([aligned[0], aligned[0]]);
        expect(items.every(item => item.start.x >= base.x1 && item.start.x <= base.x2)).toBe(true);
      } else if (new Set(items.map(item => item.end.x)).size === 1) {
        expect(items.every(item => item.end.y === item.start.y)).toBe(true);
        sawEqualWidthWithBends = true;
      }
      const byLength = items.sort((a, b) => a.length - b.length);
      for (let i = 1; i < byLength.length; i++) {
        expect(byLength[i].length - byLength[i - 1].length).toBeGreaterThan(5);
      }
      const least = word.startsWith('short');
      const expected = byLength[least ? 0 : byLength.length - 1].letter;
      expect(q.answer).toBe(expected);
      expect(q.unit).toBeUndefined();
      expect(q.choices).toBeUndefined();
      forms.add(`${pair ? 'pair' : 'set'}-${least ? 'least' : 'greatest'}`);
      answers.add(expected);
    }
  }
  expect(forms.size).toBe(4);
  expect(answers).toEqual(new Set(['A', 'B', 'C']));
  expect(sawEqualWidthWithBends).toBe(true);
});

it('keeps the full diagram for both set questions and replays it from the seed', () => {
  for (let seed = 0; seed < 12; seed++) {
    const block = Array.from({length: 4}, (_, index) => makeRagQuestion(seed, index));
    const sets = block.filter(q => /(?:shortest|tallest|longest)/.test(q.prompt));
    expect(sets).toHaveLength(2);
    expect(sets[0].picture).toEqual(sets[1].picture);
    expect(sets[0].answer).not.toBe(sets[1].answer);
    for (const [index, q] of block.entries()) expect(makeRagQuestion(seed, index)).toEqual(q);
  }
});

import { expect, it } from 'vitest';
import type { Question } from '../generate';
import { structuredResponseCorrect } from './batch6MiddleResponse';
import { makeRagQuestion } from './ragMissingDigitsInWrittenArithmetic';

// Read the displayed characters by their locations, not from the worked solution.
function readColumns(p: Question['picture']) {
  if (p?.type !== 'batch11-upper') throw Error('Expected a column calculation');
  const cells = p.marks.flatMap(m => m.kind === 'text' ? [m] : []);
  const ys = [...new Set(cells.map(c => c.y))].sort((a,b) => a-b);
  expect(ys).toHaveLength(3);
  const rows = ys.map(y => cells.filter(c => c.y === y).sort((a,b) => a.x-b.x));
  const sign = rows[1].shift();
  if (!sign || !['+', '−', '×'].includes(sign.text)) throw Error('Missing operation');
  const columns = [...new Set(rows.flatMap(row => row.map(c => c.x)))].sort((a,b) => a-b);
  for (const row of rows) {
    expect(row.map(c => c.x)).toEqual(columns.slice(-row.length));
    expect(row.map(c => c.text).join('')).toMatch(/^[0-9AB]+$/);
  }
  expect(sign.x).toBeLessThan(columns[0]);
  expect(p.marks.some(m => m.kind === 'line' && m.y1 === m.y2 && m.y1 > ys[1] && m.y1 < ys[2] && m.x1 <= columns[0] && m.x2 >= columns.at(-1)!)).toBe(true);
  const [top, lower, result] = rows.map(row => row.map(c => c.text).join(''));
  return {top, lower, result, op: sign.text};
}

type Visible = ReturnType<typeof readColumns>;
function completions({top,lower,result,op}: Visible) {
  const masks = [top,lower,result];
  const paired = masks.join('').includes('B');
  const found: {digits: string[]; values: number[]}[] = [];
  for (let a = 0; a <= 9; a++) for (let b = 0; b <= (paired ? 9 : 0); b++) {
    const filled = masks.map(s => s.replaceAll('A',String(a)).replaceAll('B',String(b)));
    if (filled.some(s => /^0\d/.test(s))) continue;
    const values = filled.map(Number), [x,y,z] = values;
    if ((op === '+' ? x+y : op === '−' ? x-y : x*y) === z) {
      found.push({digits: paired ? [String(a),String(b)] : [String(a)], values});
    }
  }
  return found;
}

it('has exactly one completion from the visible digits and keeps each answer with its box', () => {
  const styles = new Map<string, Set<string>>();
  let pairedZero = false;
  for (let seed = -20; seed <= 39; seed++) for (let index = 0; index < 4; index++) {
    const q = makeRagQuestion(seed,index);
    const v = readColumns(q.picture);
    const solutions = completions(v);
    expect(solutions).toHaveLength(1);
    const [{digits,values: [x,y,z]}] = solutions;
    expect(Math.max(x,y,z)).toBeLessThan(10000);
    const mask = v.top+v.lower+v.result;
    expect([...mask].filter(c => c === 'A')).toHaveLength(1);
    if (digits.length === 2) {
      expect([...mask].filter(c => c === 'B')).toHaveLength(1);
      expect(q.structuredResponse).toEqual({kind:'number-pair',firstLabel:'A',secondLabel:'B'});
      expect(q.answer).toBe(JSON.stringify(digits));
      expect(structuredResponseCorrect(q.structuredResponse!, q.answer, JSON.stringify(digits))).toBe(true);
      const wrong = [String((Number(digits[0])+1)%10), digits[1]];
      expect(structuredResponseCorrect(q.structuredResponse!, q.answer, JSON.stringify(wrong))).toBe(false);
      pairedZero ||= digits.includes('0');
    } else {
      expect(q.structuredResponse).toBeUndefined();
      expect(q.answer).toBe(digits[0]);
    }
    let style: string;
    if (v.op === '−') {
      expect([v.top,v.lower,v.result].every(row => row.length === 4)).toBe(true);
      if (v.top.endsWith('B')) {
        style = 'across zeros';
        expect(v.top).toMatch(/^[1-9]00B$/);
        expect(v.lower).toMatch(/^A\d{3}$/);
        expect(x%10).toBeLessThan(y%10);
      } else {
        style = 'exchange a hundred';
        expect(v.lower).toMatch(/^\d\dA\d$/);
        expect(v.result).toMatch(/^\dB\d\d$/);
        expect(x%10).toBeGreaterThanOrEqual(y%10);
        expect(Math.floor(x/10)%10).toBeLessThan(Math.floor(y/10)%10);
      }
    } else if (v.op === '+') {
      style = 'try a digit';
      expect(v.top).toMatch(/^\dA\d$/);
      expect(x%10 + y%10).toBeGreaterThanOrEqual(10);
      expect(new Set(q.choices).size).toBe(4);
      expect(q.choices?.every(s => /^\d$/.test(s))).toBe(true);
      expect(q.choices?.filter(s => s === digits[0])).toHaveLength(1);
    } else {
      style = 'product digit';
      expect(v.top).toMatch(/^[1-9]\d{2}$/);
      expect(v.lower).toMatch(/^[2-9]$/);
      expect(v.result).toMatch(/^[1-9]A\d{2}$/);
      expect((x%10)*y).toBeGreaterThanOrEqual(10);
    }
    if (!styles.has(style)) styles.set(style,new Set());
    styles.get(style)!.add(JSON.stringify(v));
    expect(q.workedSteps?.at(-1)?.equation).toBe(`${x} ${v.op} ${y} = ${z}`);
  }
  expect(styles.size).toBe(4);
  for (const examples of styles.values()) expect(examples.size).toBeGreaterThan(20);
  expect(pairedZero).toBe(true);
});

it('replays each question and changes the displayed task over a session', () => {
  const drawings = new Set<string>();
  for (let i = 0; i < 4; i++) {
    const q = makeRagQuestion(81,i);
    expect(makeRagQuestion(81,i)).toEqual(q);
    drawings.add(JSON.stringify(readColumns(q.picture)));
  }
  expect(drawings.size).toBe(4);
});

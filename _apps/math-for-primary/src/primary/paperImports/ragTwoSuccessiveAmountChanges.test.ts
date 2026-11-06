import { expect, it } from 'vitest';
import { makeRagQuestion } from './ragTwoSuccessiveAmountChanges';

function readCount(text: string, pattern: RegExp): number {
  const match = pattern.exec(text);
  if (!match) throw new Error(`Missing visible count for ${pattern}`);
  return Number(match[1]);
}

function equation(before: number, after: number): string {
  const sign = after < before ? '−' : '+';
  return `${before} ${sign} ${Math.abs(after - before)} = ${after}`;
}

it('solves each story from the printed counts and checks the two worked steps', () => {
  for (const seed of [-13, 0, 1, 5, 19, 71, 283, 4096]) {
    const seen = new Set<string>();
    for (let index = 0; index < 12; index++) {
      const q = makeRagQuestion(seed, index);
      const story = (q.context ?? []).join(' ');
      const steps = q.workedSteps?.map(step => step.equation);
      expect(q.picture).toBeUndefined();
      expect(q.choices).toBeUndefined();
      if (story.includes('school fair')) {
        const stock = readCount(story, /made (\d+) badges/);
        const games = readCount(story, /sent (\d+) badges to the games stall/);
        const food = readCount(story, /sent (\d+) badges to the food stall/);
        const kept = stock - games - food;
        const sent = stock - kept;
        expect(stock).toBeLessThanOrEqual(999);
        expect(kept).toBeGreaterThan(0);
        expect(q.prompt).toMatch(/\(a\).*two stalls altogether.*\(b\).*keep for its helpers/);
        expect(q.structuredResponse).toEqual({ kind: 'number-pair', firstLabel: '(a) Badges sent to the stalls', secondLabel: '(b) Badges kept for helpers' });
        expect(q.answer).toBe(JSON.stringify([String(sent), String(kept)]));
        expect(steps).toEqual([`${games} + ${food} = ${sent}`, `${stock} − ${sent} = ${kept}`]);
        seen.add('two removals');
        continue;
      }

      const moves = Array.from(story.matchAll(/Sam took (\d+) beads from the jar|Mei put (\d+) beads into the jar/g), match => match[1] ? -Number(match[1]) : Number(match[2]));
      expect(moves).toHaveLength(2);
      const [first, second] = moves;
      expect(first * second).toBeLessThan(0);
      const asksForStart = q.prompt.includes('at the start');
      expect(q.unit).toBe('beads');
      expect(q.structuredResponse).toBeUndefined();
      let start: number;
      if (asksForStart) {
        expect(story).toMatch(/^A jar held some beads\./);
        const end = readCount(story, /After both turns, the jar held (\d+) beads/);
        // Try each legal start and replay the two visible turns in chronological order.
        const possible = Array.from({ length: 999 }, (_, i) => i + 1).filter(n => {
          const middle = n + first;
          return middle >= 0 && middle <= 999 && middle + second === end;
        });
        expect(possible).toHaveLength(1);
        start = possible[0];
        seen.add(first < 0 ? 'undo loss then gain' : 'undo gain then loss');
      } else {
        expect(q.prompt).toContain('in the jar now');
        expect(story).not.toContain('After both turns, the jar held');
        expect(first).toBeLessThan(0);
        start = readCount(story, /^A jar held (\d+) beads/);
        seen.add('final after loss then gain');
      }
      const middle = start + first;
      const end = middle + second;
      for (const count of [start, middle, end]) {
        expect(count).toBeGreaterThan(0);
        expect(count).toBeLessThanOrEqual(999);
      }
      expect(q.answer).toBe(String(asksForStart ? start : end));
      expect(steps).toEqual(asksForStart
        ? [equation(end, middle), equation(middle, start)]
        : [equation(start, middle), equation(middle, end)]);
    }
    expect(seen.size).toBe(4);
  }
});

it('repeats the same seed and index, and varies the visible givens across seeds', () => {
  const givens = new Set<string>();
  for (let seed = 0; seed < 24; seed++) {
    const q = makeRagQuestion(seed);
    expect(makeRagQuestion(seed, 0)).toEqual(q);
    givens.add((q.context ?? []).join(' ').match(/\d+/g)?.join(',') ?? '');
  }
  expect(givens.size).toBeGreaterThan(12);
});

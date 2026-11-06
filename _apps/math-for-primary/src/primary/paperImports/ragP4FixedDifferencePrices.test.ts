import { expect, it } from 'vitest';
import { structuredResponseCorrect } from './batch6MiddleResponse';
import { makeRagQuestion } from './ragP4FixedDifferencePrices';

function read(text: string, pattern: RegExp): RegExpMatchArray {
  const match = text.match(pattern);
  if (!match) throw new Error(`Missing visible given matching ${pattern} in ${text}`);
  return match;
}

// Try whole-dollar price tags against the actual bill, independently of the worked method.
function solveBill(lowerCount: number, higherCount: number, gap: number, bill: number): number {
  expect(gap).toBeGreaterThan(0);
  expect(lowerCount + higherCount).toBeLessThanOrEqual(9);
  const matches: number[] = [];
  for (let price = 1; price * (lowerCount + higherCount) <= bill; price++) {
    if (lowerCount * price + higherCount * (price + gap) === bill) matches.push(price);
  }
  expect(matches).toHaveLength(1);
  return matches[0];
}

it('recovers each requested dollar amount from the shopping story', () => {
  const forms = new Set<string>();
  for (let seed = 0; seed < 64; seed++) {
    for (let index = 0; index < 4; index++) {
      const q = makeRagQuestion(seed, index);
      const story = (q.context ?? []).join(' ');
      const equations = q.workedSteps?.map(step => step.equation) ?? [];
      if (story.includes('cupboard')) {
        const bill = Number(read(story, /A desk and a cupboard together cost \$(\d+)\./)[1]);
        const gap = Number(read(story, /cupboard costs \$(\d+) more than the desk/)[1]);
        read(q.prompt, /\(a\) How much does the desk cost\?/);
        read(q.prompt, /\(b\) A bookcase costs twice as much as the desk/);
        read(q.prompt, /one desk, one cupboard and one bookcase cost altogether/);
        const desk = solveBill(1, 1, gap, bill);
        const allThree = desk + (desk + gap) + 2 * desk;
        const spec = q.structuredResponse;
        if (spec?.kind !== 'number-pair') throw new Error('Two labelled price entries are required');
        expect(spec.firstLabel).toBe('(a) Desk ($)');
        expect(spec.secondLabel).toBe('(b) All three items ($)');
        const entries = [desk.toFixed(2), allThree.toFixed(2)];
        expect(structuredResponseCorrect(spec, q.answer, JSON.stringify(entries))).toBe(true);
        expect(structuredResponseCorrect(spec, q.answer, JSON.stringify(entries.slice().reverse()))).toBe(false);
        expect(equations).toContain(`$${bill} + $${2 * desk} = $${allThree}`);
        forms.add('linked');
        continue;
      }

      const purchase = read(story, /buys (\d+) puzzles and (\d+) board games? for \$(\d+) altogether/);
      const [puzzles, games, bill] = purchase.slice(1).map(Number);
      expect(Math.min(puzzles, games)).toBeGreaterThan(0);
      expect(puzzles).not.toBe(games);
      const lowerClue = story.match(/One puzzle costs \$(\d+) less than one board game/);
      const gap = Number((lowerClue ?? read(story, /One board game costs \$(\d+) more than one puzzle/))[1]);
      const puzzle = solveBill(puzzles, games, gap, bill);
      const target = read(q.prompt, /What does one (puzzle|board game) cost\?/)[1];
      expect(q.unit).toBe('dollars');
      expect(q.choices).toBeUndefined();
      expect(q.structuredResponse).toBeUndefined();
      expect(q.answer).toBe(String(target === 'puzzle' ? puzzle : puzzle + gap));
      if (lowerClue) {
        expect(target).toBe('board game');
        expect(equations).toContain(`$${bill} + $${puzzles * gap} = $${bill + puzzles * gap}`);
        expect(equations.at(-1)).toBe(`$${bill + puzzles * gap} ÷ ${puzzles + games} = $${puzzle + gap}`);
        forms.add('raise');
      } else {
        expect(equations).toContain(`$${bill} − $${games * gap} = $${bill - games * gap}`);
        if (target === 'board game') expect(equations.at(-1)).toBe(`$${puzzle} + $${gap} = $${puzzle + gap}`);
        forms.add(target);
      }
    }
  }
  expect([...forms].sort()).toEqual(['board game', 'linked', 'puzzle', 'raise']);
});

it('reproduces a question and varies the visible bills across indices', () => {
  const stories = new Set<string>();
  for (let index = 0; index < 12; index++) {
    const q = makeRagQuestion(73, index);
    expect(makeRagQuestion(73, index)).toEqual(q);
    stories.add(JSON.stringify(q.context));
  }
  expect(stories.size).toBeGreaterThan(1);
});

import {describe, expect, it} from 'vitest';
import type {Question} from '../generate';
import {makeRagQuestion, RAG_PATTERN} from './ragAllocationAfterRemoval';

type VisibleQuestion = Pick<Question, 'prompt' | 'context' | 'unit'>;
type Variant = 'reverse' | 'small-trays' | 'share';
interface Solution {
  variant: Variant;
  answer: number;
  unit: string;
  equations: string[];
  quantities: number[];
}

function read(pattern: RegExp, text: string): number[] {
  const match = pattern.exec(text);
  if (!match) throw new Error(`Missing visible givens: ${text}`);
  const values = match.slice(1).map(Number);
  if (!values.every(value => Number.isSafeInteger(value) && value > 0)) {
    throw new Error('Item counts must be positive whole numbers');
  }
  return values;
}

// Independently count items and complete groups instead of consulting the
// generator's answer, proof, worked steps or private parameters.
function countItems(groups: number, each: number): number {
  let total = 0;
  for (let group = 0; group < groups; group++) total += each;
  return total;
}

function countGroups(total: number, size: number): number {
  if (total <= 0 || size <= 0) throw new Error('Empty allocation');
  let remaining = total;
  let groups = 0;
  while (remaining >= size) {
    remaining -= size;
    groups++;
  }
  if (remaining !== 0) throw new Error('Items cannot be shared exactly');
  return groups;
}

function solveVisible(q: VisibleQuestion): Solution {
  const lines = q.context;
  if (!lines || lines.length !== 3) throw new Error('Incomplete visible story');
  if (q.prompt === 'How many beads did Lina have at the start?') {
    const [removed] = read(/^Lina had some beads\. She gave (\d+) beads to a friend\.$/, lines[0]);
    if (lines[1] !== 'Her aunt then gave her exactly as many beads as she had left.') {
      throw new Error('The matching gift must be stated');
    }
    const [bags, each] = read(/^Lina put all her beads into (\d+) bags with (\d+) beads in each bag\. No beads were left over\.$/, lines[2]);
    const total = countItems(bags, each);
    const beforeGift = countGroups(total, 2);
    const answer = beforeGift + removed;
    return {
      variant: 'reverse', answer, unit: 'beads',
      quantities: [removed, bags, each, total, beforeGift, answer],
      equations: [
        `${bags} × ${each} = ${total} beads`,
        `${total} ÷ 2 = ${beforeGift} beads`,
        `${beforeGift} + ${removed} = ${answer} beads`,
      ],
    };
  }
  if (q.prompt === 'How many small trays were filled?') {
    const [total] = read(/^A school kitchen made (\d+) dumplings\.$/, lines[0]);
    const [largeTrays, largeSize] = read(/^The cook filled (\d+) large trays with (\d+) dumplings in each tray\.$/, lines[1]);
    const [smallSize] = read(/^All the remaining dumplings were packed into small trays of (\d+) dumplings each\. Every small tray was full, and no dumplings were left over\.$/, lines[2]);
    if (largeSize <= smallSize) throw new Error('Large trays must hold more');
    const allocated = countItems(largeTrays, largeSize);
    const remaining = total - allocated;
    const answer = countGroups(remaining, smallSize);
    return {
      variant: 'small-trays', answer, unit: 'trays',
      quantities: [total, largeTrays, largeSize, smallSize, allocated, remaining, answer],
      equations: [
        `${largeTrays} × ${largeSize} = ${allocated} dumplings`,
        `${total} − ${allocated} = ${remaining} dumplings`,
        `${remaining} ÷ ${smallSize} = ${answer} trays`,
      ],
    };
  }
  if (q.prompt === 'How many stickers did each child receive?') {
    const [packets, packetSize] = read(/^An art club bought (\d+) packets of stickers, with (\d+) stickers in each packet\.$/, lines[0]);
    const [removed] = read(/^The club used (\d+) stickers on a display\.$/, lines[1]);
    const [children] = read(/^All the remaining stickers were shared equally among (\d+) children\. No stickers were left over\.$/, lines[2]);
    const total = countItems(packets, packetSize);
    const remaining = total - removed;
    const answer = countGroups(remaining, children);
    return {
      variant: 'share', answer, unit: 'stickers',
      quantities: [packets, packetSize, removed, children, total, remaining, answer],
      equations: [
        `${packets} × ${packetSize} = ${total} stickers`,
        `${total} − ${removed} = ${remaining} stickers`,
        `${remaining} ÷ ${children} = ${answer} stickers per child`,
      ],
    };
  }
  throw new Error(`Unexpected response task: ${q.prompt}`);
}

function visible(q: Question): VisibleQuestion {
  return {prompt: q.prompt, context: q.context, unit: q.unit};
}

const seeds = [
  -2147483648, -101, -1, 0, 1, 2, 17, 2026, 4294967295,
  Number.MAX_SAFE_INTEGER,
  ...Array.from({length: 60}, (_, i) => 97 * i + 3),
];

describe('allocation after removal', () => {
  it('independently solves visible givens and checks every worked calculation across varied seeds', () => {
    const variants = new Set<Variant>();
    const stories = new Set<string>();
    for (const seed of seeds) {
      for (const index of [0, 1, 2, 3, 8, 31]) {
        const q = makeRagQuestion(seed, index);
        const solved = solveVisible(visible(q));
        variants.add(solved.variant);
        stories.add(JSON.stringify([q.prompt, q.context]));
        expect(q.answer).toBe(String(solved.answer));
        expect(q.unit).toBe(solved.unit);
        expect(solved.quantities.every(n => Number.isSafeInteger(n) && n > 0 && n < 3100)).toBe(true);
        expect(q.workedSteps?.map(step => step.equation)).toEqual(solved.equations);
        expect(q.workedSteps?.every(step => step.text.trim().length > 15)).toBe(true);
        expect(q.hint.trim().length).toBeGreaterThan(15);
        for (const equation of solved.equations) expect(q.explanation).toContain(equation);
        expect(q.picture).toBeUndefined();
        expect(q.structuredResponse).toBeUndefined();
        expect(q.choices).toBeUndefined();
      }
    }
    expect([...variants].sort()).toEqual(['reverse', 'share', 'small-trays']);
    expect(stories.size).toBeGreaterThan(100);
  });

  it('is repeatable and includes all three variants in each consecutive index trio', () => {
    for (const seed of seeds.slice(0, 10)) {
      const variants = new Set<Variant>();
      const keys = new Set<string>();
      for (let index = 0; index < 3; index++) {
        const first = makeRagQuestion(seed, index);
        expect(makeRagQuestion(seed, index)).toEqual(first);
        variants.add(solveVisible(visible(first)).variant);
        keys.add(first.key);
      }
      expect(variants.size).toBe(3);
      expect(keys.size).toBe(3);
      expect(makeRagQuestion(seed)).toEqual(makeRagQuestion(seed, 0));
    }
    expect(RAG_PATTERN.level).toBe(5);
    expect(RAG_PATTERN.canonicalPatternId).toBe('p5-allocation-after-removal');
    expect(RAG_PATTERN.skillIds).toEqual(['P5.S.WN.03', 'P5.S.RATE.02']);
  });

  it('re-solves changed visible amounts without access to an answer or private state', () => {
    for (let index = 0; index < 3; index++) {
      const original = visible(makeRagQuestion(41, index));
      const before = solveVisible(original);
      const lines = [...(original.context ?? [])];
      let expectedChange: number;
      if (before.variant === 'reverse') {
        lines[0] = lines[0].replace(/\d+/, n => String(Number(n) + 2));
        expectedChange = 2;
      } else if (before.variant === 'small-trays') {
        const [size] = read(/small trays of (\d+) dumplings/, lines[2]);
        lines[0] = lines[0].replace(/\d+/, n => String(Number(n) + size));
        expectedChange = 1;
      } else {
        const [children] = read(/among (\d+) children/, lines[2]);
        lines[1] = lines[1].replace(/\d+/, n => String(Number(n) + children));
        expectedChange = -1;
      }
      const after = solveVisible({...original, context: lines});
      expect(after.answer).toBe(before.answer + expectedChange);
    }
  });
});

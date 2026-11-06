import { hashString, Rng } from '../../engine/random';
import type { Question } from '../generate';
import type { Batch11UpperMark } from './batch11UpperPicture';

export const RAG_PATTERN = {
  id: 'p2-rag-filter-by-line-type',
  level: 2,
  title: 'Trace straight and curved lines',
  objective: 'Trace outlines and letter strokes to decide which ones fit a line rule.',
  skillIds: ['P1.S.SHAPE.01'],
  canonicalPatternId: 'p2-filter-by-line-type',
};

type Outline = { path: string; detail: string };
const curved: Outline[] = [
  { path: 'm -30 0 q 0 -23 30 -23 q 30 0 30 23 q 0 23 -30 23 q -30 0 -30 -23 z', detail: 'curves all the way round' },
  { path: 'm -31 3 q 23 -36 62 -6 q -17 36 -62 6 z', detail: 'has two curves that meet at the tips' },
  { path: 'm -27 0 q 0 -28 33 -22 q 28 8 15 30 q -10 22 -32 13 q -16 -5 -16 -21 z', detail: 'has a curved edge all the way round' },
];
const mixed: Outline[] = [
  { path: 'm -28 16 q 0 -40 28 -40 q 28 0 28 40 z', detail: 'has a curved top and a straight bottom' },
  { path: 'm -28 -18 l 35 0 q 32 18 0 36 l -35 0 z', detail: 'has straight sides and a curved end' },
  { path: 'm -24 17 l 0 -40 q 40 0 40 40 z', detail: 'has a curve joining two straight sides' },
];
const straight: Outline[] = [
  { path: 'm -30 18 l 30 -40 l 30 40 z', detail: 'has three straight sides' },
  { path: 'm -28 -18 l 56 0 l 0 36 l -56 0 z', detail: 'has four straight sides' },
  { path: 'm 0 -24 l 30 24 l -30 24 l -30 -24 z', detail: 'has four straight sides' },
];

function outlines(r: Rng, key: string, findBoth: boolean): Question {
  const labels = ['A', 'B', 'C', 'D'];
  const onlyCurves = r.pick(curved);
  const bothKinds = r.shuffle(mixed).slice(0, 2);
  const shapes = r.shuffle([onlyCurves, ...bothKinds, r.pick(straight)]);
  const marks: Batch11UpperMark[] = [];
  const matches: string[] = [];
  const clues: string[] = [];
  shapes.forEach((shape, i) => {
    const x = 80 + 160 * (i % 2);
    const y = 38 + 98 * Math.floor(i / 2);
    marks.push({ kind: 'path', d: `M ${x} ${y} ${shape.path}` },
      { kind: 'text', x: x - 6, y: y + 43, text: labels[i] });
    clues.push(`${labels[i]} ${shape.detail}.`);
    if (findBoth ? bothKinds.includes(shape) : shape === onlyCurves) matches.push(labels[i]);
  });
  const conclusion = findBoth
    ? `Choose ${matches.join(' and ')}. Each has both kinds of line.`
    : `Choose ${matches[0]}. Its whole outline is curved.`;
  return {
    key,
    prompt: findBoth ? 'Pick both shapes that have a straight edge and a curved edge.'
      : 'Which shape can you trace without following any straight line?',
    picture: { type: 'batch11-upper', label: 'Four outlines with a letter below each shape.', marks },
    answer: findBoth ? JSON.stringify(matches) : matches[0],
    ...(findBoth ? { structuredResponse: { kind: 'named-pair' as const, options: labels } } : { choices: labels }),
    hint: 'Trace the edge of each shape all the way back to where you started.',
    workedSteps: [{ text: clues.slice(0, 2).join(' ') }, { text: clues.slice(2).join(' ') }, { text: conclusion }],
    explanation: [...clues, conclusion].join(' '),
  };
}

// Each path draws the strokes themselves, so a device font cannot change a letter's lines.
const glyphs: Record<string, string> = {
  A: 'm 0 32 l 11 -32 l 11 32 m -18 -12 l 14 0',
  B: 'l 0 32 m 0 -32 l 10 0 q 19 8 0 16 l -10 0 m 10 0 q 21 8 0 16 l -10 0',
  D: 'l 0 32 l 4 0 q 19 0 19 -16 q 0 -16 -19 -16 z',
  E: 'm 21 0 l -21 0 l 0 32 l 21 0 m -21 -16 l 17 0',
  F: 'm 0 32 l 0 -32 l 21 0 m -21 16 l 17 0',
  H: 'l 0 32 m 22 -32 l 0 32 m -22 -16 l 22 0',
  K: 'l 0 32 m 22 -32 l -22 16 l 22 16',
  L: 'l 0 32 l 21 0',
  O: 'm 0 16 q 0 -16 11 -16 q 11 0 11 16 q 0 16 -11 16 q -11 0 -11 -16 z',
  T: 'l 22 0 m -11 0 l 0 32',
};
const words = ['BOOK', 'BOOT', 'BOAT', 'BELL', 'BELT', 'FLOAT', 'DEED', 'BOTTLE', 'BLADE', 'TABLE', 'FOOTBALL', 'FOLDED', 'HOTEL', 'LOOK'];

function letters(r: Rng, key: string): Question {
  const word = r.pick(words);
  const letters = [...word];
  const marks: Batch11UpperMark[] = letters.map((letter, i) => ({
    kind: 'path', d: `M ${(320 - (word.length - 1) * 34 - 22) / 2 + i * 34} 78 ${glyphs[letter]}`,
  }));
  const counted = letters.filter(letter => 'AEFHKLT'.includes(letter));
  const passed = letters.filter(letter => !'AEFHKLT'.includes(letter));
  const alternatives = Array.from({ length: word.length + 1 }, (_, i) => i).filter(n => n !== counted.length);
  const choices = [counted.length, ...r.shuffle(alternatives).slice(0, 3)].sort((a, b) => a - b).map(String);
  const steps = [
    `Skip ${passed.join(', ')}. Each has a curved stroke.`,
    `Count ${counted.join(', ')} from left to right. That gives ${counted.length} in all.`,
  ];
  return {
    key, prompt: 'How many of these letters can you draw using just straight strokes?',
    picture: { type: 'batch11-upper', label: `The word ${word} in block capitals.`, marks },
    answer: String(counted.length), choices,
    hint: 'Look at one letter at a time. Count each place in the word, even if a letter appears twice.',
    workedSteps: steps.map(text => ({ text })), explanation: steps.join(' '),
  };
}

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const r = new Rng(hashString(key));
  const variant = r.int(0, 3);
  return variant === 3 ? letters(r, key) : outlines(r, key, variant === 2);
}

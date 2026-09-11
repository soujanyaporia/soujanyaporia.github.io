import { describe, expect, it } from 'vitest';
import { holds } from '../equation';
import { explain } from '../explain';
import { structuresFor, type WordSkill } from '../generators/word';
import { LEVEL_IDS } from '../levels';
import { Rng } from '../random';
import { generateProblem } from '../skills';
import type { Fact, Op, Story } from '../types';
import { ALL_FRAMES, buildStory } from '../word/story';
import { STORY_STRUCTURES, STRUCTURES } from '../word/storyMath';
import { storyOf } from './helpers';

const WORD_SKILLS: WordSkill[] = [
  'word.add',
  'word.sub',
  'word.compare',
  'word.missing',
  'word.choose',
  'word.build',
  'word.mul',
  'word.div',
  'word.tricky',
  'word.op',
  'word.action',
  'word.translate',
];

const SAMPLE: Record<Op, Fact> = {
  '+': { a: 3, op: '+', b: 4, c: 7 },
  '-': { a: 9, op: '-', b: 4, c: 5 },
  '*': { a: 3, op: '*', b: 4, c: 12 },
  '/': { a: 12, op: '/', b: 3, c: 4 },
};

/** The relationship between the quantities must match the structure. */
function quantitiesConsistent(s: Story): boolean {
  const q = s.quantities as Record<string, number>;
  const family = s.structure.split('.')[0];
  switch (family) {
    case 'join':
      return q.start + q.change === q.result;
    case 'separate':
      return q.start - q.change === q.result;
    case 'combine':
      return q.part1 + q.part2 === q.whole;
    case 'compare':
      return q.big - q.small === q.diff && q.big > q.small;
    default:
      return q.groups * q.each === q.total && q.groups >= 2 && q.each >= 2;
  }
}

function checkStory(s: Story): string | null {
  if (/[{}]|undefined|NaN/.test(s.text + s.answerSentence)) return `template leak: ${s.text}`;
  if (/ {2}/.test(s.text)) return `double space: ${s.text}`;
  if (!quantitiesConsistent(s)) return `quantities do not fit ${s.structure}: ${JSON.stringify(s.quantities)}`;
  const answer = s.quantities[s.unknownRole];
  if (answer === undefined || s.solve.c !== answer) return 'solve fact does not give the unknown';
  if (!holds(s.equation, answer)) return 'story equation does not hold';

  // The numbers in the text are exactly the given numbers, in order. The
  // unknown never appears, so the story cannot give the answer away.
  const inText = (s.text.match(/\d+/g) ?? []).map(Number);
  const given = s.given.map((g) => g.value);
  if (JSON.stringify(inText) !== JSON.stringify(given)) return `numbers ${inText} vs given ${given}: ${s.text}`;
  if (s.given.some((g) => g.role === s.unknownRole)) return `the unknown (${s.unknownRole}) appears in the text`;
  if (Object.values(s.quantities).some((v) => (v as number) < 1)) return 'zero or negative quantity in a story';

  // Grammar: agreement with 1, capitalised sentences, a question at the end.
  const bad = [/\b1 (stickers|marbles|people|children|pages|years|ducks|balloons|apples)\b/, /There are 1 /, /There were 1 /, /\b1 of them are\b/];
  for (const re of bad) if (re.test(s.text) || re.test(s.answerSentence)) return `agreement: ${s.text} / ${s.answerSentence}`;
  for (const sentence of s.text.split(/(?<=[.?]) /)) {
    if (!/^[A-Z0-9]/.test(sentence)) return `sentence not capitalised: "${sentence}"`;
  }
  if (!s.text.endsWith('?')) return 'story does not end with a question';
  if (!s.answerSentence.includes(String(answer))) return 'answer sentence misses the answer';
  if (!s.actions.length || Object.keys(s.labels).length === 0) return 'story is missing actions or labels';
  return null;
}

describe('story frames', () => {
  it('every structure has frames and every frame renders', () => {
    for (const structure of STORY_STRUCTURES) {
      expect(ALL_FRAMES.some((f) => f.structure === structure), structure).toBe(true);
    }
    const rng = new Rng(7);
    for (const frame of ALL_FRAMES) {
      const fact = SAMPLE[STRUCTURES[frame.structure].op];
      for (let i = 0; i < 20; i++) {
        const story = buildStory(rng, frame.structure, fact, { frameId: frame.id, extra: i % 2 === 0, maxExtra: 9 });
        expect(story, frame.id).not.toBeNull();
        const issue = checkStory(story!);
        if (issue) throw new Error(`${frame.id}: ${issue}`);
      }
    }
  });

  it('renders 1 correctly (singular nouns and verbs)', () => {
    const rng = new Rng(99);
    for (const frame of ALL_FRAMES) {
      const info = STRUCTURES[frame.structure];
      if ((frame.minValue ?? 1) > 1 || info.op === '*' || info.op === '/') continue;
      const facts =
        info.op === '+'
          ? [{ a: 1, op: '+' as const, b: 1, c: 2 }, { a: 1, op: '+' as const, b: 3, c: 4 }]
          : [{ a: 2, op: '-' as const, b: 1, c: 1 }, { a: 4, op: '-' as const, b: 3, c: 1 }];
      for (const fact of facts) {
        const story = buildStory(rng, frame.structure, fact, { frameId: frame.id });
        if (!story) continue;
        const issue = checkStory(story);
        if (issue) throw new Error(`${frame.id}: ${issue}`);
      }
    }
  });
});

describe('generated word problems', () => {
  for (const skill of WORD_SKILLS) {
    for (const level of LEVEL_IDS) {
      it(`${skill} at level ${level} reads correctly and matches its maths`, () => {
        for (let i = 0; i < 200; i++) {
          const p = generateProblem({ skill, level }, 5000 + i * 31);
          const story = storyOf(p)!;
          const issue = checkStory(story);
          if (issue) throw new Error(`${skill} L${level}: ${issue}`);
          expect(structuresFor(skill, level)).toContain(story.structure);
        }
      });
    }
  }

  it('has real linguistic variety, not one template', () => {
    const texts = new Set<string>();
    const frames = new Set<string>();
    const openings = new Set<string>();
    for (let i = 0; i < 720; i++) {
      const skill = WORD_SKILLS[i % WORD_SKILLS.length];
      const story = storyOf(generateProblem({ skill, level: 4 }, 77 + i))!;
      texts.add(story.text);
      frames.add(story.frameId);
      openings.add(story.text.split(' ').slice(0, 2).join(' ').replace(/\d+/g, '#'));
    }
    expect(texts.size).toBeGreaterThan(680);
    expect(frames.size).toBeGreaterThan(60);
    expect(openings.size).toBeGreaterThan(70);
  });

  it('adds unneeded information only at harder levels', () => {
    for (let i = 0; i < 300; i++) {
      expect(storyOf(generateProblem({ skill: 'word.add', level: 2 }, i))!.quantities.extra).toBeUndefined();
    }
    const withExtra = Array.from({ length: 400 }, (_, i) => storyOf(generateProblem({ skill: 'word.build', level: 3 }, i))!).filter(
      (s) => s.quantities.extra !== undefined,
    );
    expect(withExtra.length).toBeGreaterThan(10);
  });
});

describe('pedagogical validity', () => {
  const stories = (skill: WordSkill, level: 1 | 2 | 3 | 4 | 5, n = 300) =>
    Array.from({ length: n }, (_, i) => storyOf(generateProblem({ skill, level }, 300 + i * 13))!);

  it('multiplication stories are really about equal groups', () => {
    for (const s of stories('word.mul', 4)) {
      expect(s.text, s.text).toMatch(/\beach\b|\bevery\b|\brows?\b/i);
      expect(s.solve.op).toBe('*');
    }
  });

  it('division stories share or group equally, with no remainders', () => {
    for (const s of stories('word.div', 4)) {
      expect(s.text, s.text).toMatch(/equal|\beach\b|same number|rows of/i);
      expect(s.solve.op).toBe('/');
      expect(s.solve.a % s.solve.b).toBe(0);
    }
  });

  it('subtraction stories are told as subtraction, even when we solve by adding', () => {
    for (const s of [...stories('word.sub', 3), ...stories('word.missing', 3)]) {
      if (s.structure.startsWith('separate')) expect(s.equation.left.ops[0]).toBe('-');
    }
  });

  it('tricky comparisons: "more" can need subtracting and "fewer" can need adding', () => {
    let more = 0;
    let fewer = 0;
    for (const s of stories('word.tricky', 3, 400)) {
      if (s.structure === 'compare.more_ref') {
        more++;
        expect(s.text).toMatch(/more/);
        expect(s.solve.op).toBe('-');
      }
      if (s.structure === 'compare.fewer_ref') {
        fewer++;
        expect(s.text).toMatch(/fewer/);
        expect(s.solve.op).toBe('+');
      }
    }
    expect(more).toBeGreaterThan(20);
    expect(fewer).toBeGreaterThan(20);
  });

  it('comparison models always draw the bigger amount longer', () => {
    for (const skill of ['word.compare', 'word.tricky'] as WordSkill[]) {
      for (const s of stories(skill, 3)) {
        const q = s.quantities as Record<string, number>;
        expect(q.big).toBeGreaterThan(q.small);
      }
    }
  });

  it('the explanation separates the story equation from the calculation', () => {
    for (let i = 0; i < 200; i++) {
      const p = generateProblem({ skill: 'word.missing', level: 2 }, 70 + i);
      const e = explain(p);
      const says = e.steps.map((s) => s.say).join(' ');
      expect(says).toMatch(/The story as an equation/);
      expect(says).toMatch(/To find □/);
    }
  });
});

import { calcTokens, equationText, equationTokens, factText, isAdditive, line, OP_SYMBOL } from '../equation';
import type {
  ChoiceProblem,
  Explanation,
  Hint,
  MatchProblem,
  NumberProblem,
  Story,
  StoryStructure,
  TranslateProblem,
  VisualSpec,
} from '../types';
import { ACTION_INFO, STRUCTURES } from '../word/storyMath';
import { ask, show, StepList, sym } from './kit';
import { computeHints } from './strategies';
import {
  arrayVisual,
  compareBar,
  groupingVisual,
  groupsVisual,
  partWholeBar,
  shareVisual,
  skipLine,
} from './visuals';

type Q = Story['quantities'];
const val = (q: Q, role: keyof Q): number => q[role] ?? 0;

/** Singapore-style models for every story structure (bars, groups, sharing). */
export function storyModel(story: Story, reveal: boolean): VisualSpec {
  const q = story.quantities;
  const names = story.names.length === 2 ? story.names : ['', ''];
  const item = story.unit.item;
  const g = val(q, 'groups');
  const e = val(q, 'each');
  const t = val(q, 'total');
  switch (story.structure) {
    case 'join.result':
      return partWholeBar(val(q, 'start'), val(q, 'change'), { whole: reveal }, { p1: 'at first', p2: 'joined' });
    case 'join.change':
      return partWholeBar(val(q, 'start'), val(q, 'change'), { p2: reveal }, { p1: 'at first', p2: 'joined', whole: 'now' });
    case 'join.start':
      return partWholeBar(val(q, 'start'), val(q, 'change'), { p1: reveal }, { p1: 'at first', p2: 'joined', whole: 'now' });
    case 'separate.result':
      return partWholeBar(val(q, 'result'), val(q, 'change'), { p1: reveal }, { p1: 'left', p2: 'gone', whole: 'at first' });
    case 'separate.change':
      return partWholeBar(val(q, 'result'), val(q, 'change'), { p2: reveal }, { p1: 'left', p2: 'gone', whole: 'at first' });
    case 'separate.start':
      return partWholeBar(val(q, 'result'), val(q, 'change'), { whole: reveal }, { p1: 'left', p2: 'gone', whole: 'at first' });
    case 'combine.whole':
      return partWholeBar(val(q, 'part1'), val(q, 'part2'), { whole: reveal });
    case 'combine.part':
      return partWholeBar(val(q, 'part1'), val(q, 'part2'), { p2: reveal });
    case 'compare.difference':
      return compareBar(val(q, 'big'), val(q, 'small'), { diff: reveal }, [names[0], names[1]], true);
    case 'compare.more':
      return compareBar(val(q, 'big'), val(q, 'small'), { big: reveal }, [names[1], names[0]], false);
    case 'compare.fewer':
      return compareBar(val(q, 'big'), val(q, 'small'), { small: reveal }, [names[0], names[1]], true);
    case 'compare.more_ref':
      return compareBar(val(q, 'big'), val(q, 'small'), { small: reveal }, [names[0], names[1]], true);
    case 'compare.fewer_ref':
      return compareBar(val(q, 'big'), val(q, 'small'), { big: reveal }, [names[1], names[0]], false);
    case 'groups.total':
    case 'rate.total':
      return g <= 6 && e <= 10 ? groupsVisual(g, e, { item, filled: g, sizes: true, totals: reveal }) : arrayVisual(g, e, { item });
    case 'array.total':
      return arrayVisual(g, e, { item });
    case 'groups.size':
      return groupsVisual(g, e, { item, filled: g, sizes: reveal, hideSize: !reveal });
    case 'share.each':
      return g <= 6 && t <= 40 ? shareVisual(t, g, reveal ? t : 0, item) : groupsVisual(g, e, { item, filled: g, hideSize: !reveal, sizes: reveal });
    case 'group.count':
      return t <= 40 ? groupingVisual(t, e, reveal ? g : 0, item) : skipLine(e, g, { hideEnd: !reveal });
  }
}

function modelSay(structure: StoryStructure, q: Q): string {
  switch (structure) {
    case 'join.result':
      return `We start with ${val(q, 'start')}, then ${val(q, 'change')} more join. We want the total.`;
    case 'join.change':
      return `We start with ${val(q, 'start')} and end with ${val(q, 'result')}. The missing part is how many joined.`;
    case 'join.start':
      return `We don't know how many there were at first. ${val(q, 'change')} more came, and now there are ${val(q, 'result')}.`;
    case 'separate.result':
      return `We start with ${val(q, 'start')}. ${val(q, 'change')} go away. We want the part that is left.`;
    case 'separate.change':
      return `We start with ${val(q, 'start')}. ${val(q, 'result')} are left. The missing part is how many went away.`;
    case 'separate.start':
      return `${val(q, 'result')} are left and ${val(q, 'change')} went away. Together they make the number at first.`;
    case 'combine.whole':
      return `There are two parts: ${val(q, 'part1')} and ${val(q, 'part2')}. We want the whole.`;
    case 'combine.part':
      return `The whole is ${val(q, 'whole')}. One part is ${val(q, 'part1')}. We want the other part.`;
    case 'compare.difference':
      return `Line up the two bars. ${val(q, 'big')} is more than ${val(q, 'small')}. We want the difference.`;
    case 'compare.more':
      return `One bar is ${val(q, 'small')}. The other has ${val(q, 'diff')} more, so it is longer.`;
    case 'compare.fewer':
      return `One bar is ${val(q, 'big')}. The other has ${val(q, 'diff')} fewer, so it is shorter.`;
    case 'compare.more_ref':
      return `The ${val(q, 'big')} belongs to the one who has MORE. The other bar is ${val(q, 'diff')} shorter.`;
    case 'compare.fewer_ref':
      return `The ${val(q, 'small')} belongs to the one who has FEWER. The other bar is ${val(q, 'diff')} longer.`;
    case 'groups.total':
      return `There are ${val(q, 'groups')} equal groups with ${val(q, 'each')} in each.`;
    case 'array.total':
      return `There are ${val(q, 'groups')} rows with ${val(q, 'each')} in each row.`;
    case 'rate.total':
      return `${val(q, 'each')} each time, ${val(q, 'groups')} times. Those are equal groups.`;
    case 'groups.size':
      return `${val(q, 'total')} are split into ${val(q, 'groups')} equal groups. We want how many are in each.`;
    case 'share.each':
      return `${val(q, 'total')} are shared equally into ${val(q, 'groups')} groups.`;
    case 'group.count':
      return `${val(q, 'total')} are put into groups of ${val(q, 'each')}. We want how many groups.`;
  }
}

/** Why we choose the operation — the relationship, never a keyword trick. */
export function decideSay(structure: StoryStructure): string {
  switch (structure) {
    case 'join.result':
    case 'combine.whole':
      return 'We are finding the whole, so we add.';
    case 'separate.start':
      return 'The number at first is the whole: the part left and the part that went away. So we add.';
    case 'compare.more':
      return 'More than means a bigger number, so we add.';
    case 'compare.fewer_ref':
      return 'The number we know is the smaller one. The other is bigger, so we add the difference.';
    case 'separate.result':
      return 'Some are taken away, so we subtract.';
    case 'compare.fewer':
      return 'Fewer than means a smaller number, so we subtract.';
    case 'compare.more_ref':
      return 'The number we know is the bigger one. The other is smaller, so we subtract the difference.';
    case 'compare.difference':
      return 'To find the difference, we take the smaller number from the bigger number.';
    case 'groups.total':
    case 'array.total':
    case 'rate.total':
      return 'Equal groups: we multiply the number of groups by the number in each.';
    case 'groups.size':
      return 'We know the total and how many groups. We divide to share it out.';
    case 'share.each':
      return 'Sharing equally: we divide.';
    case 'group.count':
      return 'Finding how many equal groups: we divide.';
    default:
      return 'We know the whole and one part. To find the other part, we subtract.';
  }
}

/** First hint: a question about the relationship in the story. */
function structureQuestion(structure: StoryStructure, q: Q): string {
  switch (structure) {
    case 'join.result':
      return 'The amount is getting bigger. Should we add or subtract?';
    case 'combine.whole':
      return 'We are putting two groups together. Should we add or subtract?';
    case 'separate.result':
      return 'Some are taken away. Should we add or subtract?';
    case 'combine.part':
      return 'We know the whole and one part. How do we find the other part?';
    case 'compare.difference':
      return 'Line them up. How many extra does one have?';
    case 'compare.more':
      return `${val(q, 'diff')} more than ${val(q, 'small')}: is that bigger or smaller than ${val(q, 'small')}?`;
    case 'compare.fewer':
      return `${val(q, 'diff')} fewer than ${val(q, 'big')}: is that bigger or smaller than ${val(q, 'big')}?`;
    case 'compare.more_ref':
    case 'compare.fewer_ref':
      return 'Who has more? Read the comparing sentence slowly before you decide.';
    case 'join.change':
      return `How many do we add to ${val(q, 'start')} to make ${val(q, 'result')}?`;
    case 'join.start':
      return `Some, and then ${val(q, 'change')} more, makes ${val(q, 'result')}. Undo the ${val(q, 'change')} more.`;
    case 'separate.change':
      return `From ${val(q, 'start')} down to ${val(q, 'result')}. How many went away?`;
    case 'separate.start':
      return `${val(q, 'result')} were left after ${val(q, 'change')} went away. Put them back together.`;
    case 'groups.total':
    case 'array.total':
    case 'rate.total':
      return 'Are there equal groups? How many groups, and how many in each?';
    case 'groups.size':
      return 'We know how many altogether and how many groups. What is missing?';
    case 'share.each':
      return 'Are things shared equally? Into how many groups?';
    case 'group.count':
      return `How many groups of ${val(q, 'each')} can we make from ${val(q, 'total')}?`;
  }
}

const list = (nums: number[]) =>
  nums.length <= 1 ? nums.join('') : `${nums.slice(0, -1).join(', ')} and ${nums[nums.length - 1]}`;

/** "At first: 8 · Went away: 3" */
export function whatWeKnow(story: Story): string {
  return story.given
    .filter((g) => g.role !== 'extra')
    .map((g) => `${story.labels[g.role] ?? g.role}: ${g.value}`)
    .join(' · ');
}

const UNDO: Record<string, string> = { '+': 'adding', '-': 'taking away', '*': 'multiplying', '/': 'dividing' };

function storySteps(story: Story, mode: 'solve' | 'choose'): StepList {
  const q = story.quantities;
  const solve = story.solve;
  const needed = story.given.filter((g) => g.role !== 'extra').map((g) => g.value);
  const extra = q.extra;
  const blankAlone = story.equation.right.terms.length === 1 && story.equation.right.terms[0] === null;
  const s = new StepList();
  s.add(`Read the story. The numbers we need are ${list(needed)}.${extra !== undefined ? ` We do not need ${extra}.` : ''}`, null);
  s.add(`What do we know? ${whatWeKnow(story)}. ${modelSay(story.structure, q)}`, storyModel(story, false));
  s.add(`What happened? ${ACTION_INFO[story.actions[0]].label}. ${decideSay(story.structure)}`);
  if (mode === 'solve' && !blankAlone) {
    s.add(`The story as an equation: ${equationText(story.equation)}`, undefined, [line(equationTokens(story.equation))]);
    const storyOp = [...story.equation.left.ops][0];
    s.add(`To find □, we undo the ${UNDO[storyOp]}: ${solve.a} ${sym(solve.op)} ${solve.b}.`, undefined, [ask(solve)]);
  } else {
    s.add(`The equation is ${solve.a} ${sym(solve.op)} ${solve.b} = □.`, undefined, [ask(solve)]);
  }
  s.add(`${solve.a} ${sym(solve.op)} ${solve.b} = ${solve.c}.`, storyModel(story, true), [show(solve, 'answer')], true);
  const filled = equationText(story.equation, String(solve.c));
  s.add(`${story.answerSentence} Does it make sense? ${filled} ✓`, undefined, [line(equationTokens(story.equation, solve.c), 'check', 'Check')]);
  return s;
}

function storyHints(story: Story): Hint[] {
  return [
    { level: 1, say: structureQuestion(story.structure, story.quantities) },
    { level: 2, say: `What do we know? ${whatWeKnow(story)}.` },
    { level: 3, say: 'The story as an equation:', work: line(equationTokens(story.equation, '?')) },
    { level: 4, say: 'Now calculate:', work: ask(story.solve), visual: storyModel(story, false) },
  ];
}

export function explainStory(p: NumberProblem | ChoiceProblem | TranslateProblem): Explanation {
  const story = p.story!;
  const solve = story.solve;
  if (p.kind === 'choice') {
    const s = storySteps(story, 'choose');
    const calc = `${solve.a} ${OP_SYMBOL[solve.op]} ${solve.b}`;
    return {
      goal: p.style === 'expression' ? 'Which calculation answers the question?' : 'Which equation matches the story?',
      steps: s.steps,
      hints: [
        { level: 1, say: structureQuestion(story.structure, story.quantities) },
        { level: 2, say: `What do we know? ${whatWeKnow(story)}.` },
        { level: 3, say: `This story needs ${isAdditive(solve.op) ? (solve.op === '+' ? 'adding (+)' : 'subtracting (−)') : solve.op === '*' ? 'multiplying (×)' : 'dividing (÷)'}.` },
        { level: 4, say: `Look for ${calc}.`, work: line(calcTokens(solve)), visual: storyModel(story, false) },
      ],
    };
  }
  const s = storySteps(story, 'solve');
  return {
    goal: story.question,
    steps: s.steps,
    hints: storyHints(story),
    solveHints: computeHints(solve, { item: story.unit.item }),
  };
}

// ---------------------------------------------------------------- which story matches?

const MEANING: Record<string, (a: number, b: number) => string> = {
  '+': (a, b) => `start with ${a} and get ${b} more`,
  '-': (a, b) => `start with ${a} and take ${b} away (or compare ${a} with ${b})`,
  '*': (a, b) => `${a} equal groups of ${b}`,
  '/': (a, b) => `share ${a} equally into ${b} groups`,
};

export function explainMatch(p: MatchProblem): Explanation {
  const eq = p.equation;
  const s = new StepList();
  s.add(`${factText(eq)} means: ${MEANING[eq.op](eq.a, eq.b)}.`, null, [show(eq)]);
  p.options.forEach((text, i) => {
    const f = p.optionFacts[i];
    s.add(
      i === p.answer ? `"${text}" is ${factText(f)}. It matches!` : `"${text}" is ${f.a} ${sym(f.op)} ${f.b}. That is a different calculation.`,
      undefined,
      [],
      i === p.answer,
    );
  });
  return {
    goal: 'Which story matches the equation?',
    steps: s.steps,
    hints: [
      { level: 1, say: `What does ${sym(eq.op)} mean in ${factText(eq)}?` },
      { level: 2, say: `${factText(eq)} means ${MEANING[eq.op](eq.a, eq.b)}.` },
      { level: 3, say: `Find the story with ${eq.a} and ${eq.b} where that happens.` },
      { level: 4, say: `Check each story: which one is ${eq.a} ${sym(eq.op)} ${eq.b}?` },
    ],
  };
}

export { STRUCTURES };

import { factTokens, line } from '../equation';
import type { CountersSpec, Fact, Hint, ItemKind, NumberLineSpec, Op, Step, StrategyView } from '../types';
import {
  arrowList,
  ask,
  checkLine,
  countable,
  counted,
  countList,
  mk,
  repeatedLine,
  show,
  StepList,
  sym,
} from './kit';
import {
  arrayVisual,
  bond,
  familyVisual,
  groupingVisual,
  groupsVisual,
  joinCounters,
  numberLine,
  shareVisual,
  skipLine,
  takeAwayCounters,
} from './visuals';

/**
 * Composable explanation strategies. Each strategy knows when it applies
 * to a fact and appends the "working out" steps. Explanations for any
 * generated problem are assembled from these, so no problem needs a
 * hand-written explanation. The order in each list is the order of
 * preference (concrete and efficient first).
 */
export interface StrategyContext {
  item?: ItemKind;
  /** Put these strategy ids first (e.g. 'share' for sharing lessons). */
  prefer?: string[];
}

export interface Strategy {
  id: string;
  label: string;
  applies: (f: Fact) => boolean;
  run: (s: StepList, f: Fact, ctx: StrategyContext) => void;
}

// ---------------------------------------------------------------- addition

const zeroAdd: Strategy = {
  id: 'zero',
  label: 'Adding 0',
  applies: ({ a, b }) => a === 0 || b === 0,
  run(s, { a, b, c }, ctx) {
    s.add(a === 0 ? 'We start with 0. That is nothing at all.' : `We start with ${a}.`, c > 0 && c <= 20 ? joinCounters(a, b, ctx.item) : numberLine(a, b));
    s.add(a === 0 ? `Then we add ${b}, so we have ${c}.` : `Adding 0 adds nothing, so we still have ${c}.`);
  },
};

const makeTen: Strategy = {
  id: 'make-ten',
  label: 'Make 10',
  applies: ({ a, b, c }) => a > 0 && b > 0 && a < 10 && b < 10 && c > 10,
  run(s, { a, b, c }) {
    const need = 10 - a;
    const rest = b - need;
    const frame: CountersSpec = { ...joinCounters(a, b), layout: 'frame' };
    s.add(`Let's make 10 first. ${a} needs ${need} more to make 10.`, frame);
    s.add(`So we split ${b} into ${need} and ${rest}.`, bond(b, [need, rest]));
    s.add(`${a} + ${need} = 10. Then 10 + ${rest} = ${c}.`, frame, [show(mk('+', a, need)), show(mk('+', 10, rest))]);
  },
};

const doubles: Strategy = {
  id: 'doubles',
  label: 'Use doubles',
  applies: ({ a, b, c }) => Math.abs(a - b) <= 1 && Math.min(a, b) >= 2 && c <= 20,
  run(s, { a, b, c }, ctx) {
    const m = Math.min(a, b);
    if (a === b) {
      s.add(`${a} + ${a} is a double. Doubles are easy to remember.`, joinCounters(a, b, ctx.item));
      s.add(`Double ${a} is ${c}.`, undefined, [show(mk('+', a, a))]);
    } else {
      s.add(`${a} and ${b} are next-door numbers. Use the double ${m} + ${m}.`, joinCounters(a, b, ctx.item));
      s.add(`${m} + ${m} = ${2 * m}, and ${c} is 1 more.`, undefined, [show(mk('+', m, m)), show(mk('+', 2 * m, 1))]);
    }
  },
};

const countOn: Strategy = {
  id: 'count-on',
  label: 'Count on',
  applies: ({ a, b, c }) => a > 0 && b > 0 && b <= 10 && c <= 20,
  run(s, { a, b }, ctx) {
    s.add(`Here are ${counted(a, 'blue counter')} and ${counted(b, 'orange counter')}.`, joinCounters(a, b, ctx.item));
    if (b > a && a <= 3) {
      s.add(`Tip: start from the bigger number, ${b}. Count on ${a}: ${countList(b, a, 1)}.`, {
        type: 'counters',
        item: ctx.item,
        groups: [
          { count: b, color: 'orange', label: String(b) },
          { count: a, color: 'blue', label: String(a) },
        ],
        numbered: true,
        numberFrom: b,
      });
    } else {
      s.add(`Start at ${a}. Count on ${b}: ${countList(a, b, 1)}.`, { ...joinCounters(a, b, ctx.item), numbered: true, numberFrom: a });
    }
  },
};

const lineAdd: Strategy = {
  id: 'number-line',
  label: 'Number line',
  applies: ({ b, c }) => b > 0 && b <= 10 && c <= 20,
  run(s, { a, b, c }) {
    const nl = numberLine(a, b);
    s.add(`Start at ${a} on the number line.`, { ...nl, showJumps: 0 });
    s.add(`Jump forward ${b}: ${countList(a, b, 1)}.`, nl);
    s.add(`We land on ${c}.`, { ...nl, marks: [a, c] });
  },
};

function tensThenOnes(start: number, delta: number) {
  const op: Op = delta >= 0 ? '+' : '-';
  const size = Math.abs(delta);
  const tens = size - (size % 10);
  const ones = size % 10;
  if (!tens || !ones) return [];
  const mid = op === '+' ? start + tens : start - tens;
  return [show(mk(op, start, tens)), show(mk(op, mid, ones))];
}

const tensOnesAdd: Strategy = {
  id: 'tens-ones',
  label: 'Tens and ones',
  applies: ({ b, c }) => b > 0 && (c > 20 || b > 10),
  run(s, { a, b, c }) {
    const nl = numberLine(a, b);
    const tens = b - (b % 10);
    s.add(`Start at ${a} on the number line.`, { ...nl, showJumps: 0 });
    s.add(tens && b % 10 ? `Add the tens first: + ${tens}. Then the ones: + ${b % 10}.` : `Jump forward ${b}.`, nl, tensThenOnes(a, b));
    s.add(`We land on ${c}.`, { ...nl, marks: [a, c] });
  },
};

// ---------------------------------------------------------------- subtraction

const zeroSub: Strategy = {
  id: 'zero',
  label: 'Taking away 0',
  applies: ({ b, c }) => b === 0 || c === 0,
  run(s, { a, b }, ctx) {
    if (b === 0) {
      s.add(`Start with ${a}.`, a <= 20 ? takeAwayCounters(a, 0, 0, true, ctx.item) : numberLine(a, 0));
      s.add(`Taking away 0 takes nothing away, so we still have ${a}.`);
    } else {
      s.add(`Start with ${a}.`, a <= 20 ? takeAwayCounters(a, b, 0, false, ctx.item) : numberLine(a, 0));
      s.add(`We take away all ${a}. Nothing is left, so the answer is 0.`, a <= 20 ? takeAwayCounters(a, b, b, false, ctx.item) : numberLine(a, -b));
    }
  },
};

const takeAway: Strategy = {
  id: 'take-away',
  label: 'Take away',
  applies: ({ a, b, c }) => a <= 20 && b > 0 && c > 0,
  run(s, { a, b, c }, ctx) {
    s.add(`Start with ${counted(a, 'counter')}.`, takeAwayCounters(a, b, 0, false, ctx.item));
    s.add(`Take away ${b}. Cross ${b === 1 ? 'it' : 'them'} out.`, takeAwayCounters(a, b, b, false, ctx.item));
    s.add(`Count what is left: ${countList(0, c, 1)}.`, takeAwayCounters(a, b, b, true, ctx.item));
  },
};

const bridgeTen: Strategy = {
  id: 'bridge-ten',
  label: 'Go through 10',
  applies: ({ a, b, c }) => a > 10 && a < 20 && b < 10 && c < 10 && b > a - 10,
  run(s, { a, b, c }) {
    const first = a - 10;
    const rest = b - first;
    const nl: NumberLineSpec = { type: 'numberline', min: 0, max: 20, start: a, jumps: [-first, -rest], marks: [a, 10], jumpLabels: true };
    s.add(`Take away ${b} in two parts. First take ${first} to get to 10.`, bond(b, [first, rest]));
    s.add(`${a} − ${first} = 10. Then 10 − ${rest} = ${c}.`, nl, [show(mk('-', a, first)), show(mk('-', 10, rest))]);
  },
};

const countBack: Strategy = {
  id: 'count-back',
  label: 'Count back',
  applies: ({ a, b, c }) => b > 0 && b <= 10 && a <= 20 && c >= 0,
  run(s, { a, b, c }) {
    const nl = numberLine(a, -b);
    s.add(`Start at ${a} on the number line.`, { ...nl, showJumps: 0 });
    s.add(`Jump back ${b}: ${countList(a, b, -1)}.`, nl);
    s.add(`We land on ${c}.`, { ...nl, marks: [a, c] });
  },
};

const thinkAdd: Strategy = {
  id: 'think-add',
  label: 'Think addition',
  applies: ({ b, c }) => b > 0 && c > 0,
  run(s, { a, b, c }) {
    s.add(`Adding and taking away are a family. Think: ${b} + what makes ${a}?`, familyVisual('add', [b, c], a), [
      line(factTokens(mk('+', b, c), { hide: 'b', fill: '?' })),
    ]);
    s.add(`${b} + ${c} = ${a}. So ${a} − ${b} = ${c}.`, familyVisual('add', [b, c], a, 2), [show(mk('+', b, c))]);
  },
};

const countUp: Strategy = {
  id: 'count-up',
  label: 'Count up',
  applies: ({ a, b, c }) => c > 0 && c <= 4 && b >= 5 && a <= 20,
  run(s, { a, b, c }) {
    const nl = numberLine(b, c);
    s.add(`${b} and ${a} are close together. Count up from ${b} to ${a}.`, { ...nl, showJumps: 0, marks: [b, a] });
    s.add(`${countList(b, c, 1)}. That is ${counted(c, 'jump')}.`, { ...nl, marks: [b, a] });
  },
};

const tensOnesSub: Strategy = {
  id: 'tens-ones',
  label: 'Tens and ones',
  applies: ({ a, b }) => a > 20 && b > 0,
  run(s, { a, b, c }) {
    const nl = numberLine(a, -b);
    const tens = b - (b % 10);
    s.add(`Start at ${a} on the number line.`, { ...nl, showJumps: 0 });
    s.add(tens && b % 10 ? `Take away the tens first: − ${tens}. Then the ones: − ${b % 10}.` : `Jump back ${b}.`, nl, tensThenOnes(a, -b));
    s.add(`We land on ${c}.`, { ...nl, marks: [a, c] });
  },
};

// ---------------------------------------------------------------- multiplication (a groups of b)

const skipText = (step: number, times: number) => countList(0, times, 1, step);

const equalGroups: Strategy = {
  id: 'equal-groups',
  label: 'Equal groups',
  applies: ({ a, b }) => a >= 1 && a <= 6 && b <= 10,
  run(s, { a, b }, ctx) {
    s.add(`${a} × ${b} means ${a} groups of ${b}. Here are ${a} empty groups.`, groupsVisual(a, b, { item: ctx.item, filled: 0 }));
    s.add(`Put ${b} in each group.`, groupsVisual(a, b, { item: ctx.item, filled: a, sizes: true }));
    s.add(`Count the groups in ${b}s: ${skipText(b, a)}.`, groupsVisual(a, b, { item: ctx.item, filled: a, totals: true }));
  },
};

const arrayStrategy: Strategy = {
  id: 'array',
  label: 'Array',
  applies: ({ a, b }) => a <= 10 && b <= 10,
  run(s, { a, b }, ctx) {
    s.add(`Make an array: ${a} rows with ${b} in each row.`, arrayVisual(a, b, { item: ctx.item }));
    s.add(`Count row by row: ${skipText(b, a)}.`, arrayVisual(a, b, { item: ctx.item, highlightRows: a }));
  },
};

const skipCount: Strategy = {
  id: 'skip-count',
  label: 'Skip count',
  applies: ({ a, b }) => a <= 10 && b <= 10,
  run(s, { a, b }) {
    const nl = skipLine(b, a);
    s.add(`Skip count in ${b}s, ${a} times, on the number line.`, { ...nl, showJumps: 0 });
    s.add(`${arrowList(0, a, 1, b)}.`, nl);
  },
};

const repeatedAdd: Strategy = {
  id: 'repeated',
  label: 'Add again',
  applies: ({ a }) => a >= 2 && a <= 5,
  run(s, { a, b, c }, ctx) {
    s.add(`${a} groups of ${b} is ${b} added ${a} times.`, groupsVisual(a, b, { item: ctx.item, filled: a, sizes: true }), [repeatedLine(b, a)]);
    s.add(`Add them up: ${skipText(b, a)}.`, groupsVisual(a, b, { item: ctx.item, filled: a, totals: true }), [repeatedLine(b, a, c)]);
  },
};

const EASY = [1, 2, 5, 10];
const turnAround: Strategy = {
  id: 'turn-around',
  label: 'Turn it around',
  applies: ({ a, b }) => a !== b && EASY.includes(a) && !EASY.includes(b),
  run(s, { a, b, c }) {
    s.add(`${a} × ${b} is the same as ${b} × ${a}. Turn the array around!`, arrayVisual(a, b, { turned: false }));
    s.add(`Now count in ${a}s, ${b} times: ${skipText(a, b)}.`, arrayVisual(a, b, { turned: true }), [show(mk('*', b, a))]);
    void c;
  },
};

const doubling: Strategy = {
  id: 'double',
  label: 'Double it',
  applies: ({ a, b }) => (a === 2 || b === 2) && a !== b,
  run(s, { a, b, c }, ctx) {
    const other = a === 2 ? b : a;
    s.add(`× 2 means two groups — that is double ${other}.`, groupsVisual(2, other, { item: ctx.item, filled: 2, sizes: true }));
    s.add(`Double ${other} is ${other} + ${other} = ${c}.`, undefined, [show(mk('+', other, other))]);
  },
};

// ---------------------------------------------------------------- division (a ÷ b = c)

const share: Strategy = {
  id: 'share',
  label: 'Share out',
  applies: ({ a, b }) => b >= 2 && b <= 6 && a <= 40,
  run(s, { a, b, c }, ctx) {
    s.add(`Share ${a} into ${b} equal groups. Here are ${a} to share and ${b} plates.`, shareVisual(a, b, 0, ctx.item));
    s.add('Give one to each plate, again and again, like dealing cards.', shareVisual(a, b, b, ctx.item));
    s.add('Keep going until they are all shared.', shareVisual(a, b, a, ctx.item));
    s.add(`Each plate has ${c}.`);
  },
};

const group: Strategy = {
  id: 'group',
  label: 'Make groups',
  applies: ({ a, c }) => c >= 1 && c <= 8 && a <= 40,
  run(s, { a, b, c }, ctx) {
    s.add(`Put ${a} into groups of ${b}.`, groupingVisual(a, b, 0, ctx.item));
    s.add(`Circle ${b} at a time.`, groupingVisual(a, b, 1, ctx.item));
    s.add(`Keep going. We made ${counted(c, 'group')}.`, groupingVisual(a, b, c, ctx.item));
  },
};

const thinkTimes: Strategy = {
  id: 'think-times',
  label: 'Think times',
  applies: ({ b }) => b > 0,
  run(s, { a, b, c }) {
    s.add(`Division and multiplication are a family. Think: what times ${b} makes ${a}?`, familyVisual('mul', [c, b], a), [
      line(factTokens(mk('*', c, b), { hide: 'a', fill: '?' })),
    ]);
    s.add(`${c} × ${b} = ${a}. So ${a} ÷ ${b} = ${c}.`, familyVisual('mul', [c, b], a, 2), [show(mk('*', c, b))]);
  },
};

const skipDivide: Strategy = {
  id: 'skip-count',
  label: 'Skip count',
  applies: ({ b, c }) => c <= 10 && b <= 10,
  run(s, { a, b, c }) {
    const nl = skipLine(b, c);
    s.add(`Count in ${b}s until you reach ${a}.`, { ...nl, showJumps: 0 });
    s.add(`${arrowList(0, c, 1, b)}. That is ${counted(c, 'jump')}.`, nl);
  },
};

export const STRATEGIES: Record<Op, Strategy[]> = {
  '+': [zeroAdd, makeTen, doubles, countOn, lineAdd, tensOnesAdd],
  '-': [zeroSub, bridgeTen, takeAway, countBack, countUp, thinkAdd, tensOnesSub],
  '*': [equalGroups, arrayStrategy, skipCount, repeatedAdd, turnAround, doubling],
  '/': [share, group, thinkTimes, skipDivide],
};

export function pickStrategies(f: Fact, prefer: string[] = []): Strategy[] {
  const applicable = STRATEGIES[f.op].filter((s) => s.applies(f));
  const rank = (s: Strategy) => {
    if (s.id === 'zero') return -2;
    const i = prefer.indexOf(s.id);
    return i >= 0 ? i - prefer.length : 0;
  };
  return applicable.map((s, i) => ({ s, i })).sort((x, y) => rank(x.s) - rank(y.s) || x.i - y.i).map(({ s }) => s);
}

const RULES: Record<Op, string | undefined> = {
  '+': undefined,
  '-': undefined,
  '*': '× means equal groups: how many groups, and how many in each.',
  '/': '÷ means sharing into equal groups, or finding how many groups.',
};

export interface FactExplanation {
  strategy: string;
  steps: Step[];
  alternatives: StrategyView[];
}

/**
 * The worked solution for a op b = c: concrete first, then the picture,
 * then the equation, then a check using the inverse operation.
 */
export function explainFact(f: Fact, ctx: StrategyContext = {}, intro?: (s: StepList) => void, check = true): FactExplanation {
  const options = pickStrategies(f, ctx.prefer);
  const build = (strategy: Strategy | undefined): Step[] => {
    const s = new StepList();
    intro?.(s);
    strategy?.run(s, f, ctx);
    s.add(`So ${f.a} ${sym(f.op)} ${f.b} = ${f.c}.`, undefined, [show(f, 'answer')], true);
    const rule = RULES[f.op];
    if (rule) s.add(rule);
    if (check && f.op !== '+' && f.b !== 0) {
      const inverse = f.op === '-' ? mk('+', f.c, f.b) : f.op === '*' ? mk('/', f.c, f.b) : mk('*', f.c, f.b);
      s.add(`Check: ${inverse.a} ${sym(inverse.op)} ${inverse.b} = ${inverse.c}.`, undefined, [checkLine(inverse)]);
    }
    return s.steps;
  };
  return {
    strategy: options[0]?.label ?? 'Work it out',
    steps: build(options[0]),
    alternatives: options.slice(1, 3).map((st) => ({ id: st.id, label: st.label, steps: build(st) })),
  };
}

// ---------------------------------------------------------------- hints for working out a op b

/** Four hints: a question, a strategy, a picture that helps, a picture that nearly solves it. */
export function computeHints(f: Fact, ctx: StrategyContext = {}, reversed = false): Hint[] {
  const { a, b, c } = f;
  const first = (text: string) => (reversed ? `Both sides of = are worth the same. ${text}` : text);
  switch (f.op) {
    case '+': {
      const primary = pickStrategies(f, ctx.prefer)[0]?.id;
      const m = Math.min(a, b);
      const h1 =
        primary === 'make-ten'
          ? `${a} needs ${10 - a} more to make 10. Can you use that?`
          : primary === 'doubles'
            ? `Do you know ${m} + ${m}? Use it!`
            : b <= 5
              ? `Start at ${a}. Count on ${b} more.`
              : `Put ${a} and ${b} together. How many altogether?`;
      return [
        { level: 1, say: first(h1) },
        countable(f)
          ? { level: 2, say: `Use counters: ${a} and ${b}.`, visual: joinCounters(a, b, ctx.item) }
          : { level: 2, say: 'Add the tens first, then the ones.', work: ask(f) },
        countable(f) && b > 0
          ? { level: 3, say: `Count on from ${a}: ${countList(a, Math.max(0, b - 1), 1) || a}, …`, visual: { ...joinCounters(a, b, ctx.item), numbered: true, numberFrom: a } }
          : { level: 3, say: 'Work it out:', work: ask(f) },
        { level: 4, say: `Jump ${b} forward from ${a}.`, visual: numberLine(a, b) },
      ];
    }
    case '-':
      return [
        { level: 1, say: first(`Start with ${a}. Take away ${b}. How many are left?`) },
        { level: 2, say: `Think addition: ${b} + ? = ${a}.`, work: line(factTokens(mk('+', b, Math.max(0, c)), { hide: 'b', fill: '?' })) },
        countable(f)
          ? { level: 3, say: `${b} are crossed out. Count the ones that are left.`, visual: takeAwayCounters(a, b, b, false, ctx.item) }
          : { level: 3, say: 'Take away the tens first, then the ones.', work: ask(f) },
        { level: 4, say: `Jump back ${b} from ${a}: ${arrowList(a, Math.min(b, 10), -1, b > 10 ? Math.ceil(b / 10) : 1)}.`, visual: numberLine(a, -b) },
      ];
    case '*':
      return [
        { level: 1, say: first(`${a} × ${b} means ${a} groups of ${b}.`) },
        { level: 2, say: `Count in ${b}s, ${a} times.`, visual: skipLine(b, a, { hideEnd: true, show: Math.max(1, a - 1) }) },
        a <= 6
          ? { level: 3, say: `Add the groups: ${b} added ${a} times.`, work: repeatedLine(b, a) }
          : { level: 3, say: `Turn it around: ${b} × ${a} is the same.`, work: ask(mk('*', b, a)) },
        a <= 6
          ? { level: 4, say: `Here are the ${a} groups of ${b}.`, visual: groupsVisual(a, b, { item: ctx.item, filled: a, totals: true }) }
          : { level: 4, say: `${arrowList(0, a, 1, b)}.`, visual: skipLine(b, a) },
      ];
    case '/':
      return [
        { level: 1, say: first(ctx.prefer?.[0] === 'group' ? `How many groups of ${b} can you make from ${a}?` : `Share ${a} into ${b} equal groups.`) },
        { level: 2, say: `Think: what times ${b} makes ${a}?`, work: line(factTokens(mk('*', c, b), { hide: 'a', fill: '?' })) },
        b <= 6 && a <= 40
          ? { level: 3, say: 'Deal them out one at a time.', visual: shareVisual(a, b, b * Math.max(1, c - 1), ctx.item) }
          : { level: 3, say: `Count in ${b}s until you reach ${a}.`, visual: skipLine(b, c, { hideEnd: true, show: Math.max(1, c - 1) }) },
        b <= 6 && a <= 40
          ? { level: 4, say: 'All shared out. How many on each plate?', visual: shareVisual(a, b, a, ctx.item) }
          : { level: 4, say: `${arrowList(0, c, 1, b)}. Count the jumps.`, visual: skipLine(b, c) },
      ];
  }
}

import { equationTokens, evalExpr, exprText, exprTokens, line, tok } from '../equation';
import type { Explanation, Expr, NumberProblem, RelationProblem, TrueFalseProblem } from '../types';
import { RELATION_WORDS } from '../validate';
import { ask, askPart, checkLine, countable, mk, show, StepList } from './kit';
import { computeHints, explainFact } from './strategies';
import { balance, bond, joinCounters, numberLine, partWholeBar, partWholeCounters } from './visuals';

// ---------------------------------------------------------------- number bonds

export function explainBond(p: NumberProblem): Explanation {
  const { whole, parts } = p.bond!;
  const f = p.fact; // part + part = whole
  const s = new StepList();

  if (whole === null) {
    s.add('A number bond shows a whole and its two parts. Here we know both parts.', bond('?', [f.a, f.b], 'whole'));
    s.add(`Put the parts together: ${f.a} and ${f.b}.`, countable(f) ? joinCounters(f.a, f.b) : partWholeBar(f.a, f.b, { whole: false }));
    s.add(`${f.a} + ${f.b} = ${f.c}. The whole is ${f.c}.`, bond(f.c, [f.a, f.b], 'whole'), [show(f, 'answer')], true);
    return {
      goal: 'Find the whole.',
      steps: s.steps,
      hints: [
        { level: 1, say: `The whole is made of ${f.a} and ${f.b}. Put them together.` },
        { level: 2, say: 'Add the two parts.', work: ask(f) },
        { level: 3, say: 'Count all the counters.', visual: countable(f) ? joinCounters(f.a, f.b) : partWholeBar(f.a, f.b, { whole: false }) },
        { level: 4, say: `Start at ${f.a} and count on ${f.b}.`, visual: numberLine(f.a, f.b) },
      ],
    };
  }

  const knownFirst = parts[0] !== null;
  const known = knownFirst ? f.a : f.b;
  const ans = p.answer;
  const picture = (reveal: boolean) =>
    bond(f.c, knownFirst ? [known, reveal ? ans : '?'] : [reveal ? ans : '?', known], knownFirst ? 'part2' : 'part1');
  const model = (reveal: boolean) =>
    countable(f)
      ? partWholeCounters(known, ans, reveal, knownFirst)
      : knownFirst
        ? partWholeBar(known, ans, { p2: reveal })
        : partWholeBar(ans, known, { p1: reveal });

  s.add(`The whole is ${f.c}. One part is ${known}. What is the other part?`, picture(false));
  s.add(`Here ${f.c === 1 ? 'is' : 'are'} ${f.c} altogether. ${known} of them make one part.`, model(false));
  s.add('Take the part we know away from the whole.', model(true), [show(mk('-', f.c, known))]);
  s.add(`So the missing part is ${ans}.`, picture(true), [], true);
  s.add(`Check: ${known} and ${ans} make ${f.c}.`, undefined, [checkLine(mk('+', known, ans))]);
  return {
    goal: 'Find the missing part.',
    steps: s.steps,
    hints: [
      { level: 1, say: `The whole is ${f.c}. One part is ${known}. What is the other part?` },
      { level: 2, say: `What goes with ${known} to make ${f.c}?` },
      { level: 3, say: 'Try this:', work: askPart(mk('-', f.c, known), 'c') },
      { level: 4, say: 'Count the empty circles.', visual: model(false) },
    ],
  };
}

// ---------------------------------------------------------------- true or false

export function explainTrueFalse(p: TrueFalseProblem): Explanation {
  const { left, right } = p.equation;
  const expr = left.ops.length ? left : right;
  const shown = evalExpr(left.ops.length ? right : left, 0);
  const f = p.fact;
  const fx = explainFact(
    f,
    { item: p.item },
    (s) => s.add(`The = sign says both sides are worth the same. Is that true here? Let's work out ${exprText(expr)}.`, null),
    false,
  );
  const steps = [
    ...fx.steps,
    {
      say: p.answer ? `${f.c} is the same as ${shown}. It is true!` : `${f.c} is not the same as ${shown}. So it is false.`,
      visual: fx.steps[fx.steps.length - 1]?.visual,
      work: fx.steps[fx.steps.length - 1]?.work ?? [],
      reveal: true,
    },
  ];
  const help = computeHints(f, { item: p.item });
  return {
    goal: 'Is it true?',
    strategy: fx.strategy,
    steps,
    hints: [
      { level: 1, say: `The = sign says both sides are the same. Work out ${exprText(expr)} first.` },
      { ...help[1], level: 2 },
      { ...help[3], level: 3 },
      { level: 4, say: `${exprText(expr)} = ${f.c}. Is ${f.c} the same as ${shown}?` },
    ],
  };
}

// ---------------------------------------------------------------- compare with <, =, >

const worked = (e: Expr) => line([...exprTokens(e), tok.eq(), tok.num(evalExpr(e, 0))]);

export function explainCompare(p: RelationProblem): Explanation {
  const l = evalExpr(p.left, 0);
  const r = evalExpr(p.right, 0);
  const s = new StepList();
  const lines = [p.left, p.right].filter((e) => e.ops.length > 0).map(worked);
  const firstExpr = p.left.ops.length ? p.left : p.right;
  s.add('Which side is worth more? First, find the value of each side.', null);
  s.add(`The left side is ${l}. The right side is ${r}.`, null, lines);
  s.add(
    `${l} ${RELATION_WORDS[p.answer]} ${r}. So we choose ${p.answer}.`,
    balance(p.left, p.right),
    [line([...exprTokens(p.left), tok.rel(p.answer), ...exprTokens(p.right)], 'answer')],
    true,
  );
  if (p.answer !== '=') s.add('Tip: the open side of < and > always faces the bigger number.');
  return {
    goal: 'More, less or equal?',
    steps: s.steps,
    hints: [
      { level: 1, say: `Work out ${exprText(firstExpr)} first.` },
      { level: 2, say: 'Find the value of each side.', work: line([...exprTokens(firstExpr), tok.eq(), tok.blank('?')]) },
      { level: 3, say: 'The heavier side of the scale goes down.', visual: balance(p.left, p.right) },
      { level: 4, say: `${l} and ${r}: which is bigger? The open side faces the bigger number.` },
    ],
  };
}

// ---------------------------------------------------------------- equality / balance

export function explainEquality(p: NumberProblem): Explanation {
  const eq = p.equation!;
  const ans = p.answer;
  const blankLeft = eq.left.terms.includes(null);
  const known = blankLeft ? eq.right : eq.left;
  const unknown = blankLeft ? eq.left : eq.right;
  const value = evalExpr(known, 0);
  const s = new StepList();

  s.add('The = sign means both sides have the same value, like a balanced scale.', balance(eq.left, eq.right));
  if (known.ops.length) s.add(`Work out the side we know: ${exprText(known)} = ${value}.`, undefined, [worked(known)]);
  else s.add(`One side is ${value}.`);
  s.add(`So ${exprText(unknown)} must also make ${value}.`, undefined, [line([...exprTokens(unknown), tok.eq(), tok.num(value)])]);

  const subtracting = unknown.ops[0] === '-' && unknown.terms[1] === null;
  const k = subtracting ? (unknown.terms[0] as number) : (unknown.terms.find((t) => t !== null) as number);
  const helper = subtracting ? mk('-', k, value) : mk('-', value, k);
  s.add(
    subtracting ? `${k} take away what number leaves ${value}? ${k} − ${value} = ${ans}.` : `What number and ${k} make ${value}? ${value} − ${k} = ${ans}.`,
    undefined,
    [show(helper)],
  );
  s.add(`So □ = ${ans}. Both sides make ${value}. Balanced!`, balance(eq.left, eq.right, ans), [line(equationTokens(eq, ans), 'answer')], true);

  return {
    goal: 'Make both sides the same.',
    steps: s.steps,
    hints: [
      { level: 1, say: 'The = sign means both sides are worth the same.' },
      known.ops.length
        ? { level: 2, say: `Work out ${exprText(known)} first.`, work: line([...exprTokens(known), tok.eq(), tok.blank('?')]) }
        : { level: 2, say: `So ${exprText(unknown)} must make ${value}.` },
      { level: 3, say: `${exprText(unknown)} must also make ${value}.`, visual: balance(eq.left, eq.right) },
      { level: 4, say: 'Try this:', work: askPart(helper, 'c') },
    ],
  };
}

import { makeSolutions } from '../generators/games';
import { line, tok } from '../equation';
import { makeFact } from '../levels';
import type { Explanation, MakeProblem, NumberLineSpec, SequenceProblem } from '../types';
import { askPart, show, StepList, sym } from './kit';
import { bond } from './visuals';

// ---------------------------------------------------------------- make the target

export function explainMake(p: MakeProblem): Explanation {
  const solutions = makeSolutions(p.cards, p.ops, p.target);
  const s = new StepList();
  const [i, op, j] = solutions[0];
  const x = p.cards[i];
  const y = p.cards[j];
  s.add(`We need to make ${p.target}. Which two cards can do it?`, bond(p.target, ['?', '?']));
  s.add(`Try ${x}. ${op === '+' ? `${x} needs ${p.target - x} more to make ${p.target}` : `Look for a card that works with ${x}`}.`);
  s.add(`${x} ${sym(op)} ${y} = ${p.target}.`, op === '+' ? bond(p.target, [x, y]) : undefined, [show(makeFact(op, x, y), 'answer')], true);
  const others = solutions
    .slice(1)
    .map(([a, o, b]) => `${p.cards[a]} ${sym(o)} ${p.cards[b]}`)
    .filter((text, k, all) => all.indexOf(text) === k && text !== `${y} + ${x}`);
  if (others.length) s.add(`Other ways work too: ${others.slice(0, 3).join(', ')}.`);
  const biggest = Math.max(...p.cards.filter((c) => c <= p.target));
  return {
    goal: `Make ${p.target}.`,
    steps: s.steps,
    hints: [
      { level: 1, say: `Which two numbers make ${p.target}?` },
      { level: 2, say: `Start with a big card. What does it need to make ${p.target}?` },
      { level: 3, say: 'Try this:', work: askPart(makeFact('+', biggest, Math.max(0, p.target - biggest)), 'b') },
      { level: 4, say: `${x} and ${y} make ${p.target}.`, visual: bond(p.target, [x, '?']) },
    ],
  };
}

// ---------------------------------------------------------------- number train

export function explainSequence(p: SequenceProblem): Explanation {
  const blank = p.terms.indexOf(null);
  const known = p.terms.map((t, k) => ({ t, k })).filter((x) => x.t !== null) as { t: number; k: number }[];
  const [first, second] = known;
  const size = Math.abs(p.step);
  const dir = p.step > 0 ? 'up' : 'down';
  const prev = blank > 0 ? (p.terms[blank - 1] as number) : p.answer - p.step;
  const values = p.terms.map((t) => t ?? p.answer);
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const line0: NumberLineSpec = {
    type: 'numberline',
    min: hi <= 20 ? 0 : Math.floor(lo / 10) * 10,
    max: hi <= 20 ? 20 : Math.ceil(hi / 10) * 10,
    start: values[0],
    jumps: values.slice(1).map(() => p.step),
    jumpLabels: true,
    marks: [values[0]],
  };
  const s = new StepList();
  s.add('Look at how the numbers change from car to car.', { ...line0, showJumps: 0 });
  s.add(`${first.t} → ${second.t}: the numbers go ${dir} by ${size} each time.`, { ...line0, showJumps: Math.max(1, blank - 1), hideEnd: true });
  s.add(`So the missing car is ${prev} ${p.step > 0 ? '+' : '−'} ${size}.`, undefined, [
    line([tok.num(prev), tok.op(p.step > 0 ? '+' : '-'), tok.num(size), tok.eq(), tok.blank(p.answer, 'answer')], 'answer'),
  ], true);
  s.add(`The pattern goes ${dir} in ${size}s: ${values.join(', ')}.`, line0);
  return {
    goal: 'Find the missing number.',
    steps: s.steps,
    hints: [
      { level: 1, say: 'How much does each car change by?' },
      { level: 2, say: `${first.t} → ${second.t}: that is ${p.step > 0 ? '+' : '−'}${size}.` },
      { level: 3, say: 'Try this:', work: line([tok.num(prev), tok.op(p.step > 0 ? '+' : '-'), tok.num(size), tok.eq(), tok.blank('?')]) },
      { level: 4, say: `Jump ${size} from ${prev}.`, visual: { ...line0, showJumps: blank } },
    ],
  };
}

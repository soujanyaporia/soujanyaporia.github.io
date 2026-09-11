import type { Explanation, NumberProblem, VisualSpec } from '../types';
import { answerLine, arrowList, askPart, checkLine, countable, counted, countList, mk, show, StepList, sym } from './kit';
import { computeHints, explainFact } from './strategies';
import { numberLine, partWholeBar, partWholeCounters, takeAwayCounters } from './visuals';

// ---------------------------------------------------------------- result questions (3 + 4 = □, □ = 7 − 3)

export function explainResult(p: NumberProblem): Explanation {
  const f = p.fact;
  const reversed = p.skill.endsWith('_left');
  const prefer =
    p.visual === 'numberline'
      ? ['make-ten', 'number-line', 'bridge-ten', 'count-back', 'tens-ones']
      : ['make-ten', 'doubles', 'count-on', 'bridge-ten', 'take-away', 'tens-ones'];
  const ctx = { item: p.item, prefer };
  const intro = reversed
    ? (s: StepList) => s.add(`The = sign means both sides are worth the same. So □ is the same as ${f.a} ${sym(f.op)} ${f.b}.`, null)
    : undefined;
  const fx = explainFact(f, ctx, intro);
  return {
    goal: reversed ? 'Find the number that makes both sides the same.' : f.op === '+' ? 'How many altogether?' : 'How many are left?',
    strategy: fx.strategy,
    steps: fx.steps,
    alternatives: fx.alternatives,
    hints: computeHints(f, ctx, reversed),
  };
}

// ---------------------------------------------------------------- missing numbers (□ + 3 = 7 …)

export function explainMissing(p: NumberProblem): Explanation {
  const f = p.fact;
  const ans = p.answer;
  const s = new StepList();
  const useCounters = countable(f) && p.visual !== 'bar' && p.visual !== 'numberline';

  switch (p.skill) {
    case 'add.missing_first': {
      // □ + b = c
      const picture = (reveal: boolean): VisualSpec =>
        useCounters ? partWholeCounters(f.b, ans, reveal, false) : partWholeBar(ans, f.b, { p1: reveal });
      s.add(`We need to find the missing number. Something + ${f.b} makes ${f.c}.`, picture(false));
      s.add(`${f.c} is the whole. ${f.b} is one part. We need the other part.`);
      s.add(`We can undo + ${f.b} by taking away ${f.b}.`, useCounters ? takeAwayCounters(f.c, f.b, f.b, true) : undefined, [show(mk('-', f.c, f.b))]);
      s.add(`So the missing number is ${ans}.`, picture(true), [answerLine(ans)], true);
      s.add(`Check: ${ans} + ${f.b} = ${f.c}.`, undefined, [checkLine(f)]);
      return {
        goal: 'Find the missing number.',
        strategy: 'Undo the adding',
        steps: s.steps,
        hints: [
          { level: 1, say: `What number becomes ${f.c} after adding ${f.b}?` },
          { level: 2, say: `To undo + ${f.b}, what could we do?` },
          { level: 3, say: 'Try this:', work: askPart(mk('-', f.c, f.b), 'c') },
          { level: 4, say: `Count back ${f.b} from ${f.c}: ${arrowList(f.c, f.b, -1)}.`, visual: numberLine(f.c, -f.b) },
        ],
      };
    }
    case 'add.missing_second': {
      // a + □ = c
      const nl = numberLine(f.a, ans);
      const counters = useCounters && p.visual === 'counters';
      const picture = (reveal: boolean): VisualSpec => (counters ? partWholeCounters(f.a, ans, reveal, true) : { ...nl, marks: [f.a, f.c] });
      s.add(`We need to find the missing number. ${f.a} + something makes ${f.c}.`, counters ? picture(false) : { ...nl, showJumps: 0, marks: [f.a, f.c] });
      s.add(
        counters
          ? `We have ${f.a}. We need ${f.c}. Count the empty spaces: ${countList(0, ans, 1)}.`
          : `Start at ${f.a}. Count on to ${f.c}: ${countList(f.a, ans, 1)}. That is ${counted(ans, 'jump')}.`,
        picture(true),
      );
      s.add(`That is the same as ${f.c} − ${f.a}.`, undefined, [show(mk('-', f.c, f.a))]);
      s.add(`So the missing number is ${ans}.`, undefined, [answerLine(ans)], true);
      s.add(`Check: ${f.a} + ${ans} = ${f.c}.`, undefined, [checkLine(f)]);
      return {
        goal: 'Find the missing number.',
        strategy: 'Count on',
        steps: s.steps,
        hints: [
          { level: 1, say: `${f.a} plus what number makes ${f.c}?` },
          { level: 2, say: `How many jumps from ${f.a} to ${f.c}?` },
          { level: 3, say: 'Try this:', work: askPart(mk('-', f.c, f.a), 'c') },
          { level: 4, say: `${arrowList(f.a, ans, 1)}. Count the jumps.`, visual: { ...nl, marks: [f.a, f.c] } },
        ],
      };
    }
    case 'sub.missing_first': {
      // □ − b = c
      const picture = (reveal: boolean): VisualSpec =>
        useCounters
          ? {
              type: 'counters',
              groups: [
                { count: f.c, color: 'blue', label: `${f.c} left` },
                { count: f.b, color: 'orange', crossed: f.b, label: `${f.b} gone` },
              ],
              ...(reveal ? { numbered: true, numberFrom: 0 } : {}),
            }
          : partWholeBar(f.c, f.b, { whole: reveal }, { p1: 'left', p2: 'taken away' });
      s.add(`We need to find the number we started with. Something take away ${f.b} leaves ${f.c}.`, picture(false));
      s.add(`${f.c} are left and ${f.b} were taken away. Together they make the number we started with.`);
      s.add(`We can undo − ${f.b} by adding ${f.b} back.`, undefined, [show(mk('+', f.c, f.b))]);
      s.add(`So the missing number is ${ans}.`, picture(true), [answerLine(ans)], true);
      s.add(`Check: ${ans} − ${f.b} = ${f.c}.`, undefined, [checkLine(f)]);
      return {
        goal: 'Find the number we started with.',
        strategy: 'Undo the taking away',
        steps: s.steps,
        hints: [
          { level: 1, say: `What number, take away ${f.b}, leaves ${f.c}?` },
          { level: 2, say: `To undo − ${f.b}, what could we do?` },
          { level: 3, say: 'Try this:', work: askPart(mk('+', f.c, f.b), 'c') },
          { level: 4, say: `Count on ${f.b} from ${f.c}: ${arrowList(f.c, f.b, 1)}.`, visual: numberLine(f.c, f.b) },
        ],
      };
    }
    default: {
      // a − □ = c
      const picture = (crossed: number, label: boolean): VisualSpec =>
        useCounters
          ? {
              type: 'counters',
              groups: [
                { count: f.c, color: 'blue', label: `${f.c} left` },
                { count: ans, color: 'orange', crossed, label: label ? String(ans) : '?' },
              ],
            }
          : partWholeBar(f.c, ans, { p2: label }, { p1: 'left', p2: 'taken away' });
      s.add(`We start with ${f.a}. Some are taken away and ${f.c} are left. How many were taken away?`, picture(0, false));
      s.add(`Keep ${f.c}. Cross out the rest.`, picture(ans, false));
      s.add(`We crossed out ${ans}. That is ${f.a} − ${f.c}.`, picture(ans, true), [show(mk('-', f.a, f.c))]);
      s.add(`So the missing number is ${ans}.`, undefined, [answerLine(ans)], true);
      s.add(`Check: ${f.a} − ${ans} = ${f.c}.`, undefined, [checkLine(f)]);
      return {
        goal: 'Find how many were taken away.',
        strategy: 'Find the difference',
        steps: s.steps,
        hints: [
          { level: 1, say: `${f.a} take away what number leaves ${f.c}?` },
          { level: 2, say: `How far is it from ${f.c} up to ${f.a}?` },
          { level: 3, say: 'Try this:', work: askPart(mk('-', f.a, f.c), 'c') },
          useCounters
            ? { level: 4, say: `Keep ${f.c}. Count the ones that are crossed out.`, visual: picture(ans, false) }
            : { level: 4, say: `${arrowList(f.c, Math.min(ans, 10), 1, ans > 10 ? Math.ceil(ans / 10) : 1)}.`, visual: numberLine(f.c, ans) },
        ],
      };
    }
  }
}

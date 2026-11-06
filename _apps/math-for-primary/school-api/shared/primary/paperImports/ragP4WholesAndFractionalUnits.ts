import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';

export const RAG_PATTERN = {
  id: 'rag-p4-wholes-and-fractional-units',
  level: 4,
  title: 'Count the pieces in a whole',
  objective: 'Count equal fractional pieces in a length, or group fractional pieces into wholes and write what is left.',
  skillIds: ['P4.S.FRAC.01', 'P4.S.FRAC.02'],
  canonicalPatternId: 'p4-wholes-and-fractional-units',
};

type Steps = NonNullable<Question['workedSteps']>;
const explain = (steps: Steps) => steps.map(s => [s.text, s.equation].filter(Boolean).join(' ')).join(' ');
const gcd = (a: number, b: number): number => b === 0 ? a : gcd(b, a % b);

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const r = new Rng(hashString(key));
  const form = ((seed + index) >>> 0) % 4;

  if (form === 1) {
    const d = r.pick([4, 6, 8, 9, 10, 12]);
    const whole = r.int(1, 7);
    const left = r.int(1, d - 1);
    const n = whole * d + left;
    const factor = gcd(left, d);
    const part = `${left / factor}/${d / factor}`;
    const steps: Steps = [
      { text: `Every ${d} pieces make one whole. Make as many whole groups as possible.`, equation: `${n} = ${whole} × ${d} + ${left}` },
      { text: `${left} of the original pieces remain, so keep their denominator.`, equation: `${n}/${d} = ${whole} ${left}/${d}` },
    ];
    if (factor > 1) steps.push({ text: `Divide the top and bottom of the part left over by ${factor}.`, equation: `${left}/${d} = ${part}` });
    return {
      key, prompt: 'Write this fraction as a mixed number. Give the fractional part in simplest form.', display: `${n}/${d}`,
      answer: `${whole} ${part}`, requireMixed: true, requireSimplified: true,
      hint: 'How many full groups of the denominator can you make from the numerator?',
      workedSteps: steps, explanation: explain(steps), proof: { op: '/', a: n, b: d },
    };
  }

  const whole = form === 3 ? 1 : r.int(2, 8);
  let d: number;
  let length = String(whole);
  let extra = 0;
  let tail: { n: number; b: number } | undefined;
  if (form === 2) {
    const b = r.pick([2, 3, 4, 5, 6]);
    const n = r.pick(Array.from({ length: b - 1 }, (_, i) => i + 1).filter(i => gcd(i, b) === 1));
    d = b * r.int(2, Math.floor(12 / b));
    length = `${whole} ${n}/${b}`;
    extra = n * (d / b);
    tail = { n, b };
  } else {
    d = r.pick([3, 4, 7, 8, 9, 10, 12]);
  }
  const total = whole * d + extra;
  const steps: Steps = [{ text: `A metre has ${d} equal parts of length 1/${d} m.`, equation: `1 m = ${d}/${d} m` }];
  if (whole > 1) steps.push({ text: 'Count the pieces in the whole metres.', equation: `${whole} × ${d} = ${whole * d} pieces` });
  if (tail) {
    steps.push({ text: 'Write the extra length in parts the size of one piece.', equation: `${tail.n}/${tail.b} m = ${extra}/${d} m` });
    steps.push({ text: 'Add those extra pieces to the pieces from the whole metres.', equation: `${whole * d} + ${extra} = ${total} pieces` });
  } else if (whole === 1) {
    steps.push({ text: `The ribbon is exactly one metre long, so it makes ${d} pieces.` });
  }
  return {
    key, context: [`The ribbon is ${length} m long.`, `Each piece must be 1/${d} m long.`],
    prompt: 'How many pieces of that length can you cut from the ribbon?',
    answer: String(total), unit: 'pieces',
    ...(form === 0 ? { choices: r.shuffle([String(total), String(d), `${whole}/${d}`, String(whole + d)]) } : {}),
    hint: tail ? 'Count the pieces in the whole metres first. Then count the pieces in the extra length.' : 'Use the bottom number of the fraction to find how many pieces make one metre.',
    workedSteps: steps, explanation: explain(steps), proof: { op: '+', a: { op: '*', a: whole, b: d }, b: extra },
  };
}

import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';
import type { Batch11UpperPicture } from './batch11UpperPicture';

export const RAG_PATTERN = {
  id: 'p3-missing-digits-in-written-arithmetic',
  level: 3 as const,
  title: 'Which digits fit the boxes?',
  objective: 'Use place value, exchanges and carries to find a digit in a written calculation.',
  skillIds: ['P3.S.AS.01', 'P3.S.MD.03', 'P3.S.WN.01'],
  canonicalPatternId: 'missing-digits-in-written-arithmetic',
};

type Op = '−' | '+' | '×';
type Step = { text: string; equation?: string };
type Rows = [string, Op, string, string];

// All rows end in the same ones column. Only masked rows reach the drawing.
function column([top, op, lower, result]: Rows): Batch11UpperPicture {
  const marks: Batch11UpperPicture['marks'] = [];
  const row = (digits: string, y: number) => {
    [...digits].forEach((digit, i) => {
      const x = 228 - 36 * (digits.length - 1 - i);
      if (digit === 'A' || digit === 'B') {
        marks.push({kind: 'path', d: `M ${x-6} ${y-20} h 25 v 27 h -25 Z`});
      }
      marks.push({kind: 'text', x, y, text: digit});
    });
  };
  row(top, 55);
  marks.push({kind: 'text', x: 78, y: 100, text: op});
  row(lower, 100);
  marks.push({kind: 'line', x1: 72, y1: 118, x2: 251, y2: 118});
  row(result, 154);
  const read = (s: string) => [...s].join(' ');
  const word = op === '−' ? 'minus' : op === '+' ? 'plus' : 'times';
  return {type: 'batch11-upper', label: `Digits by row: ${read(top)}, ${word} ${read(lower)}, equals ${read(result)}.`, marks};
}

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const r = new Rng(hashString(key));
  const finish = (rows: Rows, digits: number[], hint: string, steps: Step[], options?: number[]): Question => ({
    key, picture: column(rows), hint, workedSteps: steps,
    prompt: digits.length === 2 ? 'Each box hides one digit. Find A and B.' :
      options ? 'Which digit belongs in box A? Choose from the digits below.' : 'Which digit belongs in box A?',
    answer: digits.length === 2 ? JSON.stringify(digits.map(String)) : String(digits[0]),
    ...(digits.length === 2 ? {structuredResponse: {kind: 'number-pair' as const, firstLabel: 'A', secondLabel: 'B'}} : {}),
    ...(options ? {choices: options.map(String)} : {}),
    explanation: steps.map(s => [s.text, s.equation].filter(Boolean).join(' ')).join(' '),
  });
  const check = (top: number, op: Op, lower: number, result: number): Step =>
    ({text: 'Put the digits back and check.', equation: `${top} ${op} ${lower} = ${result}`});
  const variant = (hashString(String(seed)) % 4 + (index % 4) + 4) % 4;

  if (variant === 0) {
    const k = r.int(5, 9), h = r.int(2, 9), t = r.int(0, 7), u = r.int(3, 9);
    const l = r.int(1, k-2), j = r.int(1, h-1), a = r.int(t+1, 9), v = r.int(1, u);
    const top = 1000*k + 100*h + 10*t + u, lower = 1000*l + 100*j + 10*a + v;
    const d = top-lower, b = h-1-j, dt = Math.floor(d/10)%10;
    return finish([String(top), '−', `${l}${j}A${v}`, `${Math.floor(d/1000)}B${dt}${u-v}`], [a,b],
      'Start at the ones. Compare the tens digit on top with the tens digit in the answer.', [
        {text: 'The ones do not need an exchange.', equation: `${u} − ${v} = ${u-v}`},
        {text: `The tens digit in the answer is ${dt}, greater than the ${t} on top. Exchange 1 hundred for 10 tens. How many tens were taken away?`, equation: `A = ${10+t} − ${dt} = ${a}`},
        {text: 'Use the hundreds left after the exchange.', equation: `B = ${h-1} − ${j} = ${b}`},
        check(top, '−', lower, d),
      ]);
  }

  if (variant === 1) {
    const k = r.pick([5,6,7,9]), b = r.int(0, 7), a = r.int(1, k-2);
    const h = r.int(1, 8), t = r.int(1, 8), u = r.int(b+1, 9);
    const top = k*1000+b, lower = a*1000+h*100+t*10+u, d = top-lower;
    return finish([`${k}00B`, '−', `A${h}${t}${u}`, String(d)], [a,b],
      'Add the bottom ones to the answer ones. What does their sum tell you about the exchange?', [
        {text: `Adding back the ones gives ${d%10 + u}. Remove the 10 ones that came from the exchange to find the original digit.`, equation: `B = ${d%10} + ${u} − 10 = ${b}`},
        {text: 'The tens and hundreds were both zero. Change 1 thousand to 10 hundreds, 1 of those hundreds to 10 tens, and 1 of those tens to 10 ones.'},
        {text: `That leaves ${k-1} thousands on top. Count how many thousands were taken away.`, equation: `A = ${k-1} − ${Math.floor(d/1000)} = ${a}`},
        check(top, '−', lower, d),
      ]);
  }

  if (variant === 2) {
    const h = r.int(1,4), j = r.int(1,4), t = r.int(2,8), a = r.int(9-t,9);
    const u = r.int(2,9), v = r.int(10-u,9);
    const top = h*100+a*10+u, lower = j*100+t*10+v, total = top+lower;
    const dt = Math.floor(total/10)%10;
    const options = r.shuffle([a,(a+1)%10,(a+9)%10,(a+5)%10]);
    return finish([`${h}A${u}`, '+', String(lower), String(total)], [a],
      'Add the ones first. Include the extra ten when you try a digit in A.', [
        {text: 'Carry 1 ten from the ones column.', equation: `${u} + ${v} = ${u+v}`},
        {text: `Try the choices. With ${a} in the box, the tens add to ${10+dt}. Write ${dt} and carry 1 hundred.`, equation: `${a} + ${t} + 1 = ${10+dt}`},
        check(top, '+', lower, total),
      ], options);
  }

  const h = r.int(5,9), t = r.int(4,9), u = r.int(4,9), factor = r.int(3,9);
  const top = h*100+t*10+u, product = top*factor;
  const ones = u*factor, c1 = Math.floor(ones/10), tens = t*factor+c1, c2 = Math.floor(tens/10);
  const hundreds = h*factor+c2, a = hundreds%10;
  return finish([String(top), '×', String(factor), `${Math.floor(product/1000)}A${String(product).slice(-2)}`], [a],
    'Start at the ones. Carry each new group of ten into the next column.', [
      {text: `Write ${ones%10} in the ones column and carry ${c1} to the tens.`, equation: `${u} × ${factor} = ${ones}`},
      {text: `Write ${tens%10} in the tens column and carry ${c2} to the hundreds.`, equation: `${t} × ${factor} + ${c1} = ${tens}`},
      {text: `Regroup ${hundreds} hundreds. The thousands digit is ${Math.floor(hundreds/10)} and the hundreds digit is ${a}, so A is ${a}.`, equation: `${h} × ${factor} + ${c2} = ${hundreds}`},
      check(top, '×', factor, product),
    ]);
}

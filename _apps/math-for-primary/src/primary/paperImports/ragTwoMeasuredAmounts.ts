import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';

export const RAG_PATTERN = {
  id: 'p3-rag-two-measured-amounts',
  level: 3,
  title: 'Two amounts related by a multiple',
  objective: 'Use equal shares to find a combined measure, compare two masses or split a total length.',
  skillIds: ['P3.S.MD.04', 'P3.S.MD.03', 'P3.S.AS.01', 'P3.S.MEASURE.02', 'P3.S.MEASURE.03'],
  canonicalPatternId: 'p3-two-amounts-related-by-a-multiple',
} as const;

type Step = { text: string; equation: string };
const split = (n: number, base: number) => [String(Math.floor(n / base)), String(n % base)];

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const r = new Rng(hashString(key));
  const form = ((hashString(String(seed)) + index) >>> 0) % 4;
  const make = (context: string[], prompt: string, answer: string, hint: string,
    workedSteps: Step[], extra: Pick<Question, 'unit' | 'choices' | 'structuredResponse'>): Question =>
    ({ key, context, prompt, answer, hint, workedSteps, ...extra,
      explanation: workedSteps.map(s => `${s.text} ${s.equation}`).join(' ') });

  if (form < 2) {
    const mass = form === 1;
    const factor = mass ? r.int(2, 7) : r.pick([3, 5, 6, 7, 9]);
    const one = mass ? r.int(45, 88) : r.int(13, 23);
    const large = factor * one, total = large + one;
    const unit = mass ? 'g' : 'm';
    const context = mass
      ? [`Kai has ${large} g of oats.`, `His oats weigh ${factor} times as much as his peas.`]
      : [`The blue kite has ${large} m of string.`, `Its string is ${factor} times as long as the red kite's string.`];
    const steps = [
      { text: mass ? 'One share is the mass of the peas. Divide the mass of the oats to find it.'
                   : 'One share is the length of the red string. Divide the length of the blue string to find it.',
        equation: `${large} ÷ ${factor} = ${one} ${unit}` },
      { text: mass ? 'Add the two masses.' : 'Add the two lengths.',
        equation: `${large} + ${one} = ${total} ${unit}` },
    ];
    const label = (v: number) => `${v} g`;
    return make(context, mass ? 'What is the total mass of his oats and peas?' : 'How many metres of string do the two kites have altogether? Show your working.',
      mass ? label(total) : String(total), `The larger amount is made of ${factor} equal shares. How big is one share?`, steps,
      mass ? { choices: r.shuffle([one, total, large * factor, large * (factor + 1)].map(label)) } : { unit });
  }

  if (form === 2) {
    const factor = r.int(3, 6);
    const rice = 100 * r.int(5, 8) + r.pick([23, 37, 56, 69, 82, 91]);
    const beans = factor * rice, gap = beans - rice;
    const [kg, g] = split(gap, 1000);
    return make([`Mina packs ${rice} g of rice.`, `The mass of her beans is ${factor} times the mass of her rice.`],
      'How much heavier are the beans than the rice? Show your working and give the difference in kilograms and grams.',
      JSON.stringify([kg, g]), 'Find the mass of the beans first. Which part of that mass is extra?', [
        { text: 'Each share weighs as much as the rice. Find the mass of all the beans.', equation: `${factor} × ${rice} = ${beans} g` },
        { text: 'Subtract the rice to find the extra mass.', equation: `${beans} − ${rice} = ${gap} g` },
        { text: 'Every 1000 grams make 1 kilogram. Keep the grams left over.', equation: `${gap} g = ${kg} kg ${g} g` },
      ], { structuredResponse: { kind: 'number-pair', firstLabel: 'Kilograms', secondLabel: 'Grams' } });
  }

  const factor = r.int(2, 4), short = 10 * r.int(12, 18) + r.pick([1, 3, 7, 9]);
  const total = short * (factor + 1), long = total - short;
  const a = split(short, 100), b = split(long, 100);
  return make([`Two strips of cloth measure ${total} cm altogether.`, `The green strip is ${factor} times as long as the yellow strip.`],
    '(a) How long is the yellow strip?\n(b) How long is the green strip?\nGive both lengths in metres and centimetres.',
    JSON.stringify([...a, ...b]), 'Count one share for the yellow strip. How many shares do both strips make?', [
      { text: 'Count the shares in both strips.', equation: `1 + ${factor} = ${factor + 1} shares` },
      { text: '(a) The yellow strip is one share.', equation: `${total} ÷ ${factor + 1} = ${short} cm` },
      { text: 'Every 100 centimetres make 1 metre.', equation: `${short} cm = ${a[0]} m ${a[1]} cm` },
      { text: '(b) Take the yellow strip away from the total to find the green strip.', equation: `${total} − ${short} = ${long} cm` },
      { text: 'Write the green length in metres and centimetres too.', equation: `${long} cm = ${b[0]} m ${b[1]} cm` },
    ], { structuredResponse: { kind: 'number-fields', fields: [
      { label: '(a) Yellow strip: metres' }, { label: '(a) Yellow strip: centimetres' },
      { label: '(b) Green strip: metres' }, { label: '(b) Green strip: centimetres' },
    ] } });
}

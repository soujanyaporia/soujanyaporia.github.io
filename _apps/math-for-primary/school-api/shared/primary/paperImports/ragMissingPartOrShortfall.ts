import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';
import type { Batch11UpperPicture } from './batch11UpperPicture';

export const RAG_PATTERN = {
  id: 'p3-missing-part-or-shortfall',
  level: 3,
  title: 'Find the missing amount',
  objective: 'Use the same unit for all amounts, find a missing part, and compare the parts when asked.',
  skillIds: ['P3.S.MEASURE.01', 'P3.S.MEASURE.02', 'P3.S.MEASURE.03', 'P3.S.AS.01'],
  canonicalPatternId: 'p3-missing-part-or-shortfall',
};

type Steps = NonNullable<Question['workedSteps']>;
function finish(q: Omit<Question, 'workedSteps' | 'explanation'>, workedSteps: Steps): Question {
  return { ...q, workedSteps, explanation: workedSteps.map(s => `${s.text} ${s.equation}`).join(' ') };
}
const mixed = (ml: number) => [Math.floor(ml / 1000), ml % 1000];
const inLitres = (ml: number) => { const [l, m] = mixed(ml); return `${l} L ${m} mL`; };
const fields = (...values: number[]) => JSON.stringify(values.map(String));

function drawBeakers(aStep: number, aTick: number, bStep: number, bTick: number): Batch11UpperPicture {
  const picture: Batch11UpperPicture = { type: 'batch11-upper', label: '', marks: [] };
  const descriptions: string[] = [];
  function beaker(name: string, x: number, width: number, spacing: number, step: number, tick: number) {
    const base = 160, right = x + width, top = base - spacing * 10, level = base - tick * spacing;
    const marks = picture.marks;
    marks.push({ kind: 'path', d: `M ${x} ${level} L ${right} ${level} L ${right} ${base} L ${x} ${base} Z`, fill: '#b9e3fa' });
    marks.push({ kind: 'path', d: `M ${x} ${top - 8} V ${base} H ${right} V ${top - 8}` });
    for (let i = 0; i <= 10; i++) {
      const major = i % 5 === 0, y = base - i * spacing;
      marks.push({ kind: 'line', x1: right - (major ? 17 : 9), x2: right, y1: y, y2: y });
      if (major) marks.push({ kind: 'text', x: right + 5, y: y + 5, text: `${step * i} mL` });
    }
    marks.push({ kind: 'text', x: x + width / 2 - 5, y: 189, text: name });
    descriptions.push(`Beaker ${name}: ten equal spaces from 0 to ${10 * step} mL. The water is ${tick} spaces above zero.`);
  }
  beaker('A', 12, 45, 9, aStep, aTick);
  beaker('B', 158, 65, 13, bStep, bTick);
  picture.label = descriptions.join(' ');
  return picture;
}

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const r = new Rng(hashString(key));
  const variant = ((hashString(String(seed)) + index) % 3 + 3) % 3;
  if (variant === 0) {
    const aStep = r.pick([25, 30]), bStep = r.pick([100, 150]);
    const aTick = r.pick([3, 7, 9]), bTick = r.pick([2, 3, 4, 6, 7, 9]);
    const a = aStep * aTick, b = bStep * bTick, have = a + b;
    const target = r.int(4, 6), need = target * 1000 - have;
    return finish({
      key, picture: drawBeakers(aStep, aTick, bStep, bTick),
      context: [`Mei needs ${target} L of water for the class garden. She has the water shown in beakers A and B.`],
      prompt: '(a) How much water does Mei have altogether, in millilitres? (b) How much more does she need? Give this amount in litres and millilitres.',
      structuredResponse: { kind: 'number-fields', fields: [{ label: '(a) Total (mL)' }, { label: '(b) Litres (L)' }, { label: '(b) Millilitres (mL)' }] },
      answer: fields(have, ...mixed(need)),
      hint: 'The spaces on the two scales stand for different amounts. Read each scale before adding.',
    }, [
      { text: 'Find one space on each scale.', equation: `A: ${aStep * 10} mL ÷ 10 = ${aStep} mL; B: ${bStep * 10} mL ÷ 10 = ${bStep} mL.` },
      { text: 'Count up from zero to each water line.', equation: `A: ${aTick} × ${aStep} mL = ${a} mL; B: ${bTick} × ${bStep} mL = ${b} mL.` },
      { text: '(a) Add the water in both beakers.', equation: `${a} mL + ${b} mL = ${have} mL.` },
      { text: '(b) Take the amount Mei has away from the amount she needs.', equation: `${target} L = ${target * 1000} mL; ${target * 1000} mL − ${have} mL = ${need} mL.` },
      { text: 'Group each 1000 mL into one litre.', equation: `${need} mL = ${inLitres(need)}.` },
    ]);
  }
  if (variant === 1) {
    const litres = r.pick([4, 5, 6, 7, 9]), total = litres * 1000;
    const apple = total / 2 + 50 * r.int(13, 32) + 25;
    const pear = total - apple, gap = apple - pear;
    return finish({
      key, context: [`Hana mixes apple juice and pear juice to make ${litres} L of fruit punch.`, `She uses ${inLitres(apple)} of apple juice.`],
      prompt: 'How much more apple juice than pear juice does Hana use? Give your answer in litres and millilitres.',
      structuredResponse: { kind: 'number-pair', firstLabel: 'Litres (L)', secondLabel: 'Millilitres (mL)' },
      answer: fields(...mixed(gap)), hint: 'First find how much pear juice is in the punch. Then compare the two juices.',
    }, [
      { text: 'Write both given amounts in millilitres.', equation: `${litres} L = ${total} mL; ${inLitres(apple)} = ${apple} mL.` },
      { text: 'Take the apple juice out of the total to find the pear juice.', equation: `${total} mL − ${apple} mL = ${pear} mL.` },
      { text: 'Find how much more apple juice there is.', equation: `${apple} mL − ${pear} mL = ${gap} mL.` },
      { text: 'Write the difference in litres and millilitres.', equation: `${gap} mL = ${inLitres(gap)}.` },
    ]);
  }
  const rice = r.int(22, 36) * 50, oats = r.int(5, 15) * 50 + 20, beans = r.int(6, 18) * 50 + 15;
  const known = rice + oats, total = known + beans, mass = `${Math.floor(total / 1000)} kg ${total % 1000} g`;
  return finish({
    key, context: ['Three bags are on the scale together: one of rice, one of oats and one of beans.'],
    picture: { type: 'paper', layout: 'cards', cards: [{ label: 'Scale reading', value: mass }, { label: 'Rice bag', value: `${rice} g` }, { label: 'Oats bag', value: `${oats} g` }] },
    prompt: 'What is the mass of the bag of beans? Give your answer in grams.', unit: 'g', answer: String(beans),
    hint: 'The scale shows the mass of all three bags. Which two masses can you take away?',
  }, [
    { text: 'Write the scale reading in grams.', equation: `${mass} = ${total} g.` },
    { text: 'Add the masses of the rice and the oats.', equation: `${rice} g + ${oats} g = ${known} g.` },
    { text: 'Take away those two bags to find the mass of the beans.', equation: `${total} g − ${known} g = ${beans} g.` },
  ]);
}

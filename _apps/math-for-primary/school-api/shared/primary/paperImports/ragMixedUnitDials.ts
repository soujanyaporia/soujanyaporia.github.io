import type { Rng } from '../../engine/random';
import type { Question } from '../generate';
import type { Batch11UpperMark, Batch11UpperPicture } from './batch11UpperPicture';

type Dial = { name: string; unit: 'kg' | 'g'; gaps: number; step: number; tick: number };

function gramDial(rng: Rng, name: string, excluded: number): Dial {
  const gaps = rng.pick([8, 12]);
  const step = rng.pick([50, 100]);
  const ticks = Array.from({ length: gaps - 1 }, (_, i) => i + 1).filter(i =>
    i !== gaps / 2 && i * step < 1000 && i * step !== excluded
  );
  return { name, unit: 'g', gaps, step, tick: rng.pick(ticks) };
}

function drawScales(dials: Dial[]): Batch11UpperPicture {
  const marks: Batch11UpperMark[] = [];
  const descriptions: string[] = [];
  dials.forEach(({ name, unit, gaps, step, tick }, i) => {
    const cx = 53 + 107 * i;
    const cy = 100;
    const radius = 39;
    const point = (n: number, r: number) => {
      const angle = 2 * Math.PI * n / gaps;
      return { x: cx + r * Math.sin(angle), y: cy - r * Math.cos(angle) };
    };
    const label = (value: string, y: number) => marks.push({ kind: 'text', x: cx - 4.7 * value.length, y, text: value });
    const halfLabel = `${gaps / 2 * step} ${unit}`;
    label(name, 25);
    label('0', 54);
    label(halfLabel, 162);
    marks.push({ kind: 'circle', cx, cy, r: radius });
    for (let n = 0; n < gaps; n++) {
      const inner = point(n, n % (gaps / 2) === 0 ? 28 : 32);
      const outer = point(n, radius);
      marks.push({ kind: 'line', x1: inner.x, y1: inner.y, x2: outer.x, y2: outer.y });
    }
    const tip = point(tick, 32);
    marks.push({ kind: 'line', x1: cx, y1: cy, x2: tip.x, y2: tip.y });
    marks.push({ kind: 'circle', cx, cy, r: 3, fill: '#235b4c' });
    descriptions.push(`${name}: from 0 at the top to ${halfLabel} at the bottom there are ${gaps / 2} equal gaps. The pointer is ${tick} ${tick === 1 ? 'gap' : 'gaps'} clockwise from 0.`);
  });
  return { type: 'batch11-upper', label: descriptions.join(' '), marks };
}

export function massOrderQuestion(key: string, rng: Rng): Question {
  const names = rng.shuffle(['Box', 'Bag', 'Tin']);
  const kg: Dial = { name: names[0], unit: 'kg', gaps: rng.pick([8, 12]), step: 1, tick: 1 };
  const first = gramDial(rng, names[1], 0);
  const second = gramDial(rng, names[2], first.tick * first.step);
  const dials = rng.shuffle([kg, first, second]);
  const grams = (d: Dial) => d.tick * d.step * (d.unit === 'kg' ? 1000 : 1);
  const ranked = [...dials].sort((a, b) => grams(a) - grams(b));
  const labels = ranked.map(d => d.name);
  const order = dials.map(d => d.name);
  if (order.join(',') === labels.join(',')) [order[0], order[1]] = [order[1], order[0]];
  const chain = ranked.map(d => `${grams(d)} g`).join(' < ');
  return {
    key,
    prompt: 'Put the items in order. Start with the lightest.',
    context: ['Each scale weighs one item. Read each dial clockwise, starting at 0.'],
    picture: drawScales(dials),
    order, answer: labels.join(','),
    hint: 'Find the value of one gap on each dial. Compare the three readings in grams.',
    workedSteps: [
      ...dials.map(d => ({
        text: `On the ${d.name.toLowerCase()} dial, ${d.gaps / 2} equal gaps reach ${d.gaps / 2 * d.step} ${d.unit}. Each gap is ${d.step} ${d.unit}.`,
        equation: `${d.tick} × ${d.step} ${d.unit} = ${d.tick * d.step} ${d.unit}`,
      })),
      { text: `Write the mass of the ${kg.name.toLowerCase()} in grams too.`, equation: '1 kg = 1000 g' },
      { text: 'Compare in grams and put the lightest item first.', equation: chain },
    ],
    explanation: `${chain}. The items from lightest to heaviest are ${labels.join(', ')}.`,
  };
}

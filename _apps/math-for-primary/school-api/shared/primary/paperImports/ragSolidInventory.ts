import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';
import type { Batch11UpperPicture } from './batch11UpperPicture';

export const RAG_PATTERN = {
  id: 'p2-rag-solid-inventory',
  level: 2,
  title: 'Count the solids in a model',
  objective: 'Identify the pieces in a model, count each kind and compare two counts.',
  skillIds: ['P2.S.SHAPE.02', 'P2.S.AS.01'],
  canonicalPatternId: 'p2-solid-inventory',
};

const kinds = ['cuboid', 'cylinder', 'cone'] as const;
type Solid = typeof kinds[number];
type Top = 'cone' | 'upright' | 'sideways';
const clue = {
  cuboid: 'Look at the long blocks in the base. Each layer is one cuboid.',
  cylinder: 'Find the pieces with two flat circular ends. Include cylinders lying on their sides.',
  cone: 'Find each piece with one round base and a pointed tip.',
};

function drawModel(layers: number, row: Top[], heights: number[]): Batch11UpperPicture {
  const marks: Batch11UpperPicture['marks'] = [];
  function path(d: string, closed = false) {
    marks.push({ kind: 'path', d, fill: closed ? '#e1eee8' : 'none' });
  }

  // Draw the lower slab first so that only exposed faces and seams are visible.
  for (let layer = layers - 1; layer >= 0; layer--) {
    const y = 119 + 18 * layer;
    path(`M 12 ${y} L 22 ${y-9} H 308 V ${y+9} L 298 ${y+18} H 12 Z`, true);
    path(`M 12 ${y} H 298 L 308 ${y-9} M 298 ${y} V ${y+18}`);
  }

  row.forEach((piece, i) => {
    const x = Math.round(17 + (i + 0.5) * 282 / row.length);
    const foot = 113;
    const top = foot - heights[i];
    const left = x - 16;
    const right = x + 16;
    if (piece === 'cone') {
      path(`M ${x} ${top} L ${right} ${foot} Q ${x} ${foot+10} ${left} ${foot} Z`, true);
    } else if (piece === 'upright') {
      path(`M ${left} ${top} Q ${x} ${top-10} ${right} ${top} V ${foot} Q ${x} ${foot+10} ${left} ${foot} Z`, true);
      path(`M ${left} ${top} Q ${x} ${top+10} ${right} ${top}`);
    } else {
      const upper = foot - 26;
      path(`M ${x-16} ${upper} H ${x+14} C ${x+23} ${upper} ${x+23} ${foot} ${x+14} ${foot} H ${x-16} C ${x-25} ${foot} ${x-25} ${upper} ${x-16} ${upper} Z`, true);
      path(`M ${x+14} ${upper} C ${x+5} ${upper} ${x+5} ${foot} ${x+14} ${foot}`);
    }
  });
  const profile = {
    cone: 'round base with a pointed tip',
    upright: 'two circular ends, standing up',
    sideways: 'two circular ends, lying on its side',
  };
  const base = layers === 1 ? 'One long rectangular block' : 'Two long rectangular blocks stacked flat';
  return { type: 'batch11-upper', marks, label: `${base}. On top, from left to right: ${row.map(p => profile[p]).join('; ')}.` };
}

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `p2-solid-inventory:${seed}:${index}`;
  const r = new Rng(hashString(key));
  const mode = r.pick(['pair', 'pair', 'names', 'one', 'difference'] as const);
  const layers = r.int(1, 2);
  const topCount = mode === 'difference' ? r.pick([3, 5]) : r.int(3, 5);
  const cones = mode === 'names' ? r.pick([0, topCount]) : r.int(1, topCount - 1);
  const startUpright = r.chance(0.5);
  const cylinders: Top[] = Array.from({ length: topCount - cones }, (_, i) =>
    (i % 2 === 0) === startUpright ? 'upright' : 'sideways');
  const row = r.shuffle<Top>([...Array<Top>(cones).fill('cone'), ...cylinders]);
  const picture = drawModel(layers, row, row.map(() => r.int(34, 54)));
  const counts = { cuboid: layers, cylinder: topCount - cones, cone: cones };
  const step = (solid: Solid) => {
    if (solid === 'cuboid') {
      return { text: clue.cuboid, equation: `Base layers: ${layers}` };
    }
    const positions = row.flatMap((p, i) => (p === 'cone' ? 'cone' : 'cylinder') === solid ? [i + 1] : []);
    return { text: clue[solid], equation: `Spots from the left: ${positions.join(', ')}. Count: ${positions.length}.` };
  };
  const make = (
    prompt: string, answer: string, workedSteps: NonNullable<Question['workedSteps']>,
    extra: Pick<Question, 'structuredResponse' | 'unit'> = {},
  ): Question => ({
    key, prompt, picture, answer, workedSteps,
    context: [`This model has ${layers + topCount} pieces. You can see every piece.`],
    hint: 'Look along the base first. Then check the pieces on top from left to right.',
    explanation: workedSteps.map(s => [s.text, s.equation].filter(Boolean).join(' ')).join(' '),
    ...extra,
  });

  if (mode === 'names') {
    const present = kinds.filter(k => counts[k] > 0);
    return make('Which two kinds of solid make up this model?', JSON.stringify(present), present.map(step),
      { structuredResponse: { kind: 'named-pair', options: r.shuffle(['cone', 'cube', 'cuboid', 'cylinder', 'sphere']) } });
  }
  if (mode === 'pair') {
    const [a, b] = r.shuffle<Solid>(['cylinder', r.pick(['cuboid', 'cone'] as const)]);
    return make(`How many ${a}s and how many ${b}s are in the model?`,
      JSON.stringify([String(counts[a]), String(counts[b])]), [step(a), step(b)],
      { structuredResponse: { kind: 'number-pair', firstLabel: a + 's', secondLabel: b + 's' } });
  }
  if (mode === 'one') {
    const target = r.pick(kinds);
    return make(`How many ${target}s can you find in the model?`, String(counts[target]), [step(target)], { unit: 'pieces' });
  }

  // An odd number of top pieces split between both kinds guarantees an unequal pair.
  const orderedPairs = kinds.flatMap(a => kinds.filter(b => counts[b] < counts[a]).map(b => ({ a, b })));
  const { a, b } = r.pick(orderedPairs);
  const difference = counts[a] - counts[b];
  return make(`How many more ${a}s than ${b}s are in the model?`, String(difference),
    [step(a), step(b), { text: 'Subtract the smaller count from the larger count.', equation: `${counts[a]} − ${counts[b]} = ${difference}` }],
    { unit: 'pieces' });
}

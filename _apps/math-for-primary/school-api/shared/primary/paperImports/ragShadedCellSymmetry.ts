import type {Question} from '../generate';
import {Rng, hashString} from '../../engine/random';

export const RAG_PATTERN = {
  id: 'rag-shaded-cell-symmetry',
  level: 6,
  title: 'Complete a shaded pattern',
  objective: 'Pair squares across a mirror line and find the fewest squares needed to complete the pattern.',
  skillIds: ['P4.S.SYM.02'],
  canonicalPatternId: 'shaded-cell-symmetry-completion-and-repair',
};

type Axis = 'horizontal' | 'vertical' | 'descending' | 'ascending';
type Diagram = Extract<NonNullable<Question['picture']>, {type: 'batch11-upper'}>;
type Mark = Diagram['marks'][number];
const SIZE = 6;
const CELL = 24;
const LEFT = 88;
const TOP = 28;

function partner(id: number, axis: Axis): number {
  const row = Math.floor(id / SIZE), col = id % SIZE;
  switch (axis) {
    case 'horizontal': return (SIZE - 1 - row) * SIZE + col;
    case 'vertical': return row * SIZE + SIZE - 1 - col;
    case 'descending': return col * SIZE + row;
    case 'ascending': return (SIZE - 1 - col) * SIZE + SIZE - 1 - row;
  }
}

function position(id: number): string {
  return `row ${Math.floor(id / SIZE) + 1}, column ${id % SIZE + 1}`;
}

function diagram(shaded: Set<number>, axis: Axis, labels: Map<number, string>): Diagram {
  const marks: Mark[] = [];
  for (let id = 0; id < SIZE * SIZE; id++) {
    const x = LEFT + id % SIZE * CELL;
    const y = TOP + Math.floor(id / SIZE) * CELL;
    marks.push({
      kind: 'path',
      d: `M ${x} ${y} H ${x + CELL} V ${y + CELL} H ${x} Z`,
      fill: shaded.has(id) ? '#a7b6c6' : 'white',
    });
    const label = labels.get(id);
    if (label) marks.push({kind: 'text', x: x + 8, y: y + 17, text: label});
  }
  const axes: Record<Axis, [number, number, number, number, number, number, number, number]> = {
    horizontal: [76, 100, 244, 100, 60, 105, 249, 105],
    vertical: [160, 16, 160, 184, 156, 12, 156, 198],
    descending: [76, 16, 244, 184, 62, 12, 249, 198],
    ascending: [76, 184, 244, 16, 62, 198, 249, 12],
  };
  const [x1, y1, x2, y2, ax, ay, bx, by] = axes[axis];
  marks.push(
    {kind: 'line', x1, y1, x2, y2},
    {kind: 'text', x: ax, y: ay, text: 'A'},
    {kind: 'text', x: bx, y: by, text: 'B'},
  );
  const descriptions: Record<Axis, string> = {
    horizontal: 'horizontal through the middle of the grid',
    vertical: 'vertical through the middle of the grid',
    descending: 'diagonal from the top-left corner to the bottom-right corner',
    ascending: 'diagonal from the bottom-left corner to the top-right corner',
  };
  const given = [...shaded].sort((a, b) => a - b).map(position).join('; ');
  const numbered = [...labels].map(([id, label]) => `${label} at ${position(id)}`).join('; ');
  return {
    type: 'batch11-upper',
    label: `A 6 by 6 grid of equal squares. Rows are counted from the top and columns from the left. AB is ${descriptions[axis]}. Shaded squares: ${given}.${numbered ? ` Numbered blank squares: ${numbered}.` : ''}`,
    marks,
  };
}

export function makeRagQuestion(seed: number, index = 0): Question {
  const r = new Rng(hashString(`${RAG_PATTERN.id}:${seed}:${index}`));
  const slot = ((Math.trunc(seed) + Math.trunc(index)) % 8 + 8) % 8;
  const axes: Axis[] = ['horizontal', 'vertical', 'descending', 'ascending'];
  const axis = axes[Math.floor(slot / 2)]!;
  const completion = slot % 2 === 0;
  const missingCount = completion ? 2 : r.int(1, 4);
  const fullPairCount = r.int(2, 4);
  const pairs: [number, number][] = [];
  const fixed: number[] = [];
  for (let id = 0; id < SIZE * SIZE; id++) {
    const reflected = partner(id, axis);
    if (id < reflected) pairs.push([id, reflected]);
    else if (id === reflected) fixed.push(id);
  }
  const shuffled = r.shuffle(pairs);
  const shaded = new Set<number>();
  for (const pair of shuffled.slice(0, fullPairCount)) {
    pair.forEach(id => shaded.add(id));
  }
  const missing: number[] = [];
  for (const pair of shuffled.slice(fullPairCount, fullPairCount + missingCount)) {
    const given = r.pick(pair);
    shaded.add(given);
    missing.push(partner(given, axis));
  }
  for (const id of r.shuffle(fixed).slice(0, 2)) shaded.add(id);
  missing.sort((a, b) => a - b);

  const labels = new Map<number, string>();
  if (completion) {
    const distractors = Array.from({length: SIZE * SIZE}, (_, id) => id)
      .filter(id => !shaded.has(id) && !missing.includes(id) && partner(id, axis) !== id);
    const candidates = r.shuffle([...missing, ...r.shuffle(distractors).slice(0, 4)]);
    candidates.forEach((id, i) => labels.set(id, String(i + 1)));
  }
  const answerLabels = missing.map(id => labels.get(id)!).sort();
  const steps: string[] = [
    'Imagine folding along AB. Each shaded square must meet another shaded square.',
    'Pairs that are already shaded need no change. A square crossed diagonally by AB matches itself.',
    ...missing.map(id => {
      const target = completion ? `numbered square ${labels.get(id)}` : `the square in ${position(id)}`;
      return `The shaded square in ${position(partner(id, axis))} needs its partner at ${target}.`;
    }),
    completion
      ? `Shade squares ${answerLabels.join(' and ')}. These are the only missing partners, so two additions are enough and both are necessary.`
      : `There ${missingCount === 1 ? 'is 1 missing partner' : `are ${missingCount} missing partners`}. Each must be shaded. This completes the pattern with the fewest additions: ${missingCount}.`,
  ];
  return {
    key: `${RAG_PATTERN.id}:${seed}:${index}`,
    prompt: completion
      ? 'Which two numbered squares should you shade to make AB a line of symmetry?'
      : 'What is the least number of extra squares to shade to make AB a line of symmetry?',
    context: [
      `Keep the ${shaded.size} shaded squares. You may shade only whole blank squares.`,
      'Count rows from the top and columns from the left.',
    ],
    picture: diagram(shaded, axis, labels),
    answer: completion ? JSON.stringify(answerLabels) : String(missingCount),
    ...(completion
      ? {structuredResponse: {kind: 'named-pair' as const, options: [...labels.values()]}}
      : {unit: 'squares'}),
    hint: 'Look for a shaded square whose matching square across AB is still blank.',
    workedSteps: steps.map(text => ({text})),
    explanation: steps.join(' '),
  };
}

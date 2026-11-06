import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';
import type { Batch11UpperMark, Batch11UpperPicture } from './batch11UpperPicture';

export const RAG_PATTERN = {
  id: 'p1-rag-count-and-compare-shape-occurrences',
  level: 1,
  title: 'Shape hunt',
  objective: 'Count one kind of shape in a picture or find the kind that is missing.',
  skillIds: ['P1.S.SHAPE.01', 'P1.S.WN.01'],
  canonicalPatternId: 'count-and-compare-shape-occurrences',
};

const names = ['circle', 'triangle', 'square', 'long rectangle'] as const;
type Shape = typeof names[number];
type Piece = { name: Shape; mark: Batch11UpperMark };

function piece(name: Shape, x: number, y: number, rx: number, ry: number, upsideDown = false): Piece {
  if (name === 'circle') return { name, mark: { kind: 'circle', cx: x, cy: y, r: rx } };
  const h = name === 'square' ? rx : ry;
  const base = upsideDown ? -h : h;
  const points = name === 'triangle'
    ? [[x - rx, y + base], [x, y - base], [x + rx, y + base]]
    : [[x - rx, y - h], [x + rx, y - h], [x + rx, y + h], [x - rx, y + h]];
  const d = 'M' + points.map(point => point.join(',')).join(' L') + ' Z';
  return { name, mark: { kind: 'path', d } };
}

function diagram(groups: Piece[][], label: string): Batch11UpperPicture {
  return {
    type: 'batch11-upper',
    label: groups.map((g, i) => `${label} ${i + 1}: ${g.map(p => p.name).join(', ')}.`).join(' '),
    marks: groups.flat().map(p => p.mark),
  };
}

function counts(groups: Piece[][], name: Shape) {
  return groups.map(group => group.filter(p => p.name === name).length);
}
const total = (values: number[]) => values.reduce((sum, value) => sum + value, 0);
const addition = (values: number[]) => `${values.join(' + ')} = ${total(values)}`;

function missingShape(key: string, r: Rng): Question {
  const [missing, ...present] = r.shuffle(names);
  const bag = r.shuffle([...present, ...Array.from({ length: 5 }, () => r.pick(present))]);
  const tiles = bag.map((name, i) => {
    const size = r.int(13, 20);
    return piece(name, 46 + 76 * (i % 4), 55 + 86 * Math.floor(i / 4),
      size, name === 'long rectangle' ? 8 : size, r.chance(0.5));
  });
  const rows = [tiles.slice(0, 4), tiles.slice(4)];
  const steps = [
    { text: 'Look along both rows. Count each kind you see.',
      equation: present.map(name => `${name}: ${total(counts(rows, name))}`).join(', ') },
    { text: `There is no ${missing} in either row.` },
  ];
  return {
    key, picture: diagram(rows, 'Row'), prompt: 'Which shape is missing from these rows?',
    context: ['A long rectangle has two long sides and two short sides.'],
    choices: r.shuffle(names), answer: missing,
    hint: 'Look for each choice in turn. Check both rows before you choose.',
    workedSteps: steps, explanation: steps.map(s => [s.text, s.equation].filter(Boolean).join(' ')).join(' '),
  };
}

function wagonQuestion(key: string, r: Rng, paired: boolean): Question {
  const wagonCount = r.int(2, 4);
  const loads = Array.from({ length: wagonCount }, () => r.int(1, 2));
  if (total(loads) < 3) loads[r.int(0, wagonCount - 1)] = 2;

  const wagons = loads.map((load, i) => {
    const x = 160 + (i - (wagonCount - 1) / 2) * 76;
    const parts = [piece('long rectangle', x, 100, 30, 15)];
    const loadOffsets = load === 1 ? [0] : [-15, 15];
    for (const dx of loadOffsets) {
      const h = r.int(9, 15);
      parts.push(piece('triangle', x + dx, 85 - h, load === 1 ? 19 : 12, h));
    }
    const wheelOffsets = r.chance(0.5) ? [-15, 15] : [-20, 0, 20];
    const radius = r.int(7, 9);
    for (const dx of wheelOffsets) parts.push(piece('circle', x + dx, 115 + radius, radius, radius));
    return parts;
  });
  const bodies = total(counts(wagons, 'long rectangle'));
  const wheels = counts(wagons, 'circle');
  const loadsByWagon = counts(wagons, 'triangle');
  const steps = paired ? [
    { text: `Each wagon has one rectangular body. Count the bodies from left to right to get ${bodies}.` },
    { text: 'Count the circles under each wagon, then add those counts.', equation: addition(wheels) },
  ] : [
    { text: `Look above the wagon bodies. The triangle counts from left to right are ${loadsByWagon.join(', ')}.` },
    { text: 'Put those counts together.', equation: addition(loadsByWagon) },
  ];

  return {
    key, picture: diagram(wagons, 'Wagon'), workedSteps: steps,
    explanation: steps.map(s => [s.text, s.equation].filter(Boolean).join(' ')).join(' '),
    hint: 'Look at one wagon at a time. Point to each shape you need to count.',
    ...(paired ? {
      prompt: 'How many rectangles and how many circles can you find in the wagons?',
      structuredResponse: { kind: 'number-pair' as const, firstLabel: 'Rectangles', secondLabel: 'Circles' },
      answer: JSON.stringify([String(bodies), String(total(wheels))]),
    } : {
      context: [`The wagons have ${bodies} rectangles and ${total(wheels)} circles.`],
      prompt: 'How many triangles are the wagons carrying?',
      answer: String(total(loadsByWagon)),
    }),
  };
}

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const r = new Rng(hashString(key));
  const variant = r.int(0, 5);
  if (variant === 0) return missingShape(key, r);
  return wagonQuestion(key, r, variant <= 2);
}

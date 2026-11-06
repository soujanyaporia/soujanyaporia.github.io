import {Rng, hashString} from '../../engine/random';
import type {Question} from '../generate';

export const RAG_PATTERN = {
  id: 'rag-painted-enclosed-cubes',
  level: 6,
  title: 'Painted faces and hidden cubes',
  objective: 'Use layers and outside faces to count small cubes in rectangular blocks, including totals across separate blocks.',
  skillIds: ['P6.S.VOL.02'],
  canonicalPatternId: 'p6-painted-and-enclosed-unit-cubes',
} as const;

type PaintedFaces = 0 | 1 | 2 | 3;
type Step = NonNullable<Question['workedSteps']>[number];
type Block = {name: string; x: number; y: number; z: number};

function edgeStep(block: Block, edge: number): Step {
  const {name, x, y, z} = block;
  return {
    text: `Block ${name}: divide each dimension by the small cube's edge length to count cubes along the three directions.`,
    equation: `${x * edge} ÷ ${edge} = ${x}; ${y * edge} ÷ ${edge} = ${y}; ${z * edge} ÷ ${edge} = ${z}`,
  };
}

function category(block: Block, painted: PaintedFaces): {count: number; step: Step} {
  const {name, x, y, z} = block;
  const a = x - 2, b = y - 2, c = z - 2;
  if (painted === 0) {
    const count = a * b * c;
    return {count, step: {
      text: `Block ${name}: an unpainted cube must be inside the block. Leave out one layer at each end in all three directions.`,
      equation: `(${x} − 2) × (${y} − 2) × (${z} − 2) = ${a} × ${b} × ${c} = ${count} cubes`,
    }};
  }
  if (painted === 1) {
    const count = 2 * (a * b + a * c + b * c);
    return {count, step: {
      text: `Block ${name}: count the cubes inside each face, leaving out all its edges. The six faces form three matching pairs.`,
      equation: `2 × (${x} − 2) × (${y} − 2) + 2 × (${x} − 2) × (${z} − 2) + 2 × (${y} − 2) × (${z} − 2) = ${2 * a * b} + ${2 * a * c} + ${2 * b * c} = ${count} cubes`,
    }};
  }
  if (painted === 2) {
    const count = 4 * (a + b + c);
    return {count, step: {
      text: `Block ${name}: these cubes lie along edges but are not corners. There are four edges in each direction; leave out both corner cubes on every edge.`,
      equation: `4 × (${x} − 2) + 4 × (${y} − 2) + 4 × (${z} − 2) = ${4 * a} + ${4 * b} + ${4 * c} = ${count} cubes`,
    }};
  }
  return {count: 8, step: {
    text: `Block ${name}: only the corner cubes touch three painted faces. A rectangular block has eight corners.`,
    equation: '8 × 1 = 8 cubes',
  }};
}

function explain(steps: Step[]): string {
  return steps.map(step => step.text + (step.equation ? ` ${step.equation}` : '')).join(' ');
}

export function makeRagQuestion(seed: number, index = 0): Question {
  const turn = index >>> 0;
  const r = new Rng(hashString(`painted-enclosed-cubes:${seed}:${index}`));
  const variant = (hashString(String(seed)) + turn) % 4;
  const linked = variant === 3;
  const multiple = variant === 1 || variant === 2;
  const edge = r.pick([3, 5]);
  const numberOfBlocks = multiple ? r.int(2, 3) : 1;
  const blocks: Block[] = Array.from({length: numberOfBlocks}, (_, i) => ({
    name: String.fromCharCode(65 + i),
    x: r.int(3, 9),
    y: r.int(3, 9),
    z: r.int(3, 9),
  }));
  const targets = [1, 2, 3] as const;
  const painted: PaintedFaces = variant === 1 || linked
    ? 0
    : targets[(hashString(`faces:${seed}`) + Math.floor(turn / 4)) % targets.length];
  const context = [
    multiple
      ? `${numberOfBlocks} separate solid rectangular blocks are used for a craft project. Each block is painted and cut separately.`
      : 'A solid rectangular block is used for a craft project.',
    ...blocks.map(block => `Block ${block.name} has length ${block.x * edge} cm, width ${block.y * edge} cm and height ${block.z * edge} cm.`),
    'Each block is painted on all six outside faces, including the bottom.',
    'After the paint dries, each block is cut into identical small cubes.',
    `Every small cube has edge length ${edge} cm.`,
    'The cuts are parallel to the faces. No material is lost, and the new cut faces are not painted.',
  ];
  const base = {key: `${RAG_PATTERN.id}:${seed}:${index}`, context};

  if (linked) {
    const block = blocks[0];
    const total = block.x * block.y * block.z;
    const enclosed = category(block, 0);
    const steps: Step[] = [
      edgeStep(block, edge),
      {
        text: `(a) One layer has ${block.x} × ${block.y} cubes. There are ${block.z} layers.`,
        equation: `${block.x} × ${block.y} × ${block.z} = ${total} cubes`,
      },
      {...enclosed.step, text: `(b) ${enclosed.step.text}`},
    ];
    return {
      ...base,
      prompt: '(a) How many small cubes are cut from the block in all? (b) How many of them have no painted faces?',
      answer: JSON.stringify([String(total), String(enclosed.count)]),
      structuredResponse: {
        kind: 'number-fields',
        fields: [
          {label: '(a) Total number of small cubes'},
          {label: '(b) Number of small cubes with no painted faces'},
        ],
      },
      hint: 'First count all the cubes using rows and layers. For part (b), leave out one layer at each end in each direction.',
      workedSteps: steps,
      explanation: explain(steps),
    };
  }

  const results = blocks.map(block => category(block, painted));
  const steps: Step[] = blocks.flatMap((block, i) => [edgeStep(block, edge), results[i].step]);
  const answer = results.reduce((sum, result) => sum + result.count, 0);
  if (multiple) steps.push({
    text: 'The blocks are separate, so add their counts. Each small cube is counted once.',
    equation: `${results.map(result => result.count).join(' + ')} = ${answer} cubes`,
  });
  const description = painted === 0 ? 'no painted faces' : `exactly ${painted} painted ${painted === 1 ? 'face' : 'faces'}`;
  const hints: Record<PaintedFaces, string> = {
    0: 'Leave out one layer at each end of the length, width and height.',
    1: 'Look inside each outside face, leaving out its edges.',
    2: 'Look along all twelve edges, leaving out the corners.',
    3: 'Think about which cubes touch three outside faces.',
  };
  return {
    ...base,
    prompt: multiple
      ? `Across all ${numberOfBlocks} blocks, how many small cubes have ${description}?`
      : `How many small cubes have ${description}?`,
    answer: String(answer),
    unit: 'cubes',
    hint: hints[painted] + (multiple ? ' Work out each block separately, then add.' : ''),
    workedSteps: steps,
    explanation: explain(steps),
  };
}

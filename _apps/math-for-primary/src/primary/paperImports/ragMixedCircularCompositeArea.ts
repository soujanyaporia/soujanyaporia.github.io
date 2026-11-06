import {Rng, hashString} from '../../engine/random';
import type {Question} from '../generate';

export const RAG_PATTERN = {
  id: 'rag-mixed-circular-composite-area',
  level: 6,
  title: 'Areas between circular arcs',
  objective: 'Derive radii and combine overlapping semicircle and quadrant areas using square guides.',
  skillIds: ['P6.S.CIRCLE.02', 'P6.S.CIRCLE.03'],
  canonicalPatternId: 'p6-mixed-circular-composite-area',
};

const fmt = (value: number): string => String(Number(value.toFixed(4)));

export function makeRagQuestion(seed: number, index = 0): Question {
  const random = new Rng(hashString(`${RAG_PATTERN.id}:${seed}:${index}`));
  const diameter = random.pick([16, 24, 40, 48, 56, 64]);
  const radius = diameter / 2;
  const smallRadius = radius / 2;
  const pi = 3.14;
  const largeQuadrant = pi * radius * radius / 4;
  const smallQuadrant = pi * smallRadius * smallRadius / 4;
  const smallSquare = smallRadius * smallRadius;
  const overlap = 2 * largeQuadrant - radius * radius;
  const sideWhite = smallSquare + (smallSquare - smallQuadrant) + smallQuadrant;
  const sideShade = largeQuadrant - sideWhite;
  const total = Number((overlap + 2 * sideShade).toFixed(2));
  const steps = [
    `Each large radius is ${diameter} ÷ 2 = ${radius} cm.`,
    `Each side guide square has side ${radius} cm. Each small radius is ${radius} ÷ 2 = ${smallRadius} cm.`,
    `The shaded overlap is two large quarter-circles minus the square between their centres: 2 × (1/4 × 3.14 × ${radius}²) − ${radius}² = ${fmt(overlap)} cm².`,
    `One small square has area ${smallRadius}² = ${smallSquare} cm². One small quarter-circle has area 1/4 × 3.14 × ${smallRadius}² = ${fmt(smallQuadrant)} cm².`,
    `In the right-hand section, the unshaded area is one small square, another small square with a quadrant removed, and an equal quadrant added: ${smallSquare} + (${smallSquare} − ${fmt(smallQuadrant)}) + ${fmt(smallQuadrant)} = ${fmt(sideWhite)} cm².`,
    `The shaded right-hand part is ${fmt(largeQuadrant)} − ${fmt(sideWhite)} = ${fmt(sideShade)} cm². The lower shaded part has the same area.`,
    `Total shaded area = ${fmt(overlap)} + 2 × ${fmt(sideShade)} = ${fmt(total)} cm².`,
  ];

  return {
    key: `${RAG_PATTERN.id}:${seed}:${index}`,
    prompt: 'What is the total area of the three shaded parts?',
    context: [
      `AB and AC are perpendicular. AB = AC = ${diameter} cm. A semicircle is drawn inwards on each of these lines.`,
      'The semicircle edges meet at A and P. The guide squares to the right and below P each contain four equal small squares. Each small curved edge is a quarter-circle that fits exactly in one small square.',
      'Use π = 3.14. The straight lines inside the figure are guides, not extra shaded boundaries.',
    ],
    answer: fmt(total),
    unit: 'cm²',
    hint: 'Find the shaded overlap first. Then use the small square guides to find one shaded side part; the other side part is equal.',
    explanation: steps.join(' '),
    workedSteps: steps.map(text => ({text})),
    picture: {
      type: 'batch11-upper',
      label: `Perpendicular diameters AB and AC are each ${diameter} cm. Two equal semicircles meet at A and P. Their overlap is shaded. Two further shaded parts lie between the large arcs and four equal small quarter-circle arcs. Each side guide square is divided into four equal small squares.`,
      marks: [
        {kind: 'line', x1: 60, y1: 20, x2: 240, y2: 20},
        {kind: 'line', x1: 60, y1: 20, x2: 60, y2: 200},
        {kind: 'path', d: 'M 150 20 H 240 V 110 H 150 Z'},
        {kind: 'path', d: 'M 195 20 V 110 M 150 65 H 240'},
        {kind: 'path', d: 'M 60 110 H 150 V 200 H 60 Z'},
        {kind: 'path', d: 'M 105 110 V 200 M 60 155 H 150'},
        {kind: 'path', d: 'M 60 20 A 90 90 0 0 0 150 110 A 90 90 0 0 0 60 20 Z', fill: '#dcefe6'},
        {kind: 'path', d: 'M 150 110 A 90 90 0 0 0 240 20 A 45 45 0 0 1 195 65 A 45 45 0 0 0 150 110 Z', fill: '#dcefe6'},
        {kind: 'path', d: 'M 150 110 A 90 90 0 0 1 60 200 A 45 45 0 0 0 105 155 A 45 45 0 0 1 150 110 Z', fill: '#dcefe6'},
        {kind: 'text', x: 45, y: 17, text: 'A'},
        {kind: 'text', x: 247, y: 23, text: 'B'},
        {kind: 'text', x: 44, y: 204, text: 'C'},
        {kind: 'text', x: 156, y: 124, text: 'P'},
        {kind: 'text', x: 6, y: 114, text: `${diameter} cm`},
      ],
    },
  };
}

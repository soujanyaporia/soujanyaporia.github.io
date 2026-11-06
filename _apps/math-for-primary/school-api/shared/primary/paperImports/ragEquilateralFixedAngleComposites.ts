import {Rng, hashString} from '../../engine/random';
import type {Question} from '../generate';
import type {Batch11UpperMark} from './batch11UpperPicture';

export const RAG_PATTERN = {
  id: 'rag-p5-equilateral-fixed-angle-composites',
  level: 5,
  title: 'Find angles in overlapping shapes',
  objective: 'Combine equilateral triangle angles with square corners and straight-line angles to find missing angles.',
  skillIds: ['P5.S.ANGLE.01', 'P5.S.ANGLE.03', 'P5.S.SHAPE.01', 'P5.S.SHAPE.03', 'P4.S.SHAPE.01'],
  canonicalPatternId: 'equilateral-fixed-angle-composites',
};

type Point = [number, number];
type Points = Record<string, Point>;
type Mark = Batch11UpperMark;
const sub = (a: Point, b: Point): Point => [a[0] - b[0], a[1] - b[1]];
const cross = (a: Point, b: Point) => a[0] * b[1] - a[1] * b[0];
function intersect(a: Point, b: Point, c: Point, d: Point): Point {
  const v = sub(b, a), w = sub(d, c);
  const denominator = cross(v, w);
  if (Math.abs(denominator) < 1e-10) throw new Error('Parallel construction lines');
  const t = cross(sub(c, a), w) / denominator;
  return [a[0] + t * v[0], a[1] + t * v[1]];
}
function ray(p: Point, length: number, degrees: number): Point {
  const t = degrees * Math.PI / 180;
  return [p[0] + length * Math.cos(t), p[1] + length * Math.sin(t)];
}
function angleArc(a: Point, b: Point, c: Point, radius: number): Mark {
  const start = Math.atan2(a[1] - b[1], a[0] - b[0]);
  const end = Math.atan2(c[1] - b[1], c[0] - b[0]);
  const delta = ((end - start + 3 * Math.PI) % (2 * Math.PI)) - Math.PI;
  const x1 = b[0] + radius * Math.cos(start), y1 = b[1] + radius * Math.sin(start);
  const x2 = b[0] + radius * Math.cos(start + delta), y2 = b[1] + radius * Math.sin(start + delta);
  return {kind: 'path', d: `M ${x1} ${y1} A ${radius} ${radius} 0 0 ${delta >= 0 ? 1 : 0} ${x2} ${y2}`};
}
function draw(
  points: Points, edges: string[], offsets: Points,
  arcs: {name: string; radius: number}[], mirror = false,
  notes: {at: Point; text: string}[] = [],
): Mark[] {
  const transform = (p: Point): Point => [mirror ? 320 - p[0] : p[0], p[1]];
  const visible: Points = Object.fromEntries(Object.entries(points).map(([name, p]) => [name, transform(p)]));
  const marks: Mark[] = edges.map(edge => {
    const a = visible[edge[0]], b = visible[edge[1]];
    return {kind: 'line', x1: a[0], y1: a[1], x2: b[0], y2: b[1]};
  });
  for (const arc of arcs) marks.push(angleArc(visible[arc.name[0]], visible[arc.name[1]], visible[arc.name[2]], arc.radius));
  for (const [name, p] of Object.entries(visible)) {
    const [dx, dy] = offsets[name];
    marks.push({kind: 'circle', cx: p[0], cy: p[1], r: 1.5, fill: '#235b4c'});
    marks.push({kind: 'text', x: p[0] + (mirror ? -dx - 10 : dx), y: p[1] + dy, text: name});
  }
  for (const note of notes) {
    const p = transform(note.at);
    marks.push({kind: 'text', x: p[0], y: p[1], text: note.text});
  }
  return marks;
}

export function makeRagQuestion(seed: number, index = 0): Question {
  const rng = new Rng(hashString(`${RAG_PATTERN.id}:${seed}:${index}`));
  const variant = ((hashString(String(seed)) % 3 + Math.trunc(index)) % 3 + 3) % 3;
  const finish = (
    givens: string[], targets: string[], answers: number[], hint: string,
    steps: string[], marks: Mark[],
  ): Question => {
    const context = [...givens, 'The drawing is not to scale.'];
    const prompt = targets.length === 1
      ? `Find angle ${targets[0]}.`
      : `Find (a) angle ${targets[0]} and (b) angle ${targets[1]}.`;
    return {
      key: `${RAG_PATTERN.id}:${seed}:${index}`,
      context, prompt, unit: 'degrees', hint,
      answer: answers.length === 1 ? String(answers[0]) : JSON.stringify(answers.map(String)),
      ...(targets.length === 2 ? {
        structuredResponse: {
          kind: 'number-pair' as const,
          firstLabel: `(a) Angle ${targets[0]} (degrees)`,
          secondLabel: `(b) Angle ${targets[1]} (degrees)`,
        },
      } : {}),
      workedSteps: steps.map(text => ({text})),
      explanation: steps.join(' '),
      picture: {type: 'batch11-upper', label: [...context, prompt].join(' '), marks},
    };
  };

  if (variant === 0) {
    const side = rng.int(140, 152);
    const screen = (x: number, y: number): Point => [80 + side * x, 178 - side * y];
    const points: Points = {
      K: screen(0, 1), L: screen(1, 1), M: screen(1, 0), N: screen(0, 0),
      P: screen(0.5, Math.sqrt(3) / 2), Q: screen(1 - 1 / Math.sqrt(3), 1),
    };
    return finish([
      'KLMN is a square. Triangle NPM is equilateral, with P inside the square.',
      'Lines MP and KL meet at Q. P is between M and Q, and Q is between K and L.',
    ], ['MQL'], [60],
    'Start with the angle at M in the equilateral triangle. Then use triangle QLM.', [
      'Every angle in an equilateral triangle is 60°, so angle PMN = 60°.',
      'The square corner LMN is 90°. Since MQ passes through P, angle QML = 90° − 60° = 30°.',
      'Q lies on KL, so angle QLM is a right angle.',
      'In triangle QLM, angle MQL = 180° − 90° − 30° = 60°.',
    ], draw(points, ['KQ', 'QL', 'LM', 'MN', 'NK', 'NP', 'MP', 'PQ'], {
      K: [-16, -8], L: [7, -8], M: [7, 18], N: [-16, 18], P: [9, 6], Q: [-5, -10],
    }, [{name: 'MQL', radius: 18}], rng.chance(0.5)));
  }

  if (variant === 1) {
    const side = rng.int(140, 152);
    const screen = (x: number, y: number): Point => [80 + side * x, 178 - side * y];
    const t = 1 / (1 + 1 / Math.sqrt(3));
    const points: Points = {
      L: screen(0, 1), M: screen(1, 1), N: screen(1, 0), P: screen(0, 0),
      Q: screen(Math.sqrt(3) / 2, 0.5), R: screen(t, t),
    };
    return finish([
      'LMNP is a square. Triangle LQP is equilateral, with Q inside the square.',
      'Lines PM and LQ meet at R. R is between P and M, and R is between L and Q.',
    ], ['QLM', 'PRQ'], [30, 105],
    'Find the small angle at L first. Use the equal sides of triangle LMP to find its other two angles.', [
      '(a) Angle PLM = 90° because LMNP is a square. Angle PLQ = 60° because LQP is equilateral.',
      'Angle QLM = 90° − 60° = 30°.',
      '(b) LP = LM, so triangle LMP is isosceles. Angle LMP = (180° − 90°) ÷ 2 = 45°.',
      'In triangle LMR, angle LRM = 180° − 30° − 45° = 105°.',
      'Angles PRQ and LRM are vertically opposite, so angle PRQ = 105°.',
    ], draw(points, ['LM', 'MN', 'NP', 'PL', 'LR', 'RQ', 'QP', 'PR', 'RM'], {
      L: [-16, -8], M: [7, -8], N: [7, 18], P: [-16, 18], Q: [3, 22], R: [2, -15],
    }, [{name: 'QLM', radius: 24}, {name: 'PRQ', radius: 15}], rng.chance(0.5)));
  }

  const alpha = rng.pick([96, 98, 100, 102]);
  const beta = rng.pick([52, 54, 56, 58]);
  const bAngle = 120 - alpha, eAngle = 120 - beta;
  const first = alpha + beta - 60, second = 180 - alpha - beta;
  const raw: Points = {B: [0, 0], E: [1, 0], G: [-0.35, 0], H: [2.25, 0]};
  raw.A = ray(raw.B, 1.25, 180 - alpha);
  raw.C = ray(raw.B, 1.25, 120 - alpha);
  raw.D = ray(raw.E, 1.6, beta + 60);
  raw.F = ray(raw.E, 1.6, beta);
  raw.J = intersect(raw.B, raw.C, raw.D, raw.E);
  raw.K = intersect(raw.A, raw.C, raw.D, raw.E);
  const points: Points = Object.fromEntries(Object.entries(raw).map(([name, p]) => [name, [50 + 100 * p[0], 178 - 100 * p[1]] as Point]));
  return finish([
    'Triangles ABC and DEF are equilateral.',
    'G, B, E and H lie on one straight line in that order.',
    'Lines BC and DE meet at J. Lines AC and DE meet at K.',
    'J is between B and C. K is between A and C. D, K, J and E lie on one straight line in that order.',
    `Angle ABG = ${alpha}°. Angle FEH = ${beta}°.`,
  ], ['BJE', 'JKC'], [first, second],
  'Use the two angles on the straight line to find the angles at B and E in triangle BJE.', [
    `Each angle in an equilateral triangle is 60°. Angle ABE = 180° − ${alpha}° = ${180 - alpha}°.`,
    `Angle JBE = ${180 - alpha}° − 60° = ${bAngle}°.`,
    `Angle BEJ = 180° − 60° − ${beta}° = ${eAngle}°.`,
    `(a) In triangle BJE, angle BJE = 180° − ${bAngle}° − ${eAngle}° = ${first}°.`,
    `Angles KJC and BJE are vertically opposite, so angle KJC = ${first}°.`,
    'Angle KCJ is 60° because it is the angle at C in equilateral triangle ABC.',
    `(b) In triangle JKC, angle JKC = 180° − ${first}° − 60° = ${second}°.`,
  ], draw(points,
    ['GB', 'BE', 'EH', 'AB', 'BJ', 'JC', 'AK', 'KC', 'DK', 'KJ', 'JE', 'EF', 'FD'], {
      G: [-7, 18], B: [-6, 18], E: [-5, 18], H: [-5, 18],
      A: [-12, -8], C: [8, 8], D: [6, -10], F: [7, 3], J: [-17, 5], K: [7, -4],
    }, [
      {name: 'ABG', radius: 20}, {name: 'FEH', radius: 20},
      {name: 'BJE', radius: 12}, {name: 'JKC', radius: 14},
    ], false, [{at: [10, 150], text: `${alpha}°`}, {at: [184, 164], text: `${beta}°`}]));
}

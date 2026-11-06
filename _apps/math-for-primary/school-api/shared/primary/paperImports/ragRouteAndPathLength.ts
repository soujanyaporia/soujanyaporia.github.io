import {Rng, hashString} from '../../engine/random';
import type {Question, Proof} from '../generate';
import type {Batch11UpperMark, Batch11UpperPicture} from './batch11UpperPicture';

export const RAG_PATTERN = {
  id: 'p2-rag-route-and-path-length',
  level: 2,
  title: 'Follow a path',
  objective: 'Trace the parts of a path to find a distance in metres or compare the lengths of strings.',
  skillIds: ['P2.S.MEASURE.01', 'P2.S.AS.01'],
  canonicalPatternId: 'route-and-path-length',
};

type Step = NonNullable<Question['workedSteps']>[number];
type Point = [number, number];

function distanceAnswer(key: string, legs: number[], trace: Step, sentenceStart: string,
  givens: Pick<Question, 'prompt' | 'context' | 'picture' | 'display' | 'hint'>): Question {
  const total = legs.reduce((a, b) => a + b);
  const equation = legs.length > 1 ? `${legs.join(' + ')} = ${total} m` : `${total} m`;
  const statement = `${sentenceStart} ${total} m.`;
  return {
    key, ...givens, answer: String(total), unit: 'm',
    proof: legs.slice(1).reduce<Proof>((a, b) => ({op: '+', a, b}), legs[0]),
    workedSteps: [trace, {text: statement, equation}],
    explanation: `${trace.text} ${equation}. ${statement}`,
  };
}

function markedSpan(key: string, rng: Rng): Question {
  const flags = rng.shuffle(['P', 'Q', 'R']);
  const gaps = rng.shuffle([rng.int(28, 58), rng.int(61, 95)]);
  const count = rng.chance(0.75) ? 2 : 1;
  const start = rng.int(0, 2 - count);
  const stops = flags.slice(start, start + count + 1);
  const legs = gaps.slice(start, start + count);
  if (rng.chance(0.5)) { stops.reverse(); legs.reverse(); }
  const from = stops[0], to = stops[count];
  const trace: Step = {
    text: count === 2 ? `From ${from} to ${to}, you pass flag ${stops[1]}. Join both lengths.`
      : `Flags ${from} and ${to} are next to each other. Read the length between them.`,
    picture: {type: 'paper', layout: 'bars', rows: [{label: `${from} to ${to}`,
      parts: legs.map((size, i) => ({size, label: `${size} m`, tone: i === 0 ? 'blue' : 'green'}))}]},
  };
  return distanceAnswer(key, legs, trace, 'The distance between the flags is', {
    context: [
      `Three flags stand on a straight path. From left to right they are ${flags.join(', ')}.`,
      ...gaps.map((length, i) => `Flag ${flags[i]} is ${length} m from flag ${flags[i + 1]}.`),
    ],
    prompt: `How far is flag ${from} from flag ${to}? Show your working on paper.`,
    hint: 'Start at the first flag in the question. Stop when you reach the other one.',
  });
}

function parkWalk(key: string, rng: Rng): Question {
  const places = rng.shuffle(['Gate', 'Pond', 'Hut']);
  const points: Point[] = [[42, 145], [160, 46], [278, 145]];
  const nameAt: Point[] = [[22, 174], [142, 27], [258, 174]];
  const lengthAt: Point[] = [[49, 88], [222, 88], [136, 169]];
  const metres = rng.shuffle([rng.int(143, 174), rng.int(181, 209), rng.int(240, 275)]);
  const marks: Batch11UpperMark[] = [];
  const roads = points.map(([x1, y1], i) => {
    const j = (i + 1) % places.length;
    const [x2, y2] = points[j];
    const [x, y] = lengthAt[i];
    marks.push({kind: 'line', x1, y1, x2, y2}, {kind: 'text', x, y, text: `${metres[i]} m`});
    return {ends: [places[i], places[j]], length: metres[i]};
  });
  points.forEach(([cx, cy], i) => {
    const [x, y] = nameAt[i];
    marks.push({kind: 'circle', cx, cy, r: 4, fill: '#235b4c'}, {kind: 'text', x, y, text: places[i]});
  });
  const picture: Batch11UpperPicture = {type: 'batch11-upper', marks,
    label: roads.map(road => `${road.ends.join(' to ')} is ${road.length} m.`).join(' ')};
  const stops = rng.shuffle(places);
  if (rng.chance(0.35)) stops.push(stops[1]);
  const legs = stops.slice(1).map((to, i) =>
    roads.find(road => road.ends.includes(to) && road.ends.includes(stops[i]))!.length);
  const trace = stops.slice(1).map((to, i) => `${stops[i]} to ${to} is ${legs[i]} m.`).join(' ');
  return distanceAnswer(key, legs, {text: trace}, 'Iman walks', {
    context: ['The map shows the paths in a park. Iman walks along one path for each arrow.'],
    display: stops.join(' → '), picture,
    prompt: 'How far does Iman walk altogether? Write the number sentence on paper.',
    hint: 'Follow the arrows in order. Count a path each time Iman walks along it.',
  });
}

function stringComparison(key: string, rng: Rng): Question {
  const folds = rng.shuffle([0, 1, 2]);
  const letters = ['J', 'K', 'L'];
  const depth = rng.int(18, 25);
  const left = 50, right = 284;
  const marks: Batch11UpperMark[] = [left, right].map(x => ({
    kind: 'line', x1: x, y1: 12, x2: x, y2: 180, dashed: true,
  }));
  const descriptions: string[] = [];
  folds.forEach((count, i) => {
    const y = 46 + i * 62;
    const points: Point[] = [[left, y]];
    for (let j = 0; j < count; j++) {
      const x = 89 + 98 * j;
      points.push([x, y], [x, y - depth], [x + 41, y - depth], [x + 41, y]);
    }
    points.push([right, y]);
    const d = points.map(([x, py], n) => `${n === 0 ? 'M' : 'L'} ${x} ${py}`).join(' ');
    marks.push({kind: 'path', d}, {kind: 'text', x: 20, y: y + 5, text: letters[i]});
    descriptions.push(`${letters[i]} has ${count} ${count === 1 ? 'step' : 'steps'} up and back down.`);
  });
  const straight = letters[folds.indexOf(0)], one = letters[folds.indexOf(1)], answer = letters[folds.indexOf(2)];
  const steps = [
    {text: `All three strings go the same distance across. ${straight} goes straight across.`},
    {text: `${one} goes up and down once. ${answer} goes up and down twice by the same amount. Straightened out, ${answer} would reach farthest.`},
  ];
  return {key, prompt: 'Which string would be longest if you straightened them all? Write its letter.',
    answer, hint: 'Trace each string from one end to the other, following all its bends.',
    picture: {type: 'batch11-upper', label: 'Three strings span the same width. Each step has the same height. ' + descriptions.join(' '), marks},
    workedSteps: steps, explanation: steps.map(step => step.text).join(' ')};
}

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const rng = new Rng(hashString(key));
  const slot = (hashString(String(seed)) % 9 + ((index % 9) + 9) % 9) % 9;
  if (slot === 8) return stringComparison(key, rng);
  if (slot === 1 || slot === 4 || slot === 6) return parkWalk(key, rng);
  return markedSpan(key, rng);
}

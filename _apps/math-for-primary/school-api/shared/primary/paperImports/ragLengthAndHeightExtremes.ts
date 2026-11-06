import {Rng, hashString} from '../../engine/random';
import type {Question} from '../generate';
import type {Batch11UpperMark, Batch11UpperPicture} from './batch11UpperPicture';

export const RAG_PATTERN = {
  id: 'p1-rag-length-and-height-extremes',
  level: 1,
  title: 'Compare strings and poles',
  objective: 'Find the shortest, longest or tallest item by comparing all the pictured lengths.',
  skillIds: ['P1.S.LENGTH.01'],
  canonicalPatternId: 'length-and-height-extremes',
};

type Point = [number, number];

function foldedString(y: number, halfStep: number, turns: number, depth: number): Point[] {
  const left = 50;
  if (depth === 0) return [[left, y], [left + 2 * halfStep * turns, y]];
  const points: Point[] = [[left, y]];
  for (let i = 0; i < turns; i++) {
    const x = left + 2 * halfStep * i;
    points.push([x + halfStep, y + (i % 2 === 0 ? -depth : depth)], [x + 2 * halfStep, y]);
  }
  return points;
}

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const block = Math.floor(index / 4);
  const groupKey = `${RAG_PATTERN.id}:${seed}:${block}`;
  const schedule = new Rng(hashString(`${groupKey}:order`)).shuffle([
    'greatest-set', 'least-set', 'greater-pair', 'shorter-pair',
  ]);
  const form = schedule[((index % 4) + 4) % 4];
  const pair = form.endsWith('pair');
  // Both set questions can be answered separately from the same picture.
  const rng = new Rng(hashString(`${groupKey}:${pair ? form : 'set'}`));
  const greatest = form === 'greatest-set' || form === 'greater-pair';
  const poles = form !== 'shorter-pair' && rng.chance(0.45);
  const bent = !poles && rng.chance(0.7);
  const ranks = rng.shuffle(pair ? [0, 2] : [0, 1, 2]);
  const baseSize = rng.int(3, 5);
  const halfStep = rng.int(14, 21);
  const turns = rng.int(4, 5);
  const bendStep = rng.int(9, 11);
  const item = poles ? 'pole' : 'string';
  const marks: Batch11UpperMark[] = [];
  const descriptions: string[] = [];
  if (poles) marks.push({kind: 'line', x1: 28, y1: 158, x2: 292, y2: 158});

  const objects = ranks.map((rank, i) => {
    const letter = String.fromCharCode(65 + i);
    const size = baseSize + 2 * rank;
    let points: Point[];
    if (poles) {
      const x = Math.round(320 * (i + 1) / (ranks.length + 1));
      points = [[x, 158], [x, 158 - 14 * size]];
      marks.push({kind: 'text', x: x - 5, y: 181, text: letter});
      descriptions.push(`Pole ${letter} reaches ${size} equal steps above the ground.`);
    } else {
      const y = Math.round(200 * (i + 1) / (ranks.length + 1));
      points = bent ? foldedString(y, halfStep, turns, rank * bendStep) : [[50, y], [50 + 24 * size, y]];
      marks.push({kind: 'text', x: 18, y: y + 5, text: letter});
      if (!bent) descriptions.push(`String ${letter} reaches ${size} equal steps from the left.`);
      else if (rank === 0) descriptions.push(`String ${letter} goes straight across.`);
      else descriptions.push(`String ${letter} zigzags with ${rank === 1 ? 'shallow' : 'deep'} bends.`);
    }
    const d = points.map(([x, y], j) => `${j === 0 ? 'M' : 'L'} ${x} ${y}`).join(' ');
    marks.push({kind: 'path', d});
    return {rank, letter};
  });

  const ordered = objects.sort((a, b) => a.rank - b.rank).map(object => object.letter);
  const answer = ordered[greatest ? ordered.length - 1 : 0];
  const highWord = poles ? (pair ? 'taller' : 'tallest') : (pair ? 'longer' : 'longest');
  const word = greatest ? highWord : (pair ? 'shorter' : 'shortest');
  const hint = poles ? 'Start at the ground line and look at the tops.' :
    bent ? 'Trace each string with your finger. Follow every bend.' : 'The left tips line up. Look where the right tips end.';
  const method = poles ? 'All the poles stand on the same line. A higher top means a taller pole.' :
    bent ? `The strings go the same distance across. ${ordered[0]} goes straight. ${pair ? `${ordered[1]} takes a longer route around its bends.` : `${ordered[2]} bends farther up and down than ${ordered[1]} at every turn.`}` :
    'The left tips line up. The string that ends farther to the right is longer.';
  const steps = [
    {text: method},
    {text: `From shortest to ${poles ? 'tallest' : 'longest'}, the ${item}s are ${ordered.join(', ')}.`},
    {text: `The ${word} ${item} is ${answer}.`},
  ];
  const intro = bent ? 'The strings span the same width. The zigzags turn at the same places along that width. ' : '';
  const picture: Batch11UpperPicture = {type: 'batch11-upper', label: intro + descriptions.join(' '), marks};
  return {
    key, prompt: `Which ${item} is ${word}? Write its letter.`, picture, answer, hint,
    workedSteps: steps, explanation: steps.map(step => step.text).join(' '),
  };
}

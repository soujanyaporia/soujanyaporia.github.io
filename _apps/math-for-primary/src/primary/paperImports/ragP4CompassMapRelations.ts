import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';
import type { Batch11UpperPicture } from './batch11UpperPicture';

export const RAG_PATTERN = {
  id: 'rag-p4-compass-map-relations',
  level: 4,
  title: 'Find your way on a map',
  objective: 'Use the north arrow to find a stop in a given direction or name the direction from one stop to another.',
  skillIds: ['P4.S.ANGLE.02'],
  canonicalPatternId: 'p4-read-compass-relationship-on-labelled-map',
};

const bearings = [
  ['north', 0, -1], ['north-east', 1, -1], ['east', 1, 0], ['south-east', 1, 1],
  ['south', 0, 1], ['south-west', -1, 1], ['west', -1, 0], ['north-west', -1, -1],
] as const;
type Bearing = (typeof bearings)[number];
type Stop = { label: string; col: number; row: number };
type Route = { from: Stop; to: Stop; bearing: Bearing };

function routesOnMap(stops: Stop[]): Route[] {
  const routes: Route[] = [];
  for (const from of stops) {
    for (const to of stops) {
      const dx = to.col - from.col;
      const dy = to.row - from.row;
      const span = Math.max(Math.abs(dx), Math.abs(dy));
      if (!span) continue;
      const bearing = bearings.find(([, x, y]) => dx === span * x && dy === span * y);
      if (bearing) routes.push({ from, to, bearing });
    }
  }
  return routes;
}

function drawMap(stops: Stop[], spacing: number): Batch11UpperPicture {
  const marks: Batch11UpperPicture['marks'] = [
    { kind: 'text', x: 274, y: 32, text: 'N' },
    { kind: 'line', x1: 281, y1: 88, x2: 281, y2: 44 },
    { kind: 'line', x1: 275, y1: 54, x2: 281, y2: 44 },
    { kind: 'line', x1: 287, y1: 54, x2: 281, y2: 44 },
  ];
  for (const stop of stops) {
    const x = 32 + spacing * stop.col;
    const y = 28 + spacing * stop.row;
    marks.push({ kind: 'circle', cx: x, cy: y, r: 3, fill: '#235b4c' });
    marks.push({ kind: 'text', x: x + 8, y: y + 5, text: stop.label });
  }
  const rows = ['Top', 'Middle', 'Bottom'].map((name, row) => {
    const cells = [0, 1, 2].map(col => stops.find(s => s.col === col && s.row === row)?.label ?? 'empty');
    return `${name} row, ${cells.join(', ')}.`;
  });
  return { type: 'batch11-upper', marks, label: `North points up. Read each row from left to right. ${rows.join(' ')}` };
}

export function makeRagQuestion(seed: number, index = 0): Question {
  // Consecutive parts share a map. Each part includes all the givens it needs.
  const rng = new Rng(hashString(`${RAG_PATTERN.id}:${seed}:${Math.floor(index / 2)}`));
  const namedStops = rng.chance(0.5);
  const labels = rng.shuffle(namedStops
    ? ['Tent', 'Arch', 'Pier', 'Well', 'Gate', 'Hut', 'Mill', 'Deck']
    : ['J', 'K', 'L', 'M', 'P', 'R', 'T', 'V']);
  const cells = rng.shuffle([0, 1, 2, 3, 4, 5, 6, 7, 8]).slice(0, 6);
  const stops = cells.map((cell, i) => ({ label: labels[i], col: cell % 3, row: Math.floor(cell / 3) }));
  const picture = drawMap(stops, rng.pick([62, 68, 74]));
  const routes = routesOnMap(stops);
  const unique = routes.filter(route => !routes.some(other =>
    other.from === route.from && other.bearing === route.bearing && other.to !== route.to));
  const first = rng.pick(unique);
  // Four unused stops in three rows guarantee at least one horizontal pair.
  const unused = stops.filter(stop => stop !== first.from && stop !== first.to);
  const second = rng.pick(routes.filter(route => unused.includes(route.from) && unused.includes(route.to)));
  const findStop = index % 2 === 0;
  const { from, to, bearing: [name, dx, dy] } = findStop ? first : second;
  const code = name.split('-').map(word => word[0].toUpperCase()).join('');
  const move = [dy < 0 ? 'up' : dy > 0 ? 'down' : '', dx < 0 ? 'left' : dx > 0 ? 'right' : '']
    .filter(Boolean).join(' and ');
  const prompt = findStop
    ? `Which stop is ${name} of ${from.label}?`
    : `You are at ${from.label}. In which direction is ${to.label}? Write the compass letters.`;
  const workedSteps = [
    { text: `Start at ${from.label}. The arrow shows north is up, so east is to the right.` },
    { text: findStop ? `For ${name}, look ${move} from ${from.label}.` : `Look from ${from.label} towards ${to.label}. Your eyes move ${move}.` },
    { text: findStop ? `The dot in that direction is labelled ${to.label}.` : `That direction is ${name}. Its compass letters are ${code}.` },
  ];
  const choices = findStop && namedStops
    ? rng.shuffle([to.label, ...rng.shuffle(stops.filter(s => s !== from && s !== to)).slice(0, 3).map(s => s.label)])
    : undefined;
  return {
    key: `${RAG_PATTERN.id}:${seed}:${index}`,
    context: ['Each dot marks a stop on the trail.'],
    prompt, picture, choices, answer: findStop ? to.label : code,
    hint: 'Put your finger on your starting dot. Use the north arrow to work out which way to look.',
    workedSteps, explanation: workedSteps.map(step => step.text).join(' '),
  };
}

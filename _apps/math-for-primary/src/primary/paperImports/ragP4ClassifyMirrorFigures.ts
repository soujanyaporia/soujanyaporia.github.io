import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';
import type { B10Point } from './batch10MiddlePicture';

export const RAG_PATTERN = {
  id: 'rag-p4-classify-mirror-figures',
  level: 4,
  title: 'Sort figures by their lines of symmetry',
  objective: 'Find which folds match a whole figure, then choose a figure or count the figures that qualify.',
  skillIds: ['P4.S.SYM.01'],
  canonicalPatternId: 'p4-classify-figures-by-reflection-axis-count',
};

type Figure = { paths: B10Point[][]; axes: number; reason: string };
type Mode = 'none' | 'one' | 'count';

const letters: Figure[] = [
  { paths: [[[0,0],[4,0],[0,4],[4,4]]], axes: 0,
    reason: 'The two end bars trade places in a half-turn. Folding them onto each other sends the sloping stroke the wrong way.' },
  { paths: [[[0,4],[0,0],[4,0]], [[0,2],[2,2]]], axes: 0,
    reason: 'The two arms have different lengths. Neither arm has a matching arm across the long stem.' },
  { paths: [[[0,0],[4,0]], [[2,0],[2,4]]], axes: 1,
    reason: 'A fold along the stem matches the two ends of the crossbar. A fold across the stem would move the crossbar away.' },
  { paths: [[[4,0],[0,0],[0,4],[4,4]], [[0,2],[2,2]]], axes: 1,
    reason: 'Folding along the short middle arm pairs the two long arms. Folding the other way would move the long stem.' },
  { paths: [[[0,0],[0,4]], [[4,0],[4,4]], [[0,2],[4,2]]], axes: 2,
    reason: 'One fold pairs the two long bars. Another fold runs along the joining bar and matches both halves of each long bar.' },
  { paths: [[[0,1],[4,3]], [[0,3],[4,1]]], axes: 2,
    reason: 'The strokes cross at their middles. Both the horizontal and the vertical folds through the crossing match the ends.' },
];

const box: B10Point[] = [[0,0],[4,0],[4,3],[0,3],[0,0]];
const outlines: Figure[] = [
  { paths: [box, [[0.75,1],[1.5,1]]], axes: 0,
    reason: 'The rectangle has two possible middle folds. Each sends the small mark to a blank spot.' },
  { paths: [[[0,0],[4,0],[0,3],[0,0]]], axes: 0,
    reason: 'All three sides have different lengths. No corner can fold its two sides onto each other.' },
  { paths: [[[0,0],[3,0],[3,1],[1,1],[1,3],[0,3],[0,0]]], axes: 1,
    reason: 'A diagonal fold through the inward corner pairs the two equal arms. It is the only fold that matches them.' },
  { paths: [[[0,3],[2,0],[4,3],[0,3]]], axes: 1,
    reason: 'The two equal sides meet at a tip. Folding from that tip to the middle of the opposite side pairs them.' },
  { paths: [box], axes: 2,
    reason: 'The rectangle folds in half both ways through the middles of opposite sides. A diagonal would pair a long side with a short one.' },
  { paths: [[[0,0],[4,0],[4,4],[0,4],[0,0]]], axes: 4,
    reason: 'The square folds along either diagonal and along either line through the middles of opposite sides.' },
];

function chooseFigures(r: Rng, mode: Mode) {
  const pool = mode === 'one' ? letters : [...letters, ...outlines];
  const none = pool.filter(f => f.axes === 0);
  const one = pool.filter(f => f.axes === 1);
  const many = pool.filter(f => f.axes > 1);
  if (mode === 'count') {
    const count = r.int(1, 4);
    return r.shuffle([...r.shuffle([...one, ...many]).slice(0, count), ...r.shuffle(none).slice(0, 4 - count)]);
  }
  const target = mode === 'one' ? one : none;
  const other = mode === 'one' ? none : one;
  const first = r.pick(other);
  const second = r.pick(many);
  const rest = [...other, ...many].filter(f => f !== first && f !== second);
  return r.shuffle([r.pick(target), first, second, r.pick(rest)]);
}

function segments(figure: Figure, turns: number): [B10Point, B10Point][] {
  function place([x, y]: B10Point): B10Point {
    for (let i = 0; i < turns; i++) [x, y] = [4 - y, x];
    return [x + 0.5, y + 0.5];
  }
  return figure.paths.flatMap(path => path.slice(1).map((point, i): [B10Point, B10Point] => [place(path[i]), place(point)]));
}

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = [RAG_PATTERN.id, seed, index].join(':');
  const r = new Rng(hashString(key));
  const mode = r.pick<Mode>(['none', 'one', 'count']);
  const figures = chooseFigures(r, mode);
  const options = figures.map((f, i) => ({
    label: 'ABCD'[i],
    segments: segments(f, mode === 'one' ? 0 : r.int(0, 3)),
  }));
  const matches = options.filter((_, i) => {
    const axes = figures[i].axes;
    if (mode === 'count') return axes > 0;
    return axes === (mode === 'one' ? 1 : 0);
  });
  const labels = matches.map(o => o.label);
  const answer = mode === 'count' ? String(matches.length) : labels[0];
  const prompts: Record<Mode, string> = {
    none: 'Which figure has no line of symmetry?',
    one: 'Which figure has exactly one line of symmetry?',
    count: 'How many of the four figures have at least one line of symmetry?',
  };
  const workedSteps = figures.map((f, i) => ({
    text: 'Figure ' + options[i].label + ' has ' + f.axes + (f.axes === 1 ? ' line' : ' lines') + ' of symmetry. ' + f.reason,
  }));
  const conclusion = mode === 'count'
    ? 'Count each figure with a matching fold once. The list is ' + labels.join(', ') + ', so the count is ' + answer + '.'
    : 'Only figure ' + answer + (mode === 'one' ? ' has exactly one matching fold.' : ' has no matching fold.');
  workedSteps.push({ text: conclusion });
  return {
    key, prompt: prompts[mode],
    context: ['Look at the dark strokes in each figure. The pale grid is a guide.'],
    picture: { type: 'batch10-middle', layout: 'line-options', options },
    choices: mode === 'count' ? ['1', '2', '3', '4'] : options.map(o => o.label),
    answer, hint: 'Imagine folding the figure so that every dark stroke lands on a dark stroke. Try folds in different directions.',
    workedSteps, explanation: workedSteps.map(s => s.text).join(' '),
  };
}

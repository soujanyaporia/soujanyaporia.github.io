import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';
import type { GridDrawingPicture, GridSegment } from '../gridDrawingModel';

export const RAG_PATTERN = {
  id: 'p1-rag-poles-and-ribbons',
  level: 1,
  title: 'Compare poles and ribbons',
  objective: 'Compare the spaces between the ends of each object to order objects or find one between two others.',
  skillIds: ['P1.S.LENGTH.01'],
  canonicalPatternId: 'p1-length-and-height-ordering',
};

type Task = 'four-poles' | 'three-poles' | 'taller' | 'between' | 'ribbons' | 'chain';
const groups: Task[][] = [['four-poles'], ['three-poles', 'taller'], ['between'], ['ribbons'], ['chain']];

export function makeRagQuestion(seed: number, index = 0): Question {
  const cycle = new Rng(hashString('span-order:' + seed)).shuffle(groups).flat();
  const task = cycle[((index % cycle.length) + cycle.length) % cycle.length];
  // The related questions reuse the whole scene; either can be answered on its own.
  const scene = task === 'taller' ? index - 1 : index;
  const r = new Rng(hashString([RAG_PATTERN.id, seed, scene].join(':')));
  const vertical = task !== 'ribbons' && task !== 'chain';
  const count = task === 'four-poles' || task === 'between' ? 4 : 3;
  const tags = r.shuffle(['J', 'K', 'L', 'M', 'P', 'R']).slice(0, count);
  const sizes = r.shuffle([...r.shuffle([2, 3, 4, 5, 6]).slice(0, count - 1), r.int(7, 8)]);
  const objects = tags.map((tag, i) => ({tag, size: sizes[i]}));
  const small = [...objects].sort((a, b) => a.size - b.size);
  const longest = small[count - 1].size;
  const floor = longest + (task === 'four-poles' ? 1 : 0);
  const segments: GridSegment[] = [];
  const stands: GridSegment[] = [];
  const columns = vertical ? 3 * count - 1 : 11;
  const rows = vertical ? floor : count + 1;
  const left = r.int(0, 1);
  if (vertical) stands.push([[0, floor], [columns, floor]]);
  objects.forEach(({size}, i) => {
    if (vertical) {
      const x = 3 * i + 1;
      segments.push([[x, 0], [x, size]]);
      if (size < floor) stands.push(
        [[x - 1, floor], [x - 1, size]],
        [[x - 1, size], [x + 1, size]],
        [[x + 1, size], [x + 1, floor]],
      );
    } else {
      // A short ribbon ends beyond the longest one. Comparing tips alone fails.
      const x = size === longest ? left : size === small[0].size
        ? left + longest + 1 - size : r.int(0, columns - size);
      segments.push([[x, i + 1], [x + size, i + 1]]);
    }
  });
  const legend = (vertical ? 'From left to right: ' : 'From top to bottom: ') + tags.join(', ') + '.';
  const picture: GridDrawingPicture = {
    type: 'grid-drawing', columns, rows, segments, caption: legend,
    ...(vertical ? {givenSegments: stands} : {}),
  };
  const context = [
    vertical ? 'The blue poles have their tops in a line. The boxes underneath are stands.'
      : 'Each blue line shows a ribbon.',
    legend, 'Each gap between dots along a line stands for 1 unit.',
  ];
  const steps: NonNullable<Question['workedSteps']> = [{
    text: vertical ? 'Count from the top to the foot of each pole. Leave out its stand.'
      : 'Count from one end of each ribbon to the other. Leave out any spaces before it.',
    equation: objects.map(o => o.tag + ': ' + o.size + ' units').join('; '),
  }];
  let prompt: string, answer: string;
  let control: Pick<Question, 'order' | 'choices'>;
  if (task === 'taller' || task === 'between') {
    const lower = task === 'taller' ? 1 : r.int(0, count - 3);
    const lo = small[lower], hit = small[lower + 1];
    const hi = task === 'between' ? small[lower + 2] : undefined;
    prompt = 'Which pole is taller than ' + lo.tag + (hi ? ' but shorter than ' + hi.tag : '') + '?';
    answer = hit.tag;
    control = {choices: r.shuffle(tags)};
    steps.push(hi
      ? {text: hit.tag + ' fits both clues.', equation: [lo.size, hit.size, hi.size].join(' < ') + ' (units)'}
      : {text: 'Only ' + hit.tag + ' is taller than ' + lo.tag + '.', equation: hit.size + ' > ' + lo.size + ' (units)'});
  } else {
    const chain = task === 'chain';
    const sequence = task === 'ribbons' ? [...small].reverse() : small;
    const needed = chain ? sequence.slice(1) : sequence;
    prompt = chain ? 'Start with ribbon ' + small[0].tag + '. Put the other two after it, going from shorter to longer.'
      : vertical ? 'Put the pole letters in order, with the shortest pole first.'
      : 'Put the ribbon letters in order, with the longest ribbon first.';
    answer = needed.map(o => o.tag).join(',');
    control = {order: r.shuffle(needed.map(o => o.tag))};
    steps.push({
      text: chain ? 'After ' + small[0].tag + ', put ' + needed[0].tag + ' next and ' + needed[1].tag + ' last.'
        : 'The letters in order are ' + needed.map(o => o.tag).join(', ') + '.',
      equation: sequence.map(o => o.size).join(task === 'ribbons' ? ' > ' : ' < ') + ' (units)',
    });
  }
  return {
    key: [RAG_PATTERN.id, seed, index].join(':'), context, prompt, picture, answer, ...control,
    hint: vertical ? 'Look at the two ends of each pole. Where does the pole meet its stand or the ground?'
      : 'Begin at each ribbon’s own starting dot. Count the gaps it covers.',
    workedSteps: steps, explanation: steps.map(s => s.text + ' ' + s.equation).join(' '),
  };
}

import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';
import type { Batch11UpperPicture } from './batch11UpperPicture';

export const RAG_PATTERN = {
  id: 'rag-p4-landmark-turns',
  level: 4,
  title: 'Which place is Tess facing?',
  objective: 'Follow turns on an eight-path map, or undo them to find the starting place.',
  skillIds: ['P4.S.ANGLE.02'],
  canonicalPatternId: 'p4-landmark-heading-before-or-after-directed-turns',
};

const places = ['Pond', 'Gate', 'Pier', 'Mill', 'Hut', 'Well', 'Tower', 'Bridge'];

// Each row gives a path endpoint and the position of its printed name.
const mapPositions = [
  [160, 30, 160, 20], [210, 50, 218, 47], [230, 100, 240, 106], [210, 150, 218, 164],
  [160, 170, 160, 192], [110, 150, 48, 164], [90, 100, 20, 106], [110, 50, 48, 47],
];

function parkMap(names: string[]): Batch11UpperPicture {
  const map: Batch11UpperPicture = {
    type: 'batch11-upper',
    label: `Eight paths meet in the centre. From the top, going clockwise, they lead to ${names.join(', ')}.`,
    marks: [],
  };
  mapPositions.forEach(([tipX, tipY, labelX, labelY], i) => {
    const name = names[i];
    map.marks.push({ kind: 'line', x1: 160, y1: 100, x2: tipX, y2: tipY });
    const x = tipX === 160 ? labelX - name.length * 4.5 : labelX;
    map.marks.push({ kind: 'text', x, y: labelY, text: name });
  });
  map.marks.push({ kind: 'circle', cx: 160, cy: 100, r: 3, fill: '#235b4c' });
  return map;
}

type Turn = { gaps: number; denominator?: number };
const sense = (gaps: number) => gaps > 0 ? 'clockwise' : 'anticlockwise';

function describe(turn: Turn): string {
  const amount = turn.denominator ? `1/${turn.denominator} of a turn` : `${Math.abs(turn.gaps) * 45}°`;
  return `${amount} ${sense(turn.gaps)}`;
}

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const rng = new Rng(hashString(key));
  const form = rng.weighted([['undo-one', 12], ['follow-two', 6], ['undo-two', 2]] as const);
  const backwards = form !== 'follow-two';
  const names = rng.shuffle(places);
  const known = rng.int(0, 7);
  const sign = rng.pick([1, -1]);
  const firstSize = rng.pick([1, 2, 6, 7]);
  const turns: Turn[] = [{ gaps: sign * firstSize }];
  if (form !== 'undo-one') {
    // Keep both turns meaningful and the finish different from the start.
    const secondSize = rng.pick([2, 4].filter(n => n !== firstSize));
    turns.push({ gaps: -sign * secondSize, denominator: 8 / secondSize });
  }

  const context = ['Tess stands where eight paths meet. The angle between neighbouring paths is 45°.'];
  if (!backwards) context.push(`At first, Tess faces the ${names[known]}.`);
  turns.forEach((turn, i) => context.push(`${i === 0 ? 'She turns' : 'Then she turns'} ${describe(turn)}.`));
  if (backwards) context.push(`At the end, Tess faces the ${names[known]}.`);

  const workedSteps = [{ text: 'Each gap between two neighbouring paths is one eighth of a full turn.', equation: '360° ÷ 8 = 45°' }];
  let at = known;
  const ordered = backwards ? turns.slice().reverse() : turns;
  for (const turn of ordered) {
    const count = Math.abs(turn.gaps);
    const degrees = count * 45;
    if (turn.denominator) {
      workedSteps.push({ text: `Find the size of 1/${turn.denominator} of a full turn.`, equation: `360° ÷ ${turn.denominator} = ${degrees}°` });
    }
    const move = backwards ? -turn.gaps : turn.gaps;
    const next = (at + move + 8) % 8;
    const action = backwards ? 'To undo' : 'To follow';
    workedSteps.push({
      text: `${action} a ${degrees}° ${sense(turn.gaps)} turn, start at the ${names[at]} and count ${count} ${count === 1 ? 'gap' : 'gaps'} ${sense(move)} to the ${names[next]}.`,
      equation: `${degrees}° ÷ 45° = ${count}`,
    });
    at = next;
  }

  const answer = names[at];
  const useChoices = form === 'undo-one' || rng.chance(0.5);
  const wrong = [...new Set([known, (at + 1) % 8, (at + 7) % 8, (at + 4) % 8])].filter(i => i !== at);
  return {
    key, context, answer, picture: parkMap(names),
    prompt: backwards ? 'Which place did Tess face at first?' : 'Which place does Tess face at the end?',
    ...(useChoices ? { choices: rng.shuffle([answer, ...wrong.slice(0, 3).map(i => names[i])]) } : {}),
    hint: backwards
      ? 'Start at the place Tess faces at the end. Undo her last turn by counting gaps the other way.'
      : 'Follow the first turn with your finger. Start the next turn from the path you have reached.',
    workedSteps,
    explanation: workedSteps.map(step => `${step.text} ${step.equation}.`).join(' '),
  };
}

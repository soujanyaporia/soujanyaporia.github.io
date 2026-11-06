import {Rng, hashString} from '../../engine/random';
import type {Question} from '../generate';

export const RAG_PATTERN = {
  id: 'rag-forward-reverse-rotations',
  level: 6,
  title: 'Find a place before or after a turn',
  objective: 'Follow or reverse a turn between equally spaced directions, including an alternative turn from the same starting direction.',
  skillIds: ['P5.S.ANGLE.02', 'P5.S.ANGLE.04'],
  canonicalPatternId: 'forward-and-reverse-rotations',
};

type Diagram = Extract<NonNullable<Question['picture']>, {type: 'batch11-upper'}>;
type Sign = 1 | -1;
type Step = NonNullable<Question['workedSteps']>[number];
const PLACES = ['Bakery', 'Clinic', 'Farm', 'Fort', 'Jetty', 'Pond', 'Tower', 'Zoo'];
const TURN_STEPS = [2, 3, 6, 7];
const wrap = (position: number) => ((position % 8) + 8) % 8;
const direction = (sign: Sign) => sign === 1 ? 'clockwise' : 'anti-clockwise';

function trail(names: string[], start: number, count: number, sign: Sign): string {
  return Array.from({length: count + 1}, (_, i) => names[wrap(start + sign * i)]).join(' → ');
}

function diagram(names: string[]): Diagram {
  const marks: Diagram['marks'] = [];
  for (let i = 0; i < 8; i++) {
    const angle = i * Math.PI / 4;
    marks.push({
      kind: 'line', x1: 160, y1: 100,
      x2: 160 + 65 * Math.sin(angle),
      y2: 100 - 65 * Math.cos(angle),
    });
    marks.push({
      kind: 'text',
      x: 160 + 90 * Math.sin(angle) - names[i].length * 3,
      y: 104 - 86 * Math.cos(angle),
      text: names[i],
    });
  }
  marks.push({kind: 'text', x: 164, y: 112, text: 'O'});
  return {
    type: 'batch11-upper',
    label: `Eight equally spaced lines meet at O. Clockwise from the top, the places are ${names.join(', ')}.`,
    marks,
  };
}

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const r = new Rng(hashString(key));
  const mode = r.int(0, 2);
  const names = r.shuffle([...PLACES]);
  const start = r.int(0, 7);
  const count = r.pick(TURN_STEPS);
  const angle = count * 45;
  const sign: Sign = r.int(0, 1) === 0 ? 1 : -1;
  const reverse: Sign = sign === 1 ? -1 : 1;
  const finish = wrap(start + sign * count);
  const context = [
    'The eight lines from O are equally spaced around a full turn. Each line points to one place.',
    'Noor stands at O.',
  ];
  const steps: Step[] = [{
    text: 'Find the angle between neighbouring lines.',
    equation: '360° ÷ 8 = 45°',
  }];
  let prompt: string;
  let hint: string;
  let answerPosition: number;
  let temptingPositions: number[];

  if (mode === 0) {
    context.push(`Noor starts by facing the ${names[start]}. She turns ${angle}° ${direction(sign)}.`);
    prompt = 'Which place is Noor facing after the turn?';
    hint = 'Find the angle of one gap. Count the gaps in the stated direction, starting at the given place.';
    answerPosition = finish;
    temptingPositions = [wrap(start - sign * count), start, wrap(finish + 1), wrap(finish - 1)];
    steps.push(
      {text: 'Find how many gaps the turn covers.', equation: `${angle}° ÷ 45° = ${count}`},
      {text: `Move ${count} gaps ${direction(sign)}: ${trail(names, start, count, sign)}.`},
      {text: `Noor is now facing the ${names[answerPosition]}.`},
    );
  } else if (mode === 1) {
    context.push(`Noor turns ${angle}° ${direction(sign)} and finishes facing the ${names[finish]}.`);
    prompt = 'Which place was Noor facing before the turn? Write the place name.';
    hint = 'Start at the finishing place. Undo the turn by moving through the same angle in the opposite direction.';
    answerPosition = start;
    temptingPositions = [];
    steps.push(
      {text: 'Find how many gaps to undo.', equation: `${angle}° ÷ 45° = ${count}`},
      {text: `Undo the ${direction(sign)} turn by moving ${count} gaps ${direction(reverse)} from ${names[finish]}: ${trail(names, finish, count, reverse)}.`},
      {text: `Noor was facing the ${names[answerPosition]} before the turn.`},
    );
  } else {
    const alternativeCount = r.pick(TURN_STEPS.filter(n => n !== count && (n + count) % 8 !== 0));
    const alternativeAngle = alternativeCount * 45;
    answerPosition = wrap(start + reverse * alternativeCount);
    context.push(
      `Starting from her original direction, a ${angle}° ${direction(sign)} turn would leave Noor facing the ${names[finish]}.`,
      `Instead, she makes a ${alternativeAngle}° ${direction(reverse)} turn from that same original direction.`,
    );
    prompt = 'Which place would Noor face after this different turn?';
    hint = 'Undo the first described turn to find the original facing. Apply the alternative turn from there.';
    temptingPositions = [
      wrap(finish + reverse * alternativeCount),
      start,
      finish,
      wrap(start + sign * alternativeCount),
    ];
    steps.push(
      {text: 'Find the number of gaps in the first described turn.', equation: `${angle}° ÷ 45° = ${count}`},
      {text: `Reverse that turn from ${names[finish]}. Move ${count} gaps ${direction(reverse)}: ${trail(names, finish, count, reverse)}. The original facing was ${names[start]}.`},
      {text: 'Find the number of gaps in the alternative turn.', equation: `${alternativeAngle}° ÷ 45° = ${alternativeCount}`},
      {text: `Start again at ${names[start]}, not at the first finishing place. Move ${alternativeCount} gaps ${direction(reverse)}: ${trail(names, start, alternativeCount, reverse)}.`},
      {text: `Noor would face the ${names[answerPosition]}.`},
    );
  }

  const answer = names[answerPosition];
  const wrongPositions = [...new Set([
    ...temptingPositions,
    ...Array.from({length: 8}, (_, i) => i),
  ])].filter(position => position !== answerPosition).slice(0, 3);
  return {
    key,
    prompt,
    context,
    picture: diagram(names),
    answer,
    ...(mode === 1 ? {} : {choices: r.shuffle([answer, ...wrongPositions.map(position => names[position])])}),
    hint,
    workedSteps: steps,
    explanation: steps.map(step => [step.text, step.equation].filter(Boolean).join(' ')).join(' '),
  };
}

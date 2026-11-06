import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';
import { elapsedClocks } from './ragElapsedTimeClocks';

export const RAG_PATTERN = {
  id: 'p3-rag-read-clock-interval',
  level: 3 as const,
  title: 'How many minutes passed?',
  objective: 'Read a time from clock hands or words, then count forward in minutes to the finish.',
  skillIds: ['P3.S.TIME.02', 'P2.S.TIME.01'],
  canonicalPatternId: 'p3-read-clock-times-to-find-an-interval',
};

const hourNames = ['twelve', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven'];
const reading = (time: number) => `${Math.floor(time / 60) % 12 || 12}:${String(time % 60).padStart(2, '0')}`;

function readFace(label: string, time: number) {
  const hour = Math.floor(time / 60);
  const minute = time % 60;
  return {
    text: `On the ${label} clock, the short hand is between ${hour} and ${hour + 1}. The long hand points to ${minute / 5}.`,
    equation: `${minute / 5} × 5 = ${minute} minutes, so the clock shows ${reading(time)}.`,
  };
}

function minuteChoices(rng: Rng, total: number, toHour: number, afterHour: number) {
  const errors = [afterHour, toHour, Math.abs(toHour - afterHour), total - 5, total + 5, total + 60];
  const wrong = [...new Set(errors)].filter(value => value > 0 && value !== total);
  return rng.shuffle([total, ...wrong.slice(0, 3)]).map(String);
}

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const rng = new Rng(hashString(key));
  const forms = ['words', 'finish-clock', 'two-clocks'] as const;
  const form = forms[(hashString(String(seed)) + (index >>> 0)) % forms.length];
  const startHour = form === 'finish-clock' ? rng.int(7, 9) : rng.int(3, 5);
  const startMinute = form === 'words' ? rng.pick([15, 20, 25, 40, 45, 50]) : rng.pick([35, 40, 45, 50, 55]);
  const finishMinute = rng.pick([5, 10, 15, 20].filter(minute => minute < startMinute));
  const start = 60 * startHour + startMinute;
  const nextHour = 60 * (startHour + 1);
  const finishHour = form === 'two-clocks' ? nextHour + 60 : nextHour;
  const finish = finishHour + finishMinute;
  const steps: NonNullable<Question['workedSteps']> = [];
  let prompt: string;
  let context: string[];
  let picture: Question['picture'];

  if (form === 'words') {
    const before = startMinute > 30;
    const offset = before ? 60 - startMinute : startMinute;
    const namedHour = before ? startHour + 1 : startHour;
    const phrase = `${offset} minutes ${before ? 'to' : 'past'} ${hourNames[namedHour]}`;
    context = [`It is ${phrase} in the afternoon. Story time at the library begins at ${reading(finish)} p.m.`];
    prompt = 'How many minutes are left until story time?';
    steps.push({
      text: before ? `Count back ${offset} minutes from ${reading(nextHour)}.` : `Count forward ${offset} minutes from ${reading(startHour * 60)}.`,
      equation: `${phrase} is ${reading(start)} p.m.`,
    });
  } else if (form === 'finish-clock') {
    context = [`Jia boarded a bus at ${reading(start)} a.m. The clock shows when she got off later that morning.`];
    prompt = 'How many minutes did Jia spend on the bus?';
    picture = { type: 'clock', minutes: finish };
    steps.push(readFace('finish', finish));
  } else {
    context = ['A group painted a mural one afternoon. The clocks show when the group began and when it finished.'];
    prompt = 'How many minutes did the group spend painting?';
    picture = elapsedClocks(start, finish);
    steps.push(readFace('start', start), readFace('finish', finish));
  }

  const toHour = 60 - startMinute;
  const pieces = [toHour];
  steps.push({ text: `Count from ${reading(start)} to ${reading(nextHour)}.`, equation: `60 − ${startMinute} = ${toHour} minutes` });
  if (finishHour > nextHour) {
    pieces.push(60);
    steps.push({ text: `From ${reading(nextHour)} to ${reading(finishHour)} is one whole hour.`, equation: '1 hour = 60 minutes' });
  }
  pieces.push(finishMinute);
  const total = pieces.reduce((sum, part) => sum + part, 0);
  steps.push(
    { text: `From ${reading(finishHour)} to ${reading(finish)}, count ${finishMinute} more minutes.` },
    { text: 'Add the minutes for each part.', equation: `${pieces.join(' + ')} = ${total} minutes` },
  );
  return {
    key, prompt, context, ...(picture ? { picture } : {}),
    ...(form === 'two-clocks' ? {} : { choices: minuteChoices(rng, total, toHour, finishMinute) }),
    answer: String(total), unit: 'minutes',
    hint: 'Find the start and finish times. Count to the next whole hour first, then keep going until the finish.',
    workedSteps: steps,
    explanation: `From ${reading(start)} to ${reading(finish)}, the minutes add up to ${pieces.join(' + ')} = ${total}.`,
  };
}

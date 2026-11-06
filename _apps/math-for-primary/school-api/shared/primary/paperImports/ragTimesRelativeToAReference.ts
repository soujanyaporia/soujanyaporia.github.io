import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';
import { fourClocks, type ClockEntry } from './ragLabelledClockFaces';

export const RAG_PATTERN = {
  id: 'rag-p1-times-relative-to-a-reference',
  level: 1,
  title: 'Compare the clocks',
  objective: 'Read labelled clocks and find the names or shows that meet a given time condition.',
  skillIds: ['P1.S.TIME.01'],
  canonicalPatternId: 'p1-select-times-relative-to-a-reference',
};

function timeText(minutes: number) {
  const hour = Math.floor(minutes / 60) % 12 || 12;
  return `${hour}:${String(minutes % 60).padStart(2, '0')} ${minutes < 720 ? 'am' : 'pm'}`;
}

function readings(entries: ClockEntry[]) {
  return entries.map(({ name, minutes }) => `${name} ${timeText(minutes)}`).join(', ');
}

function showQuestion(key: string, rng: Rng): Question {
  const arrival = rng.pick([840, 870, 900, 930]);
  // Make two distinct starts before arrival and two on or after it.
  const afternoon = Array.from({ length: 10 }, (_, i) => 780 + 30 * i);
  const [early, missed] = rng.shuffle(afternoon.filter(t => t < arrival));
  const future = rng.shuffle(afternoon.filter(t => t > arrival));
  const [first, second] = rng.shuffle([rng.chance(0.5) ? arrival : future[1], future[0]]);
  const [repeat, single, tooEarly] = rng.shuffle(['Dance', 'Magic', 'Mime', 'Drums', 'Songs']);
  const entries = rng.shuffle([
    { name: repeat, minutes: early }, { name: repeat, minutes: first },
    { name: single, minutes: second }, { name: tooEarly, minutes: missed },
  ]);
  const available = [...new Set(entries.filter(e => e.minutes >= arrival).map(e => e.name))];
  const workedSteps = [
    { text: 'Read each start time. One show has two clocks.', equation: readings(entries) },
    { text: `The ${timeText(early)} start for ${repeat} is too early. Its ${timeText(first)} start is in time for Jia.` },
    { text: `${single} starts at ${timeText(second)}, so Jia can also choose it. She misses ${tooEarly}, which starts at ${timeText(missed)}.` },
  ];
  return {
    key,
    context: ['The clocks show when the shows start at a fair this afternoon.', `Jia arrives at ${timeText(arrival)}.`],
    prompt: 'Which two shows have a start at or after Jia’s arrival?',
    picture: fourClocks(entries),
    structuredResponse: { kind: 'named-pair', options: rng.shuffle([repeat, single, tooEarly]) },
    answer: JSON.stringify(available),
    hint: 'Check every clock, even if you see the same show name twice. A show starting just as Jia arrives counts.',
    workedSteps,
    explanation: workedSteps.map(s => [s.text, s.equation].filter(Boolean).join(' ')).join(' '),
  };
}

function childQuestion(key: string, rng: Rng, before: boolean): Question {
  const names = rng.shuffle(['Asha', 'Kai', 'Mei', 'Ravi', 'Nila', 'Irfan']).slice(0, 4);
  const morning = Array.from({ length: 10 }, (_, i) => 420 + i * 30);
  const hour = 60 * rng.int(7, 11);
  const others = rng.shuffle(morning.filter(t => t !== hour && t !== hour + 30)).slice(0, 2);
  const times = rng.shuffle([hour, hour + 30, ...others]);
  const entries = names.map((name, i) => ({ name, minutes: times[i] }));
  const ordered = [...entries].sort((a, b) => a.minutes - b.minutes);
  const reference = ordered[before ? 1 : 2];
  const match = ordered[before ? 0 : 3];
  const relation = before ? 'before' : 'after';
  const workedSteps = [
    { text: 'Read the short hand for the hour. The long hand at 6 means half past.', equation: readings(entries) },
    { text: 'Put the children in order from first to last.', equation: ordered.map(e => e.name).join(' → ') },
    { text: `${reference.name} arrived at ${timeText(reference.minutes)}. Only ${match.name}, at ${timeText(match.minutes)}, arrived ${relation} ${reference.name}.` },
  ];
  return {
    key, context: ['Each clock shows when a child reached the park this morning.'],
    prompt: `Who reached the park ${relation} ${reference.name}?`,
    picture: fourClocks(entries), answer: match.name,
    hint: `Find ${reference.name}’s clock first. Look for a time ${relation} that one.`,
    workedSteps,
    explanation: workedSteps.map(s => [s.text, s.equation].filter(Boolean).join(' ')).join(' '),
  };
}

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const turn = Math.trunc(index);
  const offset = hashString(String(seed)) % 3;
  const mode = ((turn + offset) % 3 + 3) % 3;
  // Both person questions in a set use the same four visible clocks.
  const setKey = `${RAG_PATTERN.id}:${seed}:${Math.floor(turn / 3)}`;
  const rng = new Rng(hashString(setKey));
  return mode === 0 ? showQuestion(key, rng) : childQuestion(key, rng, mode === 1);
}

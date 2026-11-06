import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';

export const RAG_PATTERN = {
  id: 'p1-rag-clock-event-order',
  level: 1,
  title: 'Which happened first?',
  objective: 'Read labelled clocks and use the part of the day to find the first event or put all the events in order.',
  skillIds: ['P1.S.TIME.01'],
  canonicalPatternId: 'order-events-or-find-the-earliest',
};

type Event = { label: string; slot: number };
type Setting = 'arrivals' | 'day' | 'night';

// Slots are half-hours from the start of the day. Slot 48 is midnight at the end of the night.
const wholeHour = Array.from('🕛🕐🕑🕒🕓🕔🕕🕖🕗🕘🕙🕚');
const halfPast = Array.from('🕧🕜🕝🕞🕟🕠🕡🕢🕣🕤🕥🕦');

function clockFace(slot: number) {
  const hour = Math.floor(slot / 2) % 12;
  return (slot % 2 === 0 ? wholeHour : halfPast)[hour];
}

function reading(slot: number) {
  if (slot === 48) return 'midnight';
  const hour = Math.floor(slot / 2) % 12 || 12;
  return `${hour}:${slot % 2 === 0 ? '00' : '30'} ${slot < 24 ? 'am' : 'pm'}`;
}

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const rng = new Rng(hashString(key));
  const offset = hashString(`${RAG_PATTERN.id}:${seed}`) % 7;
  const turn = ((offset + Math.trunc(index)) % 7 + 7) % 7;
  const setting: Setting = turn < 5 ? 'arrivals' : turn === 5 ? 'day' : 'night';

  let context: string[];
  let labels: string[];
  let slots: number[];
  let comparison: string;
  if (setting === 'arrivals') {
    context = ['Four friends came to the park on the same morning. Each clock shows when one friend arrived.'];
    labels = rng.shuffle(['Asha', 'Ben', 'Kai', 'Mei', 'Ravi', 'Zara']).slice(0, 4);
    const start = 2 * rng.int(7, 8);
    const later = rng.shuffle(Array.from({ length: 22 - start }, (_, i) => start + 2 + i)).slice(0, 2);
    slots = [start, start + 1, ...later];
    comparison = `Two clocks show the earliest hour. ${reading(start)} comes before ${reading(start + 1)}.`;
  } else if (setting === 'day') {
    context = ['Nina tried three things at a fair on Saturday. The clocks show when she started each one.'];
    labels = ['A', 'B', 'C'];
    const afternoon = 2 * rng.int(13, 16);
    slots = [rng.int(16, 21), afternoon, afternoon + 1];
    comparison = `The morning activity came first. In the afternoon, ${reading(afternoon)} came before ${reading(afternoon + 1)}.`;
  } else {
    context = ['The clocks show when four games began at camp that night, from evening until midnight.'];
    labels = ['A', 'B', 'C', 'D'];
    const start = 2 * rng.int(19, 21);
    slots = [start, start + 1, rng.int(start + 2, 47), 48];
    comparison = `${reading(start)} comes before ${reading(start + 1)}. The clock with both hands at 12 shows midnight, after all the evening games began.`;
  }

  const shuffled = rng.shuffle(slots);
  const events: Event[] = labels.map((label, i) => ({ label, slot: shuffled[i] }));
  if (setting === 'day') {
    const activities = rng.shuffle(['painted a pot', 'made a mask', 'folded a paper bird']);
    events.forEach(({ label, slot }, i) => {
      context.push(`${label}: Nina ${activities[i]} in the ${slot < 24 ? 'morning' : 'afternoon'}.`);
    });
  } else if (setting === 'night') {
    const games = rng.shuffle(['Word Hunt', 'Shadow Tag', 'Ring Toss', 'Star Bingo']);
    events.forEach(({ label }, i) => context.push(`${label}: ${games[i]}`));
  }

  const chronological = [...events].sort((a, b) => a.slot - b.slot);
  const orderedLabels = chronological.map(event => event.label);
  const first = chronological[0];
  const earliestOnly = setting === 'arrivals';
  const workedSteps = [
    { text: 'Read the short hand for the hour. The long hand at 12 means o’clock. At 6 it means half past.',
      equation: events.map(event => `${event.label} — ${reading(event.slot)}`).join(', ') },
    { text: comparison },
    earliestOnly
      ? { text: `${first.label} arrived first, at ${reading(first.slot)}.` }
      : { text: 'Follow the clocks from first to last.', equation: orderedLabels.join(' → ') },
  ];
  return {
    key,
    context,
    prompt: earliestOnly ? 'Who got to the park first?' : 'Put the letters in order. Start with what happened first.',
    picture: { type: 'pattern', items: events.map(event => `${event.label} ${clockFace(event.slot)}`) },
    answer: earliestOnly ? first.label : orderedLabels.join(','),
    ...(earliestOnly ? { choices: rng.shuffle(labels) } : { order: labels }),
    hint: 'Look at the part of the day and the hour. If two clocks show the same hour, check the long hands.',
    workedSteps,
    explanation: workedSteps.map(step => [step.text, step.equation].filter(Boolean).join(' ')).join(' '),
  };
}

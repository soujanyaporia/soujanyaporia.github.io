import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';

export const RAG_PATTERN = {
  id: 'rag-p4-greatest-rise-or-drop',
  level: 4,
  title: 'Find the biggest change between neighbouring readings',
  objective: 'Compare changes over equal time intervals and give the requested interval or amount.',
  skillIds: ['P4.S.GRAPH.02'],
  canonicalPatternId: 'p4-line-graph-greatest-consecutive-rise-or-drop',
};

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const r = new Rng(hashString(key));
  const form = ((Math.trunc(seed) + Math.trunc(index)) % 4 + 4) % 4;
  const monthly = form === 0, hourly = form === 1, rise = form === 2;
  const word = rise ? 'rise' : 'fall';
  const labels = monthly ? ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep']
    : hourly ? ['1 pm', '2 pm', '3 pm', '4 pm', '5 pm', '6 pm']
    : Array.from({ length: 6 }, (_, i) => `Day ${i + 1}`);
  const unit = monthly ? 'bicycles' : hourly ? '°C' : 'L';
  const scale = hourly ? 1 : r.pick(monthly ? [5, 10, 20] : [2, 5, 10]);

  // Work in grid steps. Only one target-direction change can exceed two steps.
  const big = r.int(3, 5);
  const changes = hourly ? r.shuffle([-big, -r.int(1, 2), -2, -1, -1])
    : r.shuffle([big, r.int(1, 2), -(big + r.pick([-1, 1, 2])), -r.int(1, 2), r.pick([-1, 1])])
        .map(n => rise ? n : -n);
  const ticks = [0];
  for (const change of changes) ticks.push(ticks[ticks.length - 1] + change);
  const offset = hourly ? r.int(29, 34) : r.int(1, 4) - Math.min(...ticks);
  const values = ticks.map(n => (n + offset) * scale);
  const picture: Question['picture'] = { type: 'bars', line: true, labels, values, scale };
  const context = [monthly ? 'The line graph shows how many bicycles a shop sold each month.'
    : hourly ? 'A class measured the temperature of a jug of water every hour. The readings are in °C.'
    : 'The line graph shows how many litres of rainwater a school collected each day.'];
  const prompt = monthly ? 'Between which two months in a row did bicycle sales fall the most?'
    : hourly ? 'During which one-hour interval did the water temperature fall the most?'
    : `What was the biggest ${word} in the amount collected from one day to the next? Give your answer in litres.`;

  const deltas = values.slice(1).map((end, i) => end - values[i]);
  const scores = deltas.map(d => rise ? d : -d);
  const amount = Math.max(...scores), winner = scores.indexOf(amount);
  const endpoints = [labels[winner], labels[winner + 1]];
  const interval = (i: number) => `${labels[i]} to ${labels[i + 1]}`;
  const workedSteps: NonNullable<Question['workedSteps']> = deltas.map((d, i) => {
    const start = values[i], end = values[i + 1];
    return { text: `${interval(i)}: a ${d > 0 ? 'rise' : 'fall'}.`,
      equation: `${Math.max(start, end)} − ${Math.min(start, end)} = ${Math.abs(d)} ${unit}` };
  });
  const conclusion = `The biggest ${word} is ${amount} ${unit}, from ${endpoints[0]} to ${endpoints[1]}.`;
  workedSteps.push({ text: conclusion });
  const base = { key, prompt, context, picture, workedSteps, explanation: conclusion,
    hint: `Look at each pair of neighbouring points. Where the line goes ${rise ? 'up' : 'down'}, subtract the smaller reading from the larger one. Compare those amounts.` };
  if (monthly) return { ...base, answer: JSON.stringify(endpoints), structuredResponse: { kind: 'interval', labels } };
  if (hourly) {
    const others = r.shuffle(deltas.map((_, i) => i).filter(i => i !== winner)).slice(0, 3);
    return { ...base, answer: interval(winner), choices: [winner, ...others].sort((a, b) => a - b).map(interval) };
  }
  const high = Math.max(...values), low = Math.min(...values);
  const pool = [...new Set([...deltas.map(Math.abs), high - low, high, scale, amount - scale, amount + scale])];
  const wrong = r.shuffle(pool.filter(n => n > 0 && n !== amount)).slice(0, 3);
  return { ...base, answer: String(amount), choices: r.shuffle([amount, ...wrong]).map(String), unit: 'L',
    proof: { op: '-', a: Math.max(values[winner], values[winner + 1]), b: Math.min(values[winner], values[winner + 1]) } };
}

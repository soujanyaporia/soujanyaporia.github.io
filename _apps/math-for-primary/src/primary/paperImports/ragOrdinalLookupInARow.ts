import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';

export const RAG_PATTERN = {
  id: 'p1-rag-ordinal-lookup-in-a-row',
  level: 1,
  title: 'Count from one end',
  objective: 'Count from the starting end to find a card or its place.',
  skillIds: ['P1.S.WN.06'],
  canonicalPatternId: 'ordinal-lookup-in-a-row',
};

const words = ['first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh'];
const place = (n: number) => n + (['st', 'nd', 'rd'][n - 1] ?? 'th');
const cards = ['sun', 'hat', 'key', 'cup', 'fan', 'bus', 'pen', 'map', 'bag', 'log'];

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const r = new Rng(hashString(key));
  const mode = r.weighted([['find', 14], ['place', 7], ['pair', 2], ['twin', 1]] as const);
  const stack = mode === 'find' && r.chance(0.5);
  const backwards = r.chance(0.5);
  const end = stack ? (backwards ? 'bottom' : 'top') : (backwards ? 'right' : 'left');
  const n = r.int(4, stack ? 6 : 7);
  const labels = r.shuffle(cards).slice(0, n);
  // Positions start at one; physical slots run from left to right or top to bottom.
  const slot = (k: number) => backwards ? n - k : k - 1;
  let k = r.int(1, n);
  let anchor = 0;
  let other = 0;
  if (mode === 'place' && r.chance(0.5)) {
    anchor = 1;
    k = r.int(2, n);
  } else if (mode === 'pair') {
    other = r.pick(Array.from({length: n}, (_, i) => i + 1).filter(i => i !== k));
  } else if (mode === 'twin') {
    // A central mark would fit either direction. Both stars must depend on the end.
    const offCentre = Array.from({length: n}, (_, i) => i + 1).filter(i => 2 * i !== n + 1);
    anchor = r.pick(offCentre);
    k = r.pick(offCentre.filter(i => i !== anchor));
    labels.splice(0, n, ...r.shuffle(['●', '▲', '■', '◆', '♥', '☾', '☀']).slice(0, n));
    labels[slot(anchor)] = labels[slot(k)] = '★';
  }

  const tiles = labels.map((label, i) => ({
    size: 1, tone: 'blue' as const,
    label: anchor && i === slot(anchor) ? `${label}\n${place(anchor)}` : label,
  }));
  const picture: Question['picture'] = {
    type: 'paper', layout: 'bars', heading: stack ? 'Cards on shelves' : 'A row of cards',
    rows: stack ? tiles.map(tile => ({label: '', parts: [tile]})) : [{label: '', parts: tiles}],
  };
  const target = labels[slot(k)];
  const at = (p: number) => labels[slot(p)];
  const endClue = `Start at the ${end}.`;
  const context = [anchor === 0 ? endClue : mode === 'twin'
    ? 'Use the mark on one star to work out which end to start from.'
    : 'The card marked 1st shows where to start.'];
  const positionForm = 'Write the place as 1st, 2nd, 3rd and so on.';
  const steps: NonNullable<Question['workedSteps']> = [];
  if (mode === 'twin') {
    const fromLeft = slot(anchor) + 1;
    steps.push({text: `The marked star is ${place(fromLeft)} from the left and ${place(n + 1 - fromLeft)} from the right. Its mark says ${place(anchor)}, so count from the ${end}.`});
  } else {
    steps.push({text: `The ${at(1)} card at the ${end} is first. Count it as one.`});
  }
  const stop = Math.max(k, other);
  steps.push({text: `Point to each card in turn from the ${end}.`,
    equation: Array.from({length: stop}, (_, i) => `${place(i + 1)}: ${at(i + 1)}`).join(', ')});

  let prompt: string, answer: string;
  let extra: Partial<Pick<Question, 'choices' | 'structuredResponse'>> = {};
  if (mode === 'find') {
    prompt = `Which card is ${words[k - 1]}?`;
    answer = target;
    extra = {choices: r.shuffle([target, ...r.shuffle(labels.filter(x => x !== target)).slice(0, 3)])};
    steps.push({text: `Stop at the ${target} card. It is ${words[k - 1]}.`});
  } else if (mode === 'pair') {
    prompt = `Pick the ${words[k - 1]} card and the ${words[other - 1]} card.`;
    answer = JSON.stringify([target, at(other)]);
    extra = {structuredResponse: {kind: 'named-pair', options: r.shuffle(labels)}};
    steps.push({text: `Pick ${target} for ${place(k)} and ${at(other)} for ${place(other)}.`});
  } else {
    context.push(positionForm);
    prompt = mode === 'twin' ? 'What place is the unmarked star in?' : `What place is the ${target} card in?`;
    answer = place(k);
    steps.push({text: `The ${mode === 'twin' ? 'unmarked star' : target + ' card'} is ${words[k - 1]}, so write ${answer}.`});
  }
  return {key, prompt, context, picture, answer, ...extra,
    hint: mode === 'twin' ? 'Try counting to the marked star from each end. Which count matches its mark?'
      : 'Find the starting card. Call it first, then count one place for each card.',
    workedSteps: steps, explanation: steps.map(s => [s.text, s.equation].filter(Boolean).join(' ')).join(' ')};
}

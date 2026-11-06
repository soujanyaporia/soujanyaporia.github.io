import {Rng, hashString} from '../../engine/random';
import type {Question} from '../generate';

export const RAG_PATTERN = {
  id: 'p1-rag-match-sets-by-count',
  level: 1,
  title: 'Find the matching box',
  objective: 'Count the objects in each box and choose the box with exactly the number asked for.',
  skillIds: ['P1.S.WN.01'],
  canonicalPatternId: 'p1-match-sets-by-count',
};

const words = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const r = new Rng(hashString(key));
  const target = r.pick([2, 5, 6, 7, 8]);
  const nearby = Array.from({length: 10}, (_, i) => i + 1)
    .filter(n => n !== target && Math.abs(n - target) <= 3);
  const counts = r.shuffle([target, ...r.shuffle(nearby).slice(0, 3)]);
  const cards = counts.map((count, i) => ({
    label: `Box ${i + 1}`, value: '', icon: 'book' as const, count,
  }));
  const answer = cards[counts.indexOf(target)].label;
  const tally = cards.map(card => `${card.label}: ${card.count}`).join('; ');
  const conclusion = `${answer} has exactly ${target} books.`;
  return {
    key,
    prompt: `Which box holds ${words[target]} books?`,
    picture: {type: 'paper', layout: 'cards', cards},
    choices: cards.map(card => card.label),
    answer,
    hint: 'Touch each book once as you count. Start again at one for each new box.',
    workedSteps: [
      {text: 'Count the books in each box.', equation: tally},
      {text: `Look for the box where your count ends at ${words[target]}.`, equation: conclusion},
    ],
    explanation: `${tally}. ${conclusion}`,
  };
}

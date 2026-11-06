import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';

export const RAG_PATTERN = {
  id: 'p1-rag-rank-expression-values',
  level: 1,
  title: 'Compare calculation cards',
  objective: 'Work out each card, then choose the smallest or greatest result or write the results in order.',
  skillIds: ['P1.S.AS.05', 'P1.S.WN.04'],
  canonicalPatternId: 'rank-expression-values',
};

type Card = { expression: string; value: number };

function difference(value: number, removed: number): Card {
  return { expression: `${value + removed} − ${removed}`, value };
}

function makeCards(rng: Rng, fullOrder: boolean): Card[] {
  const large = !fullOrder && rng.chance(0.5);
  const start = large ? rng.int(20, 60) : 2;
  const pool = Array.from({ length: 8 }, (_, i) => start + i);
  const values = rng.shuffle(pool).slice(0, fullOrder ? 4 : 3);
  const cards = values.map((value, i) => {
    if (large) {
      const removed = i === 1 ? rng.int(2, 9) : rng.int(11, 99 - value);
      return difference(value, removed);
    }
    if (i === 0 || (fullOrder && i === 2)) {
      const right = fullOrder && i === 2 && rng.chance(0.5) ? 0 : rng.int(1, value - 1);
      return { expression: `${value - right} + ${right}`, value };
    }
    const result = fullOrder && i === 1 && rng.chance(0.5) ? 0 : value;
    return difference(result, rng.int(1, 10 - result));
  });
  return rng.shuffle(cards);
}

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const rng = new Rng(hashString(key));
  const mode = rng.pick(['least', 'greatest', 'order']);
  const fullOrder = mode === 'order';
  const cards = makeCards(rng, fullOrder);
  const ranked = [...cards].sort((a, b) => mode === 'least' ? a.value - b.value : b.value - a.value);
  if (fullOrder && cards.every((card, i) => card === ranked[i])) {
    [cards[0], cards[1]] = [cards[1], cards[0]];
  }

  const first = ranked[0];
  const extreme = mode === 'least' ? 'smallest' : 'greatest';
  const comparison = ranked.map(card => card.value).join(mode === 'least' ? ' < ' : ' > ');
  const conclusion = fullOrder
    ? 'Start with the greatest answer and put each smaller answer after it.'
    : `${first.value} is the ${extreme} answer, so choose ${first.expression}.`;
  const workedSteps = [
    ...cards.map((card, i) => ({
      text: `Work out card ${i + 1}.`,
      equation: `${card.expression} = ${card.value}`,
    })),
    { text: conclusion, equation: comparison },
  ];
  const base = {
    key,
    workedSteps,
    hint: `Work out each card first. Then look for the ${extreme} answer.`,
    explanation: workedSteps.map(step => `${step.text} ${step.equation}`).join(' '),
  };
  const expressions = cards.map(card => card.expression);
  if (fullOrder) {
    return {
      ...base,
      prompt: 'Work out all four cards. Write their answers in order, starting with the greatest.',
      context: expressions,
      structuredResponse: {
        kind: 'number-fields',
        fields: ['Greatest', 'Second greatest', 'Third greatest', 'Smallest'].map(label => ({ label })),
      },
      answer: JSON.stringify(ranked.map(card => String(card.value))),
    };
  }
  return {
    ...base,
    prompt: `Which card gives the ${extreme} number?`,
    choices: expressions,
    answer: first.expression,
  };
}

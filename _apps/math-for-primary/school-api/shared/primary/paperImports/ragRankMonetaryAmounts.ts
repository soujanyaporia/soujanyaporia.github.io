import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';

export const RAG_PATTERN = {
  id: 'rag-rank-monetary-amounts',
  level: 1,
  title: 'Compare purses and prices',
  objective: 'Count the dollars in each purse or read each price tag, then find the most or the least.',
  skillIds: ['P1.S.MONEY.02', 'P1.S.WN.04'],
  canonicalPatternId: 'rank-monetary-amounts',
};

const forms = ['least', 'totals', 'both', 'price'] as const;
const sum = (values: number[]) => values.reduce((a, b) => a + b, 0);
const dollars = (value: number) => '$' + value;
const stepsText = (steps: NonNullable<Question['workedSteps']>) =>
  steps.map(step => [step.text, step.equation].filter(Boolean).join(' ')).join(' ');

function makePurses(r: Rng, notesOnly: boolean) {
  const sizes = notesOnly ? [4, 4, 4] : r.shuffle([3, 4, 5]);
  const commonNote = r.pick([5, 10, 50]);
  const denominations = notesOnly ? [2, 5, 10] : [1, 2, 5, 10];
  const used = new Set<number>();
  const sets = sizes.map((size, i) => {
    const pieces = [commonNote];
    for (let j = 1; j < size - 1; j++) {
      pieces.push(!notesOnly && i === 0 && j === 1 ? 1 : r.pick(denominations));
    }
    const subtotal = sum(pieces);
    // At most two totals are taken, and there are at least three possible last pieces.
    pieces.push(r.pick(denominations.filter(value => !used.has(subtotal + value))));
    const total = sum(pieces);
    used.add(total);
    return { pieces: r.shuffle(pieces), total };
  });
  return r.shuffle(sets).map((set, i) => ({ ...set, number: i + 1 }));
}

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const r = new Rng(hashString(key));
  const form = forms[(hashString(String(seed)) + (index >>> 0)) % forms.length];

  if (form === 'price') {
    const items = r.shuffle(['cap', 'bag', 'belt', 'scarf', 'fan', 'hat']).slice(0, 4);
    const prices = r.shuffle([4, 5, 7, 10, 11, 12, 14, 15, 16, 18, 20, 22]).slice(0, 4);
    const highest = Math.max(...prices);
    const answer = items[prices.indexOf(highest)];
    const steps = [
      { text: 'Put the prices in order, starting with the lowest.',
        equation: [...prices].sort((a, b) => a - b).map(dollars).join(' < ') },
      { text: `The highest price is ${dollars(highest)}. The ${answer} has that price.` },
    ];
    return {
      key, prompt: 'Which item has the highest price?', answer,
      context: items.map((name, i) => `The ${name} costs ${dollars(prices[i])}.`),
      hint: 'Read all four prices. Which is the largest number of dollars?',
      workedSteps: steps, explanation: stepsText(steps),
    };
  }

  const purses = makePurses(r, form === 'totals');
  const ranked = [...purses].sort((a, b) => a.total - b.total);
  const least = ranked[0].number;
  const most = ranked[2].number;
  const steps = purses.map(purse => ({
    text: `Count the money in purse ${purse.number}.`,
    equation: `${[...purse.pieces].sort((a, b) => b - a).map(dollars).join(' + ')} = ${dollars(purse.total)}`,
  }));
  const finding = form === 'least' ? `Purse ${least} has the least money.`
    : form === 'totals' ? `Purse ${most} has the most money.`
    : `Purse ${most} has the most money and purse ${least} has the least.`;
  steps.push({ text: finding, equation: ranked.map(purse => dollars(purse.total)).join(' < ') });

  const base = {
    key, hint: 'Add the values in each purse. Compare the three totals.',
    picture: {
      type: 'paper' as const, layout: 'cards' as const, heading: 'Inside the purses',
      cards: purses.map(purse => ({
        label: `Purse ${purse.number}`,
        value: purse.pieces.map(value => `${dollars(value)} ${value === 1 ? 'coin' : 'note'}`).join(', '),
      })),
    },
    workedSteps: steps, explanation: stepsText(steps),
  };
  if (form === 'least') {
    return { ...base, prompt: 'Which purse has the least money? Write its number.', answer: String(least) };
  }
  if (form === 'both') {
    return {
      ...base, prompt: 'Which purse has the most money? Which has the least? Write their numbers.',
      structuredResponse: {
        kind: 'number-pair', firstLabel: 'Purse number with the most money', secondLabel: 'Purse number with the least money',
      },
      answer: JSON.stringify([String(most), String(least)]),
    };
  }
  return {
    ...base, prompt: 'How many dollars are in each purse? Then write the number of the purse with the most money.',
    structuredResponse: {
      kind: 'number-fields',
      fields: [...purses.map(purse => ({ label: `Dollars in purse ${purse.number}` })), { label: 'Purse number with the most money' }],
    },
    answer: JSON.stringify([...purses.map(purse => String(purse.total)), String(most)]),
  };
}

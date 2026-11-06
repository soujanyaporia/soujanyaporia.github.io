import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';

export const RAG_PATTERN = {
  id: 'p2-rag-unknown-price-after-repeated-purchases',
  level: 2 as const,
  title: 'Find the price of the other item',
  objective: 'Use the price of one item to find the cost of several, then subtract their cost from the bill. Use the same money unit throughout.',
  skillIds: ['P2.S.MONEY.03', 'P2.S.MD.01', 'P2.S.AS.01'],
  canonicalPatternId: 'p2-unknown-price-after-repeated-purchases',
};

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const r = new Rng(hashString(key));
  const mixed = (seed + index) % 2 === 0;
  const count = r.int(2, 4);
  // All arithmetic uses whole cents in the mixed version and whole dollars otherwise.
  const each = mixed ? r.pick([5, 10, 15]) : r.pick([2, 4, 6, 8]);
  const subtotal = count * each;
  const bill = mixed
    ? r.pick([60, 65, 70, 75, 80, 90, 95].filter(t => t - subtotal >= 10 && t - subtotal !== each))
    : subtotal + r.pick([4, 6, 8, 10, 12, 14, 16].filter(p => p !== each));
  const other = bill - subtotal;
  const [item, items, target] = mixed
    ? ['sticker', 'stickers', 'bookmark']
    : ['paintbrush', 'paintbrushes', 'sketchbook'];
  const amount = (n: number) => mixed ? `${n}¢` : `$${n}`;
  const priceTag = mixed ? `$0.${String(each).padStart(2, '0')}` : amount(each);
  const workedSteps = [
    ...(mixed ? [{ text: 'Read the sticker price in cents so it matches the bill.', equation: `${priceTag} = ${amount(each)}` }] : []),
    { text: `Find the cost of all ${count} ${items}.`, equation: `${count} × ${amount(each)} = ${amount(subtotal)}` },
    { text: `Take the cost of the ${items} off the bill. The rest is the price of the ${target}.`, equation: `${amount(bill)} − ${amount(subtotal)} = ${amount(other)}` },
  ];
  const base = {
    key,
    context: [`At the school fair, Nadia buys ${count} ${items} and one ${target}.`, `Each ${item} costs ${priceTag}.`, `Her bill is ${amount(bill)} in all.`],
    hint: mixed ? 'Read the price tag in cents. How much do all the stickers cost together?' : 'First find what Nadia spends on all the paintbrushes. What part of the bill is left?',
    workedSteps,
    explanation: `The ${count} ${items} cost ${amount(subtotal)} together. That leaves ${amount(other)} of the bill for the ${target}.`,
  };
  if (mixed) {
    return {
      ...base,
      prompt: 'How much does the bookmark cost? Complete the working in cents.',
      structuredResponse: { kind: 'number-fields', fields: [
        { label: `One sticker: ${priceTag} = □¢` },
        { label: `All the stickers: ${count} × the price of one sticker = □¢` },
        { label: `The bookmark: ${amount(bill)} − the cost of all the stickers = □¢` },
      ] },
      answer: JSON.stringify([String(each), String(subtotal), String(other)]),
    };
  }
  return { ...base, prompt: 'How many dollars does the sketchbook cost?', answer: String(other), unit: 'dollars' };
}

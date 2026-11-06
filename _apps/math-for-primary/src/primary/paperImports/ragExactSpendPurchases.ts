import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';

export const RAG_PATTERN = {
  id: 'rag-p1-exact-spend-purchases',
  level: 1,
  title: 'What did Jia buy?',
  objective: 'Find the amount spent and use the price tags to identify the purchase.',
  skillIds: ['P1.S.MONEY.02', 'P1.S.AS.05'],
  canonicalPatternId: 'p1-identify-purchases-from-exact-spend',
};

type Tag = { name: string; price: number };
type Basket = { tags: Tag[]; cost: number };

function possibleBaskets(tags: Tag[]): Basket[] {
  const baskets: Basket[] = [{ tags: [], cost: 0 }];
  for (const tag of tags) {
    const withTag = baskets.map(basket => ({ tags: [...basket.tags, tag], cost: basket.cost + tag.price }));
    baskets.push(...withTag);
  }
  return baskets.slice(1);
}

function basketLabel(basket: Basket): string {
  const names = basket.tags.map(tag => tag.name);
  if (names.length === 1) return names[0];
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const rng = new Rng(hashString(key));
  const form = rng.pick(['one-change', 'one-left', 'two-change', 'all-spent'] as const);
  const isBalance = form === 'one-left';
  const isPair = form === 'two-change';
  const isFullSpend = form === 'all-spent';
  const toyNames = rng.shuffle(['kite', 'toy bus', 'ball', 'puzzle']);
  const names = isBalance ? ['Box A', 'Box B', 'Box C', 'Box D'] : toyNames.slice(0, isPair ? 4 : 3);
  const lowestPrice = isBalance ? 10 : 2;
  const pricePool = Array.from({ length: isFullSpend ? 8 : 17 }, (_, i) => lowestPrice + i);
  const prices = rng.shuffle(pricePool);
  const tags = names.map((name, i) => ({ name, price: prices[i] }));

  const permitted = possibleBaskets(tags).filter(basket => isFullSpend || basket.tags.length === (isPair ? 2 : 1));
  // Unique prices guarantee a unique cheapest single or pair. Buying every item is also a unique total.
  const unambiguous = permitted.filter(basket => !permitted.some(other => other !== basket && other.cost === basket.cost));
  const bought = rng.pick(unambiguous);
  const spend = bought.cost;
  const first = bought.tags[0];
  const workedSteps: NonNullable<Question['workedSteps']> = [];
  let story: string;
  if (isFullSpend) {
    story = `Jia spent exactly $${spend} on toys from this list. She bought at most one of each toy.`;
    workedSteps.push({ text: `Look for prices that use all $${spend}.` });
  } else {
    const rest = isBalance ? rng.int(10, 21) : rng.int(2, 7);
    const start = spend + rest;
    story = isBalance
      ? `Jia started with $${start}. She bought one lunch box and had $${rest} left.`
      : `Jia bought ${isPair ? 'two different toys' : 'one toy'}. She handed over $${start} and got $${rest} back.`;
    workedSteps.push({
      text: isBalance ? 'Take the money left away from the money Jia started with.' : 'Take the change away from the money Jia handed over.',
      equation: `$${start} − $${rest} = $${spend}`,
    });
  }

  if (bought.tags.length === 1) {
    workedSteps.push({ text: `The $${spend} price tag belongs to ${isBalance ? first.name : `the ${first.name}`}.` });
  } else {
    workedSteps.push({ text: `Try the ${first.name}. How much more is needed?`, equation: `$${spend} − $${first.price} = $${spend - first.price}` });
    workedSteps.push({ text: `The ${basketLabel(bought)} have the right total.`, equation: `${bought.tags.map(tag => `$${tag.price}`).join(' + ')} = $${spend}` });
  }

  const base = {
    key,
    context: [story, ...tags.map(tag => `${tag.name}: $${tag.price}`)],
    workedSteps,
    explanation: workedSteps.map(step => [step.text, step.equation].filter(Boolean).join(' ')).join(' '),
  };
  if (isFullSpend) {
    const others = rng.shuffle(permitted.filter(basket => basket !== bought)).slice(0, 3);
    return { ...base, prompt: 'Which toy or toys did Jia buy?', answer: basketLabel(bought),
      choices: rng.shuffle([bought, ...others].map(basketLabel)), hint: 'Try a price on its own or add prices for different toys. Use all the money.' };
  }
  if (isPair) {
    return { ...base, prompt: 'Which two toys did Jia buy?', answer: JSON.stringify(bought.tags.map(tag => tag.name)),
      structuredResponse: { kind: 'named-pair', options: names }, hint: 'Find what Jia spent. Try one toy and look for a different toy to make up the rest.' };
  }
  if (isBalance) {
    return { ...base, prompt: 'Which lunch box did Jia buy? Write its letter.', answer: first.name.slice(-1),
      hint: 'Take away the money Jia still has. Look for a box that costs that much.' };
  }
  return { ...base, prompt: 'Which toy did Jia buy?', answer: first.name, choices: names,
    hint: 'Find how much the shopkeeper kept. Look for that price on the list.' };
}

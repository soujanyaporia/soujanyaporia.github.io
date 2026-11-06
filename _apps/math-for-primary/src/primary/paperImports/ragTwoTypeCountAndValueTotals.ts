import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';

export const RAG_PATTERN = {
  id: 'p3-two-type-totals',
  level: 3 as const,
  title: 'How many of each kind?',
  objective: 'Use a total count, a total value and the difference in unit values to find a missing count.',
  skillIds: ['P3.S.MD.03', 'P3.S.MD.04', 'P3.S.MONEY.01'],
  canonicalPatternId: 'two-types-from-count-and-value-totals',
};

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const rng = new Rng(hashString(key));
  const form = rng.pick(['higher-notes', 'lower-notes', 'shop', 'lunch'] as const);
  const notes = form === 'higher-notes' || form === 'lower-notes';
  const low = notes ? rng.pick([2, 5]) : rng.int(2, 4);
  const high = notes ? (low === 2 ? 5 : 10) : low + rng.int(2, 4);
  const gap = high - low;
  const cheapItem = notes ? `$${low} note` : form === 'shop' ? 'badge' : 'rice set';
  const dearItem = notes ? `$${high} note` : form === 'shop' ? 'cap' : 'noodle set';
  const count = rng.int(19, 28);
  const dearCount = rng.int(2, count - 2);
  const cheapCount = count - dearCount;
  const total = cheapCount * low + dearCount * high;

  const startHigh = form === 'lower-notes' || form === 'lunch';
  const assumedItem = startHigh ? dearItem : cheapItem;
  const targetItem = startHigh ? cheapItem : dearItem;
  const assumedPrice = startHigh ? high : low;
  const estimate = count * assumedPrice;
  const difference = startHigh ? estimate - total : total - estimate;
  const found = difference / gap;
  const steps: NonNullable<Question['workedSteps']> = [];
  if (form === 'lunch') {
    steps.push({ text: 'A rice set costs less than a noodle set. Find its price.', equation: `$${high} − $${gap} = $${low}` });
  }
  steps.push(
    { text: `Suppose all ${count} were ${assumedItem}s. Find their total value.`, equation: `${count} × $${assumedPrice} = $${estimate}` },
    { text: startHigh ? 'How much too high is this total?' : 'How much more is the actual total?', equation: startHigh ? `$${estimate} − $${total} = $${difference}` : `$${total} − $${estimate} = $${difference}` },
    { text: `Replacing one ${assumedItem} with one ${targetItem} ${startHigh ? 'lowers' : 'raises'} the total by this much.`, equation: `$${high} − $${low} = $${gap}` },
    { text: `How many such changes make up the difference? Each change gives us one ${targetItem}.`, equation: `$${difference} ÷ $${gap} = ${found}` },
  );
  if (form === 'shop') {
    steps.push({ text: 'The rest of Zac’s items are badges.', equation: `${count} − ${found} = ${cheapCount}` });
  }
  const check = `${cheapCount} × $${low} + ${dearCount} × $${high} = $${total}`;
  const base = {
    key,
    workedSteps: steps,
    hint: `Imagine that all ${count} were ${assumedItem}s. How would one swap change their total value?`,
    explanation: `There are ${cheapCount} ${cheapItem}s and ${dearCount} ${dearItem}s. These counts add to ${count}. The value also checks out because ${check}.`,
  };

  if (notes) {
    return {
      ...base,
      context: [`A cash box holds ${count} notes worth $${total} altogether.`, `Each note is either a $${low} note or a $${high} note.`],
      prompt: `How many ${targetItem}s are in the box?`,
      answer: String(found),
      unit: 'notes',
    };
  }
  if (form === 'shop') {
    const capOrder = rng.int(4, 12);
    const capCost = capOrder * high;
    return {
      ...base,
      context: [`One badge costs $${low}. One cap costs $${high}.`, `Mira buys ${capOrder} caps.`, `Zac buys ${count} items for $${total}. He buys only badges and caps.`],
      prompt: '(a) How much does Mira pay for her caps?\n(b) How many badges and how many caps does Zac buy?',
      structuredResponse: { kind: 'number-fields', fields: [{ label: '(a) Cost of Mira’s caps (dollars)', decimal: true }, { label: '(b) Badges' }, { label: '(b) Caps' }] },
      answer: JSON.stringify([String(capCost), String(cheapCount), String(found)]),
      hint: `For Mira, use the price of one cap. For Zac, imagine buying only badges first.`,
      explanation: `Mira pays $${capCost}. For Zac’s purchase, ${cheapCount} badges and ${found} caps make ${count} items. Their cost is ${check}.`,
      workedSteps: [{ text: '(a) Multiply the number of caps Mira buys by the price of one cap.', equation: `${capOrder} × $${high} = $${capCost}` }, ...steps],
    };
  }
  return {
    ...base,
    context: [`Rani pays $${total} for ${count} lunch sets. Each is either a rice set or a noodle set.`, `A noodle set costs $${high}, which is $${gap} more than a rice set.`],
    prompt: 'How many rice sets does Rani buy?',
    answer: String(found),
    unit: 'rice sets',
  };
}

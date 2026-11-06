import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';

export const RAG_PATTERN = {
  id: 'p2-rag-dollars-and-cents-notation',
  level: 2 as const,
  title: 'Read and write money amounts',
  objective: 'Write a price in figures and identify its whole dollars and remaining cents.',
  skillIds: ['P2.S.MONEY.01', 'P2.S.MONEY.03'],
  canonicalPatternId: 'p2-dollars-and-cents-notation',
};

const small = 'zero one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen'.split(' ');
const tens = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
function words(n: number): string {
  if (n < 20) return small[n];
  return tens[Math.floor(n / 10)] + (n % 10 ? '-' + small[n % 10] : '');
}
const unit = (n: number, name: string) => name + (n === 1 ? '' : 's');
const mod12 = (n: number) => ((Math.trunc(n) % 12) + 12) % 12;

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const r = new Rng(hashString(key));
  const slot = (mod12(seed) + mod12(index)) % 12;
  const variant = slot % 3;
  const d = variant === 2 ? r.int(1, 8) : r.int(12, 79);
  const c = slot < 3 ? r.int(1, 9) : slot < 6 ? r.int(10, 99) : slot < 9 ? 10 * r.int(1, 9) : 0;
  const digits = String(c).padStart(2, '0');
  const price = `$${d}.${digits}`;
  const centPart = `${c} ${unit(c, 'cent')}`;
  const dollarPart = `${d} ${unit(d, 'dollar')}`;
  const fields = { kind: 'number-pair' as const, firstLabel: 'Whole dollars', secondLabel: 'Remaining cents' };
  const pair = JSON.stringify([String(d), String(c)]);

  if (variant === 0) {
    const amount = `${words(d)} ${unit(d, 'dollar')} and ${words(c)} ${unit(c, 'cent')}`;
    return {
      key, context: [`The price is ${amount}.`],
      prompt: 'Write the price in figures. Start with $ and use two digits for the cents.',
      answer: price, hint: 'Write the dollars before the point. If the cents have only one digit, put a zero in front of it.',
      workedSteps: [
        { text: 'Write the dollar part.', equation: `${words(d)} dollars → $${d}` },
        { text: 'Write the cents in two places after the point.', equation: `${centPart} → .${digits}` },
        { text: 'Put the two parts on the price tag.', equation: price },
      ],
      explanation: `The dollar part is ${d}. The two digits for ${centPart} are ${digits}, so the tag reads ${price}.`,
    };
  }
  if (variant === 1) {
    return {
      key, context: [`A price tag shows ${price}.`],
      prompt: 'How many whole dollars and how many remaining cents does the tag show?',
      structuredResponse: fields, answer: pair,
      hint: 'Look at the digits on each side of the point.',
      workedSteps: [
        { text: 'Read the part before the point as whole dollars.', equation: `${d} → ${dollarPart}` },
        { text: 'Read both digits after the point as cents.', equation: `${digits} → ${centPart}` },
      ],
      explanation: `In ${price}, the part before the point gives ${dollarPart}. The part after it gives ${centPart}.`,
    };
  }
  const total = 100 * d + c;
  return {
    key, context: [`A money box holds ${total} cents.`],
    prompt: 'How many whole dollars can you make? How many cents are left over?',
    structuredResponse: fields, answer: pair,
    hint: 'Make as many groups of 100 cents as you can.',
    workedSteps: [
      { text: `Make ${dollarPart} using groups of 100 cents.`, equation: `${d} × 100 cents = ${100 * d} cents` },
      { text: 'Find the cents left outside the groups.', equation: `${total} − ${100 * d} = ${c}` },
    ],
    explanation: `${total} cents makes ${dollarPart} with ${centPart} left over. There are fewer than 100 cents left, so you cannot make another dollar.`,
  };
}

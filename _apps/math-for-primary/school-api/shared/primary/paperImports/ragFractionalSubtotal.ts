import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';

export const RAG_PATTERN = {
  id: 'p2-rag-fractional-subtotal',
  level: 2 as const,
  title: 'Find the parts that make a fraction',
  objective: 'Choose three like fractions that make a given total, or use a known total to find a missing part and the part left over.',
  skillIds: ['P2.S.FRAC.05'],
  canonicalPatternId: 'p2-compose-fractional-subtotal',
};

function cardQuestion(r: Rng, key: string): Question {
  const d = r.int(8, 11);
  const fraction = (n: number) => `${n}/${d}`;
  const seeds: number[][] = [];
  for (let a = 1; a < d; a++) {
    for (let b = a + 1; b < d; b++) {
      for (let c = b + 1; a + b + c < d; c++) seeds.push([a, b, c]);
    }
  }
  const core = r.pick(seeds);
  const spare = Array.from({ length: d - 1 }, (_, i) => i + 1).filter(n => !core.includes(n));
  const cards = r.shuffle([...core, ...r.shuffle(spare).slice(0, 2)]);
  const triples: { values: number[]; sum: number }[] = [];
  for (let i = 0; i < cards.length; i++) {
    for (let j = i + 1; j < cards.length; j++) {
      for (let k = j + 1; k < cards.length; k++) {
        const values = [cards[i], cards[j], cards[k]];
        const sum = values.reduce((s, n) => s + n, 0);
        if (sum < d) triples.push({ values, sum });
      }
    }
  }
  // The three smallest cards have a unique minimum sum, no larger than the core sum.
  const unique = triples.filter(x => triples.filter(y => y.sum === x.sum).length === 1);
  const { values, sum } = r.pick(unique);
  const [a, b, c] = values;
  const check = `${values.map(fraction).join(' + ')} = ${fraction(sum)}`;
  return {
    key,
    context: ['You may use each card only once.'],
    display: cards.map(fraction).join(',   '),
    prompt: `Which three cards make ${fraction(sum)}? Write their top numbers as you see them from left to right.`,
    structuredResponse: { kind: 'number-fields', fields: ['First', 'Second', 'Third'].map(pos => ({ label: `${pos} chosen card: □/${d}` })) },
    answer: JSON.stringify(values.map(String)),
    hint: 'Try two cards. How many more equal parts do you need? Look for a third card with that top number.',
    workedSteps: [
      { text: `Each part is ${fraction(1)} of a whole. Try ${fraction(a)} and ${fraction(b)} together.`, equation: `${fraction(a)} + ${fraction(b)} = ${fraction(a + b)}` },
      { text: 'Find how much more you need. Look for that fraction on another card.', equation: `${fraction(sum)} − ${fraction(a + b)} = ${fraction(c)}` },
      { text: 'Check the three chosen cards together.', equation: check },
    ],
    explanation: `The three cards count parts of the same size. ${check}.`,
  };
}

function stripQuestion(r: Rng, key: string): Question {
  const d = r.pick([6, 7, 8, 10, 11, 12]);
  const total = r.int(2, d - 1);
  const kite = r.int(1, total - 1);
  const flag = total - kite;
  const left = d - total;
  const f = (n: number) => `${n}/${d}`;
  return {
    key,
    context: [
      `Mei cuts one paper strip into ${d} equal pieces. She uses ${f(kite)} of the strip for a kite and some more pieces for a flag.`,
      `She uses ${f(total)} of the strip for the kite and flag together.`,
    ],
    prompt: 'What fraction of the strip does Mei use for the flag? What fraction of the strip is left? Fill in both top numbers.',
    structuredResponse: { kind: 'number-fields', fields: [{ label: `For the flag: □/${d}` }, { label: `Left over: □/${d}` }] },
    answer: JSON.stringify([String(flag), String(left)]),
    hint: 'For the flag, start with the part used. For the pieces left, start with the whole strip.',
    workedSteps: [
      { text: 'The used pieces went to the kite or the flag. Take the kite pieces out of the used part.', equation: `${f(total)} − ${f(kite)} = ${f(flag)}` },
      { text: `The whole strip had ${d} pieces. Take away all the pieces used for both projects.`, equation: `${f(d)} − ${f(total)} = ${f(left)}` },
    ],
    explanation: `The flag takes ${f(flag)} of the strip. The unused pieces make ${f(left)} of the same strip.`,
  };
}

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const r = new Rng(hashString(key));
  return (seed + index) % 2 === 0 ? cardQuestion(r, key) : stripQuestion(r, key);
}

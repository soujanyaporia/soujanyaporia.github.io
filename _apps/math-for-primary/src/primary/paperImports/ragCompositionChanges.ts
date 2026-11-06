import {Rng, hashString} from '../../engine/random';
import type {Question} from '../generate';

export const RAG_PATTERN = {
  id: 'p6-rag-composition-changes',
  level: 6,
  title: 'Collections with changing percentages',
  objective: 'Use an unchanged group to recover totals, follow additions and removals, and calculate percentage growth.',
  skillIds: ['P6.S.PCT.01', 'P6.S.PCT.02', 'P5.S.PCT.03'],
  canonicalPatternId: 'p6-composition-changed-by-additions-or-removals',
};

type Steps = NonNullable<Question['workedSteps']>;

function gcd(a: number, b: number): number {
  while (b !== 0) {
    const remainder = a % b;
    a = b;
    b = remainder;
  }
  return a;
}

export function makeRagQuestion(seed: number, index = 0): Question {
  const r = new Rng(hashString(`${RAG_PATTERN.id}:${seed}:${index}`));
  const offset = ((Math.trunc(index) % 3) + 3) % 3;
  const variant = ((hashString(String(seed)) >>> 0) % 3 + offset) % 3;
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const make = (
    prompt: string,
    context: string[],
    answer: string,
    hint: string,
    workedSteps: Steps,
    extra: Partial<Question> = {},
  ): Question => ({
    key, prompt, context, answer, hint, workedSteps,
    explanation: workedSteps.map(step => [step.text, step.equation].filter(Boolean).join(' ')).join('\n'),
    ...extra,
  });

  if (variant === 0) {
    const [firstPercent, secondPercent] = r.pick([
      [40, 32], [45, 36], [48, 32], [60, 40], [50, 40], [36, 24],
    ] as const);
    const common = gcd(firstPercent, secondPercent);
    const blue = firstPercent * secondPercent / common * r.int(1, 5);
    const firstTotal = blue * 100 / firstPercent;
    const secondTotal = blue * 100 / secondPercent;
    const redAfterFirst = firstTotal - blue;
    const firstAdded = 10 * r.int(2, Math.floor(redAfterFirst / 20));
    const secondAdded = secondTotal - firstTotal;
    const originalRed = redAfterFirst - firstAdded;
    const totalAdded = firstAdded + secondAdded;
    // Round the positive rational percentage to tenths without an intermediate decimal approximation.
    const tenths = Math.floor((2000 * totalAdded + originalRed) / (2 * originalRed));
    const growth = (tenths / 10).toFixed(1);
    const firstParts = secondPercent / common;
    const secondParts = firstPercent / common;
    const extraParts = secondParts - firstParts;
    const perPart = secondAdded / extraParts;

    return make(
      '(a) How many blue counters are in the box? (b) What is the percentage increase in red counters after both additions, compared with the number before either addition? Give (b) to 1 decimal place.',
      [
        'Leela keeps red and blue counters in a box.',
        `She first adds ${firstAdded} red counters. Blue counters then make up ${firstPercent}% of all the counters.`,
        `Next, she adds ${secondAdded} more red counters. Blue counters now make up ${secondPercent}% of all the counters.`,
        'These are the only changes to the box. No blue counters are added or removed.',
      ],
      JSON.stringify([String(blue), growth]),
      'The blue count stays the same. Compare the totals after the two additions, then work back to the original red count.',
      [
        {
          text: 'The same blue count is a percentage of two different totals. This gives the reverse ratio for the totals.',
          equation: `${firstPercent}% of first total = ${secondPercent}% of second total; first total : second total = ${secondPercent} : ${firstPercent} = ${firstParts} : ${secondParts}`,
        },
        {
          text: 'The second addition accounts for the difference between these totals.',
          equation: `${secondParts} − ${firstParts} = ${extraParts} units; ${secondAdded} ÷ ${extraParts} = ${perPart} counters per unit`,
        },
        {
          text: 'Find the total after the first addition.',
          equation: `${firstParts} × ${perPart} = ${firstTotal} counters`,
        },
        {
          text: '(a) Find the unchanged blue count.',
          equation: `${firstPercent}/100 × ${firstTotal} = ${blue} blue counters`,
        },
        {
          text: 'Subtract the blue count and undo the first addition to recover the original red count.',
          equation: `${firstTotal} − ${blue} − ${firstAdded} = ${originalRed} red counters`,
        },
        {
          text: 'Count all the red counters added.',
          equation: `${firstAdded} + ${secondAdded} = ${totalAdded} red counters`,
        },
        {
          text: '(b) Divide the increase by the original red count. Round only the final percentage.',
          equation: `${totalAdded} ÷ ${originalRed} × 100% ≈ ${growth}% (1 decimal place)`,
        },
      ],
      {
        structuredResponse: {
          kind: 'number-fields',
          fields: [
            {label: '(a) Number of blue counters'},
            {label: '(b) Increase in red counters (%)', decimal: true},
          ],
        },
      },
    );
  }

  const initialPercent = r.pick([15, 20, 30, 35, 40]);
  const finalPercent = r.pick([50, 55, 60, 65, 70]);
  const initialOtherPercent = 100 - initialPercent;
  const finalOtherPercent = 100 - finalPercent;
  // This multiple makes every initial and final object count integral.
  const total = 100 * (finalOtherPercent / gcd(initialOtherPercent, finalOtherPercent)) * r.int(1, 4);
  const initialChanged = total * initialPercent / 100;
  const unchanged = total - initialChanged;
  const finalTotal = unchanged * 100 / finalOtherPercent;

  if (variant === 1) {
    const difference = unchanged - initialChanged;
    const added = finalTotal - total;
    return make(
      '(a) How many more circle stickers than star stickers does Arun have before adding any stickers? (b) How many star stickers does he add?',
      [
        `Arun has ${total} stickers. ${initialPercent}% are star stickers and the rest are circle stickers.`,
        `He adds only star stickers until ${finalPercent}% of all his stickers are star stickers.`,
        'No stickers are removed, and the number of circle stickers stays the same.',
      ],
      JSON.stringify([String(difference), String(added)]),
      'Find the initial counts first. The circle count stays the same while its share of the total changes.',
      [
        {text: 'Find the initial circle percentage.', equation: `100% − ${initialPercent}% = ${initialOtherPercent}%`},
        {text: 'Find the circle count, which will stay unchanged.', equation: `${initialOtherPercent}/100 × ${total} = ${unchanged} circle stickers`},
        {text: 'Find the initial star count.', equation: `${initialPercent}/100 × ${total} = ${initialChanged} star stickers`},
        {text: '(a) Compare the initial counts.', equation: `${unchanged} − ${initialChanged} = ${difference} stickers`},
        {text: 'Find the final circle percentage.', equation: `100% − ${finalPercent}% = ${finalOtherPercent}%`},
        {text: 'Use the unchanged circle count to recover the final total.', equation: `${unchanged} ÷ ${finalOtherPercent} × 100 = ${finalTotal} stickers`},
        {text: '(b) Only star stickers were added, so subtract the original total.', equation: `${finalTotal} − ${total} = ${added} star stickers`},
      ],
      {
        structuredResponse: {
          kind: 'number-pair',
          firstLabel: '(a) Difference (stickers)',
          secondLabel: '(b) Star stickers added',
        },
      },
    );
  }

  const removed = 5 * r.int(1, Math.floor((initialChanged - 1) / 5));
  const afterRemoval = total - removed;
  const received = finalTotal - afterRemoval;
  return make(
    'How many green tiles does Mira receive after taking out the tiles for her picture?',
    [
      `Mira has ${total} mosaic tiles. ${initialPercent}% are green and the rest are white.`,
      `She takes out ${removed} green tiles for a picture. She then receives some new green tiles.`,
      `Green tiles then make up ${finalPercent}% of all her tiles.`,
      'No white tiles are added or taken out. There are no other changes.',
    ],
    String(received),
    'Keep the white count unchanged. Find the final total, then compare it with the total after the green tiles were taken out.',
    [
      {text: 'Find the initial white percentage.', equation: `100% − ${initialPercent}% = ${initialOtherPercent}%`},
      {text: 'Find the unchanged white count.', equation: `${initialOtherPercent}/100 × ${total} = ${unchanged} white tiles`},
      {text: 'Find the total left after taking out green tiles.', equation: `${total} − ${removed} = ${afterRemoval} tiles`},
      {text: 'Find the final white percentage.', equation: `100% − ${finalPercent}% = ${finalOtherPercent}%`},
      {text: 'Recover the final total from the unchanged white count.', equation: `${unchanged} ÷ ${finalOtherPercent} × 100 = ${finalTotal} tiles`},
      {text: 'Compare with the total after removal to find all the green tiles received.', equation: `${finalTotal} − ${afterRemoval} = ${received} green tiles`},
    ],
    {unit: 'tiles'},
  );
}

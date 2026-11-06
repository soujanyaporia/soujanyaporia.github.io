import {Rng, hashString} from '../../engine/random';
import type {Question} from '../generate';

export const RAG_PATTERN = {
  id: 'rag-p5-overlapping-price-constraints',
  level: 5,
  title: 'Find prices from overlapping sets',
  objective: 'Remove known sets of items to find an individual price and a related cost.',
  skillIds: ['P5.S.RATE.02', 'P4.S.DEC.05', 'P4.S.DEC.06'],
  canonicalPatternId: 'p5-overlapping-price-constraints',
} as const;

type Counts = [number, number, number];
type Step = NonNullable<Question['workedSteps']>[number];
const names = ['cup', 'plate', 'bowl'] as const;
const money = (cents: number): string => (cents / 100).toFixed(2);
const cash = (cents: number): string => `$${money(cents)}`;

function items(counts: Counts): string {
  const parts = counts.flatMap((count, i) => count > 0
    ? [`${count} ${names[i]}${count === 1 ? '' : 's'}`]
    : []);
  return parts.length === 1 ? parts[0]
    : `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`;
}

function receipt(counts: Counts, cents: number): string {
  return `A set of ${items(counts)} costs ${cash(cents)}.`;
}

export function makeRagQuestion(seed: number, index = 0): Question {
  const r = new Rng(hashString(`rag-overlapping-prices-v1:${seed}:${index}`));
  const variant = ((seed >>> 0) + (index >>> 0)) % 3;
  // Integer cents keep every visible amount and subtraction exact.
  const cup = r.pick([135, 165, 195, 225, 255, 285]);
  const plate = r.pick([310, 370, 430, 490, 550, 610]);
  const bowl = r.pick([675, 735, 795, 855, 915, 975]);

  const make = (
    receipts: string[],
    targets: [Counts, Counts],
    answers: [number, number],
    hint: string,
    workedSteps: Step[],
  ): Question => ({
    key: `${RAG_PATTERN.id}:${seed}:${index}`,
    context: [
      'At a kitchenware stall, all cups have the same price, all plates have the same price and all bowls have the same price.',
      ...receipts,
    ],
    prompt: 'Find the two costs below. Write each amount in dollars.',
    structuredResponse: {
      kind: 'number-pair',
      firstLabel: `(a) Cost of ${items(targets[0])} (dollars)`,
      secondLabel: `(b) Cost of ${items(targets[1])} (dollars)`,
      decimal: true,
    },
    answer: JSON.stringify(answers.map(money)),
    unit: 'dollars',
    hint,
    workedSteps,
    explanation: workedSteps.map(step => [step.text, step.equation].filter(Boolean).join(' ')).join(' '),
  });

  if (variant === 0) {
    const plates = r.int(2, 4);
    const bowls = r.int(2, 3);
    const extraCups = r.int(1, 2);
    const cups = plates + bowls + extraCups;
    const cupPlate = cup + plate;
    const cupBowl = cup + bowl;
    const total = cups * cup + plates * plate + bowls * bowl;
    return make(
      [
        receipt([1, 1, 0], cupPlate),
        receipt([1, 0, 1], cupBowl),
        receipt([cups, plates, bowls], total),
      ],
      [[1, 0, 0], [0, 1, 1]],
      [cup, plate + bowl],
      'Match the plates and bowls in the large set with the two smaller sets. Count the cups left over.',
      [
        {
          text: `Remove ${plates} cup-and-plate pairs and ${bowls} cup-and-bowl pairs from the large set. This leaves ${extraCups} ${extraCups === 1 ? 'cup' : 'cups'}.`,
          equation: `${cash(total)} − ${plates} × ${cash(cupPlate)} − ${bowls} × ${cash(cupBowl)} = ${cash(extraCups * cup)}`,
        },
        {
          text: 'Find the cost of one cup for (a).',
          equation: `${cash(extraCups * cup)} ÷ ${extraCups} = ${cash(cup)}`,
        },
        {
          text: 'The two small sets together contain two cups, one plate and one bowl.',
          equation: `${cash(cupPlate)} + ${cash(cupBowl)} = ${cash(cupPlate + cupBowl)}`,
        },
        {
          text: 'Remove the cost of two cups to find the cost of one plate and one bowl for (b).',
          equation: `${cash(cupPlate + cupBowl)} − 2 × ${cash(cup)} = ${cash(plate + bowl)}`,
        },
      ],
    );
  }

  if (variant === 1) {
    const plates = r.int(3, 4);
    const smallCups = r.int(1, 2);
    const extraCups = r.int(2, 3);
    const cups = smallCups + plates + extraCups;
    const total = cups * cup + plates * plate + bowl;
    const smallSet = smallCups * cup + bowl;
    const pair = cup + plate;
    const targetCups = cups - smallCups - 1;
    const targetPlates = plates - 1;
    const afterBowl = total - smallSet;
    const targetCost = targetCups * cup + targetPlates * plate;
    return make(
      [
        receipt([cups, plates, 1], total),
        receipt([smallCups, 0, 1], smallSet),
        receipt([1, 1, 0], pair),
      ],
      [[targetCups, targetPlates, 0], [0, 1, 0]],
      [targetCost, plate],
      'Remove the smaller set containing a bowl from the large set. Then use the price of a cup-and-plate pair.',
      [
        {
          text: `Remove the smaller set containing a bowl. There are ${cups - smallCups} cups and ${plates} plates left.`,
          equation: `${cash(total)} − ${cash(smallSet)} = ${cash(afterBowl)}`,
        },
        {
          text: `Remove one cup and one plate. The remaining ${targetCups} cups and ${targetPlates} plates give the cost for (a).`,
          equation: `${cash(afterBowl)} − ${cash(pair)} = ${cash(targetCost)}`,
        },
        {
          text: `From the items in (a), remove ${targetPlates} cup-and-plate pairs. This leaves ${extraCups} cups.`,
          equation: `${cash(targetCost)} − ${targetPlates} × ${cash(pair)} = ${cash(extraCups * cup)}`,
        },
        {
          text: 'Find the cost of one cup.',
          equation: `${cash(extraCups * cup)} ÷ ${extraCups} = ${cash(cup)}`,
        },
        {
          text: 'Remove the cup price from the pair price to find one plate for (b).',
          equation: `${cash(pair)} − ${cash(cup)} = ${cash(plate)}`,
        },
      ],
    );
  }

  const cups = r.pick([3, 4, 6]);
  const pairs = r.int(2, 4);
  const plateBowl = plate + bowl;
  const cupPlate = cup + plate;
  const total = cups * cup + pairs * plateBowl;
  return make(
    [
      receipt([cups, pairs, pairs], total),
      receipt([0, 1, 1], plateBowl),
      receipt([1, 1, 0], cupPlate),
    ],
    [[1, 0, 0], [0, 0, 1]],
    [cup, bowl],
    'Group each plate with a bowl. Remove those pairs first, then use the other pair price.',
    [
      {
        text: `Remove ${pairs} plate-and-bowl pairs from the large set. Only ${cups} cups remain.`,
        equation: `${cash(total)} − ${pairs} × ${cash(plateBowl)} = ${cash(cups * cup)}`,
      },
      {
        text: 'Find the cost of one cup for (a).',
        equation: `${cash(cups * cup)} ÷ ${cups} = ${cash(cup)}`,
      },
      {
        text: 'Remove the cup price from the cup-and-plate price to find one plate.',
        equation: `${cash(cupPlate)} − ${cash(cup)} = ${cash(plate)}`,
      },
      {
        text: 'Remove the plate price from the plate-and-bowl price to find one bowl for (b).',
        equation: `${cash(plateBowl)} − ${cash(plate)} = ${cash(bowl)}`,
      },
    ],
  );
}

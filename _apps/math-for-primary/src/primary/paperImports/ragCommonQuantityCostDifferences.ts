import {Rng, hashString} from '../../engine/random';
import type {Question} from '../generate';

export const RAG_PATTERN = {
  id: 'rag-p5-common-quantity-from-cost-differences',
  level: 5,
  title: 'Find a quantity from cost differences',
  objective: 'Compare costs for equal quantities to find a common count or a combined count.',
  skillIds: ['P5.S.RATE.01', 'P5.S.RATE.02', 'P4.S.DEC.05'],
  canonicalPatternId: 'p5-common-quantity-from-cost-differences',
};

function money(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function greatestCommonFactor(a: number, b: number): number {
  while (b !== 0) {
    const remainder = a % b;
    a = b;
    b = remainder;
  }
  return a;
}

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const random = new Rng(hashString(key));
  const variantOffset = hashString(`${RAG_PATTERN.id}:${seed}:variant`) >>> 0;
  const variant = (variantOffset + (index >>> 0)) % 3;

  if (variant === 0) {
    const notebookCount = random.pick([5, 7, 9, 11, 13, 15]);
    const benPenCents = random.pick([55, 65, 75, 85]);
    const penDifferenceCents = random.pick([20, 30, 40, 50]);
    const ashaPenCents = benPenCents + penDifferenceCents;
    const ashaNotebookCents = random.pick([145, 165, 185, 205]);
    const priceDifferenceMultiplier = random.int(2, 5);
    const notebookDifferenceCents = penDifferenceCents * priceDifferenceMultiplier;
    const benNotebookCents = ashaNotebookCents + notebookDifferenceCents;
    const penCount = notebookCount * priceDifferenceMultiplier;
    const totalNotebookDifferenceCents = notebookCount * notebookDifferenceCents;
    const totalCents = penCount * ashaPenCents + notebookCount * ashaNotebookCents;

    const workedSteps = [
      {
        text: 'Find how much more Ben pays for each notebook.',
        equation: `${money(benNotebookCents)} − ${money(ashaNotebookCents)} = ${money(notebookDifferenceCents)}`,
      },
      {
        text: `Find Ben's extra cost for all ${notebookCount} notebooks.`,
        equation: `${notebookCount} × ${money(notebookDifferenceCents)} = ${money(totalNotebookDifferenceCents)}`,
      },
      {
        text: 'Find how much more Asha pays for each pen.',
        equation: `${money(ashaPenCents)} − ${money(benPenCents)} = ${money(penDifferenceCents)}`,
      },
      {
        text: 'Their totals are equal, so Asha pays as much extra for pens as Ben pays extra for notebooks. Use cents to find the number of pens.',
        equation: `${totalNotebookDifferenceCents} ÷ ${penDifferenceCents} = ${penCount} pens`,
      },
      {
        text: "Check Asha's total cost.",
        equation: `${penCount} × ${money(ashaPenCents)} + ${notebookCount} × ${money(ashaNotebookCents)} = ${money(totalCents)}`,
      },
      {
        text: "Check Ben's total cost. It is the same amount.",
        equation: `${penCount} × ${money(benPenCents)} + ${notebookCount} × ${money(benNotebookCents)} = ${money(totalCents)}`,
      },
    ];

    return {
      key,
      context: [
        `At one shop, Asha buys some pens at ${money(ashaPenCents)} each and ${notebookCount} notebooks at ${money(ashaNotebookCents)} each.`,
        `At another shop, Ben buys the same number of pens at ${money(benPenCents)} each and ${notebookCount} notebooks at ${money(benNotebookCents)} each.`,
        'They spend the same amount in total.',
      ],
      prompt: 'How many pens does Asha buy?',
      answer: String(penCount),
      unit: 'pens',
      hint: "Find Ben's extra cost for the notebooks. Asha's extra cost for the pens must balance this amount.",
      workedSteps,
      explanation: workedSteps.map(step => `${step.text} ${step.equation}`).join(' '),
    };
  }

  const name = random.pick(['Nadia', 'Farah', 'Iman', 'Devan']);
  const [eraserPackSize, pencilPackSize] = random.pick([
    [3, 4],
    [3, 5],
    [4, 6],
    [4, 5],
    [2, 5],
  ]);
  const batchSize = eraserPackSize * pencilPackSize /
    greatestCommonFactor(eraserPackSize, pencilPackSize);
  const eraserPackCents = random.int(12, 31) * 10 + 5;
  const comparablePencilPackCents = eraserPackCents * pencilPackSize / eraserPackSize;
  const pencilPackCents = Math.floor(comparablePencilPackCents / 10) * 10 +
    5 + random.int(2, 8) * 10;
  const eraserPacksPerBatch = batchSize / eraserPackSize;
  const pencilPacksPerBatch = batchSize / pencilPackSize;
  const eraserBatchCents = eraserPacksPerBatch * eraserPackCents;
  const pencilBatchCents = pencilPacksPerBatch * pencilPackCents;
  const batchDifferenceCents = pencilBatchCents - eraserBatchCents;
  const batchCount = random.int(2, 9);
  const totalDifferenceCents = batchDifferenceCents * batchCount;
  const commonCount = batchSize * batchCount;
  const askCombined = variant === 2;
  const answer = askCombined ? 2 * commonCount : commonCount;

  const workedSteps = [
    {
      text: `Compare equal batches of ${batchSize} erasers and ${batchSize} pencils. ${batchSize} is the smallest common multiple of the two pack sizes.`,
      equation: `${eraserPackSize} × ${eraserPacksPerBatch} = ${pencilPackSize} × ${pencilPacksPerBatch} = ${batchSize}`,
    },
    {
      text: `Find the cost of ${batchSize} erasers.`,
      equation: `${eraserPacksPerBatch} × ${money(eraserPackCents)} = ${money(eraserBatchCents)}`,
    },
    {
      text: `Find the cost of ${batchSize} pencils.`,
      equation: `${pencilPacksPerBatch} × ${money(pencilPackCents)} = ${money(pencilBatchCents)}`,
    },
    {
      text: `Find the cost difference for ${batchSize} items of each kind.`,
      equation: `${money(pencilBatchCents)} − ${money(eraserBatchCents)} = ${money(batchDifferenceCents)}`,
    },
    {
      text: 'Use cents to find how many equal batches were bought.',
      equation: `${totalDifferenceCents} ÷ ${batchDifferenceCents} = ${batchCount} batches`,
    },
    {
      text: 'Find the number of pencils. The number of erasers is equal to this.',
      equation: `${batchCount} × ${batchSize} = ${commonCount}`,
    },
  ];

  if (askCombined) {
    workedSteps.push({
      text: 'Add the equal counts to find the number of items altogether.',
      equation: `${commonCount} + ${commonCount} = ${answer} items`,
    });
  }

  return {
    key,
    context: [
      `${name} needs an equal number of erasers and pencils for a class activity.`,
      `Erasers are sold in packs of ${eraserPackSize} for ${money(eraserPackCents)} per pack.`,
      `Pencils are sold in packs of ${pencilPackSize} for ${money(pencilPackCents)} per pack.`,
      `${name} buys only full packs. The pencils cost ${money(totalDifferenceCents)} more altogether than the erasers.`,
    ],
    prompt: askCombined
      ? `How many erasers and pencils does ${name} buy altogether?`
      : `How many pencils does ${name} buy?`,
    answer: String(answer),
    unit: askCombined ? 'items' : 'pencils',
    hint: 'Find a common multiple of the pack sizes. Compare the costs of that many erasers and that many pencils.',
    workedSteps,
    explanation: workedSteps.map(step => `${step.text} ${step.equation}`).join(' '),
  };
}

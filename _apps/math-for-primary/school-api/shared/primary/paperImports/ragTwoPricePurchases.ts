import type {Question} from '../generate';

export const RAG_PATTERN = {
  id: 'rag-p5-two-price-purchases',
  level: 5,
  title: 'Work out prices from two purchases',
  objective: 'Use two purchase totals to find unit prices, a new total cost or an affordable quantity.',
  skillIds: ['P5.S.RATE.02', 'P4.S.DEC.05', 'P4.S.DEC.06'],
  canonicalPatternId: 'p5-two-price-purchase-equations',
};

type Steps = NonNullable<Question['workedSteps']>;
const amount = (cents: number): string => (cents / 100).toFixed(2);
const dollars = (cents: number): string => '$' + amount(cents);

function hash(value: string): number {
  let state = 2166136261;
  for (let i = 0; i < value.length; i++) {
    state = Math.imul(state ^ value.charCodeAt(i), 16777619);
  }
  return state >>> 0;
}

function randomIntegers(initial: number): (low: number, high: number) => number {
  let state = initial;
  return (low, high) => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    const fraction = ((value ^ (value >>> 14)) >>> 0) / 4294967296;
    return low + Math.floor(fraction * (high - low + 1));
  };
}

export function makeRagQuestion(seed: number, index = 0): Question {
  const draw = randomIntegers(hash(`${seed}:${index}`));
  const slot = ((Math.trunc(index) % 4) + 4) % 4;
  const variant = (hash(String(seed)) % 4 + slot) % 4;
  const context = [
    'At the school shop, all notebooks have the same price and all markers have the same price. These prices stay the same for every purchase.',
  ];
  const finish = (prompt: string, answer: string, unit: string, hint: string, steps: Steps): Question => ({
    key: `${RAG_PATTERN.id}:${seed}:${index}`,
    context,
    prompt,
    answer,
    unit,
    hint,
    workedSteps: steps,
    explanation: steps.map(step => `${step.text} ${step.equation ?? ''}`.trim()).join(' '),
  });
  const quantityPrompt = (budget: number): string =>
    `With ${dollars(budget)}, how many markers can be bought if all the money is spent on markers?`;

  if (variant === 3) {
    // Construct an exact same-budget comparison with positive integer-cent prices.
    const gap = draw(3, 6);
    const multiple = draw(2, 4);
    const markerCount = draw(3, 8);
    const priceUnit = draw(4, 10) * 5;
    const pureNotebooks = gap * multiple;
    const mixedNotebooks = pureNotebooks - gap;
    const notebookPrice = markerCount * priceUnit;
    const markerPrice = gap * priceUnit;
    const budget = pureNotebooks * notebookPrice;
    const mixedNotebookCost = mixedNotebooks * notebookPrice;
    const mixedMarkerCost = budget - mixedNotebookCost;
    const affordable = budget / markerPrice;
    context.push(
      `A purchase of ${mixedNotebooks} notebooks and ${markerCount} markers costs ${dollars(budget)}.`,
      `Buying only ${pureNotebooks} notebooks costs ${dollars(budget)}.`,
    );
    return finish(quantityPrompt(budget), String(affordable), 'markers',
      'Use the notebook-only purchase to find one notebook price. Then work out the marker price.', [
        {text: 'Find the price of one notebook.', equation: `${dollars(budget)} ÷ ${pureNotebooks} = ${dollars(notebookPrice)}`},
        {text: 'Find the cost of the notebooks in the mixed purchase.', equation: `${mixedNotebooks} × ${dollars(notebookPrice)} = ${dollars(mixedNotebookCost)}`},
        {text: 'The rest of the mixed purchase total pays for its markers.', equation: `${dollars(budget)} − ${dollars(mixedNotebookCost)} = ${dollars(mixedMarkerCost)}`},
        {text: 'Find the price of one marker.', equation: `${dollars(mixedMarkerCost)} ÷ ${markerCount} = ${dollars(markerPrice)}`},
        {text: 'Divide the whole budget by the marker price.', equation: `${dollars(budget)} ÷ ${dollars(markerPrice)} = ${affordable} markers`},
      ]);
  }

  const firstNotebooks = draw(2, 3);
  const firstMarkers = draw(2, 5);
  const multiplier = draw(2, 3);
  const extraMarkers = draw(2, 4);
  const secondNotebooks = firstNotebooks * multiplier;
  const secondMarkers = firstMarkers * multiplier + extraMarkers;
  const notebookPrice = 300 + 25 * draw(0, 16);
  const markerPrice = 35 + 5 * draw(0, 29);
  const firstTotal = firstNotebooks * notebookPrice + firstMarkers * markerPrice;
  const secondTotal = secondNotebooks * notebookPrice + secondMarkers * markerPrice;
  const scaledTotal = firstTotal * multiplier;
  const extraCost = secondTotal - scaledTotal;
  context.push(
    `A purchase of ${firstNotebooks} notebooks and ${firstMarkers} markers costs ${dollars(firstTotal)}.`,
    `A purchase of ${secondNotebooks} notebooks and ${secondMarkers} markers costs ${dollars(secondTotal)}.`,
  );
  const steps: Steps = [
    {
      text: `Take ${multiplier} copies of the first purchase. They contain ${secondNotebooks} notebooks and ${firstMarkers * multiplier} markers.`,
      equation: `${dollars(firstTotal)} × ${multiplier} = ${dollars(scaledTotal)}`,
    },
    {
      text: `Both comparisons now contain ${secondNotebooks} notebooks, so their notebook costs are equal. Find the extra markers in the second purchase.`,
      equation: `${secondMarkers} − ${firstMarkers * multiplier} = ${extraMarkers}`,
    },
    {text: 'Subtract the totals to find the cost of those extra markers.', equation: `${dollars(secondTotal)} − ${dollars(scaledTotal)} = ${dollars(extraCost)}`},
    {text: 'Share that cost equally to find one marker price.', equation: `${dollars(extraCost)} ÷ ${extraMarkers} = ${dollars(markerPrice)}`},
  ];
  const hint = 'Multiply the first purchase so that both purchases contain the same number of notebooks. Then subtract their costs.';

  if (variant === 0) {
    return finish('What is the price of one marker?', amount(markerPrice), 'dollars', hint, steps);
  }
  if (variant === 1) {
    const affordable = draw(7, 24);
    const budget = affordable * markerPrice;
    steps.push({text: 'Use the marker price to find how many the budget buys.', equation: `${dollars(budget)} ÷ ${dollars(markerPrice)} = ${affordable} markers`});
    return finish(quantityPrompt(budget), String(affordable), 'markers', hint, steps);
  }

  // Avoid a target obtainable by merely scaling either given purchase.
  const targetOptions = [1, 2, 3, 4, 5].filter(count =>
    firstNotebooks * count !== firstMarkers && secondNotebooks * count !== secondMarkers);
  const targetMarkers = targetOptions[draw(0, targetOptions.length - 1)];
  const targetTotal = notebookPrice + targetMarkers * markerPrice;
  const knownMarkerCost = firstMarkers * markerPrice;
  steps.push(
    {
      text: `The ${firstMarkers} markers in the first purchase cost ${dollars(knownMarkerCost)}. Remove that cost and share the rest among its ${firstNotebooks} notebooks.`,
      equation: `(${dollars(firstTotal)} − ${dollars(knownMarkerCost)}) ÷ ${firstNotebooks} = ${dollars(notebookPrice)}`,
    },
    {text: 'Add the cost of one notebook to the cost of the requested markers.', equation: `${dollars(notebookPrice)} + ${targetMarkers} × ${dollars(markerPrice)} = ${dollars(targetTotal)}`},
  );
  return finish(
    `What is the total price of 1 notebook and ${targetMarkers} ${targetMarkers === 1 ? 'marker' : 'markers'}?`,
    amount(targetTotal), 'dollars', hint, steps,
  );
}

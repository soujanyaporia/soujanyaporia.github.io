import type {Question} from '../generate';

export const RAG_PATTERN = {
  id: 'rag-pack-promotion-optimisation',
  level: 6,
  title: 'Choose packs and offers',
  objective: 'Compare whole packs and individual purchases to find the least cost or greatest quantity.',
  skillIds: ['P5.S.RATE.02', 'P3.S.MD.02', 'P2.S.MONEY.03'],
  canonicalPatternId: 'pack-and-promotion-optimisation',
} as const;

type Step = NonNullable<Question['workedSteps']>[number];
const cash = (cents: number): string => (cents / 100).toFixed(2);

function randomFor(seed: number, index: number) {
  let state = 2166136261;
  const text = `pack-promotion-v1:${seed}:${index}`;
  for (let i = 0; i < text.length; i++) {
    state = Math.imul(state ^ text.charCodeAt(i), 16777619);
  }
  return (min: number, max: number): number => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return min + Math.floor(state / 4294967296 * (max - min + 1));
  };
}

export function makeRagQuestion(seed: number, index = 0): Question {
  const random = randomFor(seed, index);
  const variant = ((seed >>> 0) % 4 + (index >>> 0) % 4) % 4;
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const build = (
    context: string[], prompt: string, answer: string, unit: string,
    hint: string, steps: Step[], structuredResponse?: Question['structuredResponse'],
  ): Question => ({
    key, context, prompt, answer, unit, hint,
    workedSteps: steps,
    explanation: steps.map(step => `${step.text}${step.equation ? ` ${step.equation}` : ''}`).join(' '),
    ...(structuredResponse ? {structuredResponse} : {}),
  });

  if (variant === 0) {
    const size = random(4, 7);
    const singleCents = random(14, 28) * 5;
    const extraPackUseful = random(0, 1) === 1;
    const remainder = extraPackUseful ? size - 1 : random(1, size - 2);
    const target = random(2, 6) * size + remainder;
    const packCents = (size - 2) * singleCents + random(5, 10) * 5;
    const promotion = random(0, 1) === 1;
    const items = promotion ? 'muffins' : 'badges';
    const item = promotion ? 'muffin' : 'badge';
    const groups = promotion ? 'offers' : 'packs';
    const context = [
      `Zara needs at least ${target} ${items} for a class activity.`,
      `One ${item} costs ${singleCents} cents.`,
      promotion
        ? `Offer: Pay $${cash(packCents)} for ${size - 1} muffins and receive 1 free muffin.`
        : `A sealed pack of ${size} badges costs $${cash(packCents)}.`,
      `She may buy any number of complete ${groups} and single ${items}. She may keep any extra ${items}.`,
    ];
    const lastPackCount = Math.ceil(target / size);
    const plans = Array.from({length: lastPackCount + 1}, (_, packs) => {
      const singles = Math.max(0, target - packs * size);
      return {packs, singles, quantity: packs * size + singles, cost: packs * packCents + singles * singleCents};
    });
    let best = plans[0]!;
    for (const plan of plans) {
      if (plan.cost < best.cost || (plan.cost === best.cost && plan.quantity < best.quantity)) best = plan;
    }
    const steps: Step[] = [
      {text: 'Write the single-item price in dollars.', equation: `${singleCents} cents = $${cash(singleCents)}`},
      promotion
        ? {text: 'Count the free muffin as part of each complete offer.', equation: `${size - 1} + 1 = ${size} muffins`}
        : {text: `Each complete pack supplies ${size} badges.`},
      {text: `Compare 0 to ${lastPackCount} ${groups}. With ${lastPackCount} ${groups}, there are already enough ${items}; buying more complete ${groups} would cost more.`},
      ...plans.map(plan => ({
        text: `${plan.packs} ${groups} need ${plan.singles} single ${items} to reach the target.`,
        equation: `${plan.packs} × $${cash(packCents)} + ${plan.singles} × $${cash(singleCents)} = $${cash(plan.cost)}`,
      })),
      {
        text: `Choose ${best.packs} ${groups} and ${best.singles} single ${items}. This gives ${best.quantity} ${items}, enough for the activity.`,
        equation: `Least cost = $${cash(best.cost)}`,
      },
    ];
    return build(context, 'What is the least amount Zara needs to pay? Give your answer in dollars.',
      cash(best.cost), 'dollars',
      'Count all the items in each pack or offer. Compare packs with singles, including one more pack if it gives enough items.', steps);
  }

  if (variant === 1) {
    const size = random(3, 9);
    const packCents = random(15, 45) * 20;
    const affordablePacks = random(3, 8);
    const leftover = random(0, 3) === 0 ? 0 : random(1, packCents / 5 - 1) * 5;
    const budget = affordablePacks * packCents + leftover;
    const steps: Step[] = [
      {text: 'Find how many complete packs fit within the budget.', equation: `${affordablePacks} × $${cash(packCents)} = $${cash(affordablePacks * packCents)}`},
      {text: 'Check the money left.', equation: `$${cash(budget)} − $${cash(affordablePacks * packCents)} = $${cash(leftover)}`},
      {text: 'One more pack would exceed the budget.', equation: `${affordablePacks + 1} × $${cash(packCents)} = $${cash((affordablePacks + 1) * packCents)} > $${cash(budget)}`},
      {text: 'Count the beads in the affordable packs.', equation: `${affordablePacks} × ${size} = ${affordablePacks * size} beads`},
    ];
    return build([
      'A supply shop sells beads only in sealed packs.',
      `Each pack contains ${size} beads and costs $${cash(packCents)}.`,
      `The craft club can spend up to $${cash(budget)}.`,
      'Packs cannot be split, and no single beads are sold.',
    ], 'What is the greatest number of beads the club can buy?', String(affordablePacks * size), 'beads',
    'Find the number of whole packs the budget can pay for. Then count the beads in those packs.', steps);
  }

  if (variant === 2) {
    const size = random(4, 8);
    const singleCents = random(14, 30) * 5;
    const priceMode = random(0, 2);
    const packCents = size * singleCents + (priceMode === 0
      ? -random(1, size - 2) * singleCents
      : priceMode === 1 ? 0 : random(1, 12) * 5);
    const budget = random(2, 6) * packCents + random(0, packCents / 5 - 1) * 5;
    const lastPackCount = Math.floor(budget / packCents);
    const plans = Array.from({length: lastPackCount + 1}, (_, packs) => {
      const left = budget - packs * packCents;
      const singles = Math.floor(left / singleCents);
      return {packs, left, singles, quantity: packs * size + singles, cost: packs * packCents + singles * singleCents};
    });
    const maximum = Math.max(...plans.map(plan => plan.quantity));
    const best = plans.find(plan => plan.quantity === maximum)!;
    const steps: Step[] = [
      {text: `Try 0 to ${lastPackCount} whole packs. For each choice, use the remaining money to buy as many single erasers as possible.`},
      ...plans.map(plan => ({
        text: `After ${plan.packs} packs, $${cash(plan.left)} is left. It pays for ${plan.singles} single erasers.`,
        equation: `${plan.packs} × ${size} + ${plan.singles} = ${plan.quantity} erasers; total cost $${cash(plan.cost)}`,
      })),
      {text: 'Compare the quantities, keeping within the budget.', equation: `Greatest quantity = ${maximum} erasers`},
      {text: `One best choice is ${best.packs} packs and ${best.singles} single erasers.`, equation: `$${cash(budget)} − $${cash(best.cost)} = $${cash(budget - best.cost)} left`},
    ];
    return build([
      'A shop sells identical erasers singly and in sealed packs.',
      `One eraser costs $${cash(singleCents)}.`,
      `A sealed pack of ${size} erasers costs $${cash(packCents)}.`,
      `A pupil has $${cash(budget)} to spend on erasers.`,
      'The pupil may buy any number of whole packs and single erasers, without spending more than this amount.',
    ], 'What is the greatest number of erasers the pupil can buy?', String(maximum), 'erasers',
    'For each affordable number of packs, work out how many singles the remaining money buys. Compare the total quantities.', steps);
  }

  const adultCents = random(18, 31) * 100;
  const childCents = random(9, 16) * 100;
  const groupCents = 2 * adultCents + 2 * childCents - random(6, 14) * 100;
  const adultsOnly = random(2, 4);
  const adults = 2 * random(2, 4) + random(0, 1);
  const children = 2 * random(2, 4) + random(0, 1);
  const groupLimit = Math.min(Math.floor(adults / 2), Math.floor(children / 2));
  const plans = Array.from({length: groupLimit + 1}, (_, groups) => {
    const remainingAdults = adults - 2 * groups;
    const remainingChildren = children - 2 * groups;
    return {groups, remainingAdults, remainingChildren,
      cost: groups * groupCents + remainingAdults * adultCents + remainingChildren * childCents};
  });
  let best = plans[0]!;
  for (const plan of plans) if (plan.cost < best.cost) best = plan;
  const firstCost = adultsOnly * adultCents;
  const steps: Step[] = [
    {text: '(a) With no children, this party cannot use a group pass. Buy an individual pass for each adult.', equation: `${adultsOnly} × $${cash(adultCents)} = $${cash(firstCost)}`},
    {text: `(b) Each group pass needs 2 adults and 2 children. At most ${groupLimit} complete groups can be formed. Compare every possible number of group passes.`},
    ...plans.map(plan => ({
      text: `${plan.groups} group passes leave ${plan.remainingAdults} adults and ${plan.remainingChildren} children needing individual passes.`,
      equation: `${plan.groups} × $${cash(groupCents)} + ${plan.remainingAdults} × $${cash(adultCents)} + ${plan.remainingChildren} × $${cash(childCents)} = $${cash(plan.cost)}`,
    })),
    {text: `Use ${best.groups} group passes, ${best.remainingAdults} individual adult passes and ${best.remainingChildren} individual child passes.`, equation: `(b) Least cost = $${cash(best.cost)}`},
  ];
  return build([
    'A nature park sells these entry passes.',
    `An individual adult pass costs $${cash(adultCents)}.`,
    `An individual child pass costs $${cash(childCents)}.`,
    `A group pass for 2 adults and 2 children costs $${cash(groupCents)}.`,
    'Use a group pass only for a full group of 2 adults and 2 children. No visitor can use two pass places. Buy individual passes for everyone else. There are no other charges.',
    `(a) ${adultsOnly} adults visit without any children.`,
    `(b) Another party has ${adults} adults and ${children} children.`,
  ], 'Find (a) the total cost for the adults visiting without children and (b) the least cost for the other party. Give both amounts in dollars.',
  JSON.stringify([cash(firstCost), cash(best.cost)]), 'dollars',
  'Use the same price list for both parts. For part (b), count complete groups, then price the visitors left over.', steps,
  {kind: 'number-fields', fields: [
    {label: '(a) Cost in dollars', decimal: true},
    {label: '(b) Least cost in dollars', decimal: true},
  ]});
}

import {Rng, hashString} from '../../engine/random';
import type {Question} from '../generate';

export const RAG_PATTERN = {
  id: 'p5-purchase-combination-optimization',
  level: 5,
  title: 'Choose the least costly purchase',
  objective: 'Compare whole packs and single purchases to find a minimum cost or the greatest affordable quantity.',
  skillIds: ['P5.S.RATE.02', 'P4.S.DEC.05', 'P4.S.DEC.06'],
  canonicalPatternId: 'p5-purchase-combination-optimization',
} as const;

type Steps = NonNullable<Question['workedSteps']>;
type PackPlan = {large: number; small: number; singles: number; count: number; cost: number};
type TicketPlan = {b: number; a: number; adultSingles: number; childSingles: number; cost: number};
const cash = (cents: number): string => (cents / 100).toFixed(2);
const money = (cents: number): string => `$${cash(cents)}`;
const counted = (n: number, noun: string): string => `${n} ${noun}${n === 1 ? '' : 's'}`;
const explanation = (steps: Steps): string => steps.map(s => [s.text, s.equation].filter(Boolean).join(' ')).join(' ');
const cheapest = <T extends {cost: number}>(plans: T[]): T => plans.reduce((best, p) => p.cost < best.cost ? p : best);

// Keep the cheapest completion for every feasible number of large packs.
function exactPlans(quantity: number, smallSize: number, largeSize: number, unit: number, smallPrice: number, largePrice: number): PackPlan[] {
  const rows: PackPlan[] = [];
  for (let large = 0; large * largeSize <= quantity; large++) {
    let best: PackPlan | undefined;
    for (let small = 0; large * largeSize + small * smallSize <= quantity; small++) {
      const singles = quantity - large * largeSize - small * smallSize;
      const cost = large * largePrice + small * smallPrice + singles * unit;
      const plan = {large, small, singles, count: quantity, cost};
      if (!best || cost < best.cost) best = plan;
    }
    if (best) rows.push(best);
  }
  return rows;
}

function affordablePlans(budget: number, smallSize: number, largeSize: number, unit: number, smallPrice: number, largePrice: number): PackPlan[] {
  const rows: PackPlan[] = [];
  for (let large = 0; large * largePrice <= budget; large++) {
    for (let small = 0; large * largePrice + small * smallPrice <= budget; small++) {
      const singles = Math.floor((budget - large * largePrice - small * smallPrice) / unit);
      rows.push({large, small, singles,
        count: large * largeSize + small * smallSize + singles,
        cost: large * largePrice + small * smallPrice + singles * unit});
    }
  }
  return rows;
}

function planSteps(rows: PackPlan[], smallSize: number, largeSize: number, unit: number, smallPrice: number, largePrice: number): Steps {
  return [
    {text: 'For each possible number of large packs, fill the remaining quantity with as many small packs as fit, then singles. Each small pack saves money.',
      equation: `${smallSize} × ${money(unit)} = ${money(smallSize * unit)} > ${money(smallPrice)}`},
    ...rows.map(p => ({
      text: `With ${counted(p.large, 'large pack')}, the cheapest completion uses ${counted(p.small, 'small pack')} and ${counted(p.singles, 'single')}.`,
      equation: `${p.large} × ${largeSize} + ${p.small} × ${smallSize} + ${p.singles} = ${p.count} items; ${p.large} × ${money(largePrice)} + ${p.small} × ${money(smallPrice)} + ${p.singles} × ${money(unit)} = ${money(p.cost)}`,
    })),
  ];
}

export function makeRagQuestion(seed: number, index = 0): Question {
  const r = new Rng(hashString(`purchase-combination-v1:${seed}:${index}`));
  const variant = (((hashString(String(seed)) >>> 0) % 3 + Math.trunc(index) % 3) + 3) % 3;
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;

  if (variant === 0) {
    const smallSize = r.int(3, 6);
    const largeSize = 2 * smallSize + r.int(-1, 1);
    const unit = r.pick([90, 120, 140, 160]);
    const saving = 10 * r.int(3, 8);
    const smallPrice = smallSize * unit - saving;
    const largePrice = largeSize * unit - 2 * saving - 10 * r.int(1, 4);
    const quantity = largeSize * r.int(2, 4) + r.int(1, smallSize);
    const rows = exactPlans(quantity, smallSize, largeSize, unit, smallPrice, largePrice);
    const best = cheapest(rows);
    const workedSteps: Steps = [
      ...planSteps(rows, smallSize, largeSize, unit, smallPrice, largePrice),
      {text: 'Compare the costs for every possible number of large packs. Choose the least cost.', equation: `Least cost = ${money(best.cost)}`},
    ];
    return {
      key,
      context: [
        `Mei needs exactly ${quantity} notebooks for her club.`,
        'She may buy any number of the listed packs and single notebooks. She must not buy extra notebooks.',
      ],
      prompt: 'What is the least amount Mei can spend?',
      picture: {type: 'paper', layout: 'cards', heading: 'Notebook prices', cards: [
        {label: '1 notebook', value: money(unit)},
        {label: `Pack of ${smallSize} notebooks`, value: money(smallPrice)},
        {label: `Pack of ${largeSize} notebooks`, value: money(largePrice)},
      ]},
      answer: cash(best.cost), unit: 'dollars',
      hint: 'Try each possible number of large packs. Complete the required quantity with small packs and singles, then compare the costs.',
      workedSteps, explanation: explanation(workedSteps),
    };
  }

  if (variant === 1) {
    const adults = r.int(5, 8), children = r.int(2, 5);
    const adultPrice = 100 * r.pick([12, 14, 16, 18]);
    const childPrice = 100 * r.pick([6, 8, 9, 10]);
    const savingA = 100 * r.int(2, 5);
    const savingB = savingA + 100 * r.int(-1, 3);
    const priceA = adultPrice + childPrice - savingA;
    const priceB = 2 * adultPrice + childPrice - savingB;
    const rows: TicketPlan[] = [];
    for (let b = 0; b <= Math.min(Math.floor(adults / 2), children); b++) {
      let best: TicketPlan | undefined;
      for (let a = 0; a <= Math.min(adults - 2 * b, children - b); a++) {
        const adultSingles = adults - 2 * b - a;
        const childSingles = children - b - a;
        const cost = b * priceB + a * priceA + adultSingles * adultPrice + childSingles * childPrice;
        const plan = {b, a, adultSingles, childSingles, cost};
        if (!best || cost < best.cost) best = plan;
      }
      if (best) rows.push(best);
    }
    const best = cheapest(rows);
    const workedSteps: Steps = [
      {text: 'Pack A costs less than an adult ticket and a child ticket bought separately.',
        equation: `${money(adultPrice)} + ${money(childPrice)} = ${money(adultPrice + childPrice)} > ${money(priceA)}`},
      {text: 'Try every possible number of Pack B. For each choice, use as many Pack A as the remaining adults and children allow, then buy single tickets.'},
      ...rows.map(p => ({
        text: `${p.b} of Pack B, ${p.a} of Pack A, ${counted(p.adultSingles, 'single adult ticket')} and ${counted(p.childSingles, 'single child ticket')}.`,
        equation: `${p.b} × ${money(priceB)} + ${p.a} × ${money(priceA)} + ${p.adultSingles} × ${money(adultPrice)} + ${p.childSingles} × ${money(childPrice)} = ${money(p.cost)}`,
      })),
      {text: 'Compare these costs. Every person has exactly one ticket in each plan.', equation: `Least cost = ${money(best.cost)}`},
    ];
    return {
      key,
      context: [
        `A group needs tickets for exactly ${adults} adults and ${children} children to visit a science centre.`,
        'Each person needs one ticket. The group may buy any number of each offer, but must not buy extra tickets.',
      ],
      prompt: 'What is the lowest total price for the group?',
      picture: {type: 'paper', layout: 'cards', heading: 'Admission offers', cards: [
        {label: '1 adult ticket', value: money(adultPrice)},
        {label: '1 child ticket', value: money(childPrice)},
        {label: 'Pack A: 1 adult ticket and 1 child ticket', value: money(priceA)},
        {label: 'Pack B: 2 adult tickets and 1 child ticket', value: money(priceB)},
      ]},
      answer: cash(best.cost), unit: 'dollars',
      hint: 'Keep separate counts for adults and children. Try each possible number of Pack B and complete each plan with Pack A and single tickets.',
      workedSteps, explanation: explanation(workedSteps),
    };
  }

  const smallSize = r.pick([4, 6]), largeSize = 2 * smallSize;
  const unit = r.pick([200, 250, 350, 400]);
  const smallPrice = smallSize * unit - 50 * r.int(1, 3);
  const largePrice = 2 * smallPrice - 50 * r.int(1, 2);
  const budget = smallPrice + unit * r.int(1, smallSize - 2) + r.pick([0, 50, 100]);
  const rollPackSize = r.pick([3, 4, 5]);
  const rollCount = 2 * rollPackSize, rollPrice = budget / 2;
  const target = largeSize + r.int(1, smallSize - 1);
  const affordable = affordablePlans(budget, smallSize, largeSize, unit, smallPrice, largePrice);
  const maximum = affordable.reduce((best, p) => p.count > best.count || (p.count === best.count && p.cost < best.cost) ? p : best);
  const rows = exactPlans(target, smallSize, largeSize, unit, smallPrice, largePrice);
  const minimum = cheapest(rows);
  const extra = minimum.cost - budget;
  const workedSteps: Steps = [
    {text: 'First find the money Ari has, using the bread-roll offer.',
      equation: `${rollCount} ÷ ${rollPackSize} = 2 packs; 2 × ${money(rollPrice)} = ${money(budget)}`},
    {text: '(a) Check every affordable combination of whole packs. For each combination, buy as many singles as the money left allows.'},
    ...affordable.map(p => {
      const left = budget - p.large * largePrice - p.small * smallPrice;
      return {
        text: `After ${counted(p.large, 'large pack')} and ${counted(p.small, 'small pack')}, ${money(left)} remains. It buys ${counted(p.singles, 'single muffin')}.`,
        equation: `${p.singles} × ${money(unit)} = ${money(p.singles * unit)}; ${p.singles + 1} × ${money(unit)} = ${money((p.singles + 1) * unit)} > ${money(left)}; ${p.large} × ${largeSize} + ${p.small} × ${smallSize} + ${p.singles} = ${p.count} muffins`,
      };
    }),
    {text: '(a) Select the greatest total among all the affordable combinations.', equation: `${maximum.count} muffins`},
    {text: `(b) Start again with the original money. Find the least cost of exactly ${target} muffins.`},
    ...planSteps(rows, smallSize, largeSize, unit, smallPrice, largePrice),
    {text: '(b) Subtract the original money from the least cost.', equation: `${money(minimum.cost)} − ${money(budget)} = ${money(extra)}`},
  ];
  return {
    key,
    context: [
      `Ari has just enough money for ${rollCount} bread rolls, sold in packs of ${rollPackSize} for ${money(rollPrice)} per pack.`,
      'Ari has not bought anything and decides to buy muffins instead. Any number of each offer may be bought, but packs cannot be split.',
      'For each part, start with all of the original money. Ari may leave some money unspent in part (a).',
    ],
    prompt: `(a) What is the greatest number of muffins Ari can buy? (b) What is the least extra money Ari needs to buy exactly ${target} muffins?`,
    picture: {type: 'paper', layout: 'cards', heading: 'Muffin prices', cards: [
      {label: '1 muffin', value: money(unit)},
      {label: `Pack of ${smallSize} muffins`, value: money(smallPrice)},
      {label: `Pack of ${largeSize} muffins`, value: money(largePrice)},
    ]},
    structuredResponse: {kind: 'number-fields', fields: [
      {label: '(a) Number of muffins'},
      {label: '(b) Extra money ($)', decimal: true},
    ]},
    answer: JSON.stringify([String(maximum.count), cash(extra)]),
    hint: 'Find the original money first. Compare affordable pack choices for (a). For (b), find the cheapest exact purchase before subtracting the original money.',
    workedSteps, explanation: explanation(workedSteps),
  };
}

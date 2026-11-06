import {Rng, hashString} from '../../engine/random';
import type {Question} from '../generate';

export const RAG_PATTERN = {
  id: 'rag-p5-budget-limited-purchases',
  level: 5,
  title: 'Shop within a budget',
  objective: 'Find the greatest number of items affordable when buying whole packs or individual items, including after an earlier purchase.',
  skillIds: ['P5.S.RATE.02', 'P4.S.DEC.05'],
  canonicalPatternId: 'budget-limited-purchases',
};

const money = (cents: number): string =>
  `$${Math.floor(cents / 100)}.${String(cents % 100).padStart(2, '0')}`;

export function makeRagQuestion(seed: number, index = 0): Question {
  const r = new Rng(hashString(`rag-budget-v1:${seed}:${index}`));
  const variant = ((hashString(`rag-budget-mode:${seed}`) >>> 0) + (index >>> 0)) % 3;
  const name = r.pick(['Alya', 'Dev', 'Hana', 'Wei']);
  const isPack = variant === 0;
  const packSize = isPack ? r.pick([4, 7, 8, 9]) : 1;
  const price = isPack
    ? r.pick([1400, 1800, 2300, 2700, 3200, 4600])
    : r.pick([120, 160, 180, 240, 260, 320, 360, 450]);
  const targetCount = r.int(2, 18);
  const smallestRemainder = isPack ? 100 : 1;
  const randomRemainder = isPack
    ? r.int(1, price / 100 - 1) * 100
    : r.int(1, price - 1);
  const remainderCases = [0, smallestRemainder, price - smallestRemainder, randomRemainder];
  const remainder = remainderCases[Math.floor((index >>> 0) / 3) % remainderCases.length];
  const available = targetCount * price + remainder;
  const priorCount = variant === 2 ? r.int(2, 7) : 0;
  const priorPrice = variant === 2 ? r.pick([150, 220, 280, 340]) : 0;
  const priorCost = priorCount * priorPrice;
  const budget = available + priorCost;
  const purchases = Math.floor(available / price);
  const leftover = available - purchases * price;
  const nextCost = (purchases + 1) * price;
  const answer = String(purchases * packSize);
  const context = [`${name} has ${money(budget)} for shopping.`];
  const workedSteps: NonNullable<Question['workedSteps']> = [];
  let prompt: string;
  let unit: string;
  let hint: string;
  let purchaseUnit: string;

  if (isPack) {
    context.push(`Crayons come in packs of ${packSize}. Each pack costs ${money(price)}.`);
    context.push('Only complete packs are sold; crayons cannot be bought separately.');
    prompt = `What is the greatest number of crayons ${name} can buy with this money?`;
    unit = 'crayons';
    purchaseUnit = 'packs';
    hint = 'Find how many complete packs the money can pay for. Then count the crayons in those packs.';
  } else if (variant === 1) {
    context.push(`A key ring costs ${money(price)}. Key rings are sold separately.`);
    prompt = `What is the greatest number of key rings ${name} can buy with this money?`;
    unit = 'key rings';
    purchaseUnit = 'key rings';
    hint = 'Divide the money by the price of one key ring. Count only whole key rings.';
  } else {
    context.push(`${name} first buys ${priorCount} notebooks at ${money(priorPrice)} each.`);
    context.push(`A pencil costs ${money(price)}. Pencils are sold separately.`);
    prompt = `What is the greatest number of pencils ${name} can buy with the money left?`;
    unit = 'pencils';
    purchaseUnit = 'pencils';
    hint = 'Find the notebook cost and subtract it from the starting money. Then count the whole pencils the rest can pay for.';
    workedSteps.push(
      {text: 'Find the cost of the notebooks.', equation: `${priorCount} × ${money(priorPrice)} = ${money(priorCost)}`},
      {text: 'Subtract the notebook cost to find the money left for pencils.', equation: `${money(budget)} − ${money(priorCost)} = ${money(available)}`},
    );
  }

  workedSteps.push(
    {
      text: `Divide the available money by the price. This pays for ${purchases} whole ${purchaseUnit}.`,
      equation: `${money(available)} ÷ ${money(price)} gives ${purchases} whole ${purchaseUnit}, with ${money(leftover)} left`,
    },
    {
      text: `Check the cost of ${purchases + 1} ${purchaseUnit}. It is more than the available money, so another purchase is not possible.`,
      equation: `${purchases + 1} × ${money(price)} = ${money(nextCost)} > ${money(available)}`,
    },
  );
  if (isPack) {
    workedSteps.push({
      text: `Multiply the number of packs by the ${packSize} crayons in each pack.`,
      equation: `${purchases} × ${packSize} = ${answer} crayons`,
    });
  }

  const question: Question = {
    key: `${RAG_PATTERN.id}:${seed}:${index}`,
    context,
    prompt,
    answer,
    unit,
    hint,
    workedSteps,
    explanation: `${workedSteps.map(step => `${step.text} ${step.equation ?? ''}`).join(' ')} The greatest number is ${answer} ${unit}.`,
  };
  if (isPack && (index >>> 0) % 2 === 0) {
    question.choices = r.shuffle([
      answer,
      String(purchases),
      String((purchases + 1) * packSize),
      String(Number(answer) + 1),
    ]);
  }
  return question;
}

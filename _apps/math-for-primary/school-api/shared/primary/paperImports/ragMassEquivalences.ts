import {Rng, hashString} from '../../engine/random';
import type {Picture, Question} from '../generate';
import type {BalanceItem, Batch9MiddlePicture} from './batch9MiddlePicture';

export const RAG_PATTERN = {
  id: 'p2-rag-mass-equivalences',
  level: 2,
  title: 'Find the mass of one toy',
  objective: 'Use equal pan loads or a combined scale reading to find a missing mass in grams.',
  skillIds: ['P2.S.MEASURE.02', 'P2.S.AS.01', 'P2.S.MD.01', 'P2.S.MD.02'],
  canonicalPatternId: 'mass-equivalences-in-diagrams',
};

type Row = Extract<Batch9MiddlePicture, {layout: 'balances'}>['rows'][number];
const pans = (...rows: Row[]): Picture => ({type: 'batch9-middle', layout: 'balances', rows});
const weight = (grams: number): BalanceItem => ({kind: 'weight', count: 1, grams});
const balls = (count: number): BalanceItem => ({kind: 'ball', count});

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const rng = new Rng(hashString(key));
  const variant = (hashString(String(seed)) + (index >>> 0)) % 4;
  const car: BalanceItem = {kind: 'car', count: 1};
  const finish = (
    toy: string, mass: number, picture: Picture, context: string[], hint: string,
    workedSteps: NonNullable<Question['workedSteps']>,
  ): Question => ({
    key, context, prompt: `How many grams does the toy ${toy} weigh?`, picture,
    answer: String(mass), unit: 'g', hint, workedSteps,
    explanation: workedSteps.map(step => `${step.text} ${step.equation}`).join(' '),
  });

  if (variant === 0) {
    const tin = 10 * rng.int(2, 4) + 5;
    const pouch = 10 * rng.int(5, 8) + 5;
    const label = 100 * rng.int(2, 4);
    const marks = rng.pick([2, 4, 6, 8]);
    const total = label + 10 * marks;
    const known = tin + pouch;
    const boat = total - known;
    return finish('boat', boat,
      {type: 'batch9-early', layout: 'mass-dial', maximum: 500, labelStep: 100, minorStep: 10, reading: total},
      ['A toy boat, a tin and a pouch are on the scale together.', `The tin weighs ${tin} g. The pouch weighs ${pouch} g.`],
      'Read the pointer for all three objects. Which two masses can you take away?', [
        {text: 'There are ten equal spaces between labels that are 100 g apart.', equation: '100 g ÷ 10 = 10 g'},
        {text: `Count ${marks} small spaces past ${label} g to reach the pointer.`, equation: `${label} g + ${10 * marks} g = ${total} g`},
        {text: 'Add the masses of the tin and the pouch.', equation: `${tin} g + ${pouch} g = ${known} g`},
        {text: 'Take their mass away to find the mass of the boat.', equation: `${total} g − ${known} g = ${boat} g`},
      ]);
  }

  if (variant === 1) {
    const ball = rng.int(12, 38);
    const carMass = rng.int(61, 125);
    const extra = rng.int(15, 36);
    const pair = carMass + ball;
    const lower = ball + extra;
    return finish('car', carMass, pans(
      {left: [car, balls(1)], right: [weight(pair)]},
      {left: [balls(1), weight(extra)], right: [weight(lower)]},
    ), [
      `On the top scale, the car and a ball balance ${pair} g.`,
      `On the bottom scale, the same ball and a weight marked ${extra} g balance ${lower} g.`,
    ], 'Start with the lower scale. How much of its load is the ball?', [
      {text: 'On the lower scale, take away the labelled weight to find the mass of the ball.', equation: `${lower} g − ${extra} g = ${ball} g`},
      {text: 'On the upper scale, take away the ball to find the mass of the car.', equation: `${pair} g − ${ball} g = ${carMass} g`},
    ]);
  }

  if (variant === 2) {
    const first = 5 * rng.int(3, 9);
    const second = 5 * rng.int(10, 23);
    const total = first + second;
    return finish('car', total, pans({left: [car], right: [weight(first), weight(second)]}),
      [`One pan holds a toy car. The other holds two weights marked ${first} g and ${second} g. The pans balance.`],
      'Both weights together balance the car.', [
        {text: 'Add the masses on the other pan to find the mass of the car.', equation: `${first} g + ${second} g = ${total} g`},
        {text: 'Check by taking away the smaller weight. The larger weight should be left.', equation: `${total} g − ${first} g = ${second} g`},
      ]);
  }

  const count = rng.int(2, 4);
  const ball = 10 * rng.int(2, 9);
  const total = (count + 1) * ball;
  const carMass = count * ball;
  return finish('car', carMass, pans(
    {left: [car], right: [balls(count)]},
    {left: [car, balls(1)], right: [weight(total)]},
  ), [
    `On the top scale, the car balances ${count} balls. All the balls weigh the same.`,
    `On the bottom scale, the same car and one ball balance ${total} g.`,
  ], 'Imagine putting balls in place of the car on the lower scale.', [
    {text: `The upper scale shows that the car weighs as much as ${count} balls. Count the extra ball on the lower scale.`, equation: `${count} balls + 1 ball = ${count + 1} balls`},
    {text: 'Share the mass of the lower load equally among those balls.', equation: `${total} g ÷ ${count + 1} = ${ball} g`},
    {text: `The car balances ${count} balls, so add that many equal masses.`, equation: `${count} × ${ball} g = ${carMass} g`},
  ]);
}

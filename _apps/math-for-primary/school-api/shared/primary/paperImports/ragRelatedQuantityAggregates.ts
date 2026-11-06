import {Rng, hashString} from '../../engine/random';
import type {Question} from '../generate';

export const RAG_PATTERN = {
  id: 'rag-related-quantity-aggregates',
  level: 6,
  title: 'Totals of related quantities',
  objective: 'Express related quantities using a letter, then combine them to find a total.',
  skillIds: ['P6.S.ALG.01', 'P6.S.ALG.02', 'P6.S.ALG.03'],
  canonicalPatternId: 'p6-repeated-or-related-quantity-aggregates',
};

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

function term(numerator: number, denominator: number, letter: string): string {
  const divisor = gcd(numerator, denominator);
  const n = numerator / divisor;
  const d = denominator / divisor;
  return `${n === 1 ? '' : n}${letter}${d === 1 ? '' : `/${d}`}`;
}

function expression(n: number, d: number, constant: number, letter: string): string {
  return `${term(n, d, letter)} ${constant < 0 ? '−' : '+'} ${Math.abs(constant)}`;
}

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const r = new Rng(hashString(key));
  // Consecutive indices visit all three variants for any integer seed.
  const variant = ((seed >>> 0) + (index >>> 0)) % 3;
  const letter = r.pick(['a', 'b', 'n', 't']);

  const make = (
    context: string[],
    prompt: string,
    answer: string,
    wrong: string[],
    unit: string,
    hint: string,
    steps: string[],
  ): Question => ({
    key,
    context,
    prompt,
    answer,
    choices: r.shuffle([answer, ...wrong]),
    unit,
    hint,
    workedSteps: steps.map(text => ({text})),
    explanation: steps.join(' '),
  });

  if (variant === 0) {
    const denominator = r.pick([2, 4, 5, 6, 8]);
    const extra = r.pick([4, 6, 7, 8, 9, 10, 12]);
    const share = term(1, denominator, letter);
    const omar = expression(1, denominator, extra, letter);
    const answer = expression(denominator + 2, denominator, extra, letter);
    return make(
      [
        `At a craft club, Nila has ${letter} beads.`,
        `Jaya has 1/${denominator} as many beads as Nila.`,
        `Jaya has ${extra} fewer beads than Omar.`,
        `${letter} is a positive multiple of ${denominator}.`,
      ],
      'Which expression gives the total number of beads the three children have?',
      answer,
      [
        expression(denominator + 2, denominator, -extra, letter),
        expression(1 + 2 * denominator, 1, extra, letter),
        expression(denominator + 1, denominator, extra, letter),
      ],
      'beads',
      'Write each child’s number of beads using the letter. Check who has more before adding all three amounts.',
      [
        `Jaya has ${share} beads.`,
        `Omar has ${extra} more beads than Jaya, so Omar has ${omar} beads.`,
        `Add the three amounts: ${letter} + ${share} + ${share} + ${extra}.`,
        `The letter terms add to ${term(denominator + 2, denominator, letter)}, so the total is ${answer} beads.`,
      ],
    );
  }

  if (variant === 1) {
    const notebooks = r.pick([4, 5, 6]);
    const games = r.pick([2, 4, 5]);
    const extra = r.pick([7, 9, 11, 14, 16, 18]);
    const notebookCost = term(notebooks, 1, letter);
    const gameCost = expression(notebooks, 1, extra, letter);
    const combinedBase = term(notebooks * games, 1, letter);
    const answer = expression(notebooks * games, 1, games * extra, letter);
    return make(
      [
        `Each notebook costs $${letter}.`,
        `The price of each board game is $${extra} more than the total price of ${notebooks} notebooks.`,
        `${letter} is a positive whole number.`,
      ],
      `Which expression gives the cost of ${games} board games, in dollars?`,
      answer,
      [
        expression(notebooks * games, 1, extra, letter),
        gameCost,
        expression(notebooks + games, 1, games * extra, letter),
      ],
      'dollars',
      'Find the price of one board game first. For several games, include the extra charge for every game.',
      [
        `The ${notebooks} notebooks cost ${notebookCost} dollars.`,
        `One board game costs ${gameCost} dollars.`,
        `For ${games} games, the notebook-cost parts total ${games} × ${notebookCost} = ${combinedBase} dollars.`,
        `The extra charges total ${games} × ${extra} = ${games * extra} dollars.`,
        `The total cost is ${answer} dollars.`,
      ],
    );
  }

  const redCount = r.pick([2, 3, 5, 6, 7]);
  const extra = r.pick([3, 4, 5, 6, 7, 8]);
  const redMass = term(redCount, 1, letter);
  const blueMass = expression(1, 1, extra, letter);
  const answer = expression(redCount + 1, 1, extra, letter);
  return make(
    [
      `One red parcel has a mass of ${letter} kg.`,
      `One blue parcel is ${extra} kg heavier than one red parcel.`,
      'All parcels of the same colour have the same mass.',
      `${letter} is positive.`,
    ],
    `Which expression gives the total mass of ${redCount} red parcels and 1 blue parcel, in kg?`,
    answer,
    [
      expression(redCount, 1, extra, letter),
      expression(redCount + 1, 1, redCount * extra, letter),
      expression(redCount + 1, 1, -extra, letter),
    ],
    'kg',
    'Find the mass of all the red parcels, then add the mass of the blue parcel once.',
    [
      `The ${redCount} red parcels have a total mass of ${redMass} kg.`,
      `The blue parcel has a mass of ${blueMass} kg.`,
      `Total mass = ${redMass} + ${letter} + ${extra} = ${answer} kg.`,
    ],
  );
}

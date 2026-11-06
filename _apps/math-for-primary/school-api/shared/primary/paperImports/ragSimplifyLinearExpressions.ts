import {Rng, hashString} from '../../engine/random';
import type {Question} from '../generate';

export const RAG_PATTERN = {
  id: 'rag-simplify-linear-expressions',
  level: 6,
  title: 'Collect letter terms and numbers',
  objective: 'Combine like terms and constants in linear expressions without brackets.',
  skillIds: ['P6.S.ALG.03'],
  canonicalPatternId: 'simplify-linear-expressions',
};

type Term = {
  amount: number;
  letter?: string;
  product?: readonly [number, number];
};

function renderTerms(terms: Term[]): string {
  return terms.map((term, i) => {
    const magnitude = Math.abs(term.amount);
    const body = term.product
      ? `${term.product[0]} × ${term.product[1]}`
      : term.letter
        ? `${magnitude === 1 ? '' : magnitude}${term.letter}`
        : String(magnitude);
    const sign = i === 0 ? (term.amount < 0 ? '−' : '') : (term.amount < 0 ? ' − ' : ' + ');
    return sign + body;
  }).join('');
}

function positiveFirst(terms: Term[]): Term[] {
  return [...terms.filter(t => t.amount > 0), ...terms.filter(t => t.amount < 0)];
}

export function makeRagQuestion(seed: number, index = 0): Question {
  if (!Number.isSafeInteger(seed) || !Number.isSafeInteger(index) || index < 0) {
    throw new RangeError('Use an integer seed and a nonnegative integer index.');
  }
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const r = new Rng(hashString(key));
  const variant = ((seed % 3 + index % 3) % 3 + 3) % 3;
  const letter = r.pick(['m', 'n', 'p', 't']);
  const variable = (amount: number): Term => ({amount, letter});
  const number = (amount: number): Term => ({amount});
  let terms: Term[];

  if (variant === 0) {
    const firstNumber = r.int(34, 92);
    const secondNumber = r.int(4, 23);
    const a = r.int(3, 13);
    const b = r.int(2, 11);
    const layout = r.int(0, 2);
    if (layout === 0) {
      terms = [number(firstNumber), variable(a), number(-secondNumber), variable(b)];
    } else if (layout === 1) {
      terms = [number(firstNumber), variable(a + b), number(secondNumber), variable(-a)];
    } else {
      terms = [number(firstNumber), variable(-1), variable(a), number(-secondNumber), variable(b)];
    }
  } else if (variant === 1) {
    const left = r.int(2, 9);
    const right = r.int(3, 9);
    const product = left * right;
    const subtractNumber = r.int(1, product - 1);
    const subtractCoefficient = r.int(2, 12);
    const remainingCoefficient = r.int(1, 12);
    terms = [
      variable(subtractCoefficient + remainingCoefficient),
      {amount: product, product: [left, right]},
      variable(-subtractCoefficient),
      number(-subtractNumber),
    ];
  } else {
    const a = r.int(2, 12);
    const b = r.int(2, 12);
    const subtractCoefficient = r.int(1, a + b - 1);
    terms = [variable(a), variable(b), variable(-subtractCoefficient)];
  }

  const display = renderTerms(terms);
  const letterTerms = terms.filter(t => t.letter !== undefined);
  const numberTerms = terms.filter(t => t.letter === undefined);
  const coefficient = letterTerms.reduce((sum, term) => sum + term.amount, 0);
  const constant = numberTerms.reduce((sum, term) => sum + term.amount, 0);
  const letterAnswer = `${coefficient === 1 ? '' : coefficient}${letter}`;
  const answer = letterAnswer + (constant === 0 ? '' : `+${constant}`);
  const workedSteps: NonNullable<Question['workedSteps']> = [];

  for (const term of terms) {
    if (term.product) {
      workedSteps.push({
        text: 'Do the numerical multiplication before adding or subtracting.',
        equation: `${term.product[0]} × ${term.product[1]} = ${term.amount}`,
      });
    }
  }
  const coefficientTerms = positiveFirst(letterTerms.map(t => ({amount: t.amount})));
  workedSteps.push({
    text: `Collect the ${letter}-terms. Each ${letter} counts as one ${letter}; add the positive coefficients, then subtract.`,
    equation: `${renderTerms(coefficientTerms)} = ${coefficient}`,
  });
  if (numberTerms.length > 0) {
    const constants = positiveFirst(numberTerms.map(t => ({amount: t.amount})));
    workedSteps.push({
      text: 'Combine the ordinary numbers separately.',
      equation: `${renderTerms(constants)} = ${constant}`,
    });
  }
  workedSteps.push({
    text: constant === 0
      ? `Keep the common letter ${letter}. A coefficient of 1 is left unwritten.`
      : 'Write the collected letter term followed by the number term. A coefficient of 1 is left unwritten.',
    equation: `${display} = ${letterAnswer}${constant === 0 ? '' : ` + ${constant}`}`,
  });

  return {
    key,
    prompt: 'Collect like terms to write this expression in its simplest form. Write the letter term first, followed by any number term. Leave out spaces in your answer.',
    display,
    answer,
    hint: 'Keep the sign attached to each term. Do any multiplication first, then collect matching letter terms and ordinary numbers separately.',
    workedSteps,
    explanation: workedSteps.map(step => `${step.text} ${step.equation}`).join(' '),
  };
}

import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';

export const RAG_PATTERN = {
  id: 'p1-read-tens-and-ones',
  level: 1,
  title: 'Read tens and ones',
  objective: 'Read a two-digit number or a collection and identify its tens and ones.',
  skillIds: ['P1.S.WN.02'],
  canonicalPatternId: 'read-tens-and-ones',
};

const forms = ['layout', 'picture', 'tens', 'match'] as const;
const numerals = Array.from({ length: 90 }, (_, i) => 10 + i).filter(n => n !== 19 && n !== 43);
const choiceNumerals = numerals.filter(n => n % 10 > 0 && n % 10 !== Math.floor(n / 10));

function units(count: number, unit: 'ten' | 'one') {
  return `${count} ${unit}${count === 1 ? '' : 's'}`;
}

function description(tens: number, ones: number) {
  return `${units(tens, 'ten')} and ${units(ones, 'one')}`;
}

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const rng = new Rng(hashString(key));
  const form = forms[((hashString(String(seed)) + index) >>> 0) % forms.length];
  const number = rng.pick(form === 'tens' ? choiceNumerals : numerals);
  const tens = Math.floor(number / 10);
  const ones = number % 10;
  const counts = description(tens, ones);
  const workedSteps = form === 'picture' ? [
    { text: `Each full box is one ten. Count the boxes to get ${units(tens, 'ten')}.`, equation: `${units(tens, 'ten')} = ${tens * 10}` },
    { text: `Count the loose pencils to get ${units(ones, 'one')}. The whole collection has ${counts}.`, equation: `${tens * 10} + ${ones} = ${number}` },
  ] : [
    { text: `The digit on the left is ${tens}. It stands for ${units(tens, 'ten')}.`, equation: `${units(tens, 'ten')} = ${tens * 10}` },
    { text: `The digit on the right is ${ones}. Together the digits show ${counts}.`, equation: `${tens * 10} + ${ones} = ${number}` },
  ];
  const base = { key, workedSteps, explanation: workedSteps.map(s => s.text).join(' ') };

  if (form === 'layout' || form === 'picture') {
    const pair = {
      answer: JSON.stringify([String(tens), String(ones)]),
      structuredResponse: { kind: 'number-pair' as const, firstLabel: 'Tens', secondLabel: 'Ones' },
    };
    if (form === 'layout') {
      return { ...base, ...pair, display: String(number),
        prompt: 'Fill in the tens and ones for this number.',
        hint: 'Read the digit on the left first. Then read the digit on the right.',
      };
    }
    return { ...base, ...pair,
      prompt: 'How many tens and how many ones do the pencils show?',
      context: ['Each full box holds 10 pencils. The pencils outside the boxes are loose.'],
      picture: { type: 'paper', layout: 'cards', cards: [
        { label: 'Full boxes', value: '10 pencils per box', icon: 'box', count: tens },
        { label: 'Loose pencils', value: 'Count one at a time', icon: 'pencil', count: ones },
      ] },
      hint: 'Count each full box as one ten. Then count each loose pencil as one.',
    };
  }

  if (form === 'tens') {
    return { ...base, display: String(number), context: [`Ones: ${ones}`],
      prompt: 'How many tens are in this number?',
      answer: String(tens), choices: rng.shuffle([tens, ones, 10 * tens, 10 * ones]).map(String),
      hint: 'The digit on the left tells you how many groups of ten there are.',
    };
  }

  const otherTens = tens === 9 ? 8 : tens + 1;
  const otherOnes = ones === 9 ? 8 : ones + 1;
  return { ...base, display: String(number),
    prompt: 'Which line shows the tens and ones in this number?',
    answer: counts,
    choices: rng.shuffle([counts, description(otherTens, ones), description(tens, otherOnes), description(otherTens, otherOnes)]),
    hint: 'Check the tens in each line, then check the ones.',
  };
}

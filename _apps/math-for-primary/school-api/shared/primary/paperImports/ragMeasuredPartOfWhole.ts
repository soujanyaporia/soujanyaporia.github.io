import type {Question} from '../generate';

export const RAG_PATTERN = {
  id: 'rag-p5-measured-part-of-whole',
  level: 5,
  title: 'Percentages of measurements',
  objective: 'Compare a measured part with the whole in matching units and express the fraction as a percentage.',
  skillIds: ['P5.S.PCT.02', 'P5.S.DEC.02'],
  canonicalPatternId: 'measured-part-of-whole',
};

function hash(text: string): number {
  let value = 2166136261;
  for (let i = 0; i < text.length; i++) {
    value = Math.imul(value ^ text.charCodeAt(i), 16777619);
  }
  return value >>> 0;
}

function format(value: number): string {
  return Number(value.toFixed(4)).toString();
}

export function makeRagQuestion(seed: number, index = 0): Question {
  const identity = `${seed}:${index}`;
  const pick = (label: string, values: readonly number[]): number =>
    values[hash(`${identity}:${label}`) % values.length];
  const mode = hash(`${identity}:mode`) % 3;

  // Each whole is divisible by 8 and 20. All selected percentages
  // therefore give an integer part in the smaller unit.
  const wholeSmall = mode === 0
    ? pick('whole', [400, 600, 800, 1200])
    : mode === 1
      ? pick('whole', [240, 360, 480])
      : pick('whole', [80, 120, 160, 240, 320]);
  const percentageTenths = pick('percentage', [
    50, 100, 125, 150, 200, 250, 350, 375, 400, 500,
    600, 625, 650, 700, 750, 800, 850, 875, 900, 950,
  ]);
  const part = wholeSmall * percentageTenths / 1000;
  const whole = mode === 0 ? wholeSmall / 1000
    : mode === 1 ? wholeSmall / 60 : wholeSmall;
  const wholeUnit = mode === 0 ? 'km' : mode === 1 ? 'hours' : 'cm';
  const partUnit = mode === 0 ? 'm' : mode === 1 ? 'minutes' : 'cm';
  const fraction = part / wholeSmall;
  const percentage = part * 100 / wholeSmall;
  const answer = format(percentage);

  const firstStep = mode === 0
    ? {
        text: 'Use metres for both lengths. One kilometre is 1000 metres.',
        equation: `${format(whole)} km = ${wholeSmall} m`,
      }
    : mode === 1
      ? {
          text: 'Use minutes for both times. One hour is 60 minutes.',
          equation: `${whole} hours = ${wholeSmall} minutes`,
        }
      : {
          text: 'Both lengths use centimetres. The complete length is the whole.',
          equation: `${wholeSmall} cm represents 100%`,
        };

  const question: Question = {
    key: `${RAG_PATTERN.id}:${identity}`,
    prompt: `What percentage of ${format(whole)} ${wholeUnit} is ${part} ${partUnit}?`,
    answer,
    unit: '%',
    hint: 'Use the same unit for both measurements. Divide the part by the whole, then multiply by 100.',
    explanation: `${firstStep.equation}. The part is ${part} ${partUnit} and the whole is ${wholeSmall} ${partUnit}. (${part} ÷ ${wholeSmall}) × 100 = ${answer}%.`,
    workedSteps: [
      firstStep,
      {
        text: 'Divide the part by the whole to find the fraction of the whole.',
        equation: `${part} ÷ ${wholeSmall} = ${format(fraction)}`,
      },
      {
        text: 'Multiply by 100 to express this fraction as a percentage.',
        equation: `${format(fraction)} × 100 = ${answer}%`,
      },
    ],
  };

  if (mode === 0) {
    const wrong = [...new Set([
      percentage / 10,
      percentage * 10,
      100 - percentage,
      percentage + 5,
    ].map(format))].filter(value => value !== answer);
    const options = [answer, ...wrong].slice(0, 4);
    const offset = hash(`${identity}:position`) % options.length;
    question.choices = [...options.slice(offset), ...options.slice(0, offset)];
  }

  return question;
}

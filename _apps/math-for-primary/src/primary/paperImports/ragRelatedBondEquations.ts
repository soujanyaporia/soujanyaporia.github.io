import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';

export const RAG_PATTERN = {
  id: 'related-number-bond-equations',
  level: 1,
  title: 'Equations for the same number bond',
  objective: 'Use the same whole and two parts to write related equations or check a given equation.',
  skillIds: ['P1.S.AS.03', 'P1.S.AS.04'],
  canonicalPatternId: 'related-number-bond-equations',
};

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const rng = new Rng(hashString(key));
  const variant = ((hashString(String(seed)) + index) % 4 + 4) % 4;

  if (variant === 0) {
    const [a, b] = rng.shuffle([rng.int(10, 16), rng.int(4, 8)]);
    const whole = a + b;
    return {
      key,
      prompt: 'Count the apples in each tray. Fill in both number sentences.',
      context: [
        '□ + □ = □   Start with Tray A, then add Tray B.',
        '□ − □ = □   Start with all the apples, then take away Tray B.',
      ],
      picture: {
        type: 'paper', layout: 'cards',
        cards: [
          { label: 'Tray A', value: '', icon: 'fruit', count: a },
          { label: 'Tray B', value: '', icon: 'fruit', count: b },
        ],
      },
      structuredResponse: {
        kind: 'number-fields',
        fields: [
          'Addition: first number', 'Addition: second number', 'Addition: total',
          'Subtraction: starting number', 'Subtraction: number taken away', 'Subtraction: number left',
        ].map(label => ({ label })),
      },
      answer: JSON.stringify([a, b, whole, whole, b, a].map(String)),
      hint: 'Count each tray on its own. Which tray is left when you take Tray B away?',
      workedSteps: [
        { text: `Tray A has ${a} apples. Tray B has ${b}.` },
        { text: 'Add the two counts to find how many apples there are altogether.', equation: `${a} + ${b} = ${whole}` },
        { text: 'Take Tray B away from the total to find Tray A again.', equation: `${whole} − ${b} = ${a}` },
      ],
      explanation: `Both sentences use the same ${whole} apples. Adding joins the trays. Taking away the ${b} apples in Tray B leaves the ${a} in Tray A.`,
    };
  }

  if (variant === 1) {
    const taken = rng.int(2, 8);
    const whole = 10 * rng.int(2, 9) + rng.int(0, taken - 1);
    const left = whole - taken;
    return {
      key,
      prompt: 'Use these three numbers to make an addition that puts the two parts back together.',
      display: `${whole} − ${taken} = ${left}`,
      numberSentence: { numbers: rng.shuffle([whole, taken, left]), operation: '+', chooseOperation: true },
      answer: `${left} + ${taken} = ${whole}`,
      hint: 'Find the number you started with. It goes after the equals sign in your addition.',
      workedSteps: [
        { text: `${taken} was taken from ${whole}, leaving ${left}.`, equation: `${whole} − ${taken} = ${left}` },
        { text: 'Add back the part that was taken away.', equation: `${left} + ${taken} = ${whole}` },
      ],
      explanation: `${left} and ${taken} are the parts of ${whole}. Either part can come first in the addition.`,
    };
  }

  if (variant === 2) {
    const whole = rng.int(7, 10);
    const small = rng.int(1, Math.floor((whole - 1) / 2));
    const large = whole - small;
    const [a, b] = rng.shuffle([small, large]);
    const incorrect = `${large} − ${small} = ${whole}`;
    return {
      key,
      prompt: 'Which equation gets this number bond wrong?',
      picture: {
        type: 'paper', layout: 'bars', totalLabel: `Whole: ${whole}`,
        rows: [{ label: 'Parts', parts: [a, b].map(n => ({ size: n, label: String(n) })) }],
      },
      choices: rng.shuffle([`${a} + ${b} = ${whole}`, `${b} + ${a} = ${whole}`, `${whole} − ${a} = ${b}`, incorrect]),
      answer: incorrect,
      hint: 'Add the two parts to check the whole. For subtraction, check which number comes first.',
      workedSteps: [
        { text: 'Adding the two parts in either order gives the whole.', equation: `${a} + ${b} = ${whole}` },
        { text: 'Taking a part from the whole leaves the other part.', equation: `${whole} − ${a} = ${b}` },
        { text: 'Check what happens when you take the smaller part from the larger part.', equation: `${large} − ${small} = ${large - small}` },
      ],
      explanation: `${large} minus ${small} gives ${large - small}. The equation that gives ${whole} for this subtraction is wrong.`,
    };
  }

  const whole = rng.int(12, 20);
  const small = rng.int(2, Math.floor((whole - 1) / 2));
  const [a, b] = rng.shuffle([small, whole - small]);
  const take = rng.pick([a, b]);
  const subtraction = (part: number) => `${whole} − ${part} = ${whole - part}`;
  const otherParts = Array.from({ length: whole - 1 }, (_, i) => i + 1).filter(n => n !== a && n !== b);
  const choices = [subtraction(take), ...rng.shuffle(otherParts).slice(0, 3).map(subtraction)];
  return {
    key,
    prompt: 'Which subtraction uses the same two parts as this addition?',
    display: `${a} + ${b} = ${whole}`,
    choices: rng.shuffle(choices),
    answer: subtraction(take),
    hint: 'Start with the total. Look for one of the two parts being taken away.',
    workedSteps: [
      { text: `The parts are ${a} and ${b}. Together they make ${whole}.`, equation: `${a} + ${b} = ${whole}` },
      { text: `Take away the part ${take}. The other part is left.`, equation: subtraction(take) },
    ],
    explanation: `Both equations describe the same whole. Taking ${take} from ${whole} leaves ${whole - take}.`,
  };
}

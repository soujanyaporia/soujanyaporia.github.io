import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';

export const RAG_PATTERN = {
  id: 'p3-regrouping-a-product',
  level: 3 as const,
  title: 'Make new groups from the same total',
  objective: 'Find the total in equal groups, then use a new group size to find a count, a missing factor or a remainder.',
  skillIds: ['P3.S.MD.03', 'P3.S.MD.04', 'P3.S.MD.02'],
  canonicalPatternId: 'regrouping-a-product',
};

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const rng = new Rng(hashString(key));
  const kind = rng.pick(['count', 'factor', 'leftover'] as const);
  const smallFactor = rng.int(4, 8);
  const newSize = rng.pick([4, 5, 6, 7, 8, 9].filter(size =>
    kind === 'leftover' ? size > smallFactor : size !== smallFactor
  ));

  // Sample only products that fit the question. For loose beads, the new tube
  // is larger than the old bag, and at least one bead must remain outside it.
  const maxFactor = kind === 'leftover' ? 30 : 120;
  const possibleFactors = Array.from({ length: maxFactor - 11 }, (_, i) => 12 + i);
  const largeFactor = rng.pick(possibleFactors.filter(value => {
    const dividesExactly = (value * smallFactor) % newSize === 0;
    return kind === 'leftover' ? !dividesExactly : dividesExactly;
  }));
  const [first, second] = kind === 'count' ? [smallFactor, largeFactor] : [largeFactor, smallFactor];
  const total = first * second;
  const groups = Math.floor(total / newSize);
  const used = groups * newSize;
  const leftover = total - used;
  const productStep = {
    text: kind === 'factor' ? 'Find the value of the left side.' : 'Count the beads in all the bags.',
    equation: `${first} × ${second} = ${total}`,
  };

  function finish(details: Omit<Question, 'key' | 'answer' | 'explanation' | 'workedSteps'>,
    steps: { text: string; equation: string }[]): Question {
    return {
      ...details, key, answer: String(kind === 'leftover' ? leftover : groups),
      workedSteps: steps,
      explanation: steps.map(step => `${step.text} ${step.equation}.`).join(' '),
    };
  }

  if (kind === 'factor') {
    return finish({
      display: `${first} × ${second} = □ × ${newSize}`,
      prompt: 'What number goes in the box?',
      hint: 'Both sides must have the same value. How many groups of the number beside the box make that value?',
    }, [productStep,
      { text: 'Divide the total by the factor beside the box.', equation: `${total} ÷ ${newSize} = ${groups}` },
      { text: 'Check the right side.', equation: `${groups} × ${newSize} = ${total}` },
    ]);
  }

  if (kind === 'leftover') {
    const otherRemainders = Array.from({ length: newSize - 1 }, (_, i) => i + 1).filter(n => n !== leftover);
    const options = [leftover, ...rng.shuffle(otherRemainders).slice(0, 3)];
    return finish({
      context: [`Nora opens ${first} bags with ${second} beads in each bag.`,
        `She puts ${newSize} beads in each tube. She fills as many tubes as she can.`],
      prompt: 'How many loose beads are left?', unit: 'beads',
      choices: rng.shuffle(options.map(String)),
      hint: 'Count all the beads first. Find how many fit in full tubes.',
    }, [productStep,
      { text: `Find how many beads fit in ${groups} full tubes.`, equation: `${groups} × ${newSize} = ${used}` },
      { text: `Count the beads left. They are too few to fill another tube of ${newSize}.`, equation: `${total} − ${used} = ${leftover}` },
    ]);
  }

  const multipleChoice = rng.pick([true, false]);
  return finish({
    context: [`The school has ${first} bags with ${second} beads in each bag.`,
      `Each child gets ${newSize} beads to make a bracelet. All the beads are given out.`],
    prompt: multipleChoice ? 'How many children get beads?' : 'How many children get beads? Show your working on paper.',
    unit: 'children',
    choices: multipleChoice ? rng.shuffle([groups, Math.floor(second / newSize), groups + 1, total].map(String)) : undefined,
    hint: 'First count the beads in every bag together. Then count one child for each group of beads given out.',
  }, [productStep,
    { text: `Each group of ${newSize} beads goes to one child.`, equation: `${total} ÷ ${newSize} = ${groups} children` },
  ]);
}

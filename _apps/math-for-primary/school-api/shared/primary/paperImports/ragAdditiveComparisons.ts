import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';

export const RAG_PATTERN = {
  id: 'p3-additive-comparisons',
  level: 3,
  title: 'Find the larger amount',
  objective: 'Use a stated difference to find a larger amount, then combine the counts or follow a second comparison when asked.',
  skillIds: ['P3.S.AS.01'],
  canonicalPatternId: 'additive-comparisons',
};

type Step = { text: string; equation: string };

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const rng = new Rng(hashString(key));
  const form = rng.int(0, 5);
  function finish(fields: Omit<Question, 'key' | 'workedSteps' | 'explanation'>, steps: Step[]): Question {
    return {
      ...fields,
      key,
      workedSteps: steps,
      explanation: steps.map(step => `${step.text} ${step.equation}.`).join(' '),
    };
  }

  if (form < 3) {
    const smaller = rng.int(34, 69);
    const gap = rng.int(16, 29);
    const larger = smaller + gap;
    return finish({
      context: [`Two numbers are ${gap} apart. The smaller one is ${smaller}.`],
      prompt: 'What is the larger number? Show your working.',
      answer: String(larger),
      hint: 'Start at the smaller number. Count on by the gap between the numbers.',
    }, [
      { text: 'Add the gap to the smaller number.', equation: `${smaller} + ${gap} = ${larger}` },
    ]);
  }

  if (form < 5) {
    const red = rng.int(1600, 3950);
    const extra = rng.int(305, 780);
    const blue = red + extra;
    const total = red + blue;
    return finish({
      context: [`A shop has ${red} red beads. It has ${extra} more blue beads than red beads.`],
      prompt: '(a) How many blue beads does the shop have? (b) How many red and blue beads does it have in all? Show your working for both parts.',
      structuredResponse: {
        kind: 'number-pair',
        firstLabel: '(a) Blue beads',
        secondLabel: '(b) Red and blue beads in all',
      },
      answer: JSON.stringify([String(blue), String(total)]),
      hint: 'First find how many beads are blue. Then count the red beads and the blue beads together.',
    }, [
      { text: '(a) Add the extra beads to the red count to find the blue count.', equation: `${red} + ${extra} = ${blue} beads` },
      { text: '(b) Add the counts of both colours.', equation: `${red} + ${blue} = ${total} beads` },
    ]);
  }

  const red = rng.int(210, 475);
  const firstGap = rng.int(105, 295);
  const secondGap = rng.int(35, 69);
  const green = red + firstGap;
  const blue = green + secondGap;
  return finish({
    context: [
      `The red album holds ${red} stamps. The green album has ${firstGap} more stamps than the red album.`,
      `The green album has ${secondGap} fewer stamps than the blue album.`,
    ],
    prompt: 'How many stamps are in the blue album? Show your working.',
    unit: 'stamps',
    answer: String(blue),
    hint: 'Find the green album’s count first. Which album has more stamps, the green one or the blue one?',
  }, [
    { text: 'Add the first difference to find how many stamps are in the green album.', equation: `${red} + ${firstGap} = ${green} stamps` },
    { text: 'The green album has fewer stamps, so add the second difference to find the blue count.', equation: `${green} + ${secondGap} = ${blue} stamps` },
  ]);
}

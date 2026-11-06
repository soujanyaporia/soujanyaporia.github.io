import { hashString, Rng } from '../../engine/random';
import type { Question } from '../generate';

export const RAG_PATTERN = {
  id: 'p3-rag-additive-comparison',
  level: 3,
  title: 'Use a difference to find a missing count',
  objective: 'Find the other count from a stated difference, then find a total or the amount left.',
  skillIds: ['P3.S.AS.01'],
  canonicalPatternId: 'p3-additive-comparison',
};

type Story = Omit<Question, 'key' | 'explanation' | 'workedSteps'> & {
  workedSteps: { text: string; equation: string }[];
};

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const rng = new Rng(hashString(key));
  const variant = rng.int(0, 2);

  function finish(story: Story): Question {
    const explanation = story.workedSteps.map(step => `${step.text} ${step.equation}.`).join(' ');
    return { ...story, key, explanation };
  }

  if (variant === 0) {
    const red = rng.int(1540, 2690);
    const gap = rng.int(215, 485);
    const blue = red + gap;
    const total = red + blue;
    return finish({
      context: [
        `The red stall sold ${red} tickets at a fair.`,
        `The red stall sold ${gap} fewer tickets than the blue stall.`,
      ],
      prompt: 'How many tickets did the two stalls sell in all? Show your working.',
      answer: String(total),
      unit: 'tickets',
      hint: 'Which stall sold more tickets? Find its count before adding the two counts.',
      workedSteps: [
        { text: 'The blue stall sold more tickets, so add the difference to the red stall’s count.', equation: `${red} + ${gap} = ${blue}` },
        { text: 'Add the tickets sold by both stalls.', equation: `${red} + ${blue} = ${total}` },
      ],
    });
  }

  if (variant === 1) {
    const green = rng.int(81, 98);
    const gap = rng.int(16, 23);
    const used = rng.int(7, 13);
    const yellow = green - gap;
    const left = yellow - used;
    return finish({
      context: [
        `A green jar held ${green} beads. It held ${gap} more beads than a yellow jar.`,
        `Leela took ${used} beads from the yellow jar to make a bracelet.`,
      ],
      prompt: 'How many beads were left in the yellow jar?',
      answer: String(left),
      choices: rng.shuffle([left, yellow, green - used, green + gap - used].map(String)),
      unit: 'beads',
      hint: 'Work out how many beads were in the yellow jar before Leela took any.',
      workedSteps: [
        { text: 'The yellow jar started with fewer beads than the green jar.', equation: `${green} − ${gap} = ${yellow}` },
        { text: 'Take away the beads Leela used.', equation: `${yellow} − ${used} = ${left}` },
      ],
    });
  }

  const beans = rng.int(152, 236);
  const peas = rng.int(91, 135);
  const gap = rng.int(30, 55);
  const corn = beans - gap;
  const total = beans + peas + corn;
  return finish({
    context: [
      `The gardening club planted ${beans} seeds in the bean patch and ${peas} seeds in the pea patch.`,
      `The club planted ${gap} fewer seeds in the corn patch than in the bean patch.`,
    ],
    prompt: 'How many seeds did the club plant in all three patches?',
    answer: String(total),
    choices: rng.shuffle([total, beans + peas, peas + corn, beans + peas + beans + gap].map(String)),
    unit: 'seeds',
    hint: 'Use the bean patch to find the corn patch’s count. Then count each patch once.',
    workedSteps: [
      { text: 'Find how many seeds went into the corn patch.', equation: `${beans} − ${gap} = ${corn}` },
      { text: 'Add the seeds in the bean, pea and corn patches.', equation: `${beans} + ${peas} + ${corn} = ${total}` },
    ],
  });
}

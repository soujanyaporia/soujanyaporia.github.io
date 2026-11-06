import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';

export const RAG_PATTERN = {
  id: 'p3-quantity-and-its-multiple',
  level: 3,
  title: 'A count and its multiple',
  objective: 'Use equal groups to find a total, a smaller count or an increase, and tell when a count cannot be found.',
  skillIds: ['P3.S.MD.03', 'P3.S.MD.04', 'P3.S.AS.01', 'P3.S.GRAPH.01'],
  canonicalPatternId: 'quantity-and-its-multiple',
};

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const rng = new Rng(hashString(key));
  const task = rng.weighted([['total', 9], ['smaller', 5], ['missing', 2], ['increase', 1]] as const);
  const factor = rng.int(2, 6);

  function question(fields: Omit<Question, 'key' | 'explanation' | 'workedSteps'>,
                    steps: NonNullable<Question['workedSteps']>): Question {
    return {
      ...fields, key, workedSteps: steps,
      explanation: steps.map(s => [s.text, s.equation].filter(Boolean).join(' ')).join(' '),
    };
  }

  if (task === 'total') {
    const stars = rng.chance(0.5) ? rng.int(42, 96) : rng.int(105, 286);
    const moons = stars * factor;
    const total = stars + moons;
    return question({
      context: [
        `The art room has ${stars} star stickers.`,
        `It has ${factor} times as many moon stickers as star stickers.`,
      ],
      prompt: 'How many star and moon stickers are there in all?',
      unit: 'stickers', answer: String(total),
      choices: rng.chance(0.5)
        ? rng.shuffle([total, moons, moons - stars, 2 * stars + factor].map(String))
        : undefined,
      hint: 'First work out how many moon stickers there are. Which stickers must you still count?',
    }, [
      { text: 'Find the number of moon stickers.', equation: `${stars} × ${factor} = ${moons}` },
      { text: 'Count the star stickers as well.', equation: `${stars} + ${moons} = ${total} stickers` },
    ]);
  }

  if (task === 'smaller') {
    if (rng.chance(0.5)) {
      const fish = rng.int(12, 95) * factor;
      const birds = fish / factor;
      return question({
        context: [`An art club made ${fish} paper fish.`, `It made ${factor} times as many paper fish as paper birds.`],
        prompt: 'How many paper birds did the club make?',
        answer: String(birds), unit: 'paper birds',
        hint: 'Imagine splitting the fish into equal groups, each as big as the number of birds.',
      }, [
        { text: `The fish count is ${factor} equal groups. One group is the number of birds.` },
        { text: 'Find the size of one group.', equation: `${fish} ÷ ${factor} = ${birds} paper birds` },
      ]);
    }

    const scale = rng.pick([2, 5, 10]);
    const intervals = factor * rng.int(2, 3);
    // Keep both bar tops on grid lines and at most ten intervals high.
    const shorter = rng.int(Math.max(1, intervals - 10), Math.floor((intervals - 1) / 2));
    const [lin, raj] = rng.shuffle([shorter * scale, (intervals - shorter) * scale]);
    const both = lin + raj;
    const tess = both / factor;
    return question({
      context: ['The chart shows how many cards Lin and Raj folded.', `Together they folded ${factor} times as many cards as Tess.`],
      prompt: 'How many cards did Tess fold?',
      picture: { type: 'bars', labels: ['Lin', 'Raj'], values: [lin, raj], scale },
      unit: 'cards', answer: String(tess),
      hint: 'Read both bars using the scale. Whose count does their total help you find?',
    }, [
      { text: `Each small step on the scale stands for ${scale} cards. Lin folded ${lin} cards and Raj folded ${raj}.` },
      { text: 'Add the two counts.', equation: `${lin} + ${raj} = ${both} cards` },
      { text: `Their total is ${factor} equal groups of Tess's count. Find one group.`, equation: `${both} ÷ ${factor} = ${tess} cards` },
    ]);
  }

  if (task === 'missing') {
    const answer = 'There is too little information to tell.';
    return question({
      context: [`Jo has ${factor} times as many stamps as Imran. Each child has some stamps.`],
      prompt: 'How many stamps does Imran have?',
      answer, choices: rng.shuffle([answer, '1 stamp', `${factor} stamps`, `${factor + 1} stamps`]),
      hint: 'Try two different starting counts for Imran. Can both fit the clue?',
    }, [
      { text: 'If Imran has 2 stamps, Jo could have this many.', equation: `2 × ${factor} = ${2 * factor}` },
      { text: 'If Imran has 5 stamps, Jo could have this many instead.', equation: `5 × ${factor} = ${5 * factor}` },
      { text: 'Both pairs fit the clue. One more fact, such as their total number of stamps, would let us find Imran’s count.' },
    ]);
  }

  const start = rng.int(24, 185);
  const extraGroups = factor - 1;
  const extra = extraGroups * start;
  return question({
    context: [`A shop has ${start} notebooks on display.`, `It wants to display ${factor} times as many notebooks as it has on display now.`],
    prompt: 'How many more notebooks should the shop put on display?',
    answer: String(extra), unit: 'notebooks',
    hint: 'Count the notebooks on display as one group. How many more groups does the shop need?',
  }, [
    { text: 'One group is already on display. Find the number of groups to add.', equation: `${factor} − 1 = ${extraGroups}` },
    { text: `Each extra group has ${start} notebooks.`, equation: `${start} × ${extraGroups} = ${extra} notebooks` },
  ]);
}

import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';
import type { PaperPicture } from '../paperPicture';

export const RAG_PATTERN = {
  id: 'p2-paired-fact-boxes',
  level: 2,
  title: 'Fill both number sentences',
  objective: 'Use the number of pictured groups as a factor and as the divisor in a related division fact.',
  skillIds: ['P2.S.MD.01', 'P2.S.MD.02', 'P2.S.MD.04'],
  canonicalPatternId: 'p2-product-and-quotient-facts',
};

const settings = [
  { container: 'bag', plural: 'bags', label: 'Bag', items: 'apples', icon: 'fruit' },
  { container: 'box', plural: 'boxes', label: 'Box', items: 'pencils', icon: 'pencil' },
] as const;

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const rng = new Rng(hashString(key));
  const scene = rng.pick(settings);
  const groups = rng.pick([3, 4, 6, 7, 8, 9]);
  const perGroup = 2;
  const total = groups * perGroup;
  const picture: PaperPicture = {
    type: 'paper',
    layout: 'cards',
    cards: Array.from({ length: groups }, (_, i) => ({
      label: `${scene.label} ${i + 1}`,
      value: `Count the ${scene.items}`,
      icon: scene.icon,
      count: perGroup,
    })),
  };

  const productFact = `${groups} × ${perGroup} = ${total}`;
  const divisionFact = `${total} ÷ ${groups} = ${perGroup}`;
  return {
    key,
    prompt: 'Fill in both boxes using the picture.',
    context: [`Each ${scene.container} holds ${perGroup} ${scene.items}. There are ${total} ${scene.items} altogether.`],
    picture,
    structuredResponse: {
      kind: 'number-pair',
      firstLabel: `□ × ${perGroup} = ${total}`,
      secondLabel: `${total} ÷ □ = ${perGroup}`,
    },
    answer: JSON.stringify([String(groups), String(groups)]),
    hint: `Count the ${scene.plural}. Where does that number go in each sentence?`,
    workedSteps: [
      { text: `Count the ${scene.plural}. Each one holds a pair of ${scene.items}.`, equation: productFact },
      { text: `Divide all the ${scene.items} by the number of ${scene.plural} to find how many are in each one.`, equation: divisionFact },
    ],
    explanation: `Both boxes stand for the ${groups} ${scene.plural}. ${productFact}. Dividing the total among those ${scene.plural} gives ${divisionFact}.`,
  };
}

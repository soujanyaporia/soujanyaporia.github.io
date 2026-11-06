import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';

export const RAG_PATTERN = {
  id: 'rag-group-contributions',
  level: 1,
  title: 'Count what the groups use',
  objective: 'Find a total for two groups that use the same amount each, or check whether two packing plans use every item.',
  skillIds: ['P1.S.MD.01', 'P1.S.AS.01', 'P1.S.WN.04'],
  canonicalPatternId: 'p1-total-or-verify-group-contributions',
};

function compareWithSupply(needed: number, supply: number): string {
  if (needed === supply) return 'Every button is used.';
  if (needed < supply) return `${supply - needed} buttons would be left over.`;
  return `Mina would need ${needed - supply} more buttons.`;
}

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const r = new Rng(hashString(key));

  if ((seed + index) % 2 === 0) {
    const first = r.int(2, 5);
    const second = r.int(2, 5);
    const each = r.int(2, 4);
    const children = first + second;
    const total = children * each;
    return {
      key,
      context: [
        `There are ${first} children at the red table and ${second} children at the blue table.`,
        `Each child uses ${each} stickers to make a card.`,
      ],
      prompt: 'How many stickers do the children use altogether? Write a number sentence to show your answer.',
      answer: `${children} * ${each} = ${total}`,
      numberSentence: { numbers: [children, each], operation: '*', missingResult: true, chooseOperation: true, freeEntry: true },
      unit: 'stickers',
      hint: 'Count the children at both tables first. Each child uses the same number of stickers.',
      workedSteps: [
        { text: 'Count all the children.', equation: `${first} + ${second} = ${children}` },
        { text: `Count one group of ${each} stickers for each child.`, equation: `${children} × ${each} = ${total}` },
      ],
      explanation: `There are ${children} children. With ${each} stickers for each child, they use ${total} stickers altogether.`,
    };
  }

  const smallSize = r.int(2, 3);
  const largeSize = r.int(smallSize + 1, 5);
  const baseSmall = r.int(3, 5);
  // Start with a supply that both an all-small plan and a mixed plan can use exactly.
  const largeCounts = [2, 3, 4].filter(n => (n * largeSize) % smallSize === 0);
  const largeCount = r.pick(largeCounts);
  const supply = baseSmall * smallSize + largeCount * largeSize;
  const singleCount = supply / smallSize + r.pick([-1, 0, 0, 1]);
  const mixedSmall = baseSmall + r.pick([-1, 0, 0, 1]);
  const singleTotal = singleCount * smallSize;
  const smallButtons = mixedSmall * smallSize;
  const largeButtons = largeCount * largeSize;
  const mixedTotal = smallButtons + largeButtons;
  const verdictA = singleTotal === supply ? 'True' : 'False';
  const verdictB = mixedTotal === supply ? 'True' : 'False';
  const checkA = compareWithSupply(singleTotal, supply);
  const checkB = compareWithSupply(mixedTotal, supply);

  return {
    key,
    context: [
      `Mina has ${supply} buttons.`,
      `A full small bag holds ${smallSize} buttons. A full large bag holds ${largeSize} buttons.`,
      `Plan A: Fill ${singleCount} small bags only.`,
      `Plan B: Fill ${mixedSmall} small bags and ${largeCount} large bags.`,
    ],
    prompt: 'Try each plan with the same pile of buttons. Mark a plan True if it uses exactly all the buttons. Which marks go with A and B?',
    choices: ['A True, B True', 'A True, B False', 'A False, B True', 'A False, B False'],
    answer: `A ${verdictA}, B ${verdictB}`,
    hint: 'Count the buttons each plan needs. For Plan B, add the buttons in the small bags to the buttons in the large bags.',
    workedSteps: [
      { text: `Check Plan A against the pile of ${supply} buttons. ${checkA}`, equation: `${singleCount} × ${smallSize} = ${singleTotal}` },
      { text: 'Count the buttons in the small bags in Plan B.', equation: `${mixedSmall} × ${smallSize} = ${smallButtons}` },
      { text: 'Count the buttons in the large bags in Plan B.', equation: `${largeCount} × ${largeSize} = ${largeButtons}` },
      { text: `Put the two counts together and compare with ${supply}. ${checkB}`, equation: `${smallButtons} + ${largeButtons} = ${mixedTotal}` },
    ],
    explanation: `Plan A needs ${singleTotal} buttons. ${checkA} Its mark is ${verdictA}. Plan B needs ${mixedTotal} buttons. ${checkB} Its mark is ${verdictB}.`,
  };
}

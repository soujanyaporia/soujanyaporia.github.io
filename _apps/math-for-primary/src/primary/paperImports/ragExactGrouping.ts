import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';

export const RAG_PATTERN = {
  id: 'p1-rag-exact-grouping',
  level: 1,
  title: 'Can we use them all?',
  objective: 'Check whether all the objects can be shared equally or packed in full bags. Count any left over.',
  skillIds: ['P1.S.MD.02', 'P1.S.WN.01'],
  canonicalPatternId: 'test-exact-grouping-or-find-leftovers',
};

const storyTotals = [7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 19, 20];

function share(total: number, children: number) {
  const each = Math.floor(total / children);
  const given = each * children;
  const left = total - given;
  return {
    exact: left === 0,
    steps: [
      { text: `Give one to each child in turn. Each child gets ${each} after all the full rounds.`, equation: `${Array(children).fill(each).join(' + ')} = ${given}` },
      { text: left === 0 ? 'Every child has the same number and all the objects have been shared.' : `Another round needs ${children} objects. There are too few left for that.`, equation: `${total} − ${given} = ${left}` },
    ],
  };
}

function pack(total: number, bagSize: number) {
  const bags = Math.floor(total / bagSize);
  const packed = bags * bagSize;
  const left = total - packed;
  return {
    left,
    steps: [
      { text: `Count in groups of ${bagSize}. You can fill ${bags} ${bags === 1 ? 'bag' : 'bags'}.`, equation: `${Array(bags).fill(bagSize).join(' + ')} = ${packed}` },
      { text: left === 0 ? 'All the objects fit in full bags.' : `A full bag needs ${bagSize} objects. There are too few left to fill another bag.`, equation: `${total} − ${packed} = ${left}` },
    ],
  };
}

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const random = new Rng(hashString(key));
  const variant = random.pick(['trays', 'share', 'bags'] as const);

  if (variant === 'trays') {
    const trays = random.int(2, 4);
    const perTray = random.int(3, 5);
    const total = trays * perTray;
    const children = random.int(2, 5);
    const bagSize = random.pick([2, 3, 4, 5].filter(size => size !== children));
    const sharing = share(total, children);
    const packing = pack(total, bagSize);
    const first = sharing.exact ? 'True' : 'False';
    const second = packing.left === 0 ? 'True' : 'False';
    return {
      key,
      picture: {
        type: 'paper', layout: 'cards', heading: 'Apple trays',
        cards: Array.from({ length: trays }, (_, i) => ({ label: `Tray ${i + 1}`, value: 'Apples', icon: 'fruit', count: perTray })),
      },
      context: [
        `A. All the apples on the trays can be shared equally among ${children} children.`,
        `B. All the apples on the trays can go into full bags of ${bagSize} apples each.`,
      ],
      prompt: 'Look at the trays. Which choice tells you whether A and B are true or false?',
      choices: ['A: True, B: True', 'A: True, B: False', 'A: False, B: True', 'A: False, B: False'],
      answer: `A: ${first}, B: ${second}`,
      hint: 'Count the apples once. Try sharing them for A. Start again with all the apples for B.',
      workedSteps: [
        { text: 'Count the apples on all the trays.', equation: `${Array(trays).fill(perTray).join(' + ')} = ${total}` },
        ...sharing.steps,
        { text: 'For B, start with all the apples again.' },
        ...packing.steps,
      ],
      explanation: `There are ${total} apples. Sharing them among ${children} children makes A ${first.toLowerCase()}. Packing them in bags of ${bagSize} leaves ${packing.left} outside, so B is ${second.toLowerCase()}.`,
    };
  }

  const group = random.int(2, 5);
  const exact = variant === 'share' && random.chance(0.5);
  const total = random.pick(storyTotals.filter(n => n >= 2 * group && (n % group === 0) === exact));
  if (variant === 'share') {
    const sharing = share(total, group);
    return {
      key,
      context: [`Nora has ${total} beads for ${group} children.`],
      prompt: 'Can Nora use all the beads and give every child the same number?',
      choices: ['Yes', 'No'], answer: sharing.exact ? 'Yes' : 'No',
      hint: 'Give one bead to each child in turn. Can you finish a whole round each time?',
      workedSteps: sharing.steps,
      explanation: sharing.steps.map(step => `${step.equation}. ${step.text}`).join(' '),
    };
  }

  const packing = pack(total, group);
  return {
    key,
    context: [`There are ${total} buttons. A full bag holds ${group} buttons.`],
    prompt: 'Fill as many bags as you can. How many buttons are left outside the bags?',
    unit: 'buttons', answer: String(packing.left),
    hint: 'Count out one full bag at a time. Stop when you have too few buttons for another bag.',
    workedSteps: packing.steps,
    explanation: packing.steps.map(step => `${step.equation}. ${step.text}`).join(' '),
  };
}

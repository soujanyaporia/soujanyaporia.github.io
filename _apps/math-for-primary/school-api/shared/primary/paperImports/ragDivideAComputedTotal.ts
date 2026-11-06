import { Rng, hashString } from '../../engine/random';
import type { Proof, Question } from '../generate';

export const RAG_PATTERN = {
  id: 'rag-divide-a-computed-total',
  level: 1,
  title: 'How many in each share?',
  objective: 'Find how many objects are available, then share them equally among a known number of children or containers.',
  skillIds: ['P1.S.MD.02', 'P1.S.MD.01', 'P1.S.AS.01', 'P1.S.AS.02', 'P1.S.AS.04'],
  canonicalPatternId: 'divide-a-computed-total',
};

type Step = { text: string; equation: string };

// A different number of children from packets forces the pupil to regroup.
const packetPlans: { packets: number; size: number; children: number }[] = [];
for (let packets = 2; packets <= 5; packets++) {
  for (let size = 2; size <= 8 && packets * size <= 20; size++) {
    for (let children = 2; children <= 5; children++) {
      if (children !== packets && children !== size && (packets * size) % children === 0) {
        packetPlans.push({ packets, size, children });
      }
    }
  }
}

type SharingStory = {
  key: string;
  context: string[];
  item: string;
  groups: number;
  total: number;
  first: Step;
  calculation: Proof;
};

function finishSharing(story: SharingStory, intoCups = false): Question {
  const { key, context, item, groups, total, first, calculation } = story;
  const each = total / groups;
  const conclusion = intoCups ? `Each cup holds ${each} ${item}.` : `Each child gets ${each} ${item}.`;
  const second: Step = {
    text: intoCups ? `Put the same number of ${item} into each of the ${groups} cups.` : `Share the ${item} equally among the ${groups} children.`,
    equation: `${total} ÷ ${groups} = ${each}`,
  };
  const common = {
    key, context,
    hint: `First find how many ${item} there are to share. Then make ${groups} equal groups.`,
    explanation: `${first.equation}. ${second.equation}. ${conclusion}`,
    workedSteps: [first, second, { text: `Check that all ${total} ${item} have been shared.`, equation: `${groups} × ${each} = ${total}` }],
  };
  if (intoCups) {
    return {
      ...common,
      prompt: '(b) How many counters were left before sharing? How many go in each cup?',
      structuredResponse: { kind: 'number-pair', firstLabel: 'Counters left before sharing', secondLabel: 'Counters in each cup' },
      answer: JSON.stringify([String(total), String(each)]),
    };
  }
  return {
    ...common,
    prompt: `How many ${item} does each child get?`,
    answer: String(each), unit: item,
    proof: { op: '/', a: calculation, b: groups },
  };
}

export function makeRagQuestion(seed: number, index = 0): Question {
  const order = new Rng(hashString(`${RAG_PATTERN.id}:${seed}:order`)).shuffle(['packets', 'pool', 'remove', 'linked']);
  const slots = order.flatMap(kind => kind === 'linked' ? ['equation', 'cups'] : [kind]);
  const round = Math.floor(index / slots.length);
  const slot = slots[index - round * slots.length];
  const linked = slot === 'equation' || slot === 'cups';
  const rng = new Rng(hashString(`${RAG_PATTERN.id}:${seed}:${round}:${linked ? 'linked' : slot}`));
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;

  if (slot === 'packets') {
    const { packets, size, children } = rng.pick(packetPlans);
    const total = packets * size;
    return finishSharing({
      key, item: 'stickers', groups: children, total,
      context: [`Jia opens ${packets} packets of stickers. Each packet holds ${size} stickers.`, `A group of ${children} children shares all the stickers equally.`],
      first: { text: 'Count the stickers in all the packets.', equation: `${packets} × ${size} = ${total}` },
      calculation: { op: '*', a: packets, b: size },
    });
  }

  const groups = rng.int(2, 5);
  const total = groups * rng.int(slot === 'pool' ? 3 : 2, Math.floor(20 / groups));
  if (slot === 'pool') {
    const firstTray = rng.int(2, Math.floor((total - 1) / 2));
    const secondTray = total - firstTray;
    return finishSharing({
      key, item: 'beads', groups, total,
      context: [`One tray holds ${firstTray} beads. Another tray holds ${secondTray} beads.`, `${groups} children put all the beads together and share them equally.`],
      first: { text: 'Add the beads from both trays.', equation: `${firstTray} + ${secondTray} = ${total}` },
      calculation: { op: '+', a: firstTray, b: secondTray },
    });
  }

  const removed = rng.pick([2, 3, 6, 7, 8]);
  const start = total + removed;
  const calculation: Proof = { op: '-', a: start, b: removed };
  const equation = `${start} − ${removed} = ${total}`;
  if (!linked) {
    return finishSharing({
      key, item: 'buttons', groups, total, calculation,
      context: [`Siti has ${start} buttons. She uses ${removed} buttons on a coat.`, `She shares the rest equally among ${groups} children.`],
      first: { text: 'Take away the buttons sewn onto the coat.', equation },
    });
  }

  const context = [`Nico sets ${start} counters on a table. He puts ${removed} counters in his pocket.`, `He puts the rest into ${groups} cups, with the same number in each cup.`];
  const first = { text: 'Take away the counters that went into the pocket.', equation };
  if (slot === 'equation') {
    return {
      key, context,
      prompt: '(a) Write a number sentence to show how many counters are left on the table before Nico fills the cups.',
      numberSentence: { numbers: [start, removed], operation: '-', freeEntry: true, chooseOperation: true, missingResult: true },
      answer: equation,
      hint: 'Which counters can still go into the cups?',
      explanation: `${equation}. Nico has ${total} counters to share.`,
      workedSteps: [first, { text: 'Count the counters on the table and in the pocket to check the starting number.', equation: `${total} + ${removed} = ${start}` }],
    };
  }
  return finishSharing({ key, context, item: 'counters', groups, total, first, calculation }, true);
}

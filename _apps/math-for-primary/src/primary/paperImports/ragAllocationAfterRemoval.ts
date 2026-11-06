import type {Question} from '../generate';

export const RAG_PATTERN = {
  id: 'rag-p5-allocation-after-removal',
  level: 5,
  title: 'Pack and share what is left',
  objective: 'Use equal groups to find a remaining share or work backwards to a starting number.',
  skillIds: ['P5.S.WN.03', 'P5.S.RATE.02'],
  canonicalPatternId: 'p5-allocation-after-removal',
};

function hashText(text: string): number {
  let value = 2166136261;
  for (let i = 0; i < text.length; i++) {
    value = Math.imul(value ^ text.charCodeAt(i), 16777619);
  }
  return value >>> 0;
}

export function makeRagQuestion(seed: number, index = 0): Question {
  let state = hashText(`${RAG_PATTERN.id}:${seed}:${index}`);
  const int = (minimum: number, maximum: number): number => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return minimum + Math.floor(state / 4294967296 * (maximum - minimum + 1));
  };
  const variant = (hashText(String(seed)) + (index >>> 0)) % 3;
  const make = (
    context: string[], prompt: string, answer: number, unit: string,
    hint: string, workedSteps: NonNullable<Question['workedSteps']>,
    proof: NonNullable<Question['proof']>,
  ): Question => ({
    key: `${RAG_PATTERN.id}:${seed}:${index}`,
    context, prompt, answer: String(answer), unit, hint, workedSteps, proof,
    explanation: workedSteps.map(step => `${step.text} ${step.equation ?? ''}`.trim()).join(' '),
  });

  if (variant === 0) {
    const bags = [3, 4, 5, 6, 7, 9][int(0, 5)];
    const each = 16 + 2 * int(0, 7);
    const removed = 5 + 2 * int(0, 13);
    const finalTotal = bags * each;
    const beforeGift = finalTotal / 2;
    const original = beforeGift + removed;
    return make(
      [
        `Lina had some beads. She gave ${removed} beads to a friend.`,
        'Her aunt then gave her exactly as many beads as she had left.',
        `Lina put all her beads into ${bags} bags with ${each} beads in each bag. No beads were left over.`,
      ],
      'How many beads did Lina have at the start?', original, 'beads',
      'Start with the filled bags. Undo the matching gift, then add back the beads given away.',
      [
        {text: 'Find the total number of beads in the bags.', equation: `${bags} × ${each} = ${finalTotal} beads`},
        {text: 'The gift doubled the number she had left. Halve the final total to find the number before the gift.', equation: `${finalTotal} ÷ 2 = ${beforeGift} beads`},
        {text: 'Add back the beads she gave away to find the starting number.', equation: `${beforeGift} + ${removed} = ${original} beads`},
      ],
      {op: '+', a: {op: '/', a: {op: '*', a: bags, b: each}, b: 2}, b: removed},
    );
  }

  if (variant === 1) {
    const largeTrays = int(20, 59);
    const largeSize = 21 + 3 * int(0, 5);
    const smallSize = int(4, 9);
    const smallTrays = int(20, 69);
    const allocated = largeTrays * largeSize;
    const remaining = smallTrays * smallSize;
    const total = allocated + remaining;
    return make(
      [
        `A school kitchen made ${total} dumplings.`,
        `The cook filled ${largeTrays} large trays with ${largeSize} dumplings in each tray.`,
        `All the remaining dumplings were packed into small trays of ${smallSize} dumplings each. Every small tray was full, and no dumplings were left over.`,
      ],
      'How many small trays were filled?', smallTrays, 'trays',
      'Find how many dumplings went into the large trays before counting the small trays.',
      [
        {text: 'Find the number of dumplings in the large trays.', equation: `${largeTrays} × ${largeSize} = ${allocated} dumplings`},
        {text: 'Subtract these dumplings from the total.', equation: `${total} − ${allocated} = ${remaining} dumplings`},
        {text: 'Divide the remaining dumplings by the number in each small tray.', equation: `${remaining} ÷ ${smallSize} = ${smallTrays} trays`},
      ],
      {op: '/', a: {op: '-', a: total, b: {op: '*', a: largeTrays, b: largeSize}}, b: smallSize},
    );
  }

  const packets = int(20, 64);
  const packetSize = 18 + 6 * int(0, 5);
  const children = int(3, 9);
  const total = packets * packetSize;
  // Match the removed amount's remainder to the total for exact sharing.
  const removed = total % children + children * int(12, 20);
  const remaining = total - removed;
  const share = remaining / children;
  return make(
    [
      `An art club bought ${packets} packets of stickers, with ${packetSize} stickers in each packet.`,
      `The club used ${removed} stickers on a display.`,
      `All the remaining stickers were shared equally among ${children} children. No stickers were left over.`,
    ],
    'How many stickers did each child receive?', share, 'stickers',
    'Find the number of stickers bought, subtract those used, then share the rest equally.',
    [
      {text: 'Find the number of stickers in all the packets.', equation: `${packets} × ${packetSize} = ${total} stickers`},
      {text: 'Subtract the stickers used on the display.', equation: `${total} − ${removed} = ${remaining} stickers`},
      {text: 'Share the remaining stickers equally among the children.', equation: `${remaining} ÷ ${children} = ${share} stickers per child`},
    ],
    {op: '/', a: {op: '-', a: {op: '*', a: packets, b: packetSize}, b: removed}, b: children},
  );
}

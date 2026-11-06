import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';

export const RAG_PATTERN = {
  id: 'transfer-quantities',
  level: 3,
  title: 'Count the stickers before and after a gift',
  objective: 'Use equal counts or a known difference to find how many stickers the children had before or after a gift.',
  skillIds: ['P3.S.AS.01'],
  canonicalPatternId: 'reconstructing-quantities-around-a-transfer',
};

const variants = ['recipient-before-equal', 'giver-after', 'total-before', 'recipient-before-excess'] as const;

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const rng = new Rng(hashString(key));
  const offset = (hashString(String(seed)) + index) >>> 0;
  const variant = variants[offset % variants.length];
  const gift = rng.int(13, 34);
  // Leave room for both changes and for a final difference of up to 30.
  const knownCount = rng.int(2 * gift + 40, 320);
  const giftSentence = `Rani gave ${gift} stickers to Ben.`;
  const base = { key, unit: 'stickers' };

  if (variant === 'giver-after' || variant === 'total-before') {
    const eachBefore = knownCount - gift;
    const asksTotal = variant === 'total-before';
    const answer = asksTotal ? eachBefore + eachBefore : eachBefore - gift;
    return {
      ...base,
      context: [
        'Rani and Ben started with equal numbers of stickers.',
        giftSentence,
        `Ben counted ${knownCount} stickers after that.`,
      ],
      prompt: asksTotal ? 'How many stickers did the two children have altogether at the start?' : 'How many stickers did Rani have left?',
      answer: String(answer),
      hint: 'Ben counted his stickers after he received the gift. How many did he have just before it?',
      workedSteps: [
        { text: 'Take the gift out of Ben’s count to find how many he started with.', equation: `${knownCount} − ${gift} = ${eachBefore}` },
        asksTotal
          ? { text: 'Rani started with just as many as Ben. Add their two starting counts.', equation: `${eachBefore} + ${eachBefore} = ${answer}` }
          : { text: 'Rani also started with this many. Subtract the stickers she gave Ben.', equation: `${eachBefore} − ${gift} = ${answer}` },
      ],
      explanation: asksTotal
        ? `Each child started with ${eachBefore} stickers, so together they had ${answer} stickers.`
        : `Rani started with ${eachBefore} stickers. Giving Ben ${gift} left her with ${answer} stickers.`,
    };
  }

  const excess = variant === 'recipient-before-excess' ? rng.int(3, 30) : 0;
  const raniAfter = knownCount - gift;
  const benAfter = raniAfter - excess;
  const benBefore = benAfter - gift;
  return {
    ...base,
    context: [
      `Rani started with ${knownCount} stickers.`,
      giftSentence,
      excess === 0 ? 'They each had the same number of stickers after that.' : `After that, Rani had ${excess} more stickers than Ben.`,
    ],
    prompt: 'How many stickers did Ben have before Rani gave him any?',
    answer: String(benBefore),
    hint: 'Find how many stickers Rani kept. What does that tell you about Ben’s pile after the gift?',
    workedSteps: [
      { text: 'Find how many stickers Rani kept.', equation: `${knownCount} − ${gift} = ${raniAfter}` },
      excess === 0
        ? { text: `Their counts were equal after the gift, so Ben also had ${benAfter} stickers then.` }
        : { text: 'Rani had more stickers than Ben. Subtract the extra stickers from her count to find his.', equation: `${raniAfter} − ${excess} = ${benAfter}` },
      { text: 'Take the gift out of Ben’s pile to find how many he had before.', equation: `${benAfter} − ${gift} = ${benBefore}` },
    ],
    explanation: `Ben started with ${benBefore} stickers. The gift brought his count to ${benAfter}, ${excess === 0 ? 'the same as Rani’s count' : `${excess} fewer than Rani’s ${raniAfter}`}.`,
  };
}

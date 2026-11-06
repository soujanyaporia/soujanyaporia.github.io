import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';

export const RAG_PATTERN = {
  id: 'p2-fraction-from-part-counts',
  level: 2,
  title: 'Find a fraction from pieces',
  objective: 'Use counts of equal pieces to write the fraction of one whole used, given away or left.',
  skillIds: ['P2.S.FRAC.01', 'P2.S.FRAC.02', 'P2.S.AS.01'],
  canonicalPatternId: 'fraction-from-part-counts',
};

const forms = ['two-removed', 'two-used', 'give-and-keep', 'larger-removal'] as const;
const pieces = (n: number) => `${n} ${n === 1 ? 'piece' : 'pieces'}`;

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const rng = new Rng(hashString(key));
  const form = forms[((hashString(String(seed)) + index) >>> 0) % forms.length];
  // An odd total keeps the two labelled answers distinguishable even if swapped.
  const total = rng.pick(form === 'give-and-keep' ? [5, 7, 9, 11] : [5, 6, 7, 9, 11, 12]);
  const context = [`Mei cuts a ribbon into ${total} equal pieces.`];

  if (form === 'give-and-keep') {
    const given = rng.int(1, total - 1);
    const kept = total - given;
    context.push(`Mei gives ${pieces(given)} to Ali and keeps the rest.`);
    return {
      key, context,
      prompt: 'What fraction of the ribbon does Mei give away? What fraction does she keep? Use the original number of pieces as the bottom number in both fractions.',
      structuredResponse: {
        kind: 'number-fields',
        fields: [
          { label: 'Given away (top number)' }, { label: 'Given away (bottom number)' },
          { label: 'Kept (top number)' }, { label: 'Kept (bottom number)' },
        ],
      },
      answer: JSON.stringify([given, total, kept, total].map(String)),
      hint: 'Use the pieces Ali gets for the first fraction. Count the pieces still with Mei for the second.',
      workedSteps: [
        { text: 'Write the share Ali gets.', equation: `${given} out of ${total} = ${given}/${total}` },
        { text: 'Take those pieces away to find how many Mei keeps.', equation: `${total} − ${given} = ${kept}` },
        { text: 'Write the share Mei keeps using the same whole.', equation: `${kept} out of ${total} = ${kept}/${total}` },
      ],
      explanation: `Ali gets ${given}/${total} of the ribbon and Mei keeps ${kept}/${total}. Together their pieces make the whole ribbon.`,
    };
  }

  const relative = form === 'larger-removal';
  // For a larger second count, reserve one extra piece for the box and one piece to leave unused.
  const maxCard = relative ? Math.floor((total - 2) / 2) : total - 2;
  const card = rng.int(1, maxCard);
  const boxClue = rng.int(1, relative ? total - 2 * card - 1 : total - card - 1);
  const box = relative ? card + boxClue : boxClue;
  context.push(`Mei uses ${pieces(card)} for a card.`);
  const workedSteps: NonNullable<Question['workedSteps']> = [];
  if (relative) {
    context.push(`For a box, she uses ${pieces(boxClue)} more than she used for the card.`);
    workedSteps.push({ text: 'Add the extra pieces to find how many go on the box.', equation: `${card} + ${boxClue} = ${box}` });
  } else {
    context.push(`She uses ${pieces(box)} for a box.`);
  }

  const used = card + box;
  const askUsed = form === 'two-used';
  const requested = askUsed ? used : total - used;
  const answer = `${requested}/${total}`;
  workedSteps.push({ text: 'Count the pieces used for both crafts.', equation: `${card} + ${box} = ${used}` });
  if (!askUsed) {
    workedSteps.push({ text: 'Take all the used pieces away from the whole.', equation: `${total} − ${used} = ${requested}` });
  }
  workedSteps.push({ text: `Write the fraction ${askUsed ? 'used' : 'left'} out of the original ribbon.`, equation: `${requested} out of ${total} = ${answer}` });
  return {
    key, context, answer, workedSteps,
    prompt: askUsed ? 'What fraction of the ribbon does Mei use for the two crafts altogether?' : 'What fraction of the ribbon is left after both crafts?',
    hint: relative ? 'Work out how many pieces go on the box first. Then count all the pieces Mei uses.' : askUsed ? 'Count the pieces on the card and the box together.' : 'Find how many pieces both crafts use before you count what is left.',
    explanation: `The two crafts use ${pieces(used)} altogether. The fraction ${askUsed ? 'used' : 'left'} is ${answer} because the whole ribbon had ${total} equal pieces.`,
  };
}

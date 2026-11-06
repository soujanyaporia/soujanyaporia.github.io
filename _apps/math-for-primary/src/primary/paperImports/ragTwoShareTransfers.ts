import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';

export const RAG_PATTERN = {
  id: 'p3-two-share-transfers',
  level: 3,
  title: 'Moving items between two collections',
  objective: 'Use what is known before or after a move to find how many items moved or how many were in one collection.',
  skillIds: ['P3.S.AS.01', 'P3.S.MD.03', 'P3.S.MD.04'],
  canonicalPatternId: 'p3-transfers-between-two-shares',
};

type QuestionBody = Omit<Question, 'key'>;

function equaliseBoxes(rng: Rng): QuestionBody {
  // An even smaller collection guarantees that half the gap is a whole number.
  const green = 2 * rng.int(9, 24);
  const factor = rng.pick([2, 4, 6]);
  const blue = green * factor;
  const gap = blue - green;
  const move = gap / 2;
  return {
    context: [
      `The green box holds ${green} beads.`,
      `The blue box holds ${factor} times as many beads as the green box.`,
    ],
    prompt: 'How many beads should Siti move from the blue box to the green box so that the boxes hold equal numbers of beads?',
    answer: String(move),
    unit: 'beads',
    hint: 'Find how many more beads the blue box holds. What happens to that difference when you move one bead?',
    workedSteps: [
      { text: 'Find how many beads the blue box holds.', equation: `${green} × ${factor} = ${blue}` },
      { text: 'Find how many more beads are in the blue box.', equation: `${blue} − ${green} = ${gap}` },
      { text: 'Each bead moved takes one from blue and adds one to green. The difference drops by two each time.', equation: `${gap} ÷ 2 = ${move}` },
    ],
    explanation: `Move ${move} beads. Blue then holds ${blue} − ${move} = ${blue - move} beads and green holds ${green} + ${move} = ${green + move} beads.`,
    proof: { op: '/', a: { op: '-', a: { op: '*', a: green, b: factor }, b: green }, b: 2 },
  };
}

function findGiversFinalCount(rng: Rng): QuestionBody {
  const start = rng.int(40, 70);
  const move = rng.int(13, 21);
  const squareAfter = start + move;
  const roundAfter = start - move;
  return {
    context: [
      'Two trays started with the same number of buttons.',
      `Ravi moved ${move} buttons from the round tray to the square tray.`,
      `The square tray then held ${squareAfter} buttons.`,
    ],
    prompt: 'How many buttons were left in the round tray?',
    answer: String(roundAfter),
    unit: 'buttons',
    hint: 'Work back from the square tray. How many buttons did it hold before Ravi added any?',
    workedSteps: [
      { text: 'Take away the buttons that arrived in the square tray to find its starting count.', equation: `${squareAfter} − ${move} = ${start}` },
      { text: `The round tray also started with ${start} buttons. Subtract the buttons Ravi took from it.`, equation: `${start} − ${move} = ${roundAfter}` },
    ],
    explanation: `The round tray finished with ${roundAfter} buttons. Putting the ${move} buttons back would give it ${start} again, just as it had at the start.`,
    proof: { op: '-', a: { op: '-', a: squareAfter, b: move }, b: move },
  };
}

function findRecipientsStartingCount(rng: Rng): QuestionBody {
  const factor = rng.pick([2, 4, 5, 6]);
  const parts = factor + 1;
  const evanAfter = rng.int(35, 130);
  const total = parts * evanAfter;
  const move = rng.int(6, 19);
  const evanBefore = evanAfter - move;
  return {
    context: [
      `Priya and Evan had ${total} cards between them.`,
      `Priya passed ${move} of her cards to Evan.`,
      `After that, Priya had ${factor} times as many cards as Evan.`,
    ],
    prompt: 'How many cards did Evan start with?',
    answer: String(evanBefore),
    unit: 'cards',
    hint: 'Think of Evan’s pile after the move as one part. How many parts of that size do the children have together?',
    workedSteps: [
      { text: `After the move, Evan has one part and Priya has ${factor} parts of the same size. Count all the parts.`, equation: `1 + ${factor} = ${parts}` },
      { text: `The children still have all ${total} cards between them. Find the size of Evan’s one part.`, equation: `${total} ÷ ${parts} = ${evanAfter}` },
      { text: 'Take away the cards Priya passed to Evan to find his starting count.', equation: `${evanAfter} − ${move} = ${evanBefore}` },
    ],
    explanation: `Evan started with ${evanBefore} cards. Receiving ${move} brought his pile up to ${evanAfter}, one of the ${parts} equal parts.`,
    proof: { op: '-', a: { op: '/', a: total, b: { op: '+', a: 1, b: factor } }, b: move },
  };
}

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const rng = new Rng(hashString(key));
  const variants = [equaliseBoxes, findGiversFinalCount, findRecipientsStartingCount];
  const count = variants.length;
  const position = (Math.trunc(seed) % count + Math.trunc(index) % count + 2 * count) % count;
  return { key, ...variants[position](rng) };
}

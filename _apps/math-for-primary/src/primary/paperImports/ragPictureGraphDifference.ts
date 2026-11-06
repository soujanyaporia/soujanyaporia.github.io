import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';

export const RAG_PATTERN = {
  id: 'p1-rag-picture-graph-difference',
  level: 1 as const,
  title: 'Compare stamp collections',
  objective: 'Use a picture graph to find the difference between two named rows or to identify a row from a difference clue.',
  skillIds: ['P1.S.GRAPH.01', 'P1.S.AS.05'],
  canonicalPatternId: 'find-or-apply-a-difference',
};

const stampWord = (n: number) => n === 1 ? 'stamp' : 'stamps';

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const r = new Rng(hashString(key));
  const [first, second, third, fourth] = r.shuffle(['Jia', 'Harun', 'Mira', 'Nico', 'Kim', 'Zara']);
  const small = r.int(2, 5);
  const gap = r.int(1, 4);
  const large = small + gap;
  const others = r.shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9, 10].filter(n => n !== small && n !== large));
  const rows = r.shuffle([
    { name: first, count: small }, { name: second, count: large },
    { name: third, count: others[0] }, { name: fourth, count: r.chance(0.5) ? others[0] : others[1] },
  ]);
  const picture: Question['picture'] = {
    type: 'bars', pictures: true, scale: 1,
    labels: rows.map(row => row.name), values: rows.map(row => row.count),
  };
  const common = { key, picture, context: ['The graph shows four stamp collections. Each dot stands for 1 stamp.'] };

  if (r.int(1, 23) > 20) {
    return {
      ...common,
      prompt: `Who has ${gap} more ${stampWord(gap)} than ${first}?`,
      answer: second,
      hint: `Count the dots beside ${first}. Count on by ${gap}, then look for the row with that many dots.`,
      workedSteps: [
        { text: `Read ${first}’s row.`, equation: `${small} dots = ${small} stamps` },
        { text: `Count on by ${gap} to find the number you need.`, equation: `${small} + ${gap} = ${large}` },
        { text: `The row with ${large} dots belongs to ${second}.` },
      ],
      explanation: `${first} has ${small} stamps. ${gap} more makes ${large}. Only ${second} has ${large} stamps.`,
    };
  }

  const prompt = r.chance(0.5)
    ? `How many fewer stamps does ${first} have than ${second}?`
    : `How many more stamps does ${second} have than ${first}?`;
  return {
    ...common, prompt, answer: String(gap), unit: 'stamps',
    hint: 'Look at the two rows named in the question. Match their dots in pairs. How many dots have no partner?',
    workedSteps: [
      { text: 'Count the dots in the two named rows.', equation: `${first}: ${small} stamps; ${second}: ${large} stamps` },
      { text: `Find how many dots in ${second}’s row have no partner.`, equation: `${large} − ${small} = ${gap}` },
    ],
    explanation: `Pair ${small} dots in each row. That leaves ${gap} extra ${stampWord(gap)} in ${second}’s collection.`,
  };
}

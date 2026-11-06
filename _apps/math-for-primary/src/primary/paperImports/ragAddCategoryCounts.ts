import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';

export const RAG_PATTERN = {
  id: 'p1-rag-add-category-counts',
  level: 1 as const,
  title: 'Add counts from a picture graph',
  objective: 'Find two or three named groups in a picture graph and add their counts.',
  skillIds: ['P1.S.GRAPH.01', 'P1.S.AS.01', 'P1.S.AS.06'],
  canonicalPatternId: 'add-category-counts',
};

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const rng = new Rng(hashString(key));
  const rows = rng.shuffle(['Kai', 'Mira', 'Noor', 'Ravi', 'Zoe']).slice(0, 4)
    .map(name => ({ name, count: rng.int(1, 6) }));
  const selected = rng.shuffle([...rows]).slice(0, rng.int(2, 3));
  const [first, second, third] = selected;
  const names = selected.map(row => row.name);
  const nameList = `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
  const pairSum = first.count + second.count;
  const total = pairSum + (third?.count ?? 0);
  const workedSteps: NonNullable<Question['workedSteps']> = [
    {
      text: 'Find each child named in the question. Count the pictures for that child.',
      equation: selected.map(row => `${row.name}: ${row.count}`).join(', '),
    },
    {
      text: `Add the shells that ${first.name} and ${second.name} collected.`,
      equation: `${first.count} + ${second.count} = ${pairSum}`,
    },
  ];
  if (third) {
    workedSteps.push({
      text: `Now add the shells that ${third.name} collected.`,
      equation: `${pairSum} + ${third.count} = ${total}`,
    });
  }
  return {
    key,
    context: ['The graph shows how many shells each child collected. Each picture stands for 1 shell.'],
    picture: {
      type: 'bars', pictures: true, scale: 1,
      labels: rows.map(row => row.name), values: rows.map(row => row.count),
    },
    prompt: `How many shells did ${nameList} collect in all?`,
    answer: String(total),
    unit: 'shells',
    hint: 'Look for the names in the question. Count their shells and add those counts.',
    workedSteps,
    explanation: `${selected.map(row => row.count).join(' + ')} = ${total}. Together, ${nameList} collected ${total} shells.`,
  };
}

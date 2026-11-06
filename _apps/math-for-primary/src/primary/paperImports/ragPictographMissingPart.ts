import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';

export const RAG_PATTERN = {
  id: 'p1-rag-pictograph-missing-part',
  level: 1,
  title: 'Find the other boat maker',
  objective: 'Use a picture graph and a more-than clue to find a pair’s total, then identify the child who supplies the missing part.',
  skillIds: ['P1.S.GRAPH.01', 'P1.S.AS.03'],
  canonicalPatternId: 'p1-pictograph-missing-part-of-total',
};

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const rng = new Rng(hashString(key));
  const [known, reference, partner, distractor] = rng.shuffle(['Hana', 'Ravi', 'Mei', 'Ben']);
  const counts = [2, 3, 4, 5, 6, 7, 8];
  const referenceCount = rng.int(4, 8);
  const excess = rng.pick([1, 3, 4]);
  const total = referenceCount + excess;

  // Both parts must fit on the graph. Only the partner may have the missing count.
  const partCounts = counts.filter(count => count !== referenceCount);
  const knownCount = rng.pick(partCounts.filter(count => {
    const missing = total - count;
    return missing !== count && partCounts.includes(missing);
  }));
  const partnerCount = total - knownCount;
  const rows = rng.shuffle([
    { name: known, count: knownCount },
    { name: reference, count: referenceCount },
    { name: partner, count: partnerCount },
    { name: distractor, count: rng.pick(counts.filter(count => count !== partnerCount)) },
  ]);
  const labels = rows.map(row => row.name);
  const workedSteps = [
    { text: `Count the boats for ${reference} and ${known}.`, equation: `${reference} folded ${referenceCount} boats. ${known} folded ${knownCount} boats.` },
    { text: `Add the extra ${excess === 1 ? 'boat' : 'boats'} to ${reference}’s count to find how many the pair folded.`, equation: `${referenceCount} + ${excess} = ${total}` },
    { text: `Take away the boats that ${known} folded.`, equation: `${total} − ${knownCount} = ${partnerCount}` },
    { text: `${partner} has ${partnerCount} symbols on the graph, so ${partner} is the other child.` },
  ];

  return {
    key,
    context: [
      'The graph shows how many paper boats each child folded. Each symbol stands for 1 boat.',
      `${known} and one other child folded boats. Together they folded ${excess} more ${excess === 1 ? 'boat' : 'boats'} than ${reference} did.`,
    ],
    prompt: 'Who is the other child?',
    picture: { type: 'bars', pictures: true, scale: 1, labels, values: rows.map(row => row.count) },
    choices: rng.shuffle(labels),
    answer: partner,
    hint: `Start with ${reference}’s boats and count on ${excess}. How many of those boats did ${known} fold?`,
    workedSteps,
    explanation: workedSteps.map(step => [step.text, step.equation].filter(Boolean).join(' ')).join(' '),
  };
}

import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';

export const RAG_PATTERN = {
  id: 'p2-pictograph-bead-transfer',
  level: 2,
  title: 'Share beads from one collection',
  objective: 'Read two named rows of a picture graph and find how many beads to move to make the collections equal.',
  skillIds: ['P2.S.GRAPH.01', 'P2.S.AS.01', 'P2.S.MD.02'],
  canonicalPatternId: 'p2-scaled-pictograph-transfer-to-equalise-counts',
};

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const rng = new Rng(hashString(key));
  const names = rng.shuffle(['Iris', 'Dev', 'Mei', 'Noor']).slice(0, rng.int(3, 4));
  const [giver, receiver] = names;
  const scale = rng.pick([2, 3, 5]);

  // An even gap in symbols gives a whole-bead transfer for every key.
  const extraSymbols = 2 * rng.int(1, 3);
  const receiverSymbols = rng.int(1, 8 - extraSymbols);
  const giverSymbols = receiverSymbols + extraSymbols;
  const symbolCounts = [giverSymbols, receiverSymbols, ...names.slice(2).map(() => rng.int(1, 8))];
  const rows = rng.shuffle(names.map((label, i) => ({
    label, wholeSymbols: symbolCounts[i], halfSymbol: false,
  })));

  const beforeGiving = giverSymbols * scale;
  const beforeReceiving = receiverSymbols * scale;
  const gap = beforeGiving - beforeReceiving;
  const transfer = gap / 2;
  const equalCount = beforeReceiving + transfer;

  return {
    key,
    prompt: `How many beads should ${giver} pass to ${receiver} so they both have the same number of beads?`,
    picture: { type: 'batch4-early', layout: 'pictograph', heading: 'Beads before sharing', scale, rows },
    unit: 'beads',
    answer: String(transfer),
    hint: `Use the key to count the beads in the rows for ${giver} and ${receiver}. What happens to each collection when one bead changes hands?`,
    workedSteps: [
      { text: `Count ${giver}’s beads in groups of ${scale}.`, equation: `${giverSymbols} × ${scale} = ${beforeGiving}` },
      { text: `Count ${receiver}’s beads using the same key.`, equation: `${receiverSymbols} × ${scale} = ${beforeReceiving}` },
      { text: `Find how many more beads ${giver} has.`, equation: `${beforeGiving} − ${beforeReceiving} = ${gap}` },
      { text: 'For each bead passed, one child has one fewer and the other has one more. The gap gets smaller by two.', equation: `${gap} ÷ 2 = ${transfer}` },
      { text: 'Check both collections after the move.', equation: `${beforeGiving} − ${transfer} = ${equalCount},   ${beforeReceiving} + ${transfer} = ${equalCount}` },
    ],
    explanation: `${giver} has ${gap} extra beads. Passing half of them (${transfer} beads) to ${receiver} leaves the two children with ${equalCount} beads each.`,
    proof: { op: '/', a: { op: '-', a: beforeGiving, b: beforeReceiving }, b: 2 },
  };
}

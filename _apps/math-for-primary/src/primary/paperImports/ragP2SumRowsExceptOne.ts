import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';
import type { Batch4EarlyPicture } from './batch4EarlyPicture';

export const RAG_PATTERN = {
  id: 'rag-p2-sum-rows-except-one',
  level: 2,
  title: 'Add the other picture-graph rows',
  objective: 'Use a scaled picture graph to find the total represented by every row except a named category.',
  skillIds: ['P2.S.GRAPH.01', 'P2.S.AS.01'],
  canonicalPatternId: 'p2-sum-rows-except-one',
};

const labels = ['Kites', 'Books', 'Balls', 'Puzzles'];

export function makeRagQuestion(seed: number, index = 0): Question {
  const rng = new Rng(hashString(`rag-p2-sum-rows-except-one:${seed}:${index}`));
  const scale = rng.pick([2, 3, 4, 5]);
  const counts = labels.map(() => rng.int(1, 5));
  const excluded = rng.int(0, labels.length - 1);
  const includedTotal = counts.reduce((sum, count, row) => sum + (row === excluded ? 0 : count), 0) * scale;
  const picture: Batch4EarlyPicture = {
    type: 'batch4-early',
    layout: 'pictograph',
    heading: 'Favourite activities',
    scale,
    rows: labels.map((label, row) => ({ label, wholeSymbols: counts[row], halfSymbol: false })),
  };
  const included = labels.filter((_, row) => row !== excluded);
  const includedSymbols = counts.reduce((sum, count, row) => sum + (row === excluded ? 0 : count), 0);
  const equation = `${includedSymbols} × ${scale} = ${includedTotal}`;

  return {
    key: `rag-p2-sum-rows-except-one:${seed}:${index}`,
    prompt: `The graph shows how many pupils chose each activity. How many pupils did not choose ${labels[excluded]}?`,
    context: [`Each picture stands for ${scale} pupils.`, 'Count every row except the named activity.'],
    answer: String(includedTotal),
    unit: 'pupils',
    hint: `Add the picture counts for ${included.join(', ')}, then multiply by ${scale}.`,
    explanation: `The other rows have ${includedSymbols} pictures altogether. ${equation} pupils.`,
    picture,
    workedSteps: [
      { text: `Add the pictures in all rows except ${labels[excluded]}.`, equation: String(includedSymbols) },
      { text: `Multiply by the number of pupils each picture represents.`, equation },
    ],
  };
}

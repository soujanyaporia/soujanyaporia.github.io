import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';
import type { GridSegment } from '../gridDrawingModel';

export const RAG_PATTERN = {
  id: 'p2-rag-compare-match-segments',
  level: 2,
  title: 'Match lengths from end to end',
  objective: 'Compare two spans, match a line to a reference, and use a shared diagram to identify equal lengths and find a difference.',
  skillIds: ['P2.S.MEASURE.01', 'P2.S.AS.01'],
  canonicalPatternId: 'p2-compare-and-match-line-segments',
};

type Row = { label: string; span: number };
type Task = Pick<Question, 'prompt' | 'answer' | 'hint' | 'choices' | 'structuredResponse' | 'unit'>;

function withDiagram(key: string, rng: Rng, rows: Row[], measure: 'm' | 'cm' | 'spaces', task: Task, conclusion: string): Question {
  const starts = rng.shuffle([1, 2, 3, 4]);
  const segments: GridSegment[] = rows.map(({ span }, i) => [[starts[i], i], [starts[i] + span, i]]);
  const legend = 'From top to bottom: ' + rows.map(row => row.label).join(', ') + '.';
  const scale = measure === 'spaces' ? 'The dots are equally spaced.' : 'One space between neighbouring dots stands for 1 ' + measure + '.';
  const lengths = rows.map(row => row.label + ' = ' + row.span + ' ' + measure).join(', ');
  return {
    ...task, key, context: [legend, scale],
    picture: {
      type: 'grid-drawing', rows: rows.length - 1,
      columns: Math.max(...segments.map(segment => segment[1][0])),
      segments, caption: legend,
    },
    workedSteps: [
      { text: 'Count the spaces from one end of each line to the other.', equation: lengths },
      { text: conclusion },
    ],
    explanation: lengths + '. ' + conclusion,
  };
}

export function makeRagQuestion(seed: number, index = 0): Question {
  const position = index + hashString(String(seed)) % 5;
  const slot = ((position % 5) + 5) % 5;
  const key = [RAG_PATTERN.id, seed, index].join(':');
  // The two strip questions share every endpoint, even when opened separately.
  const scene = slot === 4 ? position - 1 : position;
  const rng = new Rng(hashString([RAG_PATTERN.id, seed, scene].join(':')));

  if (slot < 2) {
    const [a, b] = rng.shuffle(['J', 'K', 'L', 'M']);
    const first = rng.int(4, 8);
    const second = first + rng.pick([-2, -1, 0, 1, 2]);
    const relation = first < second ? 'shorter than' : first > second ? 'longer than' : 'the same length as';
    return withDiagram(key, rng, [{ label: a, span: first }, { label: b, span: second }], 'm', {
      prompt: 'Rope ' + a + ' is ___ rope ' + b + '. Which words fit?',
      answer: relation, choices: ['shorter than', 'longer than', 'the same length as'],
      hint: 'Imagine sliding the ropes until their left ends line up. Compare their right ends.',
    }, 'Rope ' + a + ' is ' + relation + ' rope ' + b + '.');
  }

  if (slot === 2) {
    const labels = rng.shuffle(['H', 'J', 'K', 'L', 'M', 'N']).slice(0, 4);
    const target = rng.int(4, 7);
    const spans = [target, ...rng.shuffle([target, target - rng.int(1, 2), target + rng.int(1, 2)])];
    const rows = labels.map((label, i) => ({ label, span: spans[i] }));
    const match = rows.slice(1).find(row => row.span === target)!;
    return withDiagram(key, rng, rows, 'spaces', {
      prompt: 'Which other line is just as long as line ' + labels[0] + '? Write its letter.',
      answer: match.label,
      hint: 'Count how many spaces the first line covers. Look for another line that covers that many.',
    }, 'Lines ' + labels[0] + ' and ' + match.label + ' each cover ' + target + ' spaces.');
  }

  const [a, b, c, d] = rng.shuffle(['card', 'felt', 'foil', 'paper']);
  const equal = rng.int(3, 6);
  const middle = equal + rng.int(1, 2);
  const longest = middle + rng.int(1, 3);
  const strips = rng.shuffle([
    { label: a, span: equal }, { label: b, span: equal },
    { label: c, span: middle }, { label: d, span: longest },
  ]);
  if (slot === 3) {
    return withDiagram(key, rng, strips, 'cm', {
      prompt: 'Which two strips have the same length?',
      answer: JSON.stringify([a, b]),
      structuredResponse: { kind: 'named-pair', options: strips.map(strip => strip.label) },
      hint: 'Measure each strip from its own starting dot. Look for two equal measurements.',
    }, 'The ' + a + ' strip and the ' + b + ' strip both measure ' + equal + ' cm.');
  }
  const difference = longest - equal;
  return withDiagram(key, rng, strips, 'cm', {
    prompt: 'How many centimetres shorter is the ' + a + ' strip than the ' + d + ' strip?',
    answer: String(difference), unit: 'cm',
    hint: 'Find the length of each named strip. Take the shorter length away from the longer length.',
  }, 'The difference is ' + longest + ' cm − ' + equal + ' cm = ' + difference + ' cm.');
}

import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';
import type { PaperPicture } from '../paperPicture';

export const RAG_PATTERN = {
  id: 'rag-p1-equal-group-total',
  level: 1,
  title: 'Count the boxes and pencils',
  objective: 'Use the number of boxes and the pencils in each box to find the total. Record each count the question asks for.',
  skillIds: ['P1.S.MD.01'],
  canonicalPatternId: 'p1-find-an-equal-group-total',
};

const forms = ['pictured-total', 'pictured-count-and-total', 'text-three-counts', 'picture-three-counts'] as const;

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const rng = new Rng(hashString(key));
  const form = forms[rng.int(0, forms.length - 1)];
  const boxes = rng.int(2, 6);
  const each = rng.int(3, Math.min(7, Math.floor(40 / boxes)));
  const total = boxes * each;
  const sizeClue = `Each box holds ${each} pencils.`;
  const totalQuestion = 'How many pencils are there in all?';
  let picture: PaperPicture | undefined;
  let context: string[];
  let firstStep: string;

  if (form === 'text-three-counts') {
    context = [`Mei packs ${boxes} boxes.`, sizeClue];
    firstStep = `Mei packs ${boxes} boxes with ${each} pencils in each box.`;
  } else if (form === 'picture-three-counts') {
    context = ['Each card shows one open box. Each pencil picture stands for one pencil.'];
    picture = {
      type: 'paper', layout: 'cards', heading: 'Open boxes',
      cards: Array.from({ length: boxes }, () => ({ label: 'Box', value: 'Pencils', icon: 'pencil' as const, count: each })),
    };
    firstStep = `Count the ${boxes} boxes. Count the pencils in one box. Each box has ${each}.`;
  } else {
    context = ['Each box picture stands for one packed box.', sizeClue];
    picture = {
      type: 'paper', layout: 'cards', heading: 'Packed boxes',
      cards: [{ label: 'Shelf', value: 'Boxes', icon: 'box', count: boxes }],
    };
    firstStep = `Count the boxes on the shelf. There are ${boxes}, and each holds ${each} pencils.`;
  }

  const sum = Array.from({ length: boxes }, () => each).join(' + ');
  const workedSteps = [
    { text: firstStep, equation: `${boxes} groups of ${each}` },
    { text: 'Add one group of pencils for each box.', equation: `${sum} = ${total}` },
    { text: `The boxes hold ${total} pencils in all.`, equation: `${boxes} × ${each} = ${total}` },
  ];
  const base = {
    key, context, picture, workedSteps,
    hint: 'Find how many boxes there are and how many pencils one box holds. Add that many pencils for every box.',
    explanation: workedSteps.map(step => `${step.text} ${step.equation}.`).join(' '),
  };

  if (form === 'pictured-total') {
    return { ...base, prompt: totalQuestion, answer: String(total), unit: 'pencils', proof: { op: '*', a: boxes, b: each } };
  }
  const askSize = form !== 'pictured-count-and-total';
  const labels = askSize ? ['Boxes', 'Pencils in each box', 'Pencils in all'] : ['Boxes', 'Pencils in all'];
  const values = askSize ? [boxes, each, total] : [boxes, total];
  return {
    ...base,
    prompt: ['How many boxes are there?', ...(askSize ? ['How many pencils are in each box?'] : []), totalQuestion].join(' '),
    structuredResponse: { kind: 'number-fields', fields: labels.map(label => ({ label })) },
    answer: JSON.stringify(values.map(String)),
  };
}

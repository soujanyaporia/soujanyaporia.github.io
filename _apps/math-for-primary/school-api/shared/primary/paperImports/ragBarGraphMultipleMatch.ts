import { Rng, hashString } from '../../engine/random';
import type { Picture, Question } from '../generate';

export const RAG_PATTERN = {
  id: 'p3-bar-graph-multiple-match',
  level: 3,
  title: 'Find the matching bar',
  objective: 'Read a named bar, multiply or divide its count, and find the design with that many bookmarks.',
  skillIds: ['P3.S.GRAPH.01', 'P3.S.MD.03', 'P3.S.MD.04'],
  canonicalPatternId: 'bar-graph-multiplicative-category-match',
};

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const rng = new Rng(hashString(key));
  const findLarger = rng.chance(0.6);
  const offerChoices = !findLarger && rng.chance(0.5);
  const step = rng.pick([1, 2]);
  const factor = rng.pick([2, 3]);
  const small = rng.pick([5, 7, 9]) * step;
  const large = small * factor;

  const labels = ['Leaf', 'Moon', 'Star', 'Shell', 'Kite'];
  const otherCounts = Array.from({ length: 28 }, (_, i) => (i + 2) * step)
    .filter(count => count !== small && count !== large);
  const values = rng.shuffle([small, large, ...rng.shuffle(otherCounts).slice(0, 3)]);
  const referenceCount = findLarger ? small : large;
  const target = findLarger ? large : small;
  const reference = labels[values.indexOf(referenceCount)];
  const answer = labels[values.indexOf(target)];
  const picture: Picture = findLarger || offerChoices
    ? { type: 'bars', labels, values, scale: step }
    : {
        type: 'batch2-early', layout: 'sales-bars', heading: 'Bookmarks made by the art club',
        days: labels, values, maximum: 30 * step, minorStep: step, labelStep: 5 * step,
      };

  const prompt = findLarger
    ? `Which design appears on ${factor} times as many bookmarks as the ${reference} design?`
    : `For every bookmark with the mystery design, there are ${factor} bookmarks with the ${reference} design. Which design is the mystery design?`;
  const workedSteps = [
    { text: `Read the ${reference} bar. Each small interval stands for ${step} ${step === 1 ? 'bookmark' : 'bookmarks'}.`,
      equation: `${referenceCount / step} × ${step} = ${referenceCount}`, picture },
    { text: findLarger
        ? `Find ${factor} groups of ${referenceCount} bookmarks.`
        : `Each group of ${factor} bookmarks with the ${reference} design goes with one mystery bookmark.`,
      equation: `${referenceCount} ${findLarger ? '×' : '÷'} ${factor} = ${target}` },
    { text: `The ${answer} bar reaches ${target}, so the design is ${answer}.`, picture },
  ];
  return {
    key, prompt, picture, answer,
    context: ['The graph shows how many bookmarks the art club made with each design.'],
    choices: offerChoices ? rng.shuffle(labels.filter(label => label !== reference)) : undefined,
    hint: findLarger
      ? `Read the ${reference} bar. What count would you get with ${factor} groups of that size?`
      : `Read the ${reference} bar. How many groups of ${factor} can you make from that count?`,
    workedSteps,
    explanation: workedSteps.map(s => [s.text, s.equation].filter(Boolean).join(' ')).join(' '),
  };
}

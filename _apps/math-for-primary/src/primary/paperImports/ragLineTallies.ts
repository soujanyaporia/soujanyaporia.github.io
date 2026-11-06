import {Rng, hashString} from '../../engine/random';
import type {Question} from '../generate';
import type {Batch11UpperMark, Batch11UpperPicture} from './batch11UpperPicture';

export const RAG_PATTERN = {
  id: 'rag-p2-line-tallies',
  level: 2,
  title: 'Count the lines in a badge',
  objective: 'Trace straight and curved lines, count each kind and use the counts to compare drawings.',
  skillIds: ['P1.S.SHAPE.02', 'P2.S.WN.01', 'P2.S.AS.01'],
  canonicalPatternId: 'straight-and-curved-line-tallies',
} as const;

type Tally = {straight: number; curved: number};
type Steps = NonNullable<Question['workedSteps']>;

function badge(r: Rng, tally: Tally, x: number, y: number, radius: number, name = '') {
  const loop = tally.curved >= 2 && r.chance(0.5);
  const rimCurves = tally.curved - Number(loop);
  const rim = r.shuffle([
    ...Array<string>(tally.straight).fill('straight'),
    ...Array<string>(rimCurves).fill('curved'),
  ]);
  const start = r.pick([-90, -75, -60]) * Math.PI / 180;
  const vertices = rim.map((_, i) => {
    const angle = start + 2 * Math.PI * i / rim.length;
    return [Math.round(x + radius * Math.cos(angle)), Math.round(y + radius * Math.sin(angle))];
  });
  // Each stroke stays in its own sector. Inward bows make corners distinct even between two arcs.
  const marks: Batch11UpperMark[] = rim.map((kind, i): Batch11UpperMark => {
    const [x1, y1] = vertices[i];
    const [x2, y2] = vertices[(i + 1) % rim.length];
    if (kind === 'straight') return {kind: 'line', x1, y1, x2, y2};
    const cx = Math.round(x + 0.52 * ((x1 + x2) / 2 - x));
    const cy = Math.round(y + 0.52 * ((y1 + y2) / 2 - y));
    return {kind: 'path', d: `M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`};
  });
  if (loop) marks.push({kind: 'circle', cx: x, cy: y, r: Math.round(radius * 0.16)});
  if (name) marks.push({kind: 'text', x: x - 5, y: y + radius + 14, text: name});
  const title = name ? `Badge ${name}` : 'Badge';
  const description = `${title}. Follow the rim in order. The lines are ${rim.join(', ')}.`;
  return {marks, description: description + (loop ? ' A circle is inside.' : ''), rimCurves, loop};
}

function diagram(badges: ReturnType<typeof badge>[]): Batch11UpperPicture {
  return {type: 'batch11-upper', label: badges.map(b => b.description).join(' '), marks: badges.flatMap(b => b.marks)};
}

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const r = new Rng(hashString(key));
  const mode = (hashString(String(seed)) + (index >>> 0)) % 4;
  const labels = ['A', 'B', 'C', 'D'];
  const context = ['Trace each line once. Start a new line at each corner. A circle counts as one curved line.'];
  function finish(picture: Batch11UpperPicture, prompt: string, answer: string, hint: string,
    workedSteps: Steps, response: Partial<Pick<Question, 'choices' | 'structuredResponse' | 'unit'>> = {}): Question {
    return {key, context, prompt, picture, answer, hint, workedSteps,
      explanation: workedSteps.map(s => [s.text, s.equation].filter(Boolean).join(' ')).join(' '),
      ...response};
  }

  if (mode === 0) {
    const straight = r.int(4, 5), curved = r.int(2, 3);
    const otherS = straight + r.pick([-1, 1]), otherC = curved + r.pick([-1, 1]);
    const tallies = r.shuffle([{straight, curved}, {straight, curved: otherC},
      {straight: otherS, curved}, {straight: otherS, curved: otherC}]);
    const picture = diagram(tallies.map((t, i) =>
      badge(r, t, 80 + 160 * (i % 2), 43 + 96 * Math.floor(i / 2), 32, labels[i])));
    const straightMatches = labels.filter((_, i) => tallies[i].straight === straight);
    const answer = labels[tallies.findIndex(t => t.straight === straight && t.curved === curved)];
    return finish(picture, `Which badge has ${straight} straight lines and ${curved} curved lines?`,
      answer, 'Count the straight lines on each badge. Check the curves on the badges that still fit.', [
        {text: `Badges ${straightMatches.join(' and ')} each have ${straight} straight lines.`},
        {text: straightMatches.map(label => {
          const count = tallies[labels.indexOf(label)].curved;
          return `Badge ${label} has ${count} curved ${count === 1 ? 'line' : 'lines'}.`;
        }).join(' ')},
        {text: `Badge ${answer} fits both counts.`},
      ], {choices: labels});
  }

  if (mode === 3) {
    const tallies = Array.from({length: 3}, () => ({straight: r.int(2, 4), curved: r.int(1, 4)}));
    const picture = diagram(tallies.map((t, i) => badge(r, t, 55 + 105 * i, 94, 38, labels[i])));
    const counts = tallies.map(t => t.curved);
    const total = counts.reduce((sum, n) => sum + n, 0);
    return finish(picture, 'How many curved lines can you find on the three badges altogether?',
      String(total), 'Count the curves on one badge at a time, then add the three counts.', [
        {text: `The curve counts are ${counts[0]} on A, ${counts[1]} on B and ${counts[2]} on C.`},
        {text: 'Add one count from each badge.', equation: `${counts.join(' + ')} = ${total}`},
      ], {unit: 'curved lines'});
  }

  const curved = r.int(2, 4);
  const straight = mode === 2 ? curved + r.int(1, 5) : r.int(2, 6);
  const drawing = badge(r, {straight, curved}, 160, 100, 78);
  const picture = diagram([drawing]);
  const steps: Steps = [
    {text: `Follow the rim from corner to corner. It has ${straight} straight lines.`},
    {text: drawing.loop
      ? 'Count the curves on the rim, then count the circle inside.'
      : 'Count the bends around the rim. Each bend runs from one corner to the next.',
      equation: drawing.loop ? `${drawing.rimCurves} + 1 = ${curved}` : `${curved} curved lines`},
  ];
  if (mode === 1) {
    return finish(picture, 'Count the curved lines and the straight lines on this badge.',
      JSON.stringify([String(curved), String(straight)]), 'Go round the rim once for each kind of line. Check inside too.',
      steps, {structuredResponse: {kind: 'number-pair', firstLabel: 'Curved lines', secondLabel: 'Straight lines'}});
  }
  const difference = straight - curved;
  const wrong = [...new Set([difference - 1, difference + 1, straight, curved, straight + curved, difference + 2])]
    .filter(n => n > 0 && n !== difference);
  const choices = r.shuffle([difference, ...r.shuffle(wrong).slice(0, 3)]).map(String);
  steps.push({text: 'Take the number of curved lines away from the number of straight lines.',
    equation: `${straight} − ${curved} = ${difference}`});
  return finish(picture, 'How many more straight lines than curved lines does this badge have?',
    String(difference), 'Make both counts first. Then find how far apart they are.', steps, {choices});
}

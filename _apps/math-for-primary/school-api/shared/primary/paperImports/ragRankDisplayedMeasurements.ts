import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';
import type { Batch11UpperMark } from './batch11UpperPicture';

export const RAG_PATTERN = {
  id: 'p2-rank-displayed-measurements',
  level: 2,
  title: 'Put measurements in order',
  objective: 'Compare whole masses, bent lengths and equal pours to find an order or a requested place.',
  skillIds: ['P2.S.MEASURE.01', 'P2.S.MEASURE.02', 'P2.S.MEASURE.03', 'P2.S.WN.04', 'P2.S.AS.01'],
  canonicalPatternId: 'rank-displayed-measurements',
} as const;

function massQuestion(r: Rng, key: string, children: boolean, difference: boolean): Question {
  const unit = children ? 'kg' : 'g';
  const names = children ? ['Iman', 'Dev', 'Rui', 'Tara'] : ['Notebook', 'Pencil case', 'Beanbag'];
  const pool = children ? [22, 23, 24, 25, 26, 27, 29, 30, 32, 33, 34, 35, 36, 38] :
    Array.from({ length: 42 }, (_, i) => 155 + 10 * i);
  const values = r.shuffle(pool);
  const ranked = names.map((label, i) => ({ label, mass: values[i] })).sort((a, b) => b.mass - a.mass);
  const shown = r.shuffle(ranked);
  if (shown.every((item, i) => item === ranked[i]) || shown.every((item, i) => item === ranked[ranked.length - 1 - i])) {
    [shown[0], shown[1]] = [shown[1], shown[0]];
  }
  const picture = {
    type: 'paper' as const, layout: 'cards' as const, heading: children ? 'Mass of each child' : 'Mass of each item',
    cards: shown.map(({ label, mass }) => ({ label, value: `${mass} ${unit}` })),
  };
  const heavy = ranked[0];
  if (difference) {
    const light = ranked[2];
    const gap = heavy.mass - light.mass;
    return {
      key, picture, prompt: `How many kilograms lighter is ${light.label} than ${heavy.label}?`,
      answer: String(gap), unit, hint: 'Find both names. Subtract the smaller mass from the larger mass.',
      workedSteps: [
        { text: `${light.label} weighs ${light.mass} kg and ${heavy.label} weighs ${heavy.mass} kg.` },
        { text: 'Find the gap between the two masses.', equation: `${heavy.mass} − ${light.mass} = ${gap} kg` },
      ],
      explanation: `${light.label} is ${gap} kg lighter than ${heavy.label}.`,
    };
  }
  const labels = ranked.map(item => item.label);
  return {
    key, picture, prompt: 'Put the names in order. Start with the one that weighs the most.',
    order: shown.map(item => item.label), answer: labels.join(','),
    hint: 'Find the largest mass. Pick its name, then look for the largest mass left.',
    workedSteps: [
      { text: `Compare the masses in ${unit === 'g' ? 'grams' : 'kilograms'}.`,
        equation: ranked.map(item => `${item.mass} ${unit}`).join(' > ') },
      { text: 'Match each mass to its name in that order.', equation: labels.join(' → ') },
    ],
    explanation: `${heavy.label} comes first at ${heavy.mass} ${unit}. The order is ${labels.join(', ')}.`,
  };
}

function stringsQuestion(r: Rng, key: string, shortest: boolean): Question {
  const labels = ['J', 'K', 'L', 'M'];
  const bendCounts = r.shuffle([1, 3, 5, 7]);
  const width = r.int(27, 31);
  const rise = r.int(29, 34);
  const marks: Batch11UpperMark[] = [];
  const descriptions: string[] = [];
  labels.forEach((label, row) => {
    const y = 28 + 47 * row;
    const bends = new Set(r.shuffle([0, 1, 2, 3, 4, 5, 6, 7]).slice(0, bendCounts[row]));
    let path = `M 42 ${y}`;
    let direction = 1;
    for (let space = 0; space < 8; space++) {
      const x = 42 + space * width;
      if (bends.has(space)) {
        path += ` Q ${x + width / 2} ${y + direction * rise} ${x + width} ${y}`;
        direction *= -1;
      } else {
        path += ` L ${x + width} ${y}`;
      }
    }
    marks.push({ kind: 'text', x: 12, y: y + 5, text: label }, { kind: 'path', d: path });
    descriptions.push(`${label} has ${bendCounts[row]} ${bendCounts[row] === 1 ? 'bend' : 'bends'}`);
  });
  const target = shortest ? Math.min(...bendCounts) : Math.max(...bendCounts);
  const answer = labels[bendCounts.indexOf(target)];
  const conclusion = `String ${answer} has the ${shortest ? 'fewest' : 'most'} bends, so it is the ${shortest ? 'shortest' : 'longest'}.`;
  return {
    key, prompt: `Which string would be ${shortest ? 'shortest' : 'longest'} if you laid each one out straight?`,
    context: ['The ends of each string are the same distance apart. Every bend is the same size.'],
    picture: { type: 'batch11-upper', label: `Four strings cross the same gap. ${descriptions.join('. ')}.`, marks },
    choices: r.shuffle(labels), answer, hint: 'Trace each string. A bend uses more string than going straight across the same space.',
    workedSteps: [
      { text: 'Each bend replaces a straight stretch across the same space. Each bend adds the same extra length.' },
      { text: 'Count the bends in each string.', equation: descriptions.join(', ') },
      { text: conclusion },
    ],
    explanation: conclusion,
  };
}

function volumeQuestion(r: Rng, key: string): Question {
  const labels = ['Blue tub', 'Gold tub', 'Pink tub'];
  const counts = r.shuffle([2, 3, 4, 5, 6, 7]).slice(0, 3);
  const ranked = labels.map((label, i) => ({ label, count: counts[i] })).sort((a, b) => a.count - b.count);
  const [small, middle, large] = ranked;
  return {
    key, prompt: 'Which tub has more water than one tub but less water than the other?',
    context: ['Each jug picture stands for 1 litre of water poured into that tub.'],
    picture: { type: 'paper', layout: 'cards', heading: 'Water poured into each tub',
      cards: labels.map((label, i) => ({ label, value: 'Count the jugs', icon: 'water', count: counts[i] })) },
    choices: r.shuffle(labels), answer: middle.label, hint: 'Count the jugs for each tub. Look for the count between the other two.',
    workedSteps: [
      { text: 'Each jug stands for one litre.', equation: labels.map((label, i) => `${label}: ${counts[i]} L`).join(', ') },
      { text: 'Put the three volumes in order.', equation: `${small.count} L < ${middle.count} L < ${large.count} L` },
    ],
    explanation: `The ${middle.label.toLowerCase()} has ${middle.count} litres, between ${small.count} and ${large.count} litres.`,
  };
}

export function makeRagQuestion(seed: number, index = 0): Question {
  // Slots 0 and 1 use one table for two independently answerable responses.
  const offset = new Rng(hashString(`mass-rank-start:${seed}`)).pick([0, 2, 3, 4, 5]);
  const position = index + offset;
  const slot = ((position % 6) + 6) % 6;
  const block = Math.floor(position / 6);
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const r = new Rng(hashString(`${RAG_PATTERN.id}:${seed}:${block}:${slot < 2 ? 'children' : slot}`));
  if (slot < 3) return massQuestion(r, key, slot < 2, slot === 0);
  if (slot === 5) return volumeQuestion(r, key);
  return stringsQuestion(r, key, slot === 4);
}

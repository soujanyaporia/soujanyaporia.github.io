import { Rng, hashString } from '../../engine/random';
import type { Picture, Question } from '../generate';

export const RAG_PATTERN = {
  id: 'p3-graph-category-extremes',
  level: 3,
  title: 'Find the most or the least',
  objective: 'Name the category with the most or least, using the scale, a total or a clue about a missing label.',
  skillIds: ['P3.S.GRAPH.01', 'P2.S.GRAPH.01', 'P3.S.AS.01'],
  canonicalPatternId: 'identify-the-smallest-or-greatest-category',
};

const names = ['Mei', 'Ravi', 'Nora', 'Jia', 'Leon', 'Iman'];
const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

function heights(r: Rng, count: number, step: number) {
  return r.shuffle([2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]).slice(0, count).map(n => n * step);
}

function question(key: string, picture: Picture, context: string[], prompt: string, answer: string,
  hint: string, workedSteps: NonNullable<Question['workedSteps']>): Question {
  return { key, picture, context, prompt, answer, hint, workedSteps,
    explanation: workedSteps.map(s => [s.text, s.equation].filter(Boolean).join(' ')).join(' ') };
}

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const r = new Rng(hashString(key));
  const ticket = r.int(0, 7);
  const labels = r.shuffle(names).slice(0, 4);

  if (ticket < 4) {
    const scale = r.pick([5, 10]);
    const values = heights(r, 4, scale);
    const longest = Math.max(...values);
    const runner = labels[values.indexOf(longest)];
    return question(key, { type: 'bars', labels, values, scale },
      ['Four runners started a race together. The bars show how many seconds each runner took to finish.'],
      'Who crossed the finish line last?', runner,
      'They started together. Would the last runner take more time or less time than the others?', [
        { text: 'Read each time in seconds.', equation: labels.map((n, i) => `${n}: ${values[i]} s`).join('; ') },
        { text: `${runner} took the longest (${longest} seconds), so ${runner} finished last.` },
      ]);
  }

  if (ticket === 4) {
    const dollars = r.pick([3, 4]);
    const scale = r.pick([10, 20]);
    const values = heights(r, 5, scale);
    const least = Math.min(...values);
    const day = days[values.indexOf(least)];
    const read = r.pick(days.filter(d => d !== day));
    const saved = values[days.indexOf(read)];
    return question(key, { type: 'bars', labels: [...days], values, scale },
      [`Lina had $${dollars} in pocket money each day. Each day she spent some and saved the rest. The graph shows her savings in cents.`],
      `How many cents did Lina save on ${read}? On which day did she spend the most? Write the number and then the day as shown on the graph, with a space between them.`,
      `${saved} ${day}`, 'The bars show savings. What happens to the amount spent when less of the same pocket money is saved?', [
        { text: `Read the ${read} bar. Each small step is ${scale} cents.`, equation: `${saved / scale} × ${scale} = ${saved} cents` },
        { text: `The shortest bar is ${day}: just ${least} cents saved. With the same pocket money every day, saving the least means spending the most.` },
        { text: `Find the spending on ${day}.`, equation: `${100 * dollars} − ${least} = ${100 * dollars - least} cents` },
      ]);
  }

  if (ticket === 5) {
    const scale = r.pick([2, 5]);
    const values = heights(r, 4, scale);
    const rank = labels.map((_, i) => i).sort((a, b) => values[a] - values[b]);
    const [first, , smaller, larger] = rank;
    const gap = values[larger] - values[smaller];
    return question(key, { type: 'bars', labels, values, scale },
      ['Four children collected shells. Each bar shows one child’s collection.'],
      `Who found the fewest shells? How many fewer shells did ${labels[smaller]} find than ${labels[larger]}? Write the name and then the number, with a space between them.`,
      `${labels[first]} ${gap}`, 'Find the shortest bar. For the second answer, compare just the two children named.', [
        { text: `The shortest bar belongs to ${labels[first]}. It shows ${values[first]} shells.` },
        { text: `Read the two bars using ${scale} shells per small step. ${labels[smaller]} found ${values[smaller]} and ${labels[larger]} found ${values[larger]}.` },
        { text: 'Subtract to find how many fewer.', equation: `${values[larger]} − ${values[smaller]} = ${gap} shells` },
      ]);
  }

  if (ticket === 6) {
    const scale = r.pick([2, 5]);
    const a = r.int(3, 6), b = r.int(4, 7);
    // Each column has a smaller entry on a different day from the least total.
    const pairs = r.shuffle([[a, b], [a - 1, b + r.int(2, 4)], [a + r.int(3, 5), b - 1],
      [a + r.int(1, 3), b + r.int(2, 4)]]).map(pair => pair.map(v => v * scale));
    const daysShown = days.slice(0, 4);
    const series = ['Notebooks', 'Cards'].map((label, j) => ({ label, values: pairs.map(p => p[j]) }));
    const totals = pairs.map(([left, right]) => left + right);
    const least = Math.min(...totals);
    const day = daysShown[totals.indexOf(least)];
    return question(key, { type: 'raffles-p3', layout: 'grouped-bars', days: daysShown, series, scale },
      ['The class collected notebooks and cards for a fair. Each pair of bars shows one day.'],
      'On which day did the class collect the fewest items altogether? Write the day as shown on the graph.',
      day, 'Add the two counts for each day before you compare the days.', [
        ...pairs.map(([x, y], i) => ({ text: `Count both kinds of items on ${daysShown[i]}.`, equation: `${x} + ${y} = ${x + y} items` })),
        { text: `The smallest total is ${least} items, so the day is ${day}.` },
      ]);
  }

  const [lead, other, known] = labels;
  const scale = r.pick([3, 4, 5]);
  const [otherDots, knownDots] = r.shuffle([2, 3, 4, 5]);
  const longest = r.int(6, 8);
  const counts = [...r.shuffle([longest, otherDots]), knownDots];
  const values = counts.map(n => n * scale);
  const rowLabels = ['A', 'B', known];
  const winner = counts.indexOf(longest);
  const missing = winner === 0 ? [lead, other] : [other, lead];
  const total = values.reduce((sum, v) => sum + v, 0);
  const gap = values[winner] - values[2];
  return question(key, { type: 'bars', labels: rowLabels, values, scale, pictures: true },
    [`Three runners ran ${total} laps in all. Each dot stands for ${scale} laps.`,
      `The names missing from rows A and B are ${r.shuffle([lead, other]).join(' and ')}. ${lead} ran the most laps.`],
    `Name the runners in rows A and B. How many fewer laps did ${known} run than ${lead}? Write the name for A, the name for B and the number, with a space between answers.`,
    `${missing.join(' ')} ${gap}`, 'Count the dots to place the runner who ran the most laps. Which name is left? Use the key when you compare laps.', [
      { text: `Row ${rowLabels[winner]} has the most dots (${longest}), so it belongs to ${lead}. Row ${rowLabels[1 - winner]} must belong to ${other}.` },
      { text: 'Use the key to count each runner’s laps.', equation: `${lead}: ${longest} × ${scale} = ${values[winner]}; ${known}: ${counts[2]} × ${scale} = ${values[2]}` },
      { text: `Find how many fewer laps ${known} ran.`, equation: `${values[winner]} − ${values[2]} = ${gap} laps` },
    ]);
}

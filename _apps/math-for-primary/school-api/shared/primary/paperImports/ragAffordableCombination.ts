import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';

export const RAG_PATTERN = {
  id: 'p3-choose-an-affordable-combination',
  level: 3,
  title: 'Choose items within a budget',
  objective: 'Add the prices of two or three different items and compare the total with a budget. For least change, find the largest total the shopper can pay.',
  skillIds: ['P3.S.MONEY.01'],
  canonicalPatternId: 'p3-choose-an-affordable-combination',
};

type Item = { name: string; cents: number };

const money = (cents: number) => '$' + (cents / 100).toFixed(2);

function groupName(items: Item[]) {
  const names = items.map(item => item.name);
  return names.slice(0, -1).join(', ') + ' and ' + names[names.length - 1];
}

function shoppingGroups(items: Item[], count: number) {
  // With four items, every group of three leaves out a different item.
  const groups = count === 3
    ? items.map(leftOut => items.filter(item => item !== leftOut))
    : items.flatMap((first, i) => items.slice(i + 1).map(second => [first, second]));
  return groups.map(group => ({
    items: group,
    label: groupName(group),
    total: group.reduce((sum, item) => sum + item.cents, 0),
  })).sort((a, b) => a.total - b.total);
}

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const rng = new Rng(hashString(key));
  const mode = rng.pick(['affordable-pair', 'affordable-triple', 'least-change'] as const);
  const leastChange = mode === 'least-change';
  const count = mode === 'affordable-triple' ? 3 : 2;
  const size = mode === 'affordable-pair' ? 3 : 4;
  const names = rng.shuffle(['Kite', 'Sketch pad', 'Puzzle', 'Water bottle']).slice(0, size);

  // The separated price ranges leave room for a whole-dollar budget between totals.
  const bands = [[3, 5], [7, 9], [11, 13], [16, 18]];
  const items = rng.shuffle(names.map((name, i) => ({
    name,
    cents: 100 * rng.int(bands[i][0], bands[i][1]) + (count === 3 ? 0 : 5 * rng.int(1, 16)),
  })));
  const groups = shoppingGroups(items, count);
  const targets = groups.flatMap((group, i) => {
    const next = groups[i + 1];
    if (!next) return [];
    // For a plain budget question only the cheapest group may fit.
    if (!leastChange && i !== 0) return [];
    // For least change, at least one cheaper pair must fit and the best total must be unique.
    if (leastChange && (i === 0 || groups[i - 1].total === group.total)) return [];
    const low = leastChange ? Math.floor(group.total / 100) + 1 : Math.ceil(group.total / 100);
    const high = Math.floor((next.total - 1) / 100);
    return low <= high ? [{ group, low, high }] : [];
  });
  const { group: best, low, high } = rng.pick(targets);
  const budget = 100 * rng.int(low, high);
  const prompt = leastChange
    ? 'Which two different items should Lina buy to have as little money left as possible?'
    : `Which ${count === 3 ? 'three' : 'two'} different items can Lina buy with her money?`;
  const limit = money(budget);
  const conclusion = leastChange
    ? `${best.label} cost ${money(best.total)} together. This is the largest total Lina can pay, so she has ${money(budget - best.total)} left.`
    : `${best.label} cost ${money(best.total)} together. Every other group costs more than Lina’s ${limit}.`;
  const workedSteps = groups.map(group => ({
    text: `${group.label}: ${group.total <= budget ? 'within' : 'over'} the ${limit} budget.`,
    equation: group.items.map(item => money(item.cents)).join(' + ') + ' = ' + money(group.total),
  }));
  return {
    key,
    prompt,
    context: [`Lina has ${limit} to spend at the school fair.`],
    picture: {
      type: 'paper', layout: 'cards', heading: 'Prices at the stall',
      cards: items.map(item => ({ label: item.name, value: money(item.cents) })),
    },
    ...(count === 3
      ? { choices: rng.shuffle(groups.map(group => group.label)), answer: best.label }
      : { structuredResponse: { kind: 'named-pair' as const, options: items.map(item => item.name) },
          answer: JSON.stringify(best.items.map(item => item.name)) }),
    hint: leastChange
      ? 'Add the prices in each pair. Cross out pairs that cost too much. Which pair uses the most money?'
      : 'Try each group of the right size. Add its prices and compare the total with Lina’s money.',
    explanation: conclusion,
    workedSteps: [...workedSteps, {
      text: conclusion,
      equation: leastChange
        ? `${limit} − ${money(best.total)} = ${money(budget - best.total)}`
        : `${money(best.total)} ${best.total === budget ? '=' : '<'} ${limit}`,
    }],
  };
}

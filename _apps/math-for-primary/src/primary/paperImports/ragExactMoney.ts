import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';

export const RAG_PATTERN = {
  id: 'rag-build-exact-money', level: 1, title: 'Make an exact payment',
  objective: 'Choose coins or notes that make a target and follow the limits on the payment.',
  skillIds: ['P1.S.MONEY.01', 'P1.S.MONEY.02'],
  canonicalPatternId: 'build-exact-coin-or-note-combinations',
};

type Plan = { counts: number[]; pieces: number[]; total: number };
type Step = NonNullable<Question['workedSteps']>[number];
const add = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
const money = (v: number, cents: boolean) => cents ? `${v}¢` : `$${v}`;
const sumText = (xs: number[], cents: boolean) => xs.map(v => money(v, cents)).join(' + ');
const tray = (vs: number[], caps: number[]) => vs.flatMap((v, i) => Array<number>(caps[i]).fill(v));

// One plan per set of denomination counts; exchanging identical pieces is not a new way.
function plans(vs: number[], caps: number[], limit: number): Plan[] {
  const result: Plan[] = [];
  function visit(i: number, total: number, counts: number[]) {
    if (i === vs.length) {
      if (total) result.push({ counts, pieces: tray(vs, counts), total });
      return;
    }
    for (let n = 0; n <= caps[i] && total + n * vs[i] <= limit; n++)
      visit(i + 1, total + n * vs[i], [...counts, n]);
  }
  visit(0, 0, []);
  return result;
}

function byPrice(ps: Plan[]) {
  const groups = new Map<number, Plan[]>();
  for (const p of ps) {
    const group = groups.get(p.total);
    if (group) group.push(p); else groups.set(p.total, [p]);
  }
  return [...groups.values()];
}

function fields(key: string, prompt: string, context: string[], labels: string[], values: number[],
                hint: string, workedSteps: Step[], picture?: Question['picture']): Question {
  return { key, prompt, context, structuredResponse: { kind: 'number-fields', fields: labels.map(label => ({ label })) },
    answer: JSON.stringify(values.map(String)), hint, workedSteps,
    explanation: workedSteps.map(s => [s.text, s.equation].filter(Boolean).join(' ')).join(' '),
    ...(picture ? { picture } : {}) };
}

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const r = new Rng(hashString(key));
  const mode = (hashString(String(seed)) + (index >>> 0)) % 4;

  if (mode === 0 || mode === 2) {
    const fewest = mode === 2, vs = [2, 5, 10];
    const caps = [r.int(2, 4), fewest ? r.int(5, 6) : r.int(1, 3), r.int(1, 2)];
    const stock = tray(vs, caps).sort((a, b) => b - a);
    const candidates: Plan[] = [];
    for (const group of byPrice(plans(vs, caps, 100))) {
      group.sort((a, b) => a.pieces.length - b.pieces.length);
      const p = group[0], k = p.pieces.length;
      if (p.total === 41 || k === stock.length || k > 8 || p.counts.filter(Boolean).length < 2) continue;
      if (!fewest && group.length === 1) candidates.push(p);
      if (fewest && group.length > 1 && group[1].pieces.length > k &&
          p.counts[2] === caps[2] && p.counts[1] >= 2 && add(stock.slice(0, k - 1)) < p.total) candidates.push(p);
    }
    const pay = r.pick(candidates), used = [...pay.pieces].reverse(), k = used.length;
    const steps: Step[] = [{text: `Try a $${used[0]} note. Find how much is left to pay.`,
      equation: `$${pay.total} − $${used[0]} = $${pay.total - used[0]}`},
      {text: 'Count out the rest from the tray, then check the whole payment.',
       equation: `${sumText(used, false)} = $${pay.total}`}];
    if (fewest) {
      const top = stock.slice(0, k - 1);
      steps.push({text: `Even the ${k - 1} largest notes fall short. So we need all ${k} notes in our payment.`,
        equation: `${sumText(top, false)} = $${add(top)} < $${pay.total}`});
    }
    return fields(key, `Which notes will pay $${pay.total} exactly${fewest ? ' using the fewest notes' : ''}?`,
      ['Each tile is one note in the tray. Use each note at most once. Write 0 for any kind you do not use.'],
      vs.map(v => `Number of $${v} notes`), pay.counts,
      fewest ? 'Try the larger notes first. Could fewer notes reach the price?' :
        'Try a note and count how much is left to pay. Use only notes still in the tray.', steps,
      {type: 'pattern', items: r.shuffle(stock).map(v => money(v, false))});
  }

  if (mode === 1) {
    const vs = [5, 10, 20, 50], limited = r.chance(0.5);
    const caps = limited ? r.pick([[2, 1, 1, 1], [2, 2, 1, 1], [3, 1, 1, 1], [1, 2, 1, 1]]) : vs.map(() => 3);
    const options = byPrice(plans(vs, caps, 100).filter(p => p.pieces.length === 3))
      .filter(g => g.length === 1 && g[0].counts.filter(Boolean).length >= 2 && ![45, 80].includes(g[0].total))
      .map(g => g[0]);
    const first = r.pick(options.filter(p => p.counts.some(n => n > 1)));
    const pair = r.shuffle([first, r.pick(options.filter(p => p.total !== first.total))]);
    const items = ['Bookmark', 'Sticker'];
    const context = [limited ? 'Each tile is one coin. Use only these coins. Put them all back before you pay for the next item.'
      : 'You may use any of these coins more than once: 5¢, 10¢, 20¢, 50¢.',
      ...pair.map((p, i) => `${items[i]}: ${p.total}¢`), 'For each item, write the three coin values from smallest to largest.'];
    const steps: Step[] = pair.flatMap((p, i) => {
      const [a, b, c] = p.pieces;
      return [{text: `${items[i]}: try a ${c}¢ coin. How much must the other two coins make?`,
        equation: `${p.total}¢ − ${c}¢ = ${a + b}¢`},
        {text: `Use ${a}¢ and ${b}¢ for the other two coins. Check all three together.`,
         equation: `${sumText(p.pieces, true)} = ${p.total}¢`}];
    });
    return fields(key, 'Which 3 coins will pay for each item exactly?', context,
      items.flatMap(item => [1, 2, 3].map(n => `${item}, coin ${n} (¢)`)), pair.flatMap(p => p.pieces),
      'Try one coin. Can two more coins make the amount left to pay?', steps,
      limited ? {type: 'pattern', items: r.shuffle(tray(vs, caps)).map(v => money(v, true))} : undefined);
  }

  const vs = [10, 20, 50], target = r.pick([50, 60, 80, 90]);
  const ways = plans(vs, vs.map(v => Math.floor(target / v)), target).filter(p => p.total === target);
  const shuffled = r.shuffle(ways), missing = shuffled.slice(0, 2).sort((a, b) => a.counts[0] - b.counts[0]);
  const given = shuffled.slice(2).sort((a, b) => a.counts[0] - b.counts[0]);
  const row = (p: Plan) => p.counts.join(' | ');
  const context = ['Use any number of 10¢, 20¢ and 50¢ coins. A count can be 0.',
    'Coin counts in each row: 10¢ | 20¢ | 50¢', ...given.map(p => `Shown: ${row(p)}`),
    'Write both missing rows. Put the row with fewer 10¢ coins first.'];
  const steps: Step[] = [0, 1].map(n => ({
    text: `Use ${n} ${n === 1 ? 'coin' : 'coins'} worth 50¢ each. Make the remaining ${target - n * 50}¢ with 10¢ coins. Swap two 10¢ coins for a 20¢ coin whenever you can.`,
    equation: ways.filter(p => p.counts[2] === n).sort((a, b) => b.counts[0] - a.counts[0]).map(row).join('; ')
  }));
  steps.push({text: 'Two 50¢ coins would be too much. Cross out the rows already shown. These two are left:',
    equation: missing.map(row).join('; ')});
  return fields(key, `Which ways to make ${target}¢ are missing?`, context,
    [1, 2].flatMap(n => vs.map(v => `Missing row ${n}: ${v}¢ coins`)), missing.flatMap(p => p.counts),
    'Start with no 50¢ coin. Trade two 10¢ coins for a 20¢ coin. Next try one 50¢ coin.', steps);
}

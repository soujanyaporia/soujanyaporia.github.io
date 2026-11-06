import {Rng, hashString} from '../../engine/random';
import type {Question} from '../generate';
import {exampleGrouping, groupingValue, type GroupingSpec} from '../groupingAnswer';

export const RAG_PATTERN = {
  id: 'p1-share-a-total-equally',
  level: 1,
  title: 'Make a share for everyone',
  objective: 'Count the gifts or the people, then use every item to make equal shares within 20.',
  skillIds: ['P1.S.MD.02', 'P1.S.WN.01'],
  canonicalPatternId: 'share-a-total-equally',
};

function nameList(names: string[]): string {
  return names.length === 1 ? names[0] : names.slice(0, -1).join(', ') + ' and ' + names[names.length - 1];
}

export function makeRagQuestion(seed: number, index = 0): Question {
  // Keep each construction beside its numeric follow-up. Both replay the same deal.
  const turn = index + 2 * (hashString(String(seed)) % 3);
  const slot = ((turn % 5) + 5) % 5;
  const scene = slot < 2 ? 'boxes' : slot < 4 ? 'children' : 'holder';
  const rng = new Rng(hashString(`equal-shares:${seed}:${Math.floor(turn / 5)}:${scene}`));
  const groups = rng.int(2, 5);
  const sizes = Array.from({length: Math.floor(20 / groups) - 1}, (_, i) => i + 2)
    .filter(size => ![14, 18].includes(size * groups));
  const each = rng.pick(sizes);
  const total = groups * each;
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const addBack = Array.from({length: groups}, () => each).join(' + ') + ' = ' + total;
  const proof = {op: '/' as const, a: total, b: groups};

  if (scene === 'holder') {
    const others = rng.shuffle(['Ravi', 'Lin', 'Sam', 'Asha']).slice(0, groups - 1);
    const context = [`Jia has ${total} tickets. She shares all the tickets equally with ${nameList(others)}. Jia gets a share too.`];
    const workedSteps = [
      {text: `Count Jia and ${nameList(others)}. There are ${groups} people.`},
      {text: `Give one ticket to each person in turn. Each round uses ${groups} tickets. After ${each} rounds, none are left.`},
      {text: `Each person gets ${each} tickets. Add the shares to check.`, equation: addBack},
    ];
    return {key, context, prompt: 'How many tickets does each person get?', unit: 'tickets',
      answer: String(each), proof, hint: 'Start with Jia. Who else needs a share?', workedSteps,
      explanation: `All ${groups} people, including Jia, get ${each} tickets each. ${addBack}.`};
  }

  const box = scene === 'boxes';
  const recipient = box ? 'box' : 'child';
  const context = [box ? `Pack the gifts equally into ${groups} boxes.` : `Share the gifts equally among ${groups} children.`];
  const result = box ? `Each box holds ${each} gifts.` : `Each child gets ${each} gifts.`;
  const workedSteps: NonNullable<Question['workedSteps']> = [
    {text: `Count the gifts once each. There are ${total} gifts.`},
    {text: `Set aside one gift for each ${recipient}. That uses ${groups} gifts. Do this again until no gifts are left.`},
    {text: result + ' Add the shares to check.', equation: addBack, picture: {type: 'counters', count: total, group: each}},
  ];
  const base = {key, context, hint: `Give one gift to each ${recipient} before you start the next round.`,
    workedSteps, explanation: result + ' ' + addBack + '.'};
  if (slot === 0 || slot === 2) {
    const grouping: GroupingSpec = {total, objectLabel: 'gift', target: {kind: 'count', value: groups}};
    return {...base, prompt: `Make one group for each ${recipient}. Use every gift.`, grouping,
      answer: groupingValue(exampleGrouping(grouping))};
  }
  return {...base, context: [...context, 'Each star stands for one gift.'],
    prompt: (box ? 'How many gifts go in each box?' : 'How many gifts does each child get?') + ' Write a sum on paper to check.',
    picture: {type: 'counters', count: total}, answer: String(each), unit: 'gifts', proof};
}

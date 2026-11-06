import { hashString, Rng } from '../../engine/random';
import type { Question } from '../generate';
import { routeMap } from './ragShortestRouteMap';

export const RAG_PATTERN = {
  id: 'p3-rag-shortest-route',
  level: 3,
  title: 'Find the shortest route',
  objective: 'Compare whole routes in metres and find the shortest journey that visits the named stops in order.',
  skillIds: ['P3.S.MEASURE.03', 'P3.S.MEASURE.02', 'P3.S.AS.01', 'P3.S.MD.04'],
  canonicalPatternId: 'p3-shortest-route',
};

const metres = (n: number) => `${n} m`;
const compound = (n: number) => `${Math.floor(n / 1000)} km ${n % 1000} m`;
type Steps = NonNullable<Question['workedSteps']>;
type RouteTask = Pick<Question, 'picture' | 'prompt' | 'display' | 'choices' | 'answer' | 'structuredResponse' | 'hint'>;

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const rng = new Rng(hashString(key));
  const variant = ((hashString(String(seed)) + index) % 3 + 3) % 3;
  const names = rng.shuffle(['Gate', 'Pond', 'Mill', 'Hall']);
  const [start, upper, lower, end] = names;
  const context = ['The map shows all the paths. You can walk either way on each path. Use the distances on the map.'];
  const steps: Steps = [];
  const finish = (task: RouteTask): Question => ({
    ...task, key, context, workedSteps: steps,
    explanation: steps.map(s => [s.text, s.equation].filter(Boolean).join(' ')).join('\n'),
  });

  if (variant === 2) {
    const first = rng.int(38, 62) * 10 + 1;
    const side = rng.int(111, 149) * 10 + 2;
    const viaStart = first + side;
    const diagonal = viaStart + rng.pick([-1, 1]) * rng.int(8, 29) * 10;
    const last = rng.int(102, 128) * 10 + 4;
    const bypass = rng.int(225, 278) * 10 + 6;
    const middle = Math.min(diagonal, viaStart);
    const total = first + middle + last;
    context.push(`Visit ${upper} before ${lower}, and reach ${end} last. You may use a path twice.`);
    steps.push(
      { text: `Start with ${start} to ${upper}. The other path from ${start} goes to ${lower} too soon.`, equation: metres(first) },
      { text: `For ${upper} to ${lower}, you could walk back through ${start}. Change the side path to metres and add.`,
        equation: `${compound(side)} = ${side} m.  ${first} + ${side} = ${viaStart} m` },
      { text: `Compare that walk with the direct path. ${middle === diagonal ? 'Take the direct path' : 'Go back through ' + start}.`,
        equation: `${middle} m < ${Math.max(diagonal, viaStart)} m` },
      { text: `From ${lower}, go straight to ${end}. Any other way into ${end} finishes with the longer path from ${upper}.`,
        equation: `${compound(last)} = ${last} m.  ${last} m < ${bypass} m (${compound(bypass)})` },
      { text: 'Add the distances for the three parts of the walk.', equation: `${first} + ${middle} + ${last} = ${total} m = ${compound(total)}` },
    );
    return finish({
      display: [start, upper, lower, end].join(' → '),
      picture: routeMap(names, metres(first), compound(bypass), compound(side), compound(last), metres(diagonal)),
      prompt: 'How long is the shortest walk that visits the places in the order shown?',
      hint: 'Look at each pair of stops. Between the middle two stops, could going back through the start be shorter?',
      answer: compound(total), choices: rng.shuffle([total, first + middle, middle + last, first + last].map(compound)),
    });
  }

  let top: number, right: number, left: number, bottom: number;
  let spur = 0, factor = 0;
  const linked = variant === 1;
  if (linked) {
    names.push('Hut');
    factor = rng.int(2, 5);
    spur = rng.int(Math.ceil(420 / factor), Math.floor(675 / factor));
    left = factor * spur;
    top = rng.int(43, 64) * 10 + 7;
    const upperTotal = rng.int(112, 135) * 10 + 6;
    right = upperTotal - top;
    bottom = upperTotal + rng.pick([-1, 1]) * rng.int(2, 9) * 10 - left;
    context.push(`The path from ${start} to ${lower} is ${factor} times as long as the path from ${upper} to Hut.`);
  } else {
    left = rng.int(118, 169) * 10 + 2;
    right = rng.int(111, 184) * 10 + 4;
    const extra = rng.int(15, 39) * 10;
    top = left + extra;
    bottom = right + extra + rng.pick([-1, 1]) * rng.int(2, 10) * 10;
    steps.push({ text: 'Change both kilometre-and-metre labels to metres. Each kilometre is 1000 metres.',
      equation: `${compound(right)} = ${right} m.  ${compound(left)} = ${left} m` });
  }

  const viaUpper = top + right, viaLower = left + bottom;
  const shortest = Math.min(viaUpper, viaLower);
  const winner = viaUpper < viaLower ? upper : lower;
  steps.push(
    { text: `Add the two paths through ${upper}.`, equation: `${top} + ${right} = ${viaUpper} m` },
    { text: `Add the two paths through ${lower}.`, equation: `${left} + ${bottom} = ${viaLower} m` },
    { text: `The route through ${winner} is shorter.`, equation: `${shortest} m < ${Math.max(viaUpper, viaLower)} m` },
  );
  const shared = {
    display: [start, end].join(' → '),
    picture: routeMap(names, metres(top), linked ? metres(right) : compound(right), linked ? metres(left) : compound(left), metres(bottom)),
  };
  if (linked) {
    steps.push(
      { text: 'Write the shorter distance in kilometres and metres.', equation: `${shortest} m = ${compound(shortest)}` },
      { text: `The ${start} to ${lower} distance is made up of ${factor} lengths like the path to Hut. Divide to find one length.`,
        equation: `${left} ÷ ${factor} = ${spur} m` },
    );
    return finish({ ...shared,
      prompt: `(a) How far is the shortest walk from ${start} to ${end}? Give its length in kilometres and metres.\n(b) How long is the path from ${upper} to Hut in metres?`,
      hint: 'For (a), follow each route all the way to the finish. For (b), find one equal part of the longer path.',
      structuredResponse: { kind: 'number-fields', fields: [{ label: '(a) Kilometres' }, { label: '(a) Metres' }, { label: '(b) Metres to Hut' }] },
      answer: JSON.stringify([Math.floor(shortest / 1000), shortest % 1000, spur].map(String)),
    });
  }
  return finish({ ...shared,
    prompt: `What is the length of the shortest walk from ${start} to ${end}, in metres?`,
    hint: 'Use metres for every path. Compare the whole walks, including both paths in each.',
    answer: metres(shortest), choices: rng.shuffle([viaUpper, viaLower, right, bottom].map(metres)),
  });
}

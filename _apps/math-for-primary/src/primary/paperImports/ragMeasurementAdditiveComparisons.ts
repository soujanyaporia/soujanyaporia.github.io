import {Rng, hashString} from '../../engine/random';
import type {Question} from '../generate';
import type {Batch11UpperMark, Batch11UpperPicture} from './batch11UpperPicture';

export const RAG_PATTERN = {
  id: 'p3-rag-measurement-additive-comparisons',
  level: 3,
  title: 'Compare masses, heights and distances',
  objective: 'Use differences to find a missing measurement and combine lengths in metres and kilometres.',
  skillIds: ['P3.S.AS.01', 'P3.S.MEASURE.02', 'P3.S.MEASURE.03'],
  canonicalPatternId: 'p3-measurement-additive-comparisons',
};

type Step = {text: string; equation: string};

function finish(key: string, task: Omit<Question, 'key' | 'workedSteps' | 'explanation'>, steps: Step[]): Question {
  return {...task, key, workedSteps: steps, explanation: steps.map(s => `${s.text} ${s.equation}.`).join(' ')};
}

// Four kilograms per turn. Each of the ten spaces between whole kilograms is 100 g.
function scales(blueTick: number, bothTick: number): Batch11UpperPicture {
  const marks: Batch11UpperMark[] = [];
  const cy = 94;
  for (const [cx, caption, reading] of [[80, 'Blue bag', blueTick], [240, 'Both bags', bothTick]] as const) {
    marks.push({kind: 'circle', cx, cy, r: 68});
    for (let i = 0; i < 40; i++) {
      const angle = i * Math.PI / 20;
      const dx = Math.sin(angle), dy = -Math.cos(angle);
      const wholeKg = i % 10 === 0;
      const inner = wholeKg ? 56 : 62;
      marks.push({kind: 'line', x1: cx + inner * dx, y1: cy + inner * dy, x2: cx + 68 * dx, y2: cy + 68 * dy});
      if (wholeKg) marks.push({kind: 'text', x: cx + 46 * dx - 5, y: cy + 46 * dy + 5, text: String(i / 10)});
    }
    const angle = reading * Math.PI / 20;
    marks.push({kind: 'line', x1: cx, y1: cy, x2: cx + 58 * Math.sin(angle), y2: cy - 58 * Math.cos(angle)},
      {kind: 'circle', cx, cy, r: 3, fill: '#235b4c'},
      {kind: 'text', x: cx - 52, y: 188, text: `${caption} (kg)`});
  }
  return {type: 'batch11-upper', marks, label: `Two scales marked in kilograms. Ten equal spaces separate each pair of numbered marks. Counting clockwise from zero, the blue bag points to mark ${blueTick}, and both bags together point to mark ${bothTick}.`};
}

function bagQuestion(key: string, r: Rng): Question {
  const blueTick = r.int(14, 18);
  const bothTick = r.pick([23, 24, 25, 26, 27, 28].filter(t => t < 2 * blueTick && 2 * t !== 3 * blueTick));
  const blue = 100 * blueTick, both = 100 * bothTick, red = both - blue;
  return finish(key, {
    context: ['A blue bag is weighed on its own. Then that same blue bag and a red bag are weighed together.'],
    picture: scales(blueTick, bothTick),
    prompt: 'How many grams heavier is the blue bag than the red bag?',
    unit: 'g', answer: String(blue - red),
    hint: 'Find the value of one small space. Which reading includes the red bag?',
  }, [
    {text: 'Ten small spaces make one kilogram.', equation: '1000 g ÷ 10 = 100 g'},
    {text: 'Read the blue bag in grams.', equation: `1000 g + ${blueTick - 10} × 100 g = ${blue} g`},
    {text: 'Read the two bags together in grams.', equation: `2000 g + ${bothTick - 20} × 100 g = ${both} g`},
    {text: 'Take the blue bag’s mass away from the total to find the red bag’s mass.', equation: `${both} g − ${blue} g = ${red} g`},
    {text: 'Compare the bags.', equation: `${blue} g − ${red} g = ${blue - red} g`},
  ]);
}

function heightQuestion(key: string, r: Rng): Question {
  const bamboo = r.int(135, 158), drop = r.int(14, 23), rise = r.pick([5, 7, 8, 9, 10, 11]);
  const fern = bamboo - drop, sunflower = fern + rise;
  return finish(key, {
    context: [`A bamboo plant stands ${bamboo} cm tall.`, `A fern is ${drop} cm shorter than the bamboo.`,
      `A sunflower is ${rise} cm taller than the fern.`],
    prompt: 'How tall is the sunflower in centimetres?',
    unit: 'cm', answer: String(sunflower),
    hint: 'Compare the fern with the bamboo first. Which plant is the sunflower compared with?',
  }, [
    {text: 'Subtract to find the height of the fern.', equation: `${bamboo} cm − ${drop} cm = ${fern} cm`},
    {text: 'Count up from the fern to the sunflower.', equation: `${fern} cm + ${rise} cm = ${sunflower} cm`},
  ]);
}

function trailQuestion(key: string, r: Rng): Question {
  const km = r.pick([2, 4]);
  const difference = 100 * r.int(5, 14) + r.pick([25, 75]);
  const home = 100 * r.int(16, 24) + r.pick([10, 40, 60, 90]);
  const middle = km * 1000, first = middle - difference, lap = first + middle + home;
  const wholeKm = Math.floor(lap / 1000), metres = lap % 1000;
  return finish(key, {
    context: ['A trail leads from a gate to a bridge, then to a pond and back to the gate.',
      `The path from the bridge to the pond is ${km} km long.`,
      `The path from the gate to the bridge is ${difference} m shorter than the path from the bridge to the pond.`,
      `The path from the pond back to the gate is ${home} m long.`],
    prompt: '(a) How far is it from the gate to the bridge in metres?\n(b) Jia walks once around the trail. How far does she walk in kilometres and metres?',
    structuredResponse: {kind: 'number-fields', fields: [
      {label: '(a) Gate to bridge (m)'}, {label: '(b) Whole kilometres'}, {label: '(b) Remaining metres'},
    ]},
    answer: JSON.stringify([first, wholeKm, metres].map(String)),
    hint: 'Use metres to compare the first two paths. For the whole walk, count each path once.',
  }, [
    {text: 'Change the bridge-to-pond length to metres.', equation: `${km} km = ${middle} m`},
    {text: '(a) The first path is shorter. Take away the difference.', equation: `${middle} m − ${difference} m = ${first} m`},
    {text: '(b) Add all three paths, including the path back to the gate.', equation: `${first} m + ${middle} m + ${home} m = ${lap} m`},
    {text: 'Each group of 1000 metres makes a kilometre.', equation: `${lap} m = ${wholeKm} km ${metres} m`},
  ]);
}

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const r = new Rng(hashString(key));
  const slot = (hashString(String(seed)) + (index >>> 0)) % 4;
  if (slot < 2) return bagQuestion(key, r);
  if (slot === 2) return heightQuestion(key, r);
  return trailQuestion(key, r);
}

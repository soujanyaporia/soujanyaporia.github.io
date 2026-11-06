import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';
import type { Batch10EarlyPicture } from './batch10EarlyPicture';

export const RAG_PATTERN = {
  id: 'p2-rag-solid-surface-properties',
  level: 2,
  title: 'Look at the surfaces',
  objective: 'Select pictured objects by how they roll or by the flat and curved surfaces they have.',
  skillIds: ['P2.S.SHAPE.02'],
  canonicalPatternId: 'p2-solid-surface-properties',
};

const blocks = ['cube', 'cuboid'] as const;
const rollers = ['cone', 'cylinder', 'sphere'] as const;
type Solid = typeof blocks[number] | typeof rollers[number];

const surfaces = {
  cube: { flat: 6, curved: false, clue: 'The top, bottom and four sides are all flat. That makes 6 flat faces.' },
  cuboid: { flat: 6, curved: false, clue: 'Count the top and bottom as well as the four sides. All 6 faces are flat.' },
  cone: { flat: 1, curved: true, clue: 'There is 1 flat circle at the base. The curved side goes up to a point.' },
  cylinder: { flat: 2, curved: true, clue: 'The two round ends are flat, even when one is out of sight. The side between them curves.' },
  sphere: { flat: 0, curved: true, clue: 'The surface curves all the way round. There are no flat faces.' },
};

const objectNames: Record<Solid, string[]> = {
  cube: ['letter block', 'number block'],
  cuboid: ['shoe box', 'brick'],
  cone: ['wooden toy mountain', 'wooden toy treetop'],
  cylinder: ['soup tin', 'toy drum'],
  sphere: ['marble', 'rubber ball'],
};

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const r = new Rng(hashString(key));
  const task = r.pick(['roll', 'face-count', 'both'] as const);
  let shapes: Solid[];
  if (task === 'roll') {
    shapes = [...blocks, ...r.shuffle(rollers).slice(0, 2)];
  } else if (task === 'face-count') {
    // Use just one six-faced block so every count in the picture is different.
    shapes = [r.pick(blocks), ...r.shuffle(rollers).slice(0, 2)];
  } else {
    shapes = [...blocks, 'sphere', r.pick(['cylinder', 'cone'] as const)];
  }

  const objects = r.shuffle(shapes).map((shape, i) => {
    const letter = 'ABCD'[i];
    const label = task === 'both' ? `${letter} (${r.pick(objectNames[shape])})` : letter;
    return { label, shape };
  });
  const picture: Batch10EarlyPicture = { type: 'batch10-early', layout: 'solid-order', objects };
  const labels = objects.map(o => o.label);
  const steps = objects.map(o => ({ text: `${o.label} has the shape of a ${o.shape}. ${surfaces[o.shape].clue}` }));
  const finish = (
    prompt: string, answer: string, hint: string, explanation: string,
    response: Pick<Question, 'choices' | 'structuredResponse' | 'context'>,
  ): Question => ({
    key, picture, prompt, answer, hint, explanation, ...response,
    workedSteps: [...steps, { text: explanation }],
  });

  if (task === 'roll') {
    const matches = objects.filter(o => surfaces[o.shape].curved).map(o => o.label);
    return finish('Which of these solids can roll? Select every one that can.', JSON.stringify(matches),
      'Imagine turning each solid so a different part of it touches the floor.',
      `${matches.join(' and ')} can each roll on a curved surface. The other solids have only flat faces.`,
      { structuredResponse: { kind: 'named-pair', options: labels } });
  }

  if (task === 'face-count') {
    const target = r.pick(objects);
    const count = surfaces[target.shape].flat;
    const description = count === 0 ? 'no flat faces' : `exactly ${count} flat ${count === 1 ? 'face' : 'faces'}`;
    return finish(`Which solid has ${description}?`, target.label,
      'Picture turning each solid over. Count the flat faces at the back and underneath too.',
      `Only ${target.label} has ${description}.`, { choices: labels });
  }

  const match = objects.find(o => surfaces[o.shape].flat > 0 && surfaces[o.shape].curved)!;
  return finish('Which object has a flat part and a curved part on its surface?', match.label,
    'Check each model for both kinds of surface.',
    `${match.label} has both kinds. The ball-shaped model has only a curved surface, and the two blocks have only flat faces.`,
    { choices: labels, context: ['Use the models shown for the shapes of the objects.'] });
}

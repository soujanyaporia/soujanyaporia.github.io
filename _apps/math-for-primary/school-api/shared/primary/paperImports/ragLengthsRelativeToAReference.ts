import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';
import type { GridSegment } from '../gridDrawingModel';

export const RAG_PATTERN = {
  id: 'p1-reference-sticks-and-strips',
  level: 1,
  title: 'Compare sticks and strips',
  objective: 'Use a shared starting line to find which object is shorter or taller than a named object.',
  skillIds: ['P1.S.LENGTH.01'],
  canonicalPatternId: 'p1-lengths-relative-to-a-reference',
};

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const rng = new Rng(hashString(key));
  const form = rng.pick(['strip', 'owners', 'both', 'taller'] as const);
  const labels = rng.shuffle(form === 'owners'
    ? ['Mei', 'Ben', 'Asha', 'Kai', 'Lin', 'Tom']
    : ['D', 'F', 'H', 'J', 'K', 'M']).slice(0, 3);
  const [short, ref, tall] = labels;
  const middleSize = rng.int(4, 6);
  const objects = rng.shuffle([
    { label: short, size: middleSize - rng.int(1, 2) },
    { label: ref, size: middleSize },
    { label: tall, size: middleSize + rng.int(1, 2) },
  ]);

  const horizontal = form === 'strip';
  const hint = horizontal
    ? 'Start at the left ends. Look across to see where each strip stops.'
    : 'Find the stick named in the question. Look across from its top to the tops of the other sticks.';
  const setup = horizontal
    ? 'The paper strips start at the same edge.'
    : 'The sticks stand on the same line.';
  const steps = [{ text: setup }];
  let picture: NonNullable<Question['picture']>;
  let context: string[] | undefined;
  if (horizontal) {
    picture = {
      type: 'paper', layout: 'bars',
      rows: objects.map(({ label, size }) => ({
        label, parts: [{ size, label: '', tone: 'blue' }],
      })),
    };
    steps.push({ text: `Strip ${short} stops before strip ${ref}. Strip ${tall} goes past it.` });
  } else {
    const [left, centre, right] = objects.map(o => o.label);
    const positions = form === 'owners'
      ? `From left to right, the sticks belong to ${left}, ${centre} and ${right}.`
      : `From left to right, the sticks are ${left}, ${centre} and ${right}.`;
    context = [positions];
    const segments = objects.map(({ size }, i): GridSegment => {
      const x = 2 + i * 3;
      return [[x, 8], [x, 8 - size]];
    });
    picture = { type: 'grid-drawing', columns: 10, rows: 8, segments, caption: positions };
    if (form === 'owners') {
      steps.push({ text: `${tall}'s stick reaches above both other sticks, so it is the tallest.` });
      steps.push({ text: `${short}'s stick ends below ${ref}'s stick, so it is shorter.` });
    } else {
      steps.push({ text: `Stick ${short} ends below the top of stick ${ref}. Stick ${tall} reaches above it.` });
    }
  }

  let prompt: string;
  let answer: string;
  switch (form) {
    case 'strip':
      prompt = `Which strip is shorter than strip ${ref}? Write its letter.`;
      answer = short;
      break;
    case 'taller':
      prompt = `Which stick is taller than stick ${ref}? Write its letter.`;
      answer = tall;
      break;
    case 'both':
      prompt = `Compare the other sticks with stick ${ref}. Give the shorter stick's letter first and the taller stick's letter second. Put a space between the letters.`;
      answer = [short, tall].join(' ');
      break;
    case 'owners':
      prompt = `Whose stick is tallest? Whose stick is shorter than ${ref}'s stick? Write the names in that order with a space between them.`;
      answer = [tall, short].join(' ');
      break;
  }

  return {
    key, prompt, context, picture, answer, hint,
    workedSteps: steps,
    explanation: steps.map(step => step.text).join(' '),
  };
}

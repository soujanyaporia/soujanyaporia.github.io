import { hashString, Rng } from '../../engine/random';
import type { Question } from '../generate';

export const RAG_PATTERN = {
  id: 'p3-rag-linked-comparisons',
  level: 3,
  title: 'Count the buttons in three tins',
  objective: 'Use a difference and a times-as-many clue to find one collection or the total of three collections.',
  skillIds: ['P3.S.AS.01', 'P3.S.MD.03', 'P3.S.MD.04'],
  canonicalPatternId: 'p3-linked-additive-and-multiplicative-comparisons',
};

const tasks = ['find-green', 'total-from-red', 'find-red', 'total-from-multiple'] as const;

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const rng = new Rng(hashString(key));
  const task = tasks[((hashString(String(seed)) + index) >>> 0) % tasks.length];
  const factor = rng.int(2, 9);
  const gap = rng.int(14, 26);
  const smallest = rng.int(27, 54);
  const redIsMultiple = task === 'total-from-multiple';
  const red = redIsMultiple ? smallest * factor : smallest;
  const blue = red + gap;
  const green = redIsMultiple ? smallest : blue * factor;
  const total = red + blue + green;

  const given = task === 'find-red' ? `The green tin holds ${green} buttons.` : `The red tin holds ${red} buttons.`;
  const difference = `The red tin has ${gap} fewer buttons than the blue tin.`;
  const comparison = redIsMultiple
    ? `There are ${factor} times as many buttons in the red tin as in the green tin.`
    : `There are ${factor} times as many buttons in the green tin as in the blue tin.`;
  const context = task === 'total-from-red' ? [comparison, difference, given] : [given, difference, comparison];
  const workedSteps: { text: string; equation: string }[] = [];
  let hint: string;

  if (task === 'find-red') {
    hint = 'How many buttons are in one blue tin’s share of the green buttons? Then use the fewer-buttons clue.';
    workedSteps.push(
      { text: `The green tin holds ${factor} equal lots of the blue tin’s count. Find one lot.`, equation: `${green} ÷ ${factor} = ${blue}` },
      { text: `The red tin has ${gap} fewer buttons than the blue tin.`, equation: `${blue} − ${gap} = ${red}` },
    );
  } else {
    workedSteps.push({ text: `The blue tin has ${gap} more buttons than the red tin.`, equation: `${red} + ${gap} = ${blue}` });
    if (redIsMultiple) {
      hint = 'Use the red count twice. Which tin holds more than the red tin? Which tin holds one equal share of the red buttons?';
      workedSteps.push({ text: `The red tin holds ${factor} equal lots of the green tin’s count. Find one lot.`, equation: `${red} ÷ ${factor} = ${green}` });
    } else {
      hint = 'Find the blue tin’s count first. Use that count to work out how many buttons are in the green tin.';
      workedSteps.push({ text: `Count ${factor} lots of the blue tin’s buttons to find the green tin’s count.`, equation: `${blue} × ${factor} = ${green}` });
    }
  }

  const wantsTotal = task === 'total-from-red' || redIsMultiple;
  if (wantsTotal) {
    workedSteps.push({ text: 'Add the red, blue and green counts once each.', equation: `${red} + ${blue} + ${green} = ${total}` });
  }
  const targetTin = task === 'find-red' ? 'red' : 'green';
  return {
    key,
    context,
    prompt: wantsTotal ? 'How many buttons are in the three tins altogether?' : `How many buttons are in the ${targetTin} tin?`,
    answer: String(wantsTotal ? total : targetTin === 'red' ? red : green),
    unit: 'buttons',
    ...(redIsMultiple ? { choices: rng.shuffle([total, red + blue, red + green, red + blue + red * factor].map(String)) } : {}),
    hint,
    workedSteps,
    explanation: workedSteps.map(step => `${step.text} ${step.equation}.`).join(' '),
  };
}

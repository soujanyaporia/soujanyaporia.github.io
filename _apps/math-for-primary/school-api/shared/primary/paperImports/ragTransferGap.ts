import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';

export const RAG_PATTERN = {
  id: 'p3-transfer-gap',
  level: 3,
  title: 'Passing buttons between two children',
  objective: 'Find how many buttons to pass to reach a chosen difference, or find the new difference after a transfer.',
  skillIds: ['P3.S.AS.01', 'P3.S.MD.03', 'P3.S.MD.04'],
  canonicalPatternId: 'p3-transfer-and-the-resulting-gap',
};

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const rng = new Rng(hashString(key));
  const forms = ['equal-entry', 'equal-choice', 'target-gap', 'growing-gap'] as const;
  const form = forms[((hashString(String(seed)) + index) >>> 0) % forms.length];
  const base = { key, unit: 'buttons' };

  if (form === 'equal-entry' || form === 'equal-choice') {
    const smaller = 2 * rng.int(6, 14);
    const factor = rng.pick([4, 6, 7]);
    const larger = smaller * factor;
    const gap = larger - smaller;
    const pass = gap / 2;
    const equalCount = smaller + pass;
    return {
      ...base,
      context: [`Kai counts ${smaller} buttons in his tin.`, `Iman has ${factor} times as many buttons as Kai.`],
      prompt: 'How many buttons should Iman pass to Kai so that both tins hold the same number?',
      answer: String(pass),
      ...(form === 'equal-choice' ? { choices: rng.shuffle([pass, gap, larger, equalCount].map(String)) } : {}),
      hint: 'Find how many extra buttons Iman has. Think about what happens to both tins when one button changes hands.',
      explanation: `Each button Iman passes leaves her with one fewer and Kai with one more. Passing ${pass} buttons leaves ${equalCount} in each tin.`,
      workedSteps: [
        { text: 'Find how many buttons Iman starts with.', equation: `${smaller} × ${factor} = ${larger}` },
        { text: 'Find how many more buttons Iman has than Kai.', equation: `${larger} − ${smaller} = ${gap}` },
        { text: 'Each button passed closes the gap by two. Halve the gap to find how many to pass.', equation: `${gap} ÷ 2 = ${pass}` },
        { text: 'Check both tins after the transfer.', equation: `${larger} − ${pass} = ${equalCount} and ${smaller} + ${pass} = ${equalCount}` },
      ],
    };
  }

  if (form === 'target-gap') {
    const target = rng.int(6, 29);
    const pass = rng.int(4, 26);
    const reduction = 2 * pass;
    const gap = target + reduction;
    return {
      ...base,
      context: [`Iman starts with ${gap} more buttons than Kai.`],
      prompt: `How many buttons should Iman pass to Kai to finish with ${target} more buttons than Kai?`,
      answer: String(pass),
      hint: 'Iman still wants to have more buttons. Find how much of her lead needs to disappear.',
      explanation: `The gap needs to shrink by ${reduction} buttons. Each button passed closes it by two, so Iman passes ${pass} buttons.`,
      workedSteps: [
        { text: 'Keep the lead that Iman wants and find how much of the starting gap must close.', equation: `${gap} − ${target} = ${reduction}` },
        { text: 'Iman loses one button and Kai gains one for each button passed. Divide the change in the gap by two.', equation: `${reduction} ÷ 2 = ${pass}` },
        { text: 'Check the gap after Iman gives and Kai receives the buttons.', equation: `${gap} − ${pass} − ${pass} = ${target}` },
      ],
    };
  }

  const gap = rng.int(7, 48);
  const pass = rng.int(3, 19);
  const increase = 2 * pass;
  const finalGap = gap + increase;
  return {
    ...base,
    context: [`Iman starts with ${gap} more buttons than Kai.`, `Kai gives Iman ${pass} of his buttons.`],
    prompt: 'How many more buttons does Iman have than Kai now?',
    answer: String(finalGap),
    hint: 'Kai started with fewer buttons. Does giving some to Iman bring their counts closer together or farther apart?',
    explanation: `Kai has ${pass} fewer buttons and Iman has ${pass} more than before. Together those changes increase Iman’s lead to ${finalGap} buttons.`,
    workedSteps: [
      { text: 'Kai gives buttons to the child who already has more. Count both the buttons Kai loses and the buttons Iman gains to find how much the gap grows.', equation: `${pass} + ${pass} = ${increase}` },
      { text: 'Add this increase to Iman’s starting lead.', equation: `${gap} + ${increase} = ${finalGap}` },
    ],
  };
}

import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';

export const RAG_PATTERN = {
  id: 'p3-equivalent-fraction-forms',
  level: 3,
  title: 'Find the fraction that fits',
  objective: 'Use equivalent forms to spot a different value or find a fraction equal to two given fractions.',
  skillIds: ['P3.S.FRAC.01', 'P3.S.FRAC.02'],
  canonicalPatternId: 'p3-equivalent-fraction-forms',
};

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const rng = new Rng(hashString(key));
  const matchBoth = rng.int(1, 5) === 1;
  const [top, bottom] = rng.pick([[1, 2], [1, 3], [2, 3], [3, 4]]);
  const form = (scale: number) => `${top * scale}/${bottom * scale}`;
  const simplest = form(1);
  const scales = Array.from({ length: Math.floor(18 / bottom) }, (_, i) => i + 1);
  const largerScales = scales.slice(1);
  const referenceScales = matchBoth ? rng.shuffle(largerScales).slice(0, 2) : [rng.pick(scales)];
  const references = referenceScales.map(form);
  const unusedScales = scales.filter(scale => !referenceScales.includes(scale));
  const equalScales = rng.shuffle(unusedScales).slice(0, matchBoth ? 1 : 3);
  const equalChoices = equalScales.map(form);

  // Moving the numerator one part either way changes the value. A scale of
  // at least two leaves room for that change within a positive proper fraction.
  const changedScales = matchBoth
    ? rng.shuffle(largerScales).slice(0, 3)
    : [rng.pick(equalScales.filter(scale => scale > 1))];
  const differentChoices = changedScales.map(scale =>
    `${top * scale + rng.pick([-1, 1])}/${bottom * scale}`
  );
  const answer = matchBoth ? equalChoices[0] : differentChoices[0];
  const workedSteps: NonNullable<Question['workedSteps']> = referenceScales.map(scale =>
    scale === 1
      ? { text: `${simplest} is already in simplest form.` }
      : { text: `Divide the top and bottom of ${form(scale)} by ${scale}.`, equation: `${form(scale)} = ${simplest}` }
  );

  if (matchBoth) {
    const scale = equalScales[0];
    workedSteps.push({
      text: scale === 1
        ? `Both fractions simplify to ${simplest}. Choose that fraction.`
        : `Both fractions simplify to ${simplest}. Multiply its top and bottom by ${scale} to find the matching choice.`,
      equation: `${references[0]} = ${answer} = ${references[1]}`,
    });
  } else {
    const scale = changedScales[0];
    workedSteps.push(
      { text: `These three choices are all ways to write ${simplest}.`, equation: equalChoices.join(' = ') },
      { text: `With ${bottom * scale} equal parts in the whole, ${simplest} takes ${top * scale} parts. The remaining choice takes a different number of parts.`, equation: `${simplest} = ${form(scale)} ≠ ${answer}` },
    );
  }

  return {
    key,
    prompt: matchBoth
      ? 'Which choice has the same value as both fractions shown?'
      : 'Which choice has a different value from the fraction shown?',
    display: references.join(' and '),
    choices: rng.shuffle([...equalChoices, ...differentChoices]),
    answer,
    hint: 'Try dividing the top and bottom by the same number. Then check which choices have the same value.',
    workedSteps,
    explanation: workedSteps.map(step => [step.text, step.equation].filter(Boolean).join(' ')).join(' '),
  };
}

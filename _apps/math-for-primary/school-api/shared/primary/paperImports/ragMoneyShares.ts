import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';

export const RAG_PATTERN = {
  id: 'p3-rag-money-shares',
  level: 3 as const,
  title: 'Find the smallest amount',
  objective: 'Use the differences to take the extra dollars out of a total, then divide what is left into equal parts.',
  skillIds: ['P3.S.AS.01', 'P3.S.MD.04', 'P3.S.MONEY.01'],
  canonicalPatternId: 'p3-shares-from-total-and-additive-gaps',
};

const forms = ['pair', 'from-base', 'from-largest', 'successive'] as const;

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const rng = new Rng(hashString(key));
  const form = forms[((hashString(String(seed)) + index) >>> 0) % forms.length];
  const savings = form === 'from-largest';
  const count = form === 'pair' ? 2 : 3;
  const smallest = rng.int(14, 46);
  const middleExtra = rng.int(4, 13);
  const upperGap = rng.int(14, 23);
  const largestExtra = middleExtra + upperGap;
  const extras = count === 2 ? middleExtra : middleExtra + largestExtra;
  const total = count * smallest + extras;
  const context: string[] = [];
  const steps: NonNullable<Question['workedSteps']> = [];

  if (savings) {
    context.push(`Ida, Ravi and Zoe saved $${total} altogether.`, `Ravi saved $${largestExtra} more than Ida.`, `Zoe saved $${upperGap} less than Ravi.`);
    steps.push({ text: 'Ravi saved more than Ida. Take away the amount by which Zoe falls short of Ravi to find how much more Zoe saved than Ida.', equation: `$${largestExtra} − $${upperGap} = $${middleExtra}` });
  } else {
    const items = count === 2 ? 'A cap and a scarf' : 'A cap, a scarf and a jacket';
    context.push(`${items} cost $${total} altogether.`, `The scarf costs $${middleExtra} more than the cap.`);
    if (form === 'from-base') {
      context.push(`The jacket costs $${largestExtra} more than the cap.`);
    } else if (form === 'successive') {
      context.push(`The jacket costs $${upperGap} more than the scarf.`);
      steps.push({ text: 'Go from the cap to the scarf, then from the scarf to the jacket. Add both differences to find how much more the jacket costs than the cap.', equation: `$${middleExtra} + $${upperGap} = $${largestExtra}` });
    }
  }

  if (count === 3) {
    steps.push({ text: savings ? 'Add the extra dollars that Zoe and Ravi saved above Ida’s amount.' : 'Add the extra dollars in the scarf and jacket prices above the price of the cap.', equation: `$${middleExtra} + $${largestExtra} = $${extras}` });
  }
  const equalTotal = total - extras;
  const answer = equalTotal / count;
  steps.push({
    text: savings ? 'Take away the extra dollars. What is left is three lots of Ida’s savings.' : `Take away the extra dollars. What is left is the cost of ${count} caps.`,
    equation: `$${total} − $${extras} = $${equalTotal}`,
  }, {
    text: savings ? 'Divide into three equal parts to find how much Ida saved.' : `Divide by ${count} to find the cost of one cap.`,
    equation: `$${equalTotal} ÷ ${count} = $${answer}`,
  });

  return {
    key, context,
    prompt: savings ? 'How much did Ida save? Show your working.' : 'How much does the cap cost? Show your working.',
    unit: 'dollars', answer: String(answer),
    hint: savings ? 'Compare each child’s savings with Ida’s. How many extra dollars are in the total?' : 'Imagine each item cost the same as the cap. Which extra dollars would you take away?',
    workedSteps: steps,
    explanation: steps.map(step => `${step.text} ${step.equation}`).join(' '),
  };
}

import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';

export const RAG_PATTERN = {
  id: 'rag-p4-threshold-frequencies',
  level: 4,
  title: 'Who reached the target?',
  objective: 'Read a frequency table or bar graph and use a cutoff to find a number or fraction of pupils.',
  skillIds: ['P4.S.GRAPH.01', 'P3.S.GRAPH.01', 'P4.S.FRAC.03'],
  canonicalPatternId: 'p4-threshold-frequency-count-or-fraction',
};

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const rng = new Rng(hashString(key));
  const variant = rng.pick(['at least', 'at least', 'at least', 'more than', 'fewer than', 'fraction'] as const);
  const fraction = variant === 'fraction';
  const rule = fraction ? 'at least' : variant;
  const useTable = rng.chance(0.5);
  const scale = fraction ? rng.pick([2, 3]) : rng.pick([1, 2, 5]);
  const scores = [0, 1, 2, 3, 4, 5];
  const cutoff = rule === 'more than' ? rng.int(1, 3) : rng.int(2, 4);

  // A fraction question has 8 to 12 equal shares before scaling the pupil counts.
  const shares = scores.map(() => fraction ? 1 : rng.int(1, 7));
  if (fraction) {
    const extras = rng.int(2, 6);
    for (let i = 0; i < extras; i++) shares[rng.int(0, shares.length - 1)]++;
  }
  const counts = shares.map(n => n * scale);
  const labels = scores.map(String);
  const picture: Question['picture'] = useTable
    ? {type: 'nanyang-p4', layout: 'table', caption: 'Hoop toss results', rowHeader: 'Hoops on target',
       columns: labels, rows: [{label: 'Pupils', values: counts}]}
    : {type: 'bars', labels, values: counts, scale};

  const selected = scores.filter(score => {
    if (rule === 'more than') return score > cutoff;
    if (rule === 'fewer than') return score < cutoff;
    return score >= cutoff;
  });
  const sum = (values: number[]) => values.reduce((total, n) => total + n, 0);
  const groupCounts = selected.map(score => counts[score]);
  const matching = sum(groupCounts);
  const total = sum(counts);
  const condition = `${rule} ${cutoff} hoop${cutoff === 1 ? '' : 's'}`;
  const lastScore = selected[selected.length - 1];
  const scoreList = `${selected.slice(0, -1).join(', ')} and ${lastScore}`;
  const steps: NonNullable<Question['workedSteps']> = [
    {text: `The scores that fit “${condition}” are ${scoreList}.`},
    {text: 'Add the pupil counts for those scores.', equation: `${groupCounts.join(' + ')} = ${matching} pupils`},
  ];
  let answer = String(matching);
  if (fraction) {
    const divisor = gcd(matching, total);
    answer = `${matching / divisor}/${total / divisor}`;
    steps.push(
      {text: 'Count everyone who played.', equation: `${counts.join(' + ')} = ${total} pupils`},
      {text: `Write the matching count over the total. Divide both numbers by ${divisor}.`, equation: `${matching}/${total} = ${answer}`},
    );
  }

  const context = ['At a school fair, each pupil had one turn to toss five hoops at a target. The score was the number of hoops that landed on the target.'];
  if (!useTable) context.push('The numbers along the bottom are hoops on target. Each bar shows how many pupils got that score.');
  const question: Question = {
    key, context, picture, answer,
    prompt: fraction
      ? `What fraction of all the pupils landed ${condition} on the target? Give your answer in simplest form.`
      : `How many pupils landed ${condition} on the target?`,
    hint: fraction
      ? 'Decide which scores to include. Which pupils count towards the whole?'
      : 'Would a pupil with exactly the stated score count? Look for all the scores that fit.',
    workedSteps: steps,
    explanation: steps.map(step => [step.text, step.equation].filter(Boolean).join(' ')).join(' '),
    ...(fraction ? {requireSimplified: true} : {unit: 'pupils'}),
  };

  if (!fraction && (useTable || rule === 'more than')) {
    // At least two groups qualify and at least two are excluded.
    const justOutside = rule === 'at least' ? cutoff - 1 : cutoff;
    const tooFew = rule === 'at least' ? matching - counts[cutoff] : groupCounts[0];
    question.choices = rng.shuffle([matching, tooFew, matching + counts[justOutside], total].map(String));
  }
  return question;
}

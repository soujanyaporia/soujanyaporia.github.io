import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';

export const RAG_PATTERN = {
  id: 'p2-rag-two-successive-amount-changes',
  level: 2,
  title: 'Two changes to a collection',
  objective: 'Follow two changes to find a final count, or undo them to find the starting count.',
  skillIds: ['P2.S.AS.01'],
  canonicalPatternId: 'two-successive-amount-changes',
};

const variants = ['find-end', 'two-removals', 'undo-loss-gain', 'undo-gain-loss'] as const;

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const rng = new Rng(hashString(key));
  const offset = hashString(String(seed)) >>> 0;
  const turn = ((index % variants.length) + variants.length) % variants.length;
  const variant = variants[(offset + turn) % variants.length];

  if (variant === 'two-removals') {
    const made = rng.pick([600, 700, 900]);
    // The stall counts require regrouping. Their sum stays below the starting stock.
    const games = rng.int(26, 29) * 10 + rng.int(5, 8);
    const food = rng.int(14, 16) * 10 + rng.int(6, 9);
    const sent = games + food;
    const kept = made - sent;
    return {
      key,
      context: [
        `The art club made ${made} badges for the school fair.`,
        `It sent ${games} badges to the games stall. Then it sent ${food} badges to the food stall.`,
        'The club kept the rest for its helpers.',
      ],
      prompt: '(a) How many badges did the club send to the two stalls altogether? (b) How many badges did it keep for its helpers?',
      structuredResponse: {
        kind: 'number-pair',
        firstLabel: '(a) Badges sent to the stalls',
        secondLabel: '(b) Badges kept for helpers',
      },
      answer: JSON.stringify([String(sent), String(kept)]),
      hint: 'Count the badges at both stalls first. Use that total to find how many stayed with the club.',
      workedSteps: [
        { text: 'Add the badges sent to the games stall and the food stall.', equation: `${games} + ${food} = ${sent}` },
        { text: 'Take the badges sent away from all the badges the club made.', equation: `${made} − ${sent} = ${kept}` },
      ],
      explanation: `The club sent ${sent} badges to the stalls and kept ${kept} badges for its helpers.`,
    };
  }

  const start = rng.int(402, 635);
  const smallChange = rng.int(22, 33);
  const largeChange = rng.int(62, 79);
  const gainIsLarger = variant === 'undo-loss-gain' || rng.chance(0.5);
  const removed = gainIsLarger ? smallChange : largeChange;
  const added = gainIsLarger ? largeChange : smallChange;
  const take = {
    sentence: `Sam took ${removed} beads from the jar.`,
    change: -removed,
    follow: 'Subtract the beads Sam took.',
    undo: 'Add back the beads Sam took to find how many were there before his turn.',
  };
  const put = {
    sentence: `Mei put ${added} beads into the jar.`,
    change: added,
    follow: 'Add the beads Mei put in.',
    undo: 'Subtract the beads Mei put in to find how many were there before her turn.',
  };
  const [first, second] = variant === 'undo-gain-loss' ? [put, take] : [take, put];
  const end = start + first.change + second.change;
  const findStart = variant !== 'find-end';
  const context = [
    findStart ? 'A jar held some beads.' : `A jar held ${start} beads.`,
    first.sentence,
    second.sentence,
  ];
  if (findStart) context.push(`After both turns, the jar held ${end} beads.`);

  let count = findStart ? end : start;
  const workedSteps: NonNullable<Question['workedSteps']> = [];
  for (const move of findStart ? [second, first] : [first, second]) {
    const change = findStart ? -move.change : move.change;
    const next = count + change;
    workedSteps.push({
      text: findStart ? move.undo : move.follow,
      equation: `${count} ${change < 0 ? '−' : '+'} ${Math.abs(change)} = ${next}`,
    });
    count = next;
  }
  return {
    key,
    context,
    prompt: findStart ? 'How many beads were in the jar at the start? Show your two steps.' : 'How many beads are in the jar now? Show your two steps.',
    unit: 'beads',
    answer: String(count),
    hint: findStart ? 'Start with the last count. Undo the last turn first, then undo the earlier turn.' : 'Start with the beads in the jar. Follow the two turns in order.',
    workedSteps,
    explanation: findStart ? `The jar held ${count} beads before either child took a turn.` : `There are ${count} beads in the jar after both turns.`,
  };
}

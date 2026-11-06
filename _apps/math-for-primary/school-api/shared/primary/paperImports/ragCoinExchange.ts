import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';

export const RAG_PATTERN = {
  id: 'p3-coin-exchange',
  level: 3,
  title: 'Swap money for coins',
  objective: 'Find the amount to be returned in coins and work out how many coins have that value.',
  skillIds: ['P2.S.MONEY.03', 'P2.S.MONEY.04', 'P3.S.MONEY.01', 'P3.S.MD.04'],
  canonicalPatternId: 'p3-exchange-into-one-denomination',
};

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const rng = new Rng(hashString(key));
  const variant = rng.int(0, 3);
  const context: string[] = [];
  const workedSteps: NonNullable<Question['workedSteps']> = [];
  let picture: Question['picture'];
  let valueCents: number;
  let coinCents: number;
  let hint: string;

  if (variant < 2) {
    const dollars = rng.pick([2, 3, 4, 6, 7, 8, 9]);
    coinCents = rng.pick([10, 20, 50]);
    valueCents = dollars * 100;
    context.push(`Siti takes $${dollars} to the change counter. She swaps it all for coins.`);
    hint = 'How many cents does Siti have? Find how many coins of the given value make that amount.';
    workedSteps.push({ text: 'Each dollar is worth 100 cents.', equation: `${dollars} × 100¢ = ${valueCents}¢` });
  } else if (variant === 2) {
    const noteDollars = rng.pick([2, 5]);
    const notes = rng.int(1, 2);
    const dollarCoins = rng.int(1, 2);
    const halfDollars = rng.int(1, 2);
    const noteCents = notes * noteDollars * 100;
    const looseCents = dollarCoins * 100 + halfDollars * 50;
    valueCents = noteCents + looseCents;
    coinCents = 50;
    picture = { type: 'pattern', items: rng.shuffle([
      ...Array<string>(notes).fill(`$${noteDollars}`),
      ...Array<string>(dollarCoins).fill('$1'),
      ...Array<string>(halfDollars).fill('50¢'),
    ]) };
    context.push('Each tile shows one note or one coin in Siti’s purse. She swaps everything shown for coins.');
    hint = 'Count each tile once. Add the values before working out the new number of coins.';
    workedSteps.push(
      { text: 'Count the notes and change their value to cents.', equation: `${notes} × $${noteDollars} = $${notes * noteDollars} = ${noteCents}¢` },
      { text: 'Count the coins already in the purse.', equation: `${dollarCoins} × 100¢ + ${halfDollars} × 50¢ = ${looseCents}¢` },
      { text: 'Put the note and coin values together.', equation: `${noteCents}¢ + ${looseCents}¢ = ${valueCents}¢` },
    );
  } else {
    const notesGiven = rng.int(2, 4);
    const givenDollars = notesGiven * 5;
    // Leave between $1 and $9 for coins, with at least two notes returned.
    const notesBack = rng.int(Math.max(2, Math.ceil((givenDollars - 9) / 2)), Math.floor((givenDollars - 1) / 2));
    const backDollars = notesBack * 2;
    valueCents = (givenDollars - backDollars) * 100;
    coinCents = rng.pick([20, 50]);
    context.push(`Siti swaps ${notesGiven} notes worth $5 each at a change counter.`,
      `She receives ${notesBack} notes worth $2 each and the rest in coins.`);
    hint = 'Work out the value of the notes on each side of the swap. Which part still has to be paid in coins?';
    workedSteps.push(
      { text: 'Find the value Siti hands over.', equation: `${notesGiven} × $5 = $${givenDollars}` },
      { text: 'Find the value she receives in notes.', equation: `${notesBack} × $2 = $${backDollars}` },
      { text: 'Only the difference comes back in coins.', equation: `$${givenDollars.toFixed(2)} − $${backDollars.toFixed(2)} = $${(valueCents / 100).toFixed(2)} = ${valueCents}¢` },
    );
  }

  context.push(`Every coin Siti receives is worth ${coinCents} cents.`);
  const count = valueCents / coinCents;
  workedSteps.push({
    text: 'Count in groups of 10¢. Divide the number of groups you have by the number in one coin.',
    equation: `${valueCents}¢ ÷ ${coinCents}¢ = ${valueCents / 10} ÷ ${coinCents / 10} = ${count} coins`,
  });
  const question: Question = {
    key, context, prompt: 'How many coins does Siti receive?', answer: String(count), unit: 'coins', hint, workedSteps,
    explanation: workedSteps.map(step => `${step.text} ${step.equation}`).join(' '),
    proof: { op: '/', a: valueCents, b: coinCents },
  };
  if (picture) question.picture = picture;
  if (variant !== 3) {
    const miscount = picture?.type === 'pattern' ? picture.items.length : valueCents / 100;
    const wrong = [...new Set([miscount, count * 2, count - 1, count + 1])].filter(n => n !== count);
    question.choices = rng.shuffle([count, ...wrong.slice(0, 3)].map(String));
  }
  return question;
}

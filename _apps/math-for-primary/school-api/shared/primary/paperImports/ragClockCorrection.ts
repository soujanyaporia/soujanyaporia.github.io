import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';

export const RAG_PATTERN = {
  id: 'p3-clock-correction',
  level: 3,
  title: 'What time will the clock show?',
  objective: 'Use the minutes a clock is ahead or behind to find a later reading or the correct time.',
  skillIds: ['P3.S.TIME.02', 'P2.S.TIME.01'],
  canonicalPatternId: 'p3-correct-fast-or-slow-clock',
};

function dialTime(minutes: number): string {
  const hour = Math.floor(minutes / 60) % 12 || 12;
  return `${hour}:${String(minutes % 60).padStart(2, '0')}`;
}

function timeOfDay(minutes: number): string {
  return `${dialTime(minutes)} ${minutes < 720 ? 'am' : 'pm'}`;
}

function withSteps(question: Omit<Question, 'workedSteps' | 'explanation'>, steps: NonNullable<Question['workedSteps']>): Question {
  const explanation = steps.map(step => [step.text, step.equation].filter(Boolean).join(' ')).join(' ');
  return { ...question, workedSteps: steps, explanation };
}

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const rng = new Rng(hashString(key));
  const variant = rng.pick(['fast dial', 'slow watch', 'two losses']);

  if (variant === 'fast dial') {
    const shown = rng.int(7, 9) * 60 + rng.int(0, 11) * 5;
    const lead = rng.pick([5, 15, 20, 25]);
    const hours = rng.int(1, 2);
    const interval = hours === 1 ? '1 hour' : '2 hours';
    const actualNow = shown - lead;
    const later = actualNow + hours * 60;
    return withSteps({
      key,
      context: [`It is morning. The library clock is ${lead} minutes fast.`],
      picture: { type: 'clock', minutes: shown },
      prompt: `What will the correct time be in ${interval}? Write it as h:mm.`,
      answer: dialTime(later),
      hint: 'Read both hands. A fast clock shows a later time than it should. Find the correct time now, then count on.',
    }, [
      { text: `The long hand shows ${shown % 60} minutes past the hour. The library clock reads ${dialTime(shown)}.` },
      { text: 'Count back to find the correct time now.', equation: `${dialTime(shown)} − ${lead} min = ${dialTime(actualNow)}` },
      { text: `Count on ${interval}.`, equation: `${dialTime(actualNow)} + ${interval} = ${dialTime(later)}` },
    ]);
  }

  if (variant === 'slow watch') {
    const reference = rng.int(7, 16) * 60 + rng.int(0, 11) * 5;
    const lag = rng.pick([5, 10, 15, 25]);
    const wait = rng.pick([35, 40, 45, 50, 55]);
    const watchNow = reference - lag;
    const later = watchNow + wait;
    const hallLater = reference + wait;
    return withSteps({
      key,
      context: [`The hall clock shows the correct time, ${timeOfDay(reference)}.`, `Mei’s watch stays ${lag} minutes behind the hall clock.`],
      prompt: `What time will Mei’s watch show in ${wait} minutes?`,
      answer: timeOfDay(later),
      choices: rng.shuffle([later, watchNow, hallLater, hallLater + lag].map(timeOfDay)),
      hint: 'Find the time on Mei’s watch now. Then move forward by the time she waits.',
    }, [
      { text: 'Mei’s watch shows an earlier time than the hall clock.', equation: `${timeOfDay(reference)} − ${lag} min = ${timeOfDay(watchNow)}` },
      { text: 'Count on from the time on her watch.', equation: `${timeOfDay(watchNow)} + ${wait} min = ${timeOfDay(later)}` },
    ]);
  }

  const start = rng.int(7, 16) * 60;
  const loss = rng.pick([2, 3, 5, 6, 7, 8]);
  const end = start + 120;
  const totalLoss = loss + loss;
  const later = end - totalLoss;
  return withSteps({
    key,
    context: [`At ${timeOfDay(start)}, Dev sets his watch to the correct time.`, `In the first hour it loses ${loss} minutes. In the next hour it loses another ${loss} minutes.`],
    prompt: `When the correct time is ${timeOfDay(end)}, what time does Dev’s watch show?`,
    answer: timeOfDay(later),
    choices: rng.shuffle([later, end - loss, end + loss, end + totalLoss].map(timeOfDay)),
    hint: 'How many minutes has the watch lost over both hours? Its hands will be that many minutes behind.',
  }, [
    { text: 'Add the minutes lost in the first and second hours.', equation: `${loss} min + ${loss} min = ${totalLoss} min` },
    { text: 'Count back from the correct time to find the watch reading.', equation: `${timeOfDay(end)} − ${totalLoss} min = ${timeOfDay(later)}` },
  ]);
}

import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';
import type { Batch11UpperPicture, Batch11UpperMark } from './batch11UpperPicture';

export const RAG_PATTERN = {
  id: 'rag-p1-read-or-match-a-clock',
  level: 1,
  title: 'Find the matching clock',
  objective: 'Use both hands to match a time to a clock or its label, and locate the minute hand at a whole hour.',
  skillIds: ['P1.S.TIME.01'],
  canonicalPatternId: 'read-or-match-a-clock',
} as const;

const words = ['twelve', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven'];
const hour = (t: number) => Math.floor(t / 60) % 12 || 12;
const digital = (t: number) => `${hour(t)}:${t % 60 ? '30' : '00'}`;
const spoken = (t: number) => t % 60 ? `half past ${words[hour(t) % 12]}` : `${words[hour(t) % 12]} o'clock`;
const minuteMark = (t: number) => t % 60 === 0 ? 12 : 6;
function shortHand(t: number) {
  return t % 60 ? `halfway between ${hour(t)} and ${hour(t + 60)}` : `at ${hour(t)}`;
}
type Face = { tag: string; time: number; claim?: number };

function draw(faces: Face[]): Batch11UpperPicture {
  const marks: Batch11UpperMark[] = [];
  const descriptions: string[] = [];
  faces.forEach(({ tag, time, claim }, i) => {
    const cx = 54 + 106 * i, cy = 86;
    // Clockwise turns start at 12. The short hand advances between hour marks.
    const point = (turns: number, length: number) => ({
      x: cx + length * Math.sin(2 * Math.PI * turns),
      y: cy - length * Math.cos(2 * Math.PI * turns),
    });
    const hand = (turns: number, length: number) => {
      const end = point(turns, length);
      marks.push({ kind: 'line', x1: cx, y1: cy, x2: end.x, y2: end.y });
    };
    marks.push({ kind: 'circle', cx, cy, r: 50, fill: 'white' });
    for (let n = 1; n <= 12; n++) {
      const p = point(n / 12, 38);
      marks.push({ kind: 'text', x: p.x - (n < 10 ? 5 : 10), y: p.y + 6, text: String(n) });
    }
    hand(time / 720, 20);
    hand((time % 60) / 60, 29);
    marks.push({ kind: 'circle', cx, cy, r: 2, fill: '#235b4c' });
    marks.push({ kind: 'text', x: cx - 4.8 * tag.length, y: cy + 73, text: tag });
    if (claim !== undefined) {
      const text = digital(claim);
      marks.push({ kind: 'text', x: cx - 4.8 * text.length, y: cy + 96, text });
    }
    descriptions.push(`${tag}: long hand at ${minuteMark(time)}, short hand ${shortHand(time)}.` +
      (claim === undefined ? '' : ` Label: ${digital(claim)}.`));
  });
  return { type: 'batch11-upper', label: descriptions.join(' '), marks };
}

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const r = new Rng(hashString(key));
  const mode = (hashString(String(seed)) + (index >>> 0)) % 4;
  const h = r.pick([1, 2, 3, 4, 5, 7, 9, 10, 12]);
  const whole = (h % 12) * 60;
  const finish = (prompt: string, answer: string, hint: string, steps: string[], extra: Partial<Question> = {}): Question => ({
    key, prompt, answer, hint, workedSteps: steps.map(text => ({ text })), explanation: steps.join(' '), ...extra,
  });

  if (mode === 3) {
    return finish(`At ${spoken(whole)}, which number does the long hand point to?`, '12',
      'The long hand counts minutes. Where does it start each hour?',
      [`At ${spoken(whole)}, no minutes have passed since the hour began.`,
       'The long hand starts at 12. The short hand points to the hour.'],
      { choices: r.shuffle(['12', '3', '6', '9']) });
  }

  const target = whole + 30;
  const neighbour = (target + r.pick([60, 660])) % 720;
  const times = r.shuffle([target, neighbour, whole]);
  const tags = mode === 1 ? r.shuffle(['Lina', 'Kai', 'Asha']) : ['A', 'B', 'C'];
  const faces: Face[] = times.map((time, i) => ({ tag: tags[i], time }));
  if (mode === 2) {
    const correct = r.int(0, 2);
    let wrong = 0;
    faces.forEach((face, i) => {
      face.claim = i === correct ? face.time : wrong++ === 0
        ? face.time - face.time % 60 + (face.time % 60 ? 0 : 30)
        : (face.time + 60) % 720;
    });
    const read = faces.map(f => `On ${f.tag}, the long hand points to ${minuteMark(f.time)} and the short hand is ${shortHand(f.time)}. That shows ${digital(f.time)}.`);
    const tag = faces[correct].tag;
    return finish('Which clock has the right time written below it?', tag,
      'Read both hands on each clock. Then check the time written below it.',
      [...read, `Only ${tag} has a label that matches its hands.`],
      { choices: tags, picture: draw(faces) });
  }

  const tag = faces.find(f => f.time === target)!.tag;
  const named = mode === 1;
  const prompt = named ? `Who opened a book at ${spoken(target)}? Type the name.`
    : `Which clock shows ${spoken(target)}?`;
  return finish(prompt, tag, 'Check the long hand first. Then look for the hour the short hand has just passed.',
    ['Half past means 30 minutes past the hour. Look for a long hand pointing to 6.',
     `The short hand must be ${shortHand(target)}.`,
     `Both hands are in those places on ${named ? `${tag}’s clock` : `clock ${tag}`}.`],
    { picture: draw(faces), ...(named ? { context: ['Each clock shows when the child named below it opened a book.'] } : { choices: tags }) });
}

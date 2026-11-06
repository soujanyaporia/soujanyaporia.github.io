import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';
import { partitionedRectangle, sharedVertex, squareOnEdge } from './ragP4MarkedAngleSumFigures';

export const RAG_PATTERN = {
  id: 'rag-p4-marked-angle-sums',
  level: 4,
  title: 'Add angles at square and rectangle corners',
  objective: 'Trace the named angles and use right angles to find their sum.',
  skillIds: ['P4.S.ANGLE.01', 'P4.S.SHAPE.01', 'P3.S.ANGLE.01'],
  canonicalPatternId: 'p4-combine-marked-angles-at-rectangular-corners',
};

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const rng = new Rng(hashString(key));
  function question(context: string[], picture: NonNullable<Question['picture']>, prompt: string,
    total: number, hint: string, steps: string[], options?: number[]): Question {
    const response = options
      ? { answer: `${total}°`, choices: rng.shuffle(options).map(n => `${n}°`) }
      : { answer: String(total), unit: 'degrees' };
    return { key, context, picture, prompt, ...response, hint,
      workedSteps: steps.map(text => ({ text })), explanation: steps.join(' ') };
  }

  const form = rng.int(0, 2);
  if (form === 0) {
    const tilt = rng.int(24, 38);
    return question(
      ['P lies on side WX of rectangle WXYZ. The square PABC has one corner at P.', 'A half turn is two right angles.'],
      squareOnEdge(tilt, rng.int(88, 96)), 'What is the sum of ∠WPC and ∠APX?', 90,
      'Trace a half turn from PW to PX. Which part of that turn belongs to the square?',
      ['From PW to PX is a half turn, or 180°.',
        'The two marked angles and the square corner ∠CPA together fill that half turn.',
        'The marked angles together measure 180° − 90° = 90°.'],
      [90, 180, 2 * tilt, 180 - 2 * tilt]);
  }

  if (form === 1) {
    const given = rng.int(32, 52);
    const part = 90 - given;
    const total = part + 90;
    return question(
      ['T lies on the bottom side SR of rectangle PQRS. Lines PT and QT meet there.', `∠QPT is ${given}°.`],
      partitionedRectangle(given, rng.int(82, 100)), 'What is the sum of ∠SPT, ∠PQT and ∠TQR?', total,
      'Which two marked angles fill the corner at Q? What part of the corner at P is marked?',
      [`At P, ∠SPT and the given angle fill one corner. ∠SPT = 90° − ${given}° = ${part}°.`,
        'At Q, ∠PQT and ∠TQR together make the whole 90° corner.',
        `The three marked angles total ${part}° + 90° = ${total}°.`]);
  }

  const given = rng.int(20, 32);
  const wide = 90 + given;
  const total = wide + 90;
  return question(
    ['Square PQRS and rectangle PUVW share corner P.', `∠SPW is ${given}°.`],
    sharedVertex(given, rng.int(62, 68)), 'What is the sum of ∠QPW and ∠QRS?', total,
    'Trace from PQ to PW through PS. Then look at the marked corner at R.',
    [`At P, ∠QPW includes the square corner ∠QPS and the given ∠SPW. ∠QPW = 90° + ${given}° = ${wide}°.`,
      'At R, ∠QRS is another corner of the square, so it is 90°.',
      `The two angles total ${wide}° + 90° = ${total}°.`]);
}

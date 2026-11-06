import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';
import type { Batch11UpperPicture } from './batch11UpperPicture';

export const RAG_PATTERN = {
  id: 'rag-p4-count-missing-mirror-squares',
  level: 4,
  title: 'Count the missing mirror squares',
  objective: 'Find the fewest squares to shade by matching squares across a given fold line.',
  skillIds: ['P4.S.SYM.02'],
  canonicalPatternId: 'p4-count-empty-partners-across-a-given-mirror-line',
};

type Fold = 'across' | 'diagonal';
type Board = { rows: number; cols: number; fold: Fold; ink: Set<number> };

function partner(b: Board, id: number): number {
  const row = Math.floor(id / b.cols), col = id % b.cols;
  return b.fold === 'across'
    ? (b.rows - 1 - row) * b.cols + col
    : (b.rows - 1 - col) * b.cols + b.cols - 1 - row;
}
function place(b: Board, id: number) {
  return `row ${Math.floor(id / b.cols) + 1}, column ${id % b.cols + 1}`;
}

function picture(b: Board): Batch11UpperPicture {
  const side = 24, left = (320 - b.cols * side) / 2, top = (200 - b.rows * side) / 2;
  const right = left + b.cols * side, bottom = top + b.rows * side;
  const marks: Batch11UpperPicture['marks'] = [];
  // A small inset leaves the grid and the dashed fold line distinct.
  for (const id of b.ink) {
    const x = left + id % b.cols * side + 2, y = top + Math.floor(id / b.cols) * side + 2;
    marks.push({kind:'path', d:`M ${x} ${y} h 20 v 20 h -20 Z`, fill:'#526d82'});
  }
  for (let c = 0; c <= b.cols; c++) {
    const x = left + c * side;
    marks.push({kind:'line', x1:x, x2:x, y1:top, y2:bottom});
  }
  for (let r = 0; r <= b.rows; r++) {
    if (b.fold === 'across' && r === b.rows / 2) continue;
    const y = top + r * side;
    marks.push({kind:'line', x1:left, x2:right, y1:y, y2:y});
  }
  const middle = (top + bottom) / 2;
  const y1 = b.fold === 'across' ? middle : bottom + 9;
  const y2 = b.fold === 'across' ? middle : top - 9;
  marks.push({kind:'line', x1:left-9, y1, x2:right+9, y2, dashed:true},
    {kind:'text', x:left-25, y:y1+4, text:'P'}, {kind:'text', x:right+12, y:y2+4, text:'Q'});
  const direction = b.fold === 'across' ? 'halfway down, from left to right' : 'from the bottom left corner to the top right corner';
  return {type:'batch11-upper', marks,
    label:`Grid: ${b.rows} rows and ${b.cols} columns. PQ runs ${direction}. Shaded: ${[...b.ink].sort((a,c)=>a-c).map(id=>place(b,id)).join('; ')}.`};
}

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const rng = new Rng(hashString(key));
  const fold: Fold = rng.chance(0.5) ? 'across' : 'diagonal';
  const rows = fold === 'across' ? rng.pick([4,6]) : rng.pick([5,6]);
  const cols = fold === 'across' ? rng.pick([5,7]) : rows;
  const b: Board = {rows, cols, fold, ink:new Set()};
  const pairs: [number,number][] = [], fixed: number[] = [];
  for (let i = 0; i < rows * cols; i++) {
    const j = partner(b,i);
    if (i < j) pairs.push([i,j]);
    if (i === j) fixed.push(i);
  }
  const order = rng.shuffle(pairs), matched = rng.int(2,3), singles = rng.int(2,6);
  for (const [a,c] of order.slice(0,matched)) { b.ink.add(a); b.ink.add(c); }
  const startSide = rng.int(0,1);
  order.slice(matched,matched+singles).forEach((p,i)=>b.ink.add(p[(startSide+i)%2]));
  for (const id of rng.shuffle(fixed).slice(0,2)) b.ink.add(id);

  const missing = [...b.ink].map(i=>partner(b,i)).filter(i=>!b.ink.has(i)).sort((a,c)=>a-c);
  const answer = missing.length;
  const wrong = rng.shuffle([1,2,3,4,5,6,7,8].filter(n=>n!==answer)).slice(0,3);
  const steps = [
    'Imagine folding the grid along PQ. Each shaded square must land on a shaded square.',
    fold === 'across' ? 'Compare rows the same distance from PQ, one column at a time.'
      : 'A square that PQ cuts diagonally lands on itself. Compare the other squares on opposite sides of PQ.',
    `These blank squares would meet shaded squares: ${missing.map(id=>place(b,id)).join('; ')}.`,
    `Shade these ${answer} squares and every pair will match. Leave even one of them blank and its partner will still be unmatched.`,
  ];
  return {key, context:['Keep all the shaded squares. Count rows from the top and columns from the left.'],
    prompt:'Imagine folding the grid along PQ. What is the smallest number of extra squares you need to shade for the two sides to match?',
    picture:picture(b), answer:String(answer), choices:rng.shuffle([answer,...wrong]).map(String), unit:'squares',
    hint:'Look on both sides of PQ. Count a blank square only if it would fold onto a shaded square.',
    workedSteps:steps.map(text=>({text})), explanation:steps.join(' ')};
}

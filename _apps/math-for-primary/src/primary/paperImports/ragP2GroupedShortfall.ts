import {Rng,hashString} from '../../engine/random';
import type {Question} from '../generate';

export const RAG_PATTERN = {
 id: 'p2-rag-grouped-shortfall',
 level: 2,
 title: 'How many more are needed?',
 objective: 'Multiply equal daily groups over a range of days, then find how many more are needed to reach a target.',
 skillIds: ['P2.S.MD.01', 'P2.S.AS.01'],
 canonicalPatternId: 'p2-grouped-stock-shortfall-against-target',
};

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const PEOPLE: [string, string][] = [['Mei', 'She'], ['Farid', 'He'], ['Kavya', 'She'], ['Daniel', 'He']];
const THINGS = ['paper stars', 'bookmarks', 'origami boats', 'greeting cards'];

export function makeRagQuestion(seed: number, index = 0): Question {
 const r = new Rng(hashString(`p2-rag-grouped-shortfall:${seed}:${index}`));
 const [name, pronoun] = r.pick(PEOPLE);
 const noun = r.pick(THINGS);
 const each = r.pick([2, 3, 4, 5]);
 const length = r.int(3, 6);
 const start = r.int(0, DAYS.length - length);
 const first = DAYS[start], last = DAYS[start + length - 1];
 const product = each * length;
 const shortfall = r.int(3, 20);
 const target = product + shortfall;
 const steps = [
 {text: 'Count the days, including the first day and the last day.', equation: `${first} to ${last} = ${length} days`},
 {text: 'Multiply to find how many were made.', equation: `${length} × ${each} = ${product}`},
 {text: 'Subtract from the number wanted.', equation: `${target} − ${product} = ${shortfall}`},
 ];
 return {
 key: `p2-rag-grouped-shortfall:${seed}:${index}`,
 prompt: `How many more ${noun} does ${name} still need to make?`,
 context: [
 `${name} wants to give ${target} ${noun} to a class.`,
 `${pronoun} makes ${each} ${noun} every day from ${first} to ${last}.`,
 ],
 answer: String(shortfall),
 unit: noun,
 hint: `Count every day from ${first} to ${last}. Find how many were made, then see how many more are needed.`,
 explanation: steps.map(s => `${s.text} ${s.equation}.`).join(' '),
 workedSteps: steps,
 };
}

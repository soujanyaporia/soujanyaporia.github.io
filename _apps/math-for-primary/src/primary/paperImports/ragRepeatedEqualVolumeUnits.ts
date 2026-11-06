import {Rng,hashString} from '../../engine/random';
import type {Question} from '../generate';

export const RAG_PATTERN = {
 id: 'rag-repeated-equal-volume-units',
 level: 6,
 title: 'Repeated equal-volume units',
 objective: 'Divide a volume or number of cubes by the amount in one unit, then round down or up as the situation requires.',
 skillIds: ['P5.S.VOL.03', 'P5.S.VOL.04', 'P5.S.VOL.05', 'P6.S.FRAC.02'],
 canonicalPatternId: 'p6-repeated-equal-volume-units',
};

const ceilDiv = (a: number, b: number) => Math.floor((a + b - 1) / b);
type Step = [string, string];

export function makeRagQuestion(seed: number, index = 0): Question {
 const r = new Rng(hashString(`rag-repeated-equal-volume-units:${seed}:${index}`));
 const variant = (Math.abs(Math.trunc(seed)) + index) % 4;
 const key = `${RAG_PATTERN.id}:${seed}:${index}`;
 const make = (context: string[], prompt: string, answer: number, unit: string, hint: string, steps: Step[]): Question => ({
 key,
 context,
 prompt,
 answer: String(answer),
 unit,
 hint,
 workedSteps: steps.map(([text, equation]) => ({text, equation})),
 explanation: steps.map(([text, equation]) => `${text} ${equation}.`).join(' '),
 });

 if (variant === 0) {
 const l = r.int(2, 5), w = r.int(2, 5), h = r.int(2, 6), need = l * w * h;
 const q = r.int(3, 9), rem = r.int(1, need - 1), total = q * need + rem;
 return make(
 [`Mei has ${total} loose cubes. Each cube has edges of 1 cm.`, `She wants to build solid cuboids that each measure ${l} cm by ${w} cm by ${h} cm.`],
 'What is the greatest number of these cuboids she can build?',
 q, 'cuboids',
 'Find how many small cubes one cuboid needs. Then see how many of those amounts fit into all her cubes.',
 [
 ['Each 1 cm cube is 1 cm³, so one cuboid needs as many cubes as its volume.', `${l} × ${w} × ${h} = ${need} cubes`],
 ['Divide the cubes she has by the cubes one cuboid needs.', `${total} ÷ ${need} = ${q} remainder ${rem}`],
 ['Only whole cuboids can be built, so ignore the leftover cubes.', `${q} cuboids`],
 ],
 );
 }

 if (variant === 1) {
 let l = 40, w = 20, h = 20, d = 2, n = 1, c = 250;
 for (let i = 0; i < 300; i++) {
 const nl = r.pick([20, 30, 40, 50]), nw = r.pick([10, 20, 25, 30]), nh = r.pick([10, 20, 30]), nd = r.pick([2, 4, 5]), nn = r.int(1, nd - 1), nc = r.pick([200, 250, 300, 400, 500]);
 const V = nl * nw * nh;
 if ((V * nn) % nd === 0 && Math.floor(V * nn / nd / nc) >= 2) {l = nl; w = nw; h = nh; d = nd; n = nn; c = nc; break;}
 }
 const V = l * w * h, moved = V * n / d, bottles = Math.floor(moved / c);
 return make(
 [`A tank has inside measurements ${l} cm by ${w} cm by ${h} cm. It is full of water.`, `${n}/${d} of the water is poured into bottles. Each bottle holds ${c} ml, and a bottle is counted only when it is filled completely.`],
 'How many bottles can be filled completely?',
 bottles, 'bottles',
 'Find the volume of the full tank, take the fraction that is poured out, then divide by the size of one bottle. 1 cm³ = 1 ml.',
 [
 ['Find the volume of water in the full tank.', `${l} × ${w} × ${h} = ${V} cm³ = ${V} ml`],
 ['Find the amount of water that is poured out.', `${V} ÷ ${d} × ${n} = ${moved} ml`],
 ['Divide by one bottle and keep only the whole bottles.', `${moved} ÷ ${c} = ${bottles} remainder ${moved - bottles * c}`],
 ],
 );
 }

 if (variant === 2) {
 const pairs: [number, number][] = [[3, 4], [2, 5], [3, 5], [4, 5], [3, 8], [5, 8], [3, 10], [7, 10], [9, 10]];
 let T = 5, p = 7, q = 10;
 for (let i = 0; i < 300; i++) {
 const nT = r.int(2, 9), [np, nq] = r.pick(pairs);
 if ((nT * nq) % np !== 0) {T = nT; p = np; q = nq; break;}
 }
 const exactTop = T * q, ans = ceilDiv(exactTop, p);
 return make(
 [`Dev has ${T} litres of soup. He pours all of it into bowls.`, `Each bowl can hold ${p}/${q} litre.`],
 'What is the least number of bowls he needs for all of the soup?',
 ans, 'bowls',
 'Find how many bowl-sizes fit into the soup. If a part of a bowl is left over, one more bowl is still needed.',
 [
 ['Dividing by a fraction is the same as multiplying by its reciprocal.', `${T} ÷ ${p}/${q} = ${T} × ${q}/${p} = ${exactTop}/${p}`],
 ['The answer is not a whole number, so a part of one more bowl is needed.', `${exactTop} ÷ ${p} = ${Math.floor(exactTop / p)} remainder ${exactTop % p}`],
 ['Round up to the next whole bowl.', `${ans} bowls`],
 ],
 );
 }

 let l = 40, w = 20, h = 20, d = 0, n = 0, c = 250;
 for (let i = 0; i < 300; i++) {
 const nl = r.pick([20, 30, 40, 50, 60]), nw = r.pick([10, 15, 20, 25]), nh = r.pick([10, 20, 30]), nc = r.pick([200, 250, 300, 400, 500, 600]);
 const partly = r.chance(0.6), nd = partly ? r.pick([2, 4, 5]) : 0, nn = partly ? r.int(1, nd - 1) : 0;
 const V = nl * nw * nh, remaining = partly ? V * (nd - nn) / nd : V;
 if ((!partly || (V * (nd - nn)) % nd === 0) && ceilDiv(remaining, nc) >= 2) {l = nl; w = nw; h = nh; d = nd; n = nn; c = nc; break;}
 }
 const V = l * w * h, remaining = d ? V * (d - n) / d : V, scoops = ceilDiv(remaining, c);
 const steps: Step[] = [['Find the volume the tank can hold.', `${l} × ${w} × ${h} = ${V} cm³ = ${V} ml`]];
 if (d) steps.push(['Find the volume of water still needed to reach the brim.', `${V} ÷ ${d} × ${d - n} = ${remaining} ml`]);
 steps.push(['Divide by one scoop. A part of a scoop still needs a whole scoop, so round up.', `${remaining} ÷ ${c} = ${Math.floor(remaining / c)} remainder ${remaining % c}, so ${scoops} scoops`]);
 return make(
 [`A tank measures ${l} cm by ${w} cm by ${h} cm inside.`, d ? `It is ${n}/${d} full of water.` : 'It is empty.', `A scoop holds ${c} ml.`],
 'What is the least number of scoops of water needed to fill the tank to the brim?',
 scoops, 'scoops',
 'Work out how much more water the tank can take. 1 cm³ = 1 ml. Divide by one scoop and round up if there is any left over.',
 steps,
 );
}

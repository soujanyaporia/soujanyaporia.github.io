import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';
import type { Batch9EarlyPicture, Batch9Point } from './batch9EarlyPicture';

export const RAG_PATTERN = {
  id: 'rag-p4-shading-to-a-target',
  level: 4,
  title: 'How many more tiles?',
  objective: 'Read a partly shaded picture and find how many more equal parts will bring it to a target fraction.',
  skillIds: ['P4.S.FRAC.03', 'P4.S.FRAC.04', 'P4.S.AREA.02'],
  canonicalPatternId: 'p4-additional-shading-to-a-target',
};

type Piece = Extract<Batch9EarlyPicture, {layout: 'area-fraction'}>['pieces'][number];
type Steps = NonNullable<Question['workedSteps']>;
type Fraction = [number, number];
const targets: Fraction[] = [[2,3], [2,5], [4,5], [5,6], [3,7], [3,8], [5,8], [7,10]];
const ids = (n: number) => Array.from({length: n}, (_, i) => i);
const gcd = (a: number, b: number): number => b ? gcd(b, a % b) : a;

function cell(label: string, x: number, y: number, s: number, split = false): Piece[] {
  const a: Batch9Point = [x,y], b: Batch9Point = [x+s,y];
  const c: Batch9Point = [x+s,y+s], d: Batch9Point = [x,y+s];
  if (!split) return [{label, kind:'square', points:[a,b,c,d], shaded:false}];
  return [
    {label:label+' upper', kind:'triangle', points:[a,b,c], shaded:false},
    {label:label+' lower', kind:'triangle', points:[a,c,d], shaded:false},
  ];
}

function shade(r: Rng, pieces: Piece[], count: number): Piece[] {
  const marked = new Set(r.shuffle(ids(pieces.length)).slice(0,count));
  return pieces.map((p,i) => ({...p, shaded:marked.has(i)}));
}

// A visible gap separates each mat from the next whole.
function panel(r: Rng, name: string, left: number, total: number, shaded: number): Piece[] {
  let rows = Math.floor(Math.sqrt(total));
  while (total % rows !== 0) rows--;
  const cols = total / rows, side = 2.5 / cols, top = (3 - rows*side)/2;
  return shade(r, ids(total).flatMap(i => cell(name+' '+(i+1),
    left+(i%cols)*side, top+Math.floor(i/cols)*side, side)), shaded);
}

function finish(key: string, item: Pick<Question,'prompt'|'context'|'picture'|'unit'|'hint'|'choices'>,
                answer: number, steps: Steps): Question {
  return {...item, key, answer:String(answer), workedSteps:steps,
    explanation:steps.map(s => [s.text,s.equation].filter(Boolean).join(' ')).join(' ')};
}

function sumTarget(r: Rng, key: string): Question {
  const [d,e] = r.pick([[3,4], [3,5], [2,5], [3,8], [4,6]]);
  const lcm = d*e/gcd(d,e), total = lcm*r.int(1,Math.floor(24/lcm));
  const pairs: [number,number][] = [];
  for (let a=1; a<d; a++) for (let b=1; b<e; b++) {
    if (gcd(a,d)===1 && gcd(b,e)===1 && a*e+b*d<d*e) pairs.push([a,b]);
  }
  const [a,b] = r.pick(pairs), first = a*(total/d), second = b*(total/e);
  const target = first+second, now = r.int(1,target-1), extra = target-now;
  return finish(key,{
    prompt:'How many more squares should Kim shade in the right-hand mat?',
    context:['Each mat is one whole. The squares within each mat are equal in size.',
      'Kim wants the shaded fraction of the right-hand mat to equal the sum of the shaded fractions of the other two mats.'],
    picture:{type:'batch9-early',layout:'area-fraction',pieces:[
      ...panel(r,'Left',0,d,a), ...panel(r,'Middle',3,e,b), ...panel(r,'Right',6,total,now)]},
    unit:'squares', hint:'Read the left and middle fractions separately. Write each in units of one square of the right-hand mat.',
  },extra,[
    {text:'Read the shaded part of each of the first two mats.',equation:`Left: ${a}/${d}; middle: ${b}/${e}.`},
    {text:`The right-hand mat has ${total} squares. Use that denominator to add the fractions.`,
      equation:`${a}/${d} + ${b}/${e} = ${first}/${total} + ${second}/${total} = ${target}/${total}`},
    {text:`Kim needs ${target} shaded squares in all. Subtract the squares already shaded on her mat.`,
      equation:`${target} − ${now} = ${extra}`},
  ]);
}

function numberChoices(r: Rng, answer: number, target: number, now: number, total: number): string[] {
  const blank = total-now;
  const likely = [target, now, total-target, blank, answer+1, answer-1];
  const options = [...new Set([answer,...likely,...ids(blank).map(i=>i+1)])]
    .filter(n=>n>0 && n<=blank).slice(0,4);
  return r.shuffle(options).map(String);
}

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`, r = new Rng(hashString(key));
  const slot = ((hashString(String(seed))%15 + index)%15+15)%15;
  if (slot===13) return sumTarget(r,key);
  const composite = slot===12, unshaded = slot===14;
  let picture: NonNullable<Question['picture']>, total: number, frac: Fraction, unit: string;
  const steps: Steps = [];
  let context: string, prompt: string, now: number, goal: number;

  if (composite) {
    const [width,fullRows,tail] = r.pick([[4,2,2],[5,2,2],[6,1,3],[5,2,4],[6,2,3],[4,1,2]]);
    const split = r.chance(0.5), squares = fullRows*width+tail;
    total = squares*(split?2:1);
    frac = r.pick(targets.filter(([,d])=>total%d===0));
    goal = total/frac[1]*frac[0];
    now = r.int(1,goal-1);
    const pieces = ids(squares).flatMap(i => cell('Tile '+(i+1),
      (8-width)/2+i%width, Math.floor(i/width), 1, split));
    picture = {type:'batch9-early',layout:'area-fraction',pieces:shade(r,pieces,now)};
    unit = split?'triangles':'squares';
    context = split ? `The whole patch has ${total} equal triangles. A diagonal divides each square into two triangles.`
      : 'The patch is made of equal squares. The missing corner is outside the patch.';
    prompt = `Ravi wants ${frac[0]}/${frac[1]} of the patch shaded. How many more ${unit} should he shade?`;
    steps.push({text:'Count the full rows of squares and the shorter row.',equation:`${fullRows} × ${width} + ${tail} = ${squares}`});
    if (split) steps.push({text:'Each square holds two equal triangles.',equation:`${squares} × 2 = ${total}`});
  } else {
    frac = r.pick(targets);
    total = frac[1]*r.int(2,Math.floor(24/frac[1]));
    goal = total/frac[1]*frac[0];
    // Keep four feasible counts available for the multiple-choice form.
    const finalShaded = unshaded ? total-goal : goal;
    now = r.int(1,Math.min(finalShaded-1,total-4));
    unit = 'tiles';
    picture = {type:'nanyang-p4',layout:'fraction-sets',sets:[{
      label:'T',total,shadedIndices:r.shuffle(ids(total)).slice(0,now)}]};
    context = 'Each tile in the set counts once. Keep the tiles that are already shaded.';
    prompt = `Mei wants ${frac[0]}/${frac[1]} of the tiles to be ${unshaded?'unshaded':'shaded'}. How many more tiles should she shade?`;
    steps.push({text:`Count the tiles in the set: ${total} in all, with ${now} already shaded.`});
  }
  const [n,d] = frac;
  steps.push({text:`Find the number of ${unit} that should be ${unshaded?'unshaded':'shaded'}.`,
    equation:`${total} ÷ ${d} × ${n} = ${goal}`});
  const blank = total-now, extra = unshaded ? blank-goal : goal-now;
  if (unshaded) {
    steps.push({text:'Count the tiles that are blank now.',equation:`${total} − ${now} = ${blank}`},
      {text:'Shade just enough to leave the required number blank.',equation:`${blank} − ${goal} = ${extra}`});
  } else {
    steps.push({text:'Subtract the pieces already shaded from the number needed altogether.',
      equation:`${goal} − ${now} = ${extra}`});
  }
  return finish(key,{
    context:[context], prompt, picture, unit,
    hint:unshaded?'How many blank tiles must stay blank? Compare this with how many are blank now.'
      :'First find how many should be shaded in all. Which ones are already shaded?',
    ...(!unshaded && !composite ? {choices:numberChoices(r,extra,goal,now,total)} : {}),
  },extra,steps);
}

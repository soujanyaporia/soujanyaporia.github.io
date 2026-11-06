import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';
import type { Batch9EarlyPicture, Batch9Point } from './batch9EarlyPicture';
import type { Batch11UpperMark } from './batch11UpperPicture';

export const RAG_PATTERN = {
  id: 'p3-rag-fractions-from-labelled-representations',
  level: 3,
  title: 'Read fractions from a picture',
  objective: 'Use equal areas or equal steps on a line to find a fraction and write it in simplest form.',
  skillIds: ['P3.S.FRAC.02', 'P3.S.FRAC.01', 'P2.S.FRAC.01'],
  canonicalPatternId: 'fractions-from-labelled-representations',
};

type Item = Omit<Question, 'key' | 'explanation' | 'workedSteps'> & {workedSteps: NonNullable<Question['workedSteps']>};
type Pieces = Extract<Batch9EarlyPicture, {layout:'area-fraction'}>['pieces'];
const gcd = (n:number, d:number):number => d ? gcd(d, n % d) : n;
const reduced = (n:number, d:number) => {
  const g = gcd(n, d);
  return `${n/g}/${d/g}`;
};

function tileQuestion(r:Rng, choose:boolean):Item {
  const [cols, rows] = r.pick([[4,2], [5,2], [3,3]]);
  const total = cols * rows;
  const counts = Array.from({length:total-1}, (_,i) => i+1);
  const blue = r.pick(counts.filter(k => gcd(k,total)>1 && (!choose || 2*k!==total)));
  const pairs = r.int(1, Math.min(3, blue-(choose ? 1 : 0), total-blue));
  const halves = 2*pairs, solid = blue-pairs;
  const cells = r.shuffle([...Array<string>(solid).fill('full'), ...Array<string>(halves).fill('split'),
    ...Array<string>(total-solid-halves).fill('empty')]);
  const pieces:Pieces = [];
  cells.forEach((cell, i) => {
    const col = i%cols, row = Math.floor(i/cols);
    const x = 4-cols/2+col, y = row;
    const a:Batch9Point=[x,y], b:Batch9Point=[x+1,y], c:Batch9Point=[x+1,y+1], d:Batch9Point=[x,y+1];
    const label = `Row ${row+1}, tile ${col+1}`;
    if (cell !== 'split') {
      pieces.push({label, kind:'square', points:[a,b,c,d], shaded:cell==='full'});
    } else {
      const triangles = r.chance(.5) ? [[a,b,c],[a,c,d]] : [[a,b,d],[b,c,d]];
      r.shuffle(triangles).forEach((points,j) => pieces.push({label:label+(j?' white half':' blue half'),
        kind:'triangle', points, shaded:j===0}));
    }
  });
  const top = choose ? total-blue : blue, answer = reduced(top,total);
  const steps = [
    {text:'Pair the blue triangles. Each pair covers one square.', equation:`${halves} halves = ${pairs} whole squares`},
    {text:`Add the fully blue tiles. The blue area covers as much space as ${blue} whole tiles.`, equation:`${solid} + ${pairs} = ${blue}`},
  ];
  if (choose) steps.push({text:'Take the blue area away from the whole to find the white area.', equation:`${total} − ${blue} = ${top}`});
  steps.push({text:`Write the ${choose?'white':'blue'} area over the total area. Divide both numbers by ${gcd(top,total)}.`, equation:`${top}/${total} = ${answer}`});
  const wrongCounts = [...new Set([blue,total-solid,total-solid-halves,...r.shuffle(counts)])]
    .filter(k => k!==top && k>0 && k<total).slice(0,3);
  return {
    context:[`The whole card is tiled with ${total} squares of the same size.`],
    prompt:choose ? 'Which fraction of the card is white?' : 'What fraction of the card is blue? Write it in simplest form.',
    picture:{type:'batch9-early', layout:'area-fraction', pieces}, answer,
    ...(choose ? {choices:r.shuffle([answer,...wrongCounts.map(k=>reduced(k,total))])} : {requireSimplified:true}),
    hint:'Look for half tiles of the same colour. How many of them would cover a whole tile?',
    workedSteps:steps,
  };
}

function lineQuestion(r:Rng):Item {
  const den = r.pick([10,12]);
  const first = 2*r.int(1,Math.floor((den-5)/2));
  const [left,middle] = r.shuffle(['P','Q']);
  const at = (i:number) => reduced(first+i,den);
  const labels = [left,at(1),middle,at(3),at(4)];
  const marks:Batch11UpperMark[] = [{kind:'line', x1:10,y1:90,x2:310,y2:90}];
  labels.forEach((text,i) => {
    const x = 36+62*i;
    marks.push({kind:'line',x1:x,y1:79,x2:x,y2:101}, {kind:'text',x:x-4.3*text.length,y:129,text});
  });
  const fields = ['P','Q'].flatMap(label=>[{label:label+' numerator'},{label:label+' denominator'}]);
  const values = ['P','Q'].flatMap(label=>at(labels.indexOf(label)).split('/'));
  return {
    context:['These marks are equally far apart on a number line.'],
    prompt:'Find P and Q. Write both fractions in simplest form.',
    picture:{type:'batch11-upper',label:`Five equally spaced marks. From left to right: ${labels.join(', ')}.`,marks},
    structuredResponse:{kind:'number-fields',fields}, answer:JSON.stringify(values),
    hint:'Look at the last two marks. What fraction is one step between them?',
    workedSteps:[
      {text:`Write the known fractions with ${den} on the bottom.`,equation:[1,3,4].map(i=>at(i)===`${first+i}/${den}` ? at(i) : `${at(i)} = ${first+i}/${den}`).join('; ')},
      {text:'The last two marks are one step apart.',equation:`${first+4}/${den} − ${first+3}/${den} = 1/${den}`},
      {text:`Step left from the second mark for ${left}, then simplify.`,equation:`${first+1}/${den} − 1/${den} = ${first}/${den} = ${at(0)}`},
      {text:`Step right from the second mark for ${middle}, then simplify.`,equation:`${first+1}/${den} + 1/${den} = ${first+2}/${den} = ${at(2)}`},
    ],
  };
}

export function makeRagQuestion(seed:number, index=0):Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const r = new Rng(hashString(key));
  const mode = r.int(0,6);
  const item = mode===6 ? lineQuestion(r) : tileQuestion(r,mode===5);
  return {...item, key, explanation:item.workedSteps.map(s=>[s.text,s.equation].filter(Boolean).join(' ')).join(' ')};
}

import {Rng,hashString} from '../../engine/random';
import type {Picture,Question} from '../generate';

export const RAG_PATTERN = {
 id:'p5-linked-triangle-region-ratios',
 level:5,
 title:'Linked triangle regions in a square',
 objective:'Use the diagonal that halves a square, shared-height area ratios and one known region to find another region or the whole square',
 skillIds:['P5.S.AREA.02','P5.S.AREA.03'],
 canonicalPatternId:'p5-linked-triangle-region-area-ratios',
} as const;

const gcd=(a:number,b:number):number=>b?gcd(b,a%b):a;
/** Ratios a:b:c in lowest terms with c < b, so D is positive and E is nearer to P than F. */
const TRIPLES:[number,number,number][]=[];
for(let a=1;a<=6;a++)for(let b=2;b<=9;b++)for(let c=1;c<b;c++)if(gcd(gcd(a,b),c)===1)TRIPLES.push([a,b,c]);

type Ask='A'|'B'|'C'|'whole';
const ASKS:Ask[]=['A','B','C','whole'];
const n2=(v:number)=>Math.round(v*100)/100;

/** Square PQRS, diagonal PR, E and F on PR, lines QE and SF. Triangles: A=PQE, B=QER, C=SFR, D=PSF. */
function figure(a:number,b:number,d:number):Picture{
 const P:[number,number]=[60,15],Q:[number,number]=[220,15],R:[number,number]=[220,175],S:[number,number]=[60,175],side=160;
 const at=(t:number):[number,number]=>[n2(P[0]+t*side),n2(P[1]+t*side)];
 const E=at(a/(a+b)),F=at(d/(a+b));
 const line=(p:[number,number],q:[number,number])=>({kind:'line' as const,x1:p[0],y1:p[1],x2:q[0],y2:q[1]});
 const text=(x:number,y:number,t:string)=>({kind:'text' as const,x:n2(x),y:n2(y),text:t});
 const mid=(...pts:[number,number][])=>[pts.reduce((s,p)=>s+p[0],0)/pts.length-4,pts.reduce((s,p)=>s+p[1],0)/pts.length+4] as [number,number];
 const cA=mid(P,Q,E),cB=mid(Q,E,R),cC=mid(S,F,R),cD=mid(P,S,F);
 return {
  type:'batch11-upper',
  label:'Square PQRS with diagonal PR. Points E and F lie on PR, with E nearer P. Lines QE and SF cut the square into triangles A, B, C and D. The figure follows the given ratios.',
  marks:[
   line(P,Q),line(Q,R),line(R,S),line(S,P),line(P,R),line(Q,E),line(S,F),
   text(P[0]-14,P[1]-3,'P'),text(Q[0]+4,Q[1]-3,'Q'),text(R[0]+4,R[1]+14,'R'),text(S[0]-14,S[1]+14,'S'),
   text(E[0]-16,E[1]+14,'E'),text(F[0]+6,F[1]-6,'F'),
   text(cA[0],cA[1],'A'),text(cB[0],cB[1],'B'),text(cC[0],cC[1],'C'),text(cD[0],cD[1],'D'),
  ],
 } as unknown as Picture;
}

export function makeRagQuestion(seed:number,index=0):Question{
 const r=new Rng(hashString(`rag-p5-linked-triangle-region-ratios:${seed}:${index}`));
 const [a,b,c]=r.pick(TRIPLES),d=a+b-c,u=r.int(3,20),dArea=d*u,ask=r.pick(ASKS);
 const answer=ask==='A'?a*u:ask==='B'?b*u:ask==='C'?c*u:2*(a+b)*u;
 const steps:{text:string;equation?:string}[]=[
  {text:'The diagonal PR cuts the square into two equal halves, so A and B together have the same area as C and D together.',equation:'A + B = C + D'},
  {text:'Use ratio units. D is the whole second half minus C.',equation:`D = (${a} + ${b}) − ${c} = ${d} units`},
  {text:'The area of D is given, so find the area of 1 unit.',equation:`${dArea} ÷ ${d} = ${u} cm²`},
 ];
 if(ask==='whole')steps.push({text:'The square is made of two equal halves. One half is A + B.',equation:`2 × (${a} + ${b}) × ${u} = ${answer} cm²`});
 else{const parts=ask==='A'?a:ask==='B'?b:c;steps.push({text:`Multiply the ratio parts of ${ask} by the unit area.`,equation:`${ask} = ${parts} × ${u} = ${answer} cm²`});}
 return {
  key:`${RAG_PATTERN.id}:${seed}:${index}`,
  prompt:ask==='whole'?'What is the area of the whole square PQRS?':`What is the area of triangle ${ask}?`,
  context:[
   'PQRS is a square. Points E and F lie on the diagonal PR, with E closer to P than F is.',
   'Lines QE and SF cut the square into four triangles: A is triangle PQE, B is triangle QER, C is triangle SFR and D is triangle PSF.',
   `The areas of A, B and C are in the ratio ${a} : ${b} : ${c}.`,
   `The area of D is ${dArea} cm².`,
  ],
  answer:String(answer),
  unit:'cm²',
  hint:'The diagonal cuts the square into two equal halves. Compare the two halves using ratio units.',
  explanation:steps.map(s=>[s.text,s.equation].filter(Boolean).join(' ')).join(' '),
  picture:figure(a,b,d),
  workedSteps:steps,
 };
}

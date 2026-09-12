import type { Gen,Lesson } from '../model';
import { choicesOf,rngFor,simplest } from '../gen';
/**
 * P3 exemplar: equivalent fractions and simplest form, discovered on a fraction wall before any rule
 * about multiplying or dividing both numbers (MOE p. 35, denominators up to 12).
 */
const A='p3-equivalent-fractions',B='p3-simplest-form';
const PAIRS:[number,number][]=[[1,2],[1,3],[2,3],[1,4],[3,4],[1,5],[2,5],[3,5],[4,5],[1,6],[5,6]];
const wall=(rows:[number,number][]):{kind:'fractions';denominators:number[];shaded:number[]}=>({kind:'fractions',denominators:rows.map(r=>r[1]),shaded:rows.map(r=>r[0])});
/** n/d = □/(d×k): the missing numerator. */
function missingNumerator(id:string,salt:string):Gen{return (seed,i)=>{
 const r=rngFor(id,seed,i,salt),[n,d]=r.pick(PAIRS.filter(p=>p[1]<=6)),k=r.pick([2,3,4].filter(x=>d*x<=12)),answer=n*k;
 return {key:`${salt}-${i}`,prompt:'Find the missing numerator.',display:`${n}/${d} = □/${d*k}`,answer:String(answer),facet:'direct',rep:'fraction-wall',tool:wall([[n,d],[n*k,d*k]]),
  hints:[`The whole is cut into ${k} times as many parts, so each part is smaller.`,`Every shaded part was split into ${k} pieces too.`,`${n} shaded parts × ${k} = ?`],
  steps:[`${d} parts became ${d*k} parts: each part was split into ${k}.`,`The ${n} shaded parts also split into ${k} pieces each.`,`${n} × ${k} = ?`],
  another:[{title:'Look at the wall',steps:[`On the wall, ${n}/${d} and ${answer}/${d*k} reach exactly the same place.`],tool:wall([[n,d],[answer,d*k]])}],
  wrong:{...(n!==answer?{[String(n)]:`The numerator changes too. Both the parts and the shaded parts were split into ${k}.`}:{}),...(n+k!==answer?{[String(n+k)]:`We split each part, so we multiply by ${k} rather than adding ${k}.`}:{})},
  check:`${n}/${d} and ${answer}/${d*k} shade the same length ✓`};
};}
function missingDenominator(id:string,salt:string):Gen{return (seed,i)=>{
 const r=rngFor(id,seed,i,salt),[n,d]=r.pick(PAIRS.filter(p=>p[1]<=6)),k=r.pick([2,3,4].filter(x=>d*x<=12));
 return {key:`${salt}-${i}`,prompt:'Find the missing denominator.',display:`${n}/${d} = ${n*k}/□`,answer:String(d*k),facet:'missing',rep:'fraction-wall',tool:wall([[n,d],[n*k,d*k]]),
  hints:[`The numerator went from ${n} to ${n*k}: that is × ${k}.`,'Do the same to the number of parts in the whole.',`${d} × ${k}`],
  steps:[`${n} × ${k} = ${n*k}, so each part was split into ${k}.`,`The whole has ${d} × ${k} parts.`],check:`${n}/${d} and ${n*k}/${d*k} shade the same length ✓`};
};}
function equivalentChoice(id:string,salt:string):Gen{return (seed,i)=>{
 const r=rngFor(id,seed,i,salt),[n,d]=r.pick(PAIRS.filter(p=>p[1]<=6)),k=r.pick([2,3].filter(x=>d*x<=12)),answer=`${n*k}/${d*k}`;
 return {key:`${salt}-${i}`,prompt:`Which fraction is equal to ${n}/${d}?`,answer,choices:choicesOf(r,answer,[`${n+1}/${d+1}`,`${n*k}/${d*k+1}`,`${n+k}/${d*k}`]),exact:true,facet:'reverse',rep:'fraction-wall',tool:wall([[n,d]]),
  hints:['Multiply the shaded parts and the total parts by the same number.',`${n} × ${k} and ${d} × ${k}.`],steps:[`${n} × ${k} = ${n*k}`,`${d} × ${k} = ${d*k}`,`So ${n}/${d} = ${n*k}/${d*k}.`]};
};}
function wallRead(id:string,salt:string):Gen{return (seed,i)=>{
 const r=rngFor(id,seed,i,salt),[n,d]=r.pick(PAIRS.filter(p=>p[1]<=6)),k=r.pick([2,3].filter(x=>d*x<=12));
 return {key:`${salt}-${i}`,prompt:`Both rows shade the same length. Write the second fraction.`,answer:`${n*k}/${d*k}`,exact:true,facet:'visual',rep:'fraction-wall',tool:wall([[n,d],[n*k,d*k]]),
  hints:['Count the shaded parts in the lower row, then count all its parts.'],steps:[`The lower row has ${d*k} equal parts.`,`${n*k} of them are shaded.`],check:`${n}/${d} = ${n*k}/${d*k} ✓`};
};}
function halvesStory(id:string,salt:string):Gen{return (seed,i)=>{
 const r=rngFor(id,seed,i,salt),d=r.pick([4,6,8,10,12]),k=r.int(1,d/2-1)*2,answer=simplest(k,d);
 return {key:`${salt}-${i}`,prompt:`A cake is cut into ${d} equal slices. ${k} slices are eaten. Write the fraction eaten in its simplest form.`,answer,exact:true,facet:'word',rep:'story',tool:wall([[k,d]]),
  hints:['What fraction is eaten before simplifying?',`${k} out of ${d} is ${k}/${d}.`,'Divide the top and bottom by the same number.'],
  steps:[`Eaten: ${k}/${d}.`,`Divide both by their common factor.`,`${k}/${d} = ${answer}`],check:`${answer} and ${k}/${d} shade the same length ✓`};
};}
function unitCompare(id:string,salt:string):Gen{return (seed,i)=>{
 const r=rngFor(id,seed,i,salt),a=r.pick([3,4,5,6]),b=r.pick([8,10,12].filter(x=>x!==a)),answer=`1/${a}`;
 return {key:`${salt}-${i}`,prompt:`Which is the larger piece: 1/${a} or 1/${b}?`,answer,choices:choicesOf(r,answer,[`1/${b}`,'They are the same']),exact:true,facet:'reasoning',rep:'fraction-wall',tool:wall([[1,a],[1,b]]),
  hints:['Look at the wall: which piece is longer?','More pieces in the whole means each piece is smaller.'],
  steps:[`The whole is the same size in both rows.`,`Cutting it into ${b} pieces makes smaller pieces than cutting it into ${a}.`,`So 1/${a} is larger.`]};
};}
function simplify(id:string,salt:string):Gen{return (seed,i)=>{
 const r=rngFor(id,seed,i,salt),[n,d]=r.pick(PAIRS.filter(p=>p[1]<=6)),k=r.pick([2,3,4].filter(x=>d*x<=12)),answer=simplest(n,d);
 return {key:`${salt}-${i}`,prompt:'Write this fraction in its simplest form.',display:`${n*k}/${d*k}`,answer,exact:true,facet:'direct',rep:'fraction-wall',tool:wall([[n*k,d*k],[n,d]]),
  hints:[`Both ${n*k} and ${d*k} can be divided by the same number.`,`Try dividing both by ${k}.`,`${n*k} ÷ ${k} = ${n} and ${d*k} ÷ ${k} = ${d}.`],
  steps:[`${n*k} and ${d*k} share the factor ${k}.`,`Divide both: ${n*k} ÷ ${k} = ${n}, ${d*k} ÷ ${k} = ${d}.`,`Simplest form: ${answer}`],
  wrong:{...(String(n*k-k)!==answer?{[`${n*k-k}/${d*k}`]:'Subtracting from the top changes the amount. Simplifying divides both numbers by the same factor.'}:{})},
  check:`${answer} and ${n*k}/${d*k} shade the same length ✓`};
};}
function commonFactor(id:string,salt:string):Gen{return (seed,i)=>{
 const r=rngFor(id,seed,i,salt),k=r.pick([2,3,4]),[n,d]=r.pick(PAIRS.filter(p=>p[1]<=6&&p[1]*k<=12)),answer=String(k);
 return {key:`${salt}-${i}`,prompt:`Which number divides both ${n*k} and ${d*k} exactly?`,answer,choices:choicesOf(r,answer,[String(k+1),String(n*k+1),String(d*k)]),facet:'reverse',rep:'symbols',
  hints:['A common factor divides both numbers with nothing left over.'],steps:[`${n*k} ÷ ${k} = ${n}`,`${d*k} ÷ ${k} = ${d}`,`So ${k} is a common factor.`]};
};}
export const P3_LESSONS:Lesson[]=[{
 id:A,level:3,track:'both',world:'fraction-forest',title:'Equivalent fractions',minutes:12,skillIds:['P3.S.FRAC.01','P3.S.FRAC.04'],activityId:'p3s-fractionEquivalent-n9',
 objectives:['Recognise that different fractions can name the same amount','Generate equivalent fractions by splitting every part','Find a missing numerator or denominator'],
 canDo:['show that 1/2 and 2/4 are the same amount','make equivalent fractions by multiplying both numbers','find the missing number in 2/3 = □/12','explain why the amount does not change'],
 prerequisites:['P2.S.FRAC.01','P2.S.FRAC.03'],representations:['fraction-wall','bar-model','symbols','story'],
 misconceptions:[{name:'Adding the same number to the top and bottom',fix:'2/3 is not 3/4. Splitting every part multiplies both numbers: 2/3 = 4/6 = 6/9.'},{name:'Thinking a bigger denominator means a bigger fraction',fix:'More parts in the same whole means each part is smaller: 1/4 is bigger than 1/6.'}],
 grows:['P2: halves, quarters and thirds','P3: 1/2 = 2/4 = 4/8','P4: comparing and adding unlike fractions','P6: ratios and percentages use the same idea'],
 stages:[
  {kind:'readiness',title:'Warm up your maths brain',text:'A quick look at parts of a whole.',items:[
   {key:'warm-1',prompt:'What fraction of this strip is shaded?',answer:'1/4',exact:true,hints:['Count the equal parts, then the shaded parts.'],steps:['4 equal parts, 1 shaded.','That is 1 out of 4.'],tool:wall([[1,4]])},
   {key:'warm-2',prompt:'Are these parts equal in size?',answer:'Yes: every part is the same size',choices:['Yes: every part is the same size','No: the middle parts are bigger'],hints:['Fractions only work when the whole is cut into equal parts.'],steps:['Each of the 6 parts is the same length.'],tool:wall([[2,6]])}],
   booster:[{text:'The bottom number says how many equal parts the whole has. The top number says how many are shaded.',tool:wall([[3,4]])},{text:'The same whole can be cut in different ways.',tool:wall([[1,2],[2,4]])}]},
  {kind:'hook',title:'Two chocolate bars',text:'Two bars of chocolate are exactly the same size. Aisha’s bar is cut into 2 pieces and she eats 1. Ben’s bar is cut into 4 pieces and he eats 2. Who eats more chocolate?',tool:wall([[1,2],[2,4]])},
  {kind:'explore',title:'Shade the same amount',text:'Shade some of the halves row, then shade the quarters row so that both rows reach exactly the same place.',tool:{kind:'fractions',denominators:[2,4],shaded:[0,0]},goal:t=>t.kind==='fractions'&&t.shaded[0]>0&&t.shaded[0]*4===t.shaded[1]*2,goalHint:'Both shaded lengths must end at the same point, and the halves row cannot be empty.',success:'The two rows end at the same place: 1/2 and 2/4 are the same amount of chocolate.'},
  {kind:'notice',title:'What do you notice?',text:'1/2 and 2/4 reach the same place on the wall.',tool:wall([[1,2],[2,4]]),options:[
   {text:'They are the same amount, written with different numbers',correct:true,reply:'Yes. Fractions that name the same amount are called equivalent fractions.'},
   {text:'2/4 is bigger because 2 and 4 are bigger numbers',correct:false,reply:'Bigger numbers do not mean a bigger amount: the pieces are smaller, but there are more of them.'},
   {text:'They cannot be compared',correct:false,reply:'They can, because both bars are the same whole. The shaded lengths are identical.'}]},
  {kind:'connect',title:'Splitting every part',rows:[
   {text:'One half of the bar is shaded.',tool:wall([[1,2]])},
   {text:'Cut every part into 2. Now there are twice as many parts, and twice as many are shaded.',tool:wall([[1,2],[2,4]])},
   {text:'Cut every part into 2 again.',tool:wall([[1,2],[2,4],[4,8]])},
   {text:'In numbers, both the shaded parts and the total parts are multiplied by the same number.',math:'1/2 = 2/4 = 4/8'}]},
  {kind:'explain',title:'Why both numbers change together',text:'Splitting each part into k pieces makes k times as many shaded pieces and k times as many pieces in the whole. The amount of chocolate does not change, only the names of the pieces.',math:'2/3 = (2 × 4)/(3 × 4) = 8/12',tool:wall([[2,3],[8,12]]),
   why:{question:'Why can’t I just add the same number to the top and bottom?',answer:'Adding changes the shaded parts and the whole by different proportions. 2/3 and 3/4 do not reach the same place on the wall. Splitting each part keeps the relationship between the shaded amount and the whole, which is what a fraction records.',tool:wall([[2,3],[3,4]])}},
  {kind:'worked',title:'Worked example',problem:'2/3 = □/12',steps:[
   {text:'How many parts does the new whole have?',ask:{prompt:'The whole goes from 3 parts to 12 parts, so each part was split into…',choices:['4','9','12'],answer:'4'}},
   {text:'Each of the 3 parts was split into 4, giving 12 parts.',tool:wall([[2,3],[8,12]])},
   {text:'The 2 shaded parts were split into 4 as well.',math:'2 × 4 = ?',ask:{prompt:'How many shaded parts now?',answer:'8'}},
   {text:'So the missing numerator is 8.',math:'2/3 = 8/12'},
   {text:'Check on the wall: both rows end at the same place.',math:'2/3 = 8/12 ✓'}]},
  {kind:'practice',mode:'guided',title:'Try it with help',gen:missingNumerator(A,'guided'),count:4},
  {kind:'practice',mode:'independent',title:'Try it on your own',gen:missingDenominator(A,'solo'),count:4},
  {kind:'apply',title:'Use it in a story',gen:halvesStory(A,'story'),count:2},
  {kind:'reason',title:'Maths detective',items:[unitCompare(A,'detective')(0,0),{key:'added-mistake',prompt:'Ravi says 2/3 = 4/9 because he doubled the top and multiplied the bottom by 3. What went wrong?',answer:'Both numbers must be multiplied by the same number',choices:['Both numbers must be multiplied by the same number','Nothing: 4/9 is correct','He should have added 2 to both numbers'],facet:'reasoning',rep:'fraction-wall',tool:wall([[2,3],[4,9]]),hints:['Look at the wall: do the two rows end at the same place?'],steps:['On the wall, 4/9 is shorter than 2/3.','Splitting each part into 2 gives 4/6; into 3 gives 6/9.','Both numbers must use the same multiplier.']}]},
  {kind:'mastery',title:'Show what you know',gens:[
   {facet:'direct',gen:missingNumerator(A,'m-direct')},{facet:'visual',gen:wallRead(A,'m-visual')},{facet:'reverse',gen:equivalentChoice(A,'m-reverse')},
   {facet:'missing',gen:missingDenominator(A,'m-missing')},{facet:'word',gen:halvesStory(A,'m-word')},
   {facet:'unfamiliar',gen:(seed,i)=>{const r=rngFor(A,seed,i,'m-bar'),d=r.pick([6,8,10,12]),k=r.int(1,d-1);return {key:`m-bar-${i}`,prompt:`A ribbon is divided into ${d} equal parts and ${k} parts are red. What fraction is red?`,answer:`${k}/${d}`,exact:true,facet:'unfamiliar',rep:'bar-model',tool:{kind:'bar',parts:[k,d-k],whole:d,labels:['red','rest']},hints:['Shaded parts over total parts.'],steps:[`${k} red parts out of ${d}.`],check:`${k}/${d} of the ribbon ✓`};}},
   {facet:'reasoning',gen:unitCompare(A,'m-reason')}]},
  {kind:'discovery',title:'You discovered: equivalent fractions',text:'Fractions that reach the same place on the wall are the same amount. Splitting every part into the same number of pieces gives a new name for that amount.',math:'1/2 = 2/4 = 3/6 = 4/8',tool:wall([[1,2],[2,4],[3,6],[4,8]])},
 ]},{
 id:B,level:3,track:'both',world:'fraction-forest',title:'Simplest form',minutes:10,skillIds:['P3.S.FRAC.02'],activityId:'p3s-fractionSimplify-n10',
 objectives:['Find a common factor of the numerator and denominator','Write a fraction in its simplest form','Explain why simplifying does not change the amount'],
 canDo:['spot a number that divides both parts of a fraction','write 6/8 as 3/4','check a simplified fraction on the fraction wall'],
 prerequisites:[A],representations:['fraction-wall','symbols','story'],
 misconceptions:[{name:'Subtracting from the numerator and denominator',fix:'6/8 is not 5/7. Simplifying divides both numbers by the same factor: 6 ÷ 2 = 3 and 8 ÷ 2 = 4.'},{name:'Thinking a simplified fraction is a smaller amount',fix:'3/4 and 6/8 shade exactly the same length. Only the size and number of pieces change.'}],
 grows:['P3: 6/8 = 3/4','P4: adding fractions needs simplest form','P6: simplifying ratios uses the same common factor'],
 stages:[
  {kind:'readiness',title:'Warm up your maths brain',items:[
   {key:'warm-1',prompt:'Find the missing numerator.',display:'1/2 = □/6',answer:'3',hints:['Each half was split into 3.'],steps:['1 × 3 = ?'],tool:wall([[1,2],[3,6]])},
   {key:'warm-2',prompt:'Which number divides both 6 and 9 exactly?',answer:'3',choices:['3','2','5'],hints:['Try dividing each number.'],steps:['6 ÷ 3 = 2 and 9 ÷ 3 = 3.']}],
   booster:[{text:'A factor divides a number exactly, with nothing left over.',math:'8 = 1 × 8 = 2 × 4'},{text:'Equivalent fractions shade the same length.',tool:wall([[2,4],[1,2]])}]},
  {kind:'hook',title:'The tidiest name',text:'A pizza is cut into 8 slices and 6 are eaten. Mei says “6/8 of the pizza”. Ben says “3/4 of the pizza”. They are both right. Which name is tidier?',tool:wall([[6,8],[3,4]])},
  {kind:'explore',title:'Find the tidiest row',text:'Shade 6 of the 8 parts in the top row. Then shade the fourths row so it reaches the same place. Which row uses the fewest pieces?',tool:{kind:'fractions',denominators:[8,4],shaded:[0,0]},goal:t=>t.kind==='fractions'&&t.shaded[0]===6&&t.shaded[1]===3,goalHint:'Shade 6 eighths, then find how many fourths reach the same place.',success:'6/8 and 3/4 end at the same place. 3/4 says it with fewer, larger pieces: that is the simplest form.'},
  {kind:'notice',title:'What changed?',text:'6/8 became 3/4.',tool:wall([[6,8],[3,4]]),options:[
   {text:'Both numbers were divided by 2',correct:true,reply:'Yes: 6 ÷ 2 = 3 and 8 ÷ 2 = 4. Same amount, fewer pieces.'},
   {text:'2 was taken away from both numbers',correct:false,reply:'That would give 4/6, which is a different amount. We divide both numbers by the same factor.'},
   {text:'The pizza got smaller',correct:false,reply:'The shaded length is identical: only the pieces changed size.'}]},
  {kind:'connect',title:'Dividing both numbers',rows:[
   {text:'Eight parts, six shaded.',tool:wall([[6,8]])},
   {text:'Join the pieces in pairs: 2 eighths make 1 fourth.',tool:wall([[6,8],[3,4]])},
   {text:'In numbers, divide both by the common factor 2.',math:'6/8 = (6 ÷ 2)/(8 ÷ 2) = 3/4'}]},
  {kind:'explain',title:'Simplest form',text:'A fraction is in its simplest form when the only number that divides both the numerator and denominator is 1. Keep dividing by common factors until no more will go.',math:'12/16 = 6/8 = 3/4',tool:wall([[3,4]]),
   why:{question:'Why is the amount unchanged?',answer:'Dividing both numbers by the same factor joins the pieces together in equal groups. The shaded length stays exactly where it was, so it is the same amount with a tidier name.',tool:wall([[12,12],[3,4]])}},
  {kind:'worked',title:'Worked example',problem:'Write 8/12 in its simplest form.',steps:[
   {text:'Find a number that divides both 8 and 12.',ask:{prompt:'Which number divides both 8 and 12?',choices:['4','5','8'],answer:'4'}},
   {text:'Divide both numbers by 4.',math:'8 ÷ 4 = 2   and   12 ÷ 4 = 3',ask:{prompt:'What is 8/12 in simplest form?',answer:'2/3'}},
   {text:'Can 2 and 3 both be divided again? No, so this is simplest form.',math:'8/12 = 2/3'},
   {text:'Check on the wall.',tool:wall([[8,12],[2,3]])}]},
  {kind:'practice',mode:'guided',title:'Try it with help',gen:simplify(B,'guided'),count:4},
  {kind:'practice',mode:'independent',title:'Try it on your own',gen:simplify(B,'solo'),count:4},
  {kind:'apply',title:'Use it in a story',gen:halvesStory(B,'story'),count:2},
  {kind:'reason',title:'Maths detective',items:[{key:'subtract-mistake',prompt:'Wei simplifies 6/8 to 5/7 by taking 1 from the top and the bottom. Is Wei right?',answer:'No: simplifying divides both numbers by the same factor',choices:['No: simplifying divides both numbers by the same factor','Yes, that is how simplifying works','Only when the numbers are even'],facet:'reasoning',rep:'fraction-wall',tool:wall([[6,8],[5,7]]),hints:['Check the wall: do 6/8 and 5/7 reach the same place?'],steps:['5/7 is a different length from 6/8.','6 ÷ 2 = 3 and 8 ÷ 2 = 4, so 6/8 = 3/4.']},commonFactor(B,'detective')(0,0)]},
  {kind:'mastery',title:'Show what you know',gens:[
   {facet:'direct',gen:simplify(B,'m-direct')},{facet:'visual',gen:wallRead(B,'m-visual')},{facet:'reverse',gen:commonFactor(B,'m-reverse')},
   {facet:'missing',gen:missingNumerator(B,'m-missing')},{facet:'word',gen:halvesStory(B,'m-word')},
   {facet:'unfamiliar',gen:(seed,i)=>{const r=rngFor(B,seed,i,'m-set'),d=r.pick([8,10,12]),k=r.int(2,d-2),answer=simplest(k,d);return {key:`m-set-${i}`,prompt:`${k} of ${d} counters are blue. What fraction is blue, in simplest form?`,answer,exact:true,facet:'unfamiliar',rep:'counters',tool:{kind:'foundation-visual',visual:{type:'counters',groups:[{count:k,color:'blue'},{count:d-k,color:'orange'}]}},hints:[`${k} out of ${d} is ${k}/${d}.`,'Divide both numbers by a common factor.'],steps:[`${k}/${d}`,`Simplest form: ${answer}`],check:`${answer} of the counters are blue ✓`};}},
   {facet:'reasoning',gen:unitCompare(B,'m-reason')}]},
  {kind:'discovery',title:'You discovered: the tidiest name',text:'Every fraction has one simplest form. Dividing the top and bottom by their biggest common factor gets you there in one step.',math:'12/16 = 3/4',tool:wall([[12,16],[3,4]])},
 ]}];

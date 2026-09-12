import type {Item,Stage,Tool} from '../../model';
import type {PlanEntry} from '../../build/plan';
import {fraction,removal} from '../items';

const check=(id:string,prompt:string,answer:string,tool:Tool,clue:string,explanation:string,choices?:string[]):Item=>({key:`building-block-${id}`,prompt,answer,tool,choices,exact:!!choices,requiresModel:true,hints:[clue],steps:[clue,explanation],check:explanation});
const count=()=>check('count','How many blue counters are here?','3',removal(3,0),'Touch each blue counter once.','Three touches count three counters.');
const add=()=>check('join','Two counters and three counters join. How many altogether?','5',{kind:'foundation-visual',visual:{type:'counters',groups:[{count:2,color:'blue'},{count:3,color:'orange'}]}},'Count both groups, once per counter.','The two parts make five: 2 + 3 = 5.');
const equal=()=>check('equal-groups','There are two rows of three counters. How many counters in both rows?','6',{kind:'array',rows:2,cols:3},'Count three in one row and three in the other.','Two equal rows contain 3 + 3 = 6 counters.');
const parts=()=>check('equal-parts','How many equal parts make this whole strip?','4',fraction(1,4),'Include the blue part and all the white parts.','All four equal parts make the whole. The blue part alone is only one part.');
const ten=()=>check('ten','One full row is a ten. How many ones make that ten?','10',{kind:'counters',count:10,frame:10},'Count every counter in the full frame.','Ten ones can be grouped as one ten. The amount stays the same.');
const rectangle=()=>check('rectangle','How many little squares cover this rectangle?','12',{kind:'scene',scene:'area',values:[4,3],phase:0},'There are four squares in each of three rows.','4 + 4 + 4 = 12. We counted the surface, not the boundary.');
const subtract=()=>check('remaining','Eight counters are here. Three are crossed out. How many stay?','5',removal(8,3),'Count the blue counters without a cross.','Five stay. Putting three back restores eight.');
const turn=()=>check('corner','Which description matches the marked square corner?','A right angle',{kind:'diagram',picture:{type:'shape',shape:'perpendicular'},caption:'The small square marks the corner opening.'},'Compare it with a corner of a sheet of paper.','A square corner is a right angle. The lengths of the sides do not decide the opening.',['A right angle','A straight line','A curved boundary']);
const corners=()=>check('corners','How many corners does this rectangle have?','4',{kind:'diagram',picture:{type:'shape',shape:'rectangle'},caption:'Trace the boundary and stop wherever it changes direction.'},'Count each meeting of two sides once.','Four corners join the four straight sides. Next we will look closely at the opening at a corner.');
const table=()=>check('table','How many children chose apples?','4',{kind:'table',headers:['Fruit','Children'],rows:[['Apples','4'],['Pears','2']],caption:'Each fruit stays in the same row as its count.'},'Find Apples, then follow that row to Children.','The entry in the Apples row is 4. Do not read the neighbouring row.');

/** An earlier building block, not a new-skill test placed before its teaching. */
export function prerequisite(p:PlanEntry):Stage{
 const o=p.objective.toLowerCase(),c=p.code;
 let item:Item,link:string;
 if(c==='WN'){item=/ordinal|count/.test(o)&&p.level===1?count():/round|estimate/.test(o)?ten():p.level===1?count():ten();link=/round|estimate/.test(o)?'Rounding uses groups of ten and their larger place-value relatives.':/ordinal/.test(o)?'Positions use the counting order you already know.':'We will organise counted objects into place-value groups.';}
 else if(c==='AS'){item=p.level===1?count():ten();link=p.level===1?'We need to count a group before we can join it, remove from it or compare it.':'Place-value groups let us change a quantity without mixing the sizes of its units.';}
 else if(c==='MD'||c==='FACT'){item=equal();link=c==='FACT'?'Factors and multiples depend on complete equal groups.':'We will use equal groups to explain multiplication and division.';}
 else if(c==='FRAC'){item=parts();link='Every fraction refers to a whole and equal-sized parts. Keep that meaning while we learn the next relationship.';}
 else if(c==='DEC'){item=ten();link='Decimals extend place value to units smaller than one. The grouping rule still uses ten.';}
 else if(c==='MONEY'){item=p.level===1?add():ten();link='Coins and notes have values. We will combine or rename those values while keeping the same amount.';}
 else if(c==='PCT'){item=parts();link='A percentage also describes equal parts of a whole; its whole is split into one hundred parts.';}
 else if(c==='RATIO'||c==='RATE'||c==='AVG'){item=equal();link=c==='RATIO'?'Equal-sized units let us compare shares.':c==='RATE'?'A rate describes the amount in one equal unit.':'An average shares a total equally among the items.';}
 else if(c==='ALG'){item=add();link='An unknown can stand for one of the quantities in a relationship we already understand.';}
 else if(c==='TIME'){item=p.level===1?count():subtract();link=/duration|start|finish/.test(o)?'We will find a gap between two times, or use a gap to find an endpoint.':'Counting equal intervals helps us read and regroup time units.';}
 else if(c==='AREA'){item=/triangle|missing/.test(o)?rectangle():equal();link=/triangle/.test(o)?'We will use a rectangle’s surface to reason about triangles.':/missing/.test(o)?'To recover a missing dimension, first remember how rows form an area.':'Equal rows explain surface area; tracing the outside explains perimeter.';}
 else if(c==='VOL'){item=rectangle();link='A layer has a surface area. Stacking equal layers builds a volume.';}
 else if(c==='LENGTH'||c==='MEASURE'){item=count();link='Measurement counts equal intervals or units. We need to know what each counted unit means.';}
 else if(c==='CIRCLE'){item=rectangle();link='Keep surface area separate from boundary length as we move from straight edges to circles.';}
 else if(c==='GRAPH'){item=table();link='A graph changes how data are drawn, but each value must still belong to the correct label.';}
 else if(c==='ANGLE'||c==='LINES'||c==='SYM'){item=p.level===3&&c==='ANGLE'?corners():turn();link=c==='SYM'?'A reflection compares distances across a mirror line.':c==='LINES'?'The corner where lines meet helps us distinguish their relationship.':p.level===3?'We will look at the opening between two sides, rather than count how long those sides are.':'A right angle is a familiar opening we can use to understand other turns.';}
 else {item=p.level>=3?turn():count();link='We will track parts and positions carefully when we recognise, build or copy a shape.';}
 return {kind:'readiness',title:'A building block we already know',text:link,items:[item],booster:[{text:item.hints[0],tool:item.tool},{text:item.check!}],flow:{phase:'watch',label:'Get ready for the new idea',transition:link}};
}

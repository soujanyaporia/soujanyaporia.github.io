import {gridDrawingLabel} from './gridDrawingModel';
import {formatStructuredResponse} from './paperImports/batch6MiddleResponse';
import type {Question} from './generate';
import {parseGrouping} from './groupingAnswer';
export function shownAnswer(q:Question,value:string):string{
 if(q.gridDrawing)return gridDrawingLabel(q.gridDrawing,value);
 if(q.structuredResponse)return formatStructuredResponse(q.structuredResponse,value);
 if(q.grouping){const groups=parseGrouping(value);return groups?`${groups.length} groups: ${groups.map(g=>g.length).join(' + ')} objects`:'No groups made';}
 if(q.order)return value.split(',').join(' → ');
 if(q.numberSentence)return value.replace(/\*/g,'×').replace(/\//g,'÷').replace(/-/g,'−');
 return value;
}
/** The interactive board already contains these givens. Keep other diagrams visible. */
export const showQuestionPicture=(q:Question)=>!!q.picture&&!q.gridDrawing&&!q.grouping&&!(q.numberSentence&&q.picture.type==='pattern'&&q.picture.items.every(n=>q.numberSentence!.numbers.includes(Number(n))));

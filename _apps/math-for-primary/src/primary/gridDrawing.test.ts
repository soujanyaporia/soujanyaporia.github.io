import {it,expect} from 'vitest';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {GridDrawing} from './GridDrawing';
import {gridDrawingValue,validGridDrawing,parseGridDrawing,type GridDrawingSpec,type GridSegment} from './gridDrawingModel';
import {correctAnswer,type Question} from './generate';
import {blankDraft,draftReady} from './sessionDraft';
import {paperAnswerStatus,updatePaperAnswer} from './paperAttempt';
import {shownAnswer} from './answerDisplay';
import {visibleQuestionKey} from './practicePaper';
const segment:GridDrawingSpec={kind:'segment-length',columns:10,rows:1,unit:'cm'};
const base:Question={key:'grid',prompt:'Draw a horizontal line representing 4 cm.',answer:'0,0:4,0',gridDrawing:segment,hint:'Count the gaps.',explanation:'Four gaps represent 4 cm.'};
it('grades actual lengths regardless of starting point or reversed direction',()=>{
 for(let length=1;length<=7;length++)for(let start=0;start<=10-length;start++)for(const y of [0,1]){
  const q={...base,answer:gridDrawingValue([[[0,0],[length,0]]])},value=gridDrawingValue([[[start+length,y],[start,y]]]);
  expect(correctAnswer(q,value)).toBe(true);expect(paperAnswerStatus(q,value)).toBe('complete');
 }
 for(const value of ['4','0,0:3,0','0,0:4,1','0,0:4,0;4,0:5,0','0,0:0,0','0,0:99,0'])expect(correctAnswer(base,value)).toBe(false);
 expect(shownAnswer(base,base.answer)).toBe('4 cm');
});
it('compares geometry rather than drawing order or the number of strokes',()=>{
 const shape:GridSegment[]=[[[0,0],[4,0]],[[4,0],[4,3]],[[4,3],[0,3]],[[0,3],[0,0]]],spec:GridDrawingSpec={kind:'copy-grid',columns:5,rows:4,referenceSegments:shape},answer=gridDrawingValue(shape);
 expect(validGridDrawing(spec,gridDrawingValue([...shape].reverse().map(([a,b])=>[b,a])),answer)).toBe(true);
 const split:GridSegment[]=[[[0,0],[2,0]],[[2,0],[4,0]],...shape.slice(1)];
 expect(validGridDrawing(spec,gridDrawingValue(split),answer)).toBe(true);
 expect(validGridDrawing(spec,gridDrawingValue(shape.slice(0,-1)),answer)).toBe(false);
 expect(validGridDrawing(spec,gridDrawingValue([...shape,[[0,0],[4,3]]]),answer)).toBe(false);
 expect(validGridDrawing(spec,gridDrawingValue(shape.map(([a,b])=>[[a[0]+1,a[1]],[b[0]+1,b[1]]])),answer)).toBe(false);
 expect(visibleQuestionKey({...base,gridDrawing:spec})).not.toBe(visibleQuestionKey(base));
});
it('keeps blank/invalid drafts unfinished and fits the existing saved response size',()=>{
 expect(draftReady(base,blankDraft(0,'practice'))).toBe(false);
 expect(paperAnswerStatus(base,'bad')).toBe('partial');expect(parseGridDrawing(segment,'0,0:4,2')).toBeNull();
 const value=gridDrawingValue(Array.from({length:16},(_,i)=>[[i%10,0],[i%10+1,0]] as GridSegment));
 const saved=updatePaperAnswer({answers:[''],code:'test',position:0,marked:false,fingerprint:'test'},value);
 expect(saved.answers[0]).toBe(value);expect(value.length).toBeLessThanOrEqual(200);
});
it('offers touch-sized keyboard-accessible dots and keeps answer grids printable',()=>{
 const html=renderToStaticMarkup(createElement(GridDrawing,{spec:segment,value:'',onChange:()=>{}}));
 expect(html).toContain('Row 1, dot 1');expect(html).toContain('Undo last line');expect(html).toContain('Clear drawing');expect(html).not.toContain('type="text"');
 const printed=renderToStaticMarkup(createElement(GridDrawing,{spec:segment,value:'',onChange:()=>{},print:true}));
 expect(printed).toContain('Each gap represents 1 cm.');expect(printed).toContain('Blank answer grid');expect(printed).not.toContain('<button');
 const copied=renderToStaticMarkup(createElement(GridDrawing,{spec:{kind:'copy-grid',columns:5,rows:4,referenceSegments:[[[0,0],[3,2]]]},value:'1,1:2,3',onChange:()=>{},disabled:true}));
 expect(copied).toContain('Row 1, dot 1 to row 3, dot 4');expect(copied).toContain('Row 2, dot 2 to row 4, dot 3');
});

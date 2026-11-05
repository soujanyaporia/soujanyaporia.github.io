import {it,expect} from 'vitest';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {structuredResponseReady,structuredResponseCorrect,type Batch6MiddleResponseSpec} from './batch6MiddleResponse';
import {Batch6MiddleAnswer} from './batch6MiddleAnswer';
const spec:Batch6MiddleResponseSpec={kind:'number-pair',decimal:true,firstLabel:'(a) Total cost ($)',secondLabel:'(b) Change ($)'};
it('accepts equivalent decimal notation in the correct part, without changing integer-only pairs',()=>{
 const expected='["12.5","7.5"]';
 for(const value of ['["12.50","7.50"]','["012.500","07.5"]','[" 12.5 ","7.5"]'])expect(structuredResponseCorrect(spec,expected,value)).toBe(true);
 for(const value of ['["7.5","12.5"]','["12.5",""]','["12.5","7.51"]','["1.25e1","7.5"]','["12.5","Infinity"]','["12.5","."]','["12.5","NaN"]','[12.5,7.5]'])expect(structuredResponseCorrect(spec,expected,value)).toBe(false);
 expect(structuredResponseReady(spec,'[".5","1."]')).toBe(true);
 expect(structuredResponseReady({...spec,decimal:false},'["12.5","7.5"]')).toBe(false);
 expect(structuredResponseCorrect({...spec,decimal:false},'["12","7"]','["012","7"]')).toBe(true);
});
it('renders two labelled decimal inputs with enough room for subquestions and no expected answers',()=>{
 const html=renderToStaticMarkup(createElement(Batch6MiddleAnswer,{spec,value:'',onChange:()=>{}}));
 expect((html.match(/inputMode="decimal"/g)??[]).length).toBe(2);expect(html).toContain('(a) Total cost ($)');expect(html).toContain('(b) Change ($)');expect(html).toContain('min-height:44px');expect(html).not.toContain('12.5');
});

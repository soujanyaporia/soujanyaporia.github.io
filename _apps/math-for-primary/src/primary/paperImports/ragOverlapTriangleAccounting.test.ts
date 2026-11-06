import {describe,expect,it} from 'vitest';
import {makeRagQuestion} from './ragOverlapTriangleAccounting';

// Solve from the displayed wording, not generator state or the answer field.
function solveVisible(prompt:string):number {
  const m=/perpendicular sides (\d+) cm and (\d+) cm\. Their shared interior has area (\d+) cm²/.exec(prompt);
  if(!m) throw new Error('Visible triangle givens could not be read');
  const base=Number(m[1]),height=Number(m[2]),shared=Number(m[3]);
  return 2*(base*height/2-shared);
}

describe('overlapping identical right triangles',()=>{
  it('has an independently recoverable answer for varied seeds and indices',()=>{
    for(const [seed,index] of [[1,0],[17,3],[2026,8],[99991,2]] as const){
      const q=makeRagQuestion(seed,index);
      expect(Number(q.answer)).toBe(solveVisible(q.prompt));
      expect(q.unit).toBe('cm²');
      expect(q.workedSteps?.length).toBe(3);
    }
  });
});

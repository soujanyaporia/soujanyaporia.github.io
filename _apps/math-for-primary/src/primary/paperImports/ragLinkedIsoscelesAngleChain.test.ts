import {describe,expect,it} from 'vitest';
import {makeRagQuestion} from './ragLinkedIsoscelesAngleChain';

function solveFromVisibleContext(context: string, variant: number): number {
  const numbers = [...context.matchAll(/(\d+)°/g)].map(match => Number(match[1]));
  if (variant === 0) {
    if (numbers.length !== 2) throw new Error('Expected two visible angle givens');
    const [angleBCD, angleEBD] = numbers;
    const angleABE = 180 - angleBCD - angleEBD;
    return (180 - angleABE) / 2;
  }
  if (variant === 1) {
    if (numbers.length !== 1) throw new Error('Expected one visible intersection angle');
    return (180 - numbers[0]) / 2;
  }
  if (numbers.length !== 2) throw new Error('Expected two visible angle givens');
  const [angleDAB, angleBCA] = numbers;
  const angleBDC = 180 - angleDAB;
  return 180 - angleBDC - angleBCA;
}

describe('linked isosceles angle chain', () => {
  it('matches an independent solution of visible givens for each diagram form across seeds', () => {
    for (let seed = 0; seed < 90; seed++) {
      for (let index = 0; index < 3; index++) {
        const q = makeRagQuestion(seed, index);
        const variant = Math.abs(seed + index) % 3;
        expect(Number(q.answer)).toBe(solveFromVisibleContext(q.context?.join(' ') ?? '', variant));
      }
    }
  });
});

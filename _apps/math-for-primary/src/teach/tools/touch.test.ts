import {describe,it,expect} from 'vitest';
import {gridNext} from './touch';
describe('dense grid keyboard access',()=>{
 it('reaches every cell and clamps at the boundary',()=>{let n=0;const visited=new Set([n]);for(let i=0;i<110;i++){n=gridNext(n,'ArrowRight',10,100)!;visited.add(n);}expect(visited.size).toBe(100);expect(n).toBe(99);expect(gridNext(0,'ArrowUp',10,100)).toBe(0);expect(gridNext(94,'ArrowDown',10,100)).toBe(99);});
 it('supports rows, endpoints and ignores non-navigation keys',()=>{expect(gridNext(34,'ArrowUp',10,100)).toBe(24);expect(gridNext(34,'Home',10,100)).toBe(0);expect(gridNext(34,'End',10,100)).toBe(99);expect(gridNext(34,'Enter',10,100)).toBeNull();});
});

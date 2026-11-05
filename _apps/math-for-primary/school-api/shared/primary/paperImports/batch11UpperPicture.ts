/** Original maths diagrams; dimensions are illustrative and labels carry the givens. */
export type Batch11UpperMark=
 | {kind:'line';x1:number;y1:number;x2:number;y2:number;dashed?:boolean}
 | {kind:'path';d:string;fill?:string}
 | {kind:'text';x:number;y:number;text:string}
 | {kind:'circle';cx:number;cy:number;r:number;fill?:string};
export type Batch11UpperPicture={type:'batch11-upper';label:string;marks:Batch11UpperMark[]};

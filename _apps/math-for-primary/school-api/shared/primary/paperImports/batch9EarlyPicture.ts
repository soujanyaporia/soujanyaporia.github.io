export type Batch9Point=[number,number];
/** Geometry and visible scale givens only. No source scans, solutions or answer fields. */
export type Batch9EarlyModel=(
 |{layout:'ruler-total';maximum:number;objects:{label:string;start:number;end:number}[]}
 |{layout:'shape-parts';cap:'semicircle'|'triangle';width:number;height:number;rotation:number}
 |{layout:'circle-pieces';pieces:{label:string;shape:'semicircle'|'quarter-circle';radius:number;rotation:number}[]}
 |{layout:'mass-dial';maximum:number;minorStep:number;labelStep:number;reading:number}
 |{layout:'area-fraction';pieces:{label:string;kind:'square'|'triangle';points:Batch9Point[];shaded:boolean}[]}
);
export type Batch9EarlyPicture={type:'batch9-early'} & Batch9EarlyModel;

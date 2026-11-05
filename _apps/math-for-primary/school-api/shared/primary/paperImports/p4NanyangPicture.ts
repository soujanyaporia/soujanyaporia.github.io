/** Visible question givens only; never stores an answer or source artwork. */
export type P4NanyangPicture={type:'nanyang-p4'}&(
 |{layout:'fraction-sets';sets:{label:string;total:number;shadedIndices:number[]}[]}
 |{layout:'table';caption:string;rowHeader?:string;columns:string[];rows:{label:string;values:(number|null)[]}[]}
 |{layout:'line-graph';title:string;labels:string[];values:number[];scale:number}
);

import type {Batch9EarlyPicture} from './batch9EarlyPicture';
export type B10Point=[number,number];
export type Batch10MiddlePicture={type:'batch10-middle'}&(
 |{layout:'concave-polygon';points:B10Point[]}
 |{layout:'mass-pair';dials:{label:string;model:Extract<Batch9EarlyPicture,{layout:'mass-dial'}>}[]}
 |{layout:'cube-completion';cells:B10Point[];candidates:{label:string;cell:B10Point}[]}
 |{layout:'compass'}
 |{layout:'line-options';options:{label:string;segments:[B10Point,B10Point][]}[]}
 |{layout:'three-shape-area';width:number;height:number;drop:number}
 |{layout:'pie-sectors';labels:string[];knownCount:number;rotation:number}
);

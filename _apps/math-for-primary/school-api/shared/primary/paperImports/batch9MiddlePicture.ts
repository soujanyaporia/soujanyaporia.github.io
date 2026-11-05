export type GridCell=[number,number];
export type BalanceItem={kind:'ball'|'car'|'bear'|'weight';count:number;grams?:number};
/** Necessary visible figures only: no answers, opposite-face map or truth flags. */
export type Batch9MiddlePicture={type:'batch9-middle'}&(
 |{layout:'balances';rows:{left:BalanceItem[];right:BalanceItem[]}[]}
 |{layout:'crossed-rectangles';long:number;short:number}
 |{layout:'cut-rectangle';removedArea:number;remainingArea:number}
 |{layout:'notch';width:number;height:number;depth:number;rightFoot:number}
 |{layout:'symmetry-options';options:{label:string;cells:GridCell[]}[]}
 |{layout:'unit-squares';cells:GridCell[]}
 |{layout:'cube-net';faces:{label:string;x:number;y:number}[]}
);

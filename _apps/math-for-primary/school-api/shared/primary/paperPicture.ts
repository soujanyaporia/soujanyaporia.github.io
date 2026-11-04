/** Original, accessible diagrams for paper-inspired questions. No school paper scans are embedded. */
export type PaperIcon='coin'|'bag'|'book'|'fruit'|'ticket'|'clock'|'box'|'number'|'pencil'|'child'|'ribbon'|'water';
export type PaperTone='blue'|'green'|'orange';
type PaperBase={type:'paper';heading?:string;caption?:string};
export type PaperPicture=PaperBase & (
 |{layout:'cards';cards:{label:string;value:string;icon?:PaperIcon;count?:number;removed?:number}[]}
 |{layout:'bars';rows:{label:string;parts:{size:number;label:string;tone?:PaperTone}[]}[];totalLabel?:string;unit?:string}
 |{layout:'timeline';points:{label:string;icon?:PaperIcon}[];gaps:string[]}
);

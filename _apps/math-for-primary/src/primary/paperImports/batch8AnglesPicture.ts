export type AnglePoint={x:number;y:number;label:string};
export type AngleConstructionSpec={baseline:number;direction?:1|-1;vertexLabel:string;baseLabel:string;endLabel:string};
export const anglePoint=(x:number,y:number,r:number,degrees:number):[number,number]=>[x+r*Math.cos(degrees*Math.PI/180),y-r*Math.sin(degrees*Math.PI/180)];
/** Screen-independent pointer geometry; null means the unrequested semicircle. */
export function constructionSweep(spec:AngleConstructionSpec,x:number,y:number,cx=250,cy=240):number|null{
 if(Math.hypot(x-cx,y-cy)<35)return null;const direction=Math.atan2(cy-y,x-cx)*180/Math.PI,raw=(direction-spec.baseline)*(spec.direction??1),turned=((raw%360)+360)%360;return turned>180?null:Math.round(turned);
}
/** Visible geometry and givens; no stored correct option or missing-angle answer. */
export type Batch8AnglesPicture={type:'batch8-angles'}&(
 |{layout:'rays';vertex:AnglePoint;ends:AnglePoint[];mark:[number,number];markLabel?:string;protractorRotation?:number;closeShape?:boolean}
 |{layout:'notation';points:AnglePoint[];markedVertex:number}
 |{layout:'dots';vertex:AnglePoint;base:AnglePoint;dots:AnglePoint[];protractorRotation?:number}
 |{layout:'square-corner';nearHorizontal:number;nearVertical:number}
);

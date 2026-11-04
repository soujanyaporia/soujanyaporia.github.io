/** Givens only. Neither hidden angle answers nor pre-computed solution coordinates are stored. */
export type P6CatholicPicture={type:'catholic-p6'}&(
 |{layout:'circle';measure:'radius'|'diameter';value:number}
 |{layout:'fold';angle:number}
 |{layout:'square-rhombus';angle:number}
 |{layout:'quarter-square';side:number}
 |{layout:'parallel-shapes';alpha:number;beta:number;gamma:number}
 |{layout:'stadium';length:number;radius:number}
);
export type Point={x:number;y:number};
const radians=(d:number)=>d*Math.PI/180;
export function foldGeometry(angle:number){
 const A={x:35,y:45},T={x:295,y:45},C={x:295,y:185},D={x:35,y:185},P={x:295-140/Math.tan(radians(angle)),y:185};
 const v={x:T.x-P.x,y:T.y-P.y},w={x:C.x-P.x,y:C.y-P.y},t=(w.x*v.x+w.y*v.y)/(v.x*v.x+v.y*v.y),foot={x:P.x+t*v.x,y:P.y+t*v.y},Q={x:2*foot.x-C.x,y:2*foot.y-C.y};
 return {A,T,C,D,P,Q};
}
export function squareRhombusGeometry(angle:number){
 const r=radians(angle),L=115,D={x:155,y:235},C={x:D.x+L*Math.cos(r),y:D.y-L*Math.sin(r)},F={x:D.x+L,y:D.y},A={x:D.x-L*Math.sin(r),y:D.y-L*Math.cos(r)},B={x:A.x+C.x-D.x,y:A.y+C.y-D.y},E={x:C.x+L,y:C.y};
 const v={x:F.x-A.x,y:F.y-A.y},w={x:C.x-D.x,y:C.y-D.y},cross=(a:Point,b:Point)=>a.x*b.y-a.y*b.x,t=cross({x:D.x-A.x,y:D.y-A.y},w)/cross(v,w),G={x:A.x+t*v.x,y:A.y+t*v.y};
 return {A,B,C,D,E,F,G};
}
export function parallelShapesGeometry(alpha:number,beta:number,gamma:number){
 const L=170,E={x:145,y:40},H={x:E.x+L*Math.cos(radians(gamma)),y:E.y+L*Math.sin(radians(gamma))},F={x:E.x+255,y:E.y},G={x:H.x+255,y:H.y};
 const direction=gamma+alpha+beta-180,eb=L*Math.sin(radians(alpha))/Math.sin(radians(beta));
 const B={x:E.x+eb*Math.cos(radians(direction)),y:E.y+eb*Math.sin(radians(direction))},A={x:E.x+L*.57*Math.cos(radians(gamma+alpha)),y:E.y+L*.57*Math.sin(radians(gamma+alpha))};
 return {A,B,E,F,G,H};
}

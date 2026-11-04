/** Parameterized geometry configurations, containing visible givens only. */
export type Batch2UpperPicture={type:'batch2-upper'}&(
 |{layout:'three-squares';smallArea:number;largeArea:number}
 |{layout:'nested-isosceles';innerBaseAngle:number;outerApexAngle:number}
);
export type UpperPoint={x:number;y:number};
export function nestedIsoscelesGeometry(innerBaseAngle:number,outerApexAngle:number){
 const K={x:50,y:55},L={x:350,y:55},N={x:200,y:55+150*Math.tan(innerBaseAngle*Math.PI/180)},M={x:200,y:55+150/Math.tan(outerApexAngle*Math.PI/360)};
 return {K,L,N,M};
}

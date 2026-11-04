/** New diagrams, never extracted school-paper images. Kept isolated until dispatcher integration. */
export type Point=[number,number];
export type P3RafflesPicture={type:'raffles-p3'} & (
 |{layout:'angle-polygon';points:Point[];angles:{label:string;vertex:number}[];rotation:number}
 |{layout:'polygons';shapes:{label:string;points:Point[]}[]}
 |{layout:'fraction-line';parts:number;position:number;marker:string}
 |{layout:'parallel-lines';segments:{label:string;from:Point;to:Point}[];reference:string}
 |{layout:'rectangles';rectangles:{label:string;width:number;height:number}[]}
 |{layout:'grouped-bars';days:string[];series:{label:string;values:number[]}[];scale:number}
);

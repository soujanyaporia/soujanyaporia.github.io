/** Only visible givens; dimensions and cube coordinates are rendered faithfully. */
export type P5MahaBodhiPicture={type:'maha-bodhi-p5'}&(
 |{layout:'parcel';firstMass:number;baseCents:number;blockMass:number;blockCents:number}
 |{layout:'two-squares';side:number;ratio:number}
 |{layout:'composite';width:number;height:number;extension:number;tipHeight:number}
 |{layout:'containers';side:number;height:number;water:number;multiple:number}
 |{layout:'cube-growth';heights:number[];depths:number[]}
 |{layout:'overlap';area:number;extensionRatio:number}
);
export type CubePoint=[number,number,number];
export function solidCubes(heights:number[],depth:number):CubePoint[]{return heights.flatMap((h,x)=>Array.from({length:depth},(_,y)=>Array.from({length:h},(_,z):CubePoint=>[x,y,z])).flat());}

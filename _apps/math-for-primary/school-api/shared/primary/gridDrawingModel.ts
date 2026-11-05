export type GridPoint=[number,number];
export type GridSegment=[GridPoint,GridPoint];
export type GridDrawingSpec={columns:number;rows:number}&({kind:'segment-length';unit:'cm'}|{kind:'copy-grid';referenceSegments:GridSegment[]});
export type GridDrawingPicture={type:'grid-drawing';columns:number;rows:number;segments:GridSegment[];caption?:string};
export const gridDrawingValue=(segments:GridSegment[])=>segments.map(s=>s.map(p=>p.join(',')).join(':')).join(';');
export function parseGridDrawing(spec:Pick<GridDrawingSpec,'columns'|'rows'>,value:string):GridSegment[]|null{
 if(!value)return [];
 if(value.length>200)return null;
 const parts=value.split(';');if(parts.length>16)return null;
 const segments:GridSegment[]=[];
 for(const part of parts){const m=/^(\d{1,2}),(\d):(\d{1,2}),(\d)$/.exec(part);if(!m)return null;const [x,y,a,b]=m.slice(1).map(Number);
  if(x>spec.columns||a>spec.columns||y>spec.rows||b>spec.rows||(x===a&&y===b))return null;
  segments.push([[x,y],[a,b]]);
 }
 return segments;
}
export const gridDrawingReady=(spec:GridDrawingSpec,value:string)=>!!parseGridDrawing(spec,value)?.length;
const gcd=(a:number,b:number):number=>b?gcd(b,a%b):a;
/** Compare the drawn lines, accepting reverse endpoints, edge order and subdivisions. */
export function gridEdges(segments:GridSegment[]):string[]{
 const edges=new Set<string>();
 for(const [[x,y],[a,b]] of segments){const n=gcd(Math.abs(a-x),Math.abs(b-y));for(let i=0;i<n;i++){
  const u=[x+(a-x)*i/n,y+(b-y)*i/n].join(','),v=[x+(a-x)*(i+1)/n,y+(b-y)*(i+1)/n].join(',');edges.add([u,v].sort().join(':'));
 }}return [...edges].sort();
}
export function validGridDrawing(spec:GridDrawingSpec,value:string,example:string):boolean{
 const drawn=parseGridDrawing(spec,value),expected=parseGridDrawing(spec,example);if(!drawn?.length||!expected?.length)return false;
 if(spec.kind==='copy-grid')return JSON.stringify(gridEdges(drawn))===JSON.stringify(gridEdges(expected));
 // A single straight horizontal segment may start at any grid point.
 if(drawn.length!==1||expected.length!==1)return false;
 const [[a,b]]=drawn,[[x,y]]=expected;
 return a[1]===b[1]&&Math.abs(a[0]-b[0])===Math.abs(x[0]-y[0]);
}
export function gridDrawingLabel(spec:GridDrawingSpec,value:string):string{
 const segments=parseGridDrawing(spec,value);if(!segments?.length)return 'No drawing yet';
 if(spec.kind==='segment-length'&&segments.length===1){const [[a,b]]=segments;return a[1]===b[1]?`${Math.abs(a[0]-b[0])} cm`:'A sloping line';}
 return 'Drawing shown';
}

export type GridPoint=[number,number];
export type GridSegment=[GridPoint,GridPoint];
export type GridAxis={orientation:'vertical'|'horizontal';coordinate:number};
export type GridDrawingSpec={columns:number;rows:number}&(
 |{kind:'segment-length';unit:'cm'}
 |{kind:'copy-grid';referenceSegments:GridSegment[]}
 |{kind:'line-relation';givenSegment:GridSegment;throughPoint:GridPoint;relation:'parallel'|'perpendicular'}
 |{kind:'complete-reflection';axis:GridAxis;givenSegments:GridSegment[]}
);
export type GridDrawingPicture={type:'grid-drawing';columns:number;rows:number;segments:GridSegment[];caption?:string;givenSegments?:GridSegment[];axis?:GridAxis;throughPoint?:GridPoint};
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
export function reflectedSegments(segments:GridSegment[],axis:GridAxis):GridSegment[]{
 const reflect=([x,y]:GridPoint):GridPoint=>axis.orientation==='vertical'?[2*axis.coordinate-x,y]:[x,2*axis.coordinate-y];
 // An edge on the mirror line is already given; the pupil draws only the missing half.
 const given=new Set(gridEdges(segments));
 return segments.flatMap(([a,b])=>{
  const reflected:GridSegment=[reflect(a),reflect(b)],edges=gridEdges([reflected]),missing=edges.filter(e=>!given.has(e));
  return missing.length===edges.length?[reflected]:missing.map(e=>e.split(':').map(p=>p.split(',').map(Number)) as GridSegment);
 });
}
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
 if(spec.kind==='complete-reflection')return JSON.stringify(gridEdges(drawn))===JSON.stringify(gridEdges(reflectedSegments(spec.givenSegments,spec.axis)));
 if(spec.kind==='line-relation'){
  if(drawn.length!==1)return false;
  const [[a,b]]=drawn,[u,v]=spec.givenSegment,p=spec.throughPoint,dx=b[0]-a[0],dy=b[1]-a[1],gx=v[0]-u[0],gy=v[1]-u[1];
  const contains=(p[0]-a[0])*dy===(p[1]-a[1])*dx&&p[0]>=Math.min(a[0],b[0])&&p[0]<=Math.max(a[0],b[0])&&p[1]>=Math.min(a[1],b[1])&&p[1]<=Math.max(a[1],b[1]);
  return contains&&(spec.relation==='parallel'?dx*gy===dy*gx:dx*gx+dy*gy===0);
 }
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

import type {Picture} from '../generate';

/** Simple line/text/path/circle diagrams using the app's existing 'batch11-upper' picture type. */
type Mark=
 |{kind:'line';x1:number;y1:number;x2:number;y2:number}
 |{kind:'text';x:number;y:number;text:string}
 |{kind:'path';d:string;fill?:string}
 |{kind:'circle';cx:number;cy:number;r:number;fill?:string};

const n2=(v:number)=>Number(v.toFixed(2));
const line=(x1:number,y1:number,x2:number,y2:number):Mark=>({kind:'line',x1:n2(x1),y1:n2(y1),x2:n2(x2),y2:n2(y2)});
const text=(x:number,y:number,t:string):Mark=>({kind:'text',x:n2(x),y:n2(y),text:t});
const path=(d:string,fill?:string):Mark=>({kind:'path',d,...(fill?{fill}:{})});
const fig=(label:string,marks:Mark[])=>({type:'batch11-upper',label,marks}) as unknown as Picture;

export function squareDiagonalFigure(d:number):Picture{
 return fig(`A square ABCD drawn as a diamond. Its diagonal AC, from the top corner to the bottom corner, is ${d} cm.`,[
  path('M 160 30 L 230 100 L 160 170 L 90 100 Z','#dcefe6'),
  line(160,30,160,170),
  text(155,24,'A'),text(155,188,'C'),text(74,104,'B'),text(236,104,'D'),text(166,106,`${d} cm`),
 ]);
}

export function circleSquareFigure(d:number):Picture{
 return fig(`A square inside a circle with all four corners on the circle. The square's diagonal passes through the centre and is ${d} cm.`,[
  {kind:'circle',cx:160,cy:100,r:70,fill:'#dcefe6'},
  path('M 160 30 L 230 100 L 160 170 L 90 100 Z','white'),
  line(90,100,230,100),
  text(132,94,`${d} cm`),
 ]);
}

export function rectangleHolesFigure(width:number,height:number,holes:number,diagonal:number):Picture{
 const sc=Math.min(240/width,140/height),w=width*sc,h=height*sc,x0=(320-w)/2,y0=(200-h)/2+10,cy=y0+h/2,half=diagonal*sc/2;
 const marks:Mark[]=[path(`M ${n2(x0)} ${n2(y0)} h ${n2(w)} v ${n2(h)} h ${n2(-w)} Z`,'#dcefe6')];
 for(let i=0;i<holes;i++){const cx=x0+(i+.5)*diagonal*sc;marks.push(path(`M ${n2(cx)} ${n2(cy-half)} L ${n2(cx+half)} ${n2(cy)} L ${n2(cx)} ${n2(cy+half)} L ${n2(cx-half)} ${n2(cy)} Z`,'white'));}
 marks.push(line(x0,cy,x0+diagonal*sc,cy),text(x0+half-14,cy-4,`${diagonal} cm`),text(x0+w/2-20,y0-6,`${width} cm`),text(2,cy,`${height} cm`));
 return fig(`A rectangle ${width} cm long and ${height} cm wide with ${holes} tilted square holes in a row. Each hole has a diagonal of ${diagonal} cm along the length.`,marks);
}

export function triangleEdgeFigure(area:number,count:number):Picture{
 const side=180,x0=70,y0=10,w=side/count;
 const marks:Mark[]=[path(`M ${x0} ${y0} H ${x0+side} V ${y0+side} H ${x0} Z`)];
 for(let i=0;i<count;i++){const x=x0+i*w;marks.push(path(`M ${n2(x)} ${y0} L ${n2(x+w)} ${y0} L ${n2(x+w/2)} ${n2(y0+w/2)} Z`,'#dcefe6'));}
 marks.push(text(x0+20,y0+side/2+10,`each triangle: ${area} cm²`));
 return fig(`A square with ${count} identical right-angled isosceles triangles placed side by side along its top edge, longest sides on the edge. Each triangle has area ${area} square centimetres.`,marks);
}

import type {ReactNode} from 'react';
import type {Batch9MiddlePicture,BalanceItem} from './batch9MiddlePicture';
const ink='#355b50',shade='#dce9e3';
const text=(x:number,y:number,value:string,size=17)=><text x={x} y={y} textAnchor="middle" fontSize={size} fill="#203d34">{value}</text>;
function balanceItems(items:BalanceItem[],cx:number,y:number){return items.map((item,j)=>{const centre=cx+(j-(items.length-1)/2)*90;
 if(item.kind==='weight')return <g key={j}><rect x={centre-28} y={y-35} width="56" height="33" fill="#f4f2eb" stroke={ink}/>{text(centre,y-13,`${item.grams} g`,14)}</g>;
 return <g key={j}>{Array.from({length:item.count},(_,i)=>{const cols=item.kind==='ball'?Math.min(5,item.count):Math.min(3,item.count),row=Math.floor(i/cols),col=i%cols,x=centre+(col-(cols-1)/2)*(item.kind==='ball'?18:37),yy=y-12-row*23;return item.kind==='ball'?<circle key={i} cx={x} cy={yy} r="8" fill="#cbdde9" stroke={ink}/>:<g key={i}><rect x={x-16} y={yy-15} width="32" height="24" fill={shade} stroke={ink}/>{text(x,yy+1,item.kind,11)}</g>;})}</g>;
 });}
export function Batch9MiddleDiagram({model:m}:{model:Batch9MiddlePicture}){
 let body:ReactNode,height=340,label='Mathematical diagram';
 if(m.layout==='balances'){
  height=390;label='Three level balances with repeated balls, cars and a bear';body=m.rows.map((row,i)=>{const y=88+i*115;return <g key={i}>{balanceItems(row.left,145,y)}{balanceItems(row.right,355,y)}<path d={`M70 ${y}H220M280 ${y}H430M145 ${y+4}V${y+15}H355V${y+4}M145 ${y+15}H355M250 ${y+15}L235 ${y+45}H265Z`} fill="none" stroke={ink} strokeWidth="2"/></g>;});
 }else if(m.layout==='crossed-rectangles'){
  const scale=220/m.long,L=m.long*scale,S=m.short*scale,x=250-L/2,y=175-L/2;label='Two perpendicular identical rectangles with the same centre';body=<><rect x={x} y={175-S/2} width={L} height={S} fill={shade} fillOpacity=".6" stroke={ink} strokeWidth="2.5"/><rect x={250-S/2} y={y} width={S} height={L} fill="#dce6f0" fillOpacity=".6" stroke={ink} strokeWidth="2.5"/><path d={`M120 ${y}V${y+L}M115 ${y}H125M115 ${y+L}H125M${250-S/2} ${y-12}H${250+S/2}M${250-S/2} ${y-17}V${y-7}M${250+S/2} ${y-17}V${y-7}`} fill="none" stroke={ink}/>{text(250,y-24,`${m.short} cm`)}{text(88,180,`${m.long} cm`)}</>;
 }else if(m.layout==='cut-rectangle'){
  label='A rectangle with a square removed from its bottom right corner';body=<><path d="M75 80H415V165H330V250H75Z" fill={shade} stroke={ink} strokeWidth="2.5"/><path d="M330 165H415V250H330Z" fill="none" stroke="#8c7462" strokeDasharray="6 4"/>{text(245,61,'?')}{text(372,215,`${m.removedArea} cm²`,15)}{text(205,170,`${m.remainingArea} cm² remains`,16)}{[['A',65,75],['B',425,75],['C',425,268],['D',65,268],['W',320,160],['X',430,166],['Y',320,269]].map(([v,x,y])=><g key={v}>{text(Number(x),Number(y),String(v))}</g>)}<path d="M410 120H420M410 205H420" stroke={ink} strokeWidth="2"/></>;
 }else if(m.layout==='notch'){
  const s=Math.min(320/m.width,175/m.height),x=80,y=75,w=m.width*s,h=m.height*s,d=m.depth*s,right=m.rightFoot*s;label='A rectilinear figure with a square notch cut into one side';body=<><path d={`M${x} ${y}H${x+w}V${y+h}H${x+w-right}V${y+h-d}H${x+w-right-d}V${y+h}H${x}Z`} fill={shade} stroke={ink} strokeWidth="2.5"/>{text(x+w/2,y-15,`${m.width} cm`)}{text(x-30,y+h/2,`${m.height} cm`)}{text(x+w-right-d-24,y+h-d/2,`${m.depth} cm`)}{text(x+w-right/2,y+h+25,`${m.rightFoot} cm`)}</>;
 }else if(m.layout==='symmetry-options'){
  height=380;label='Four shaded shapes on square grids';body=m.options.map((option,i)=>{const x=85+(i%2)*230,y=35+Math.floor(i/2)*175,size=29;return <g key={option.label}>{text(x-25,y+65,option.label,20)}{Array.from({length:16},(_,k)=>{const c=k%4,r=Math.floor(k/4),filled=option.cells.some(([a,b])=>a===c&&b===r);return <rect key={k} x={x+c*size} y={y+r*size} width={size} height={size} fill={filled?'#557d70':'#fff'} stroke="#90a298"/>;})}</g>;});
 }else if(m.layout==='unit-squares'){
  label='A fixed arrangement of identical unit squares';const minX=Math.min(...m.cells.map(c=>c[0])),minY=Math.min(...m.cells.map(c=>c[1])),columns=Math.max(...m.cells.map(c=>c[0]))-minX+1,rows=Math.max(...m.cells.map(c=>c[1]))-minY+1,size=Math.min(55,240/Math.max(columns,rows)),x=250-columns*size/2,y=170-rows*size/2;body=m.cells.map(([a,b],i)=><rect key={i} x={x+(a-minX)*size} y={y+(b-minY)*size} width={size} height={size} fill={shade} stroke={ink} strokeWidth="2"/>);
 }else{
  label='A labelled net of a cube';const minX=Math.min(...m.faces.map(f=>f.x)),minY=Math.min(...m.faces.map(f=>f.y)),width=Math.max(...m.faces.map(f=>f.x))-minX+1,rows=Math.max(...m.faces.map(f=>f.y))-minY+1,size=Math.min(78,290/width,245/rows),ox=250-width*size/2,oy=170-rows*size/2;body=m.faces.map(f=><g key={f.label}><rect x={ox+(f.x-minX)*size} y={oy+(f.y-minY)*size} width={size} height={size} fill="#f7faf8" stroke={ink} strokeWidth="2"/>{text(ox+(f.x-minX+.5)*size,oy+(f.y-minY+.5)*size+7,f.label,22)}</g>);
 }
 return <svg className="game-figure" viewBox={`0 0 500 ${height}`} role="img" aria-label={label}>{body}</svg>;
}

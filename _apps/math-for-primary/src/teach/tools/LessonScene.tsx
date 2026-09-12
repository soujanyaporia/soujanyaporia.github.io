import type {VisualSpec} from '../../engine/types';
import {Visual} from '../../visuals/Visual';
export type SceneTool={kind:'scene';scene:'place'|'fraction'|'fraction-product'|'area'|'triangle'|'circle'|'average'|'scale'|'timeline'|'angles'|'ratio'|'money'|'regroup'|'crossing'|'house'|'triangle-angles'|'circle-area';values:number[];phase:number;labels?:string[]};
export type FoundationTool={kind:'foundation-visual';visual:VisualSpec};
const BLUE='#536ce7',GOLD='#efac59',GREEN='#71ad86',INK='#29384f';
/** Each drawing depicts the quantities named in the adjacent teaching sentence. */
export function LessonScene({t}:{t:SceneTool}){
 const [a=3,b=4,c=2,d=3]=t.values,p=t.phase;
 const rect=(x:number,y:number,w:number,h:number,fill:string,key:string|number)=><rect key={key} x={x} y={y} width={w} height={h} rx="3" fill={fill} stroke="white" strokeWidth="2"/>;
 const text=(x:number,y:number,s:string,key:string|number,fill=INK)=><text key={key} x={x} y={y} textAnchor="middle" fill={fill} fontSize="18" fontWeight="800">{s}</text>;
 let art;
 if(t.scene==='regroup'){
 const tens=p<2?Math.floor(a/10)+Math.floor(b/10):Math.floor((a+b)/10),ones=p<2?a%10+b%10:(a+b)%10;
 art=<>{Array.from({length:tens},(_,i)=><g key={i}><rect x={55+i*35} y='42' width='25' height='170' rx='4' fill={i<Math.floor(a/10)?BLUE:GOLD}/>{Array.from({length:9},(_,j)=><path key={j} d={`M${55+i*35} ${59+j*17}h25`} stroke='white'/>)}</g>)}{Array.from({length:ones},(_,i)=><rect key={i} x={290+i%5*32} y={55+Math.floor(i/5)*42} width='25' height='25' rx='4' fill={p<2&&i>=a%10?GOLD:BLUE}/>)}{p===1&&<rect x='282' y='47' width='170' height='77' rx='10' fill='none' stroke={GREEN} strokeWidth='4' strokeDasharray='6 4'/>}{text(140,247,`${tens} tens`,'t')}{text(370,247,`${ones} ones`,'o')}</>;
 }else if(t.scene==='crossing'){
 art=<><path d='M75 145H445 M190 266L330 24' stroke={INK} strokeWidth='4'/><path d='M330 145A70 70 0 0 0 295 84' fill='none' stroke={BLUE} strokeWidth='6'/><path d='M190 145A70 70 0 0 0 225 206' fill='none' stroke={GOLD} strokeWidth='6'/>{text(350,125,'60°','a')}{text(180,187,p>=1?'60°':'?','b')}{text(215,100,'120°','c')}</>;
 }else if(t.scene==='house'){
 art=<><path d='M100 230V110L260 30L420 110V230Z' fill='#edf0ff' stroke={BLUE} strokeWidth='3'/><path d='M100 110H420' stroke={INK} strokeDasharray='5 4'/>{p>=1&&<path d='M100 110L260 30L420 110Z' fill={GOLD} opacity='.7'/>}{text(260,264,'base 6 cm','b')}{text(465,175,'4 cm','h')}{text(280,88,'2 cm','roof')}<path d='M260 30V110h12v-12h-12' fill='none' stroke={INK}/></>;
 }else if(t.scene==='triangle-angles'){
 const height=230/(1/Math.tan(a*Math.PI/180)+1/Math.tan((180-a-b)*Math.PI/180)),vx=145+height/Math.tan(a*Math.PI/180);
  art=<><path d={`M145 225L${vx} ${225-height}L375 225Z`} fill='#edf0ff' stroke={BLUE} strokeWidth='3'/>{text(176,207,`${a}°`,'a')}{text(vx,225-height+48,`${b}°`,'b')}{text(345,207,p>=2?`${180-a-b}°`:'?','c')}{p>=1&&text(260,274,'The three corners make a straight turn','total')}</>;
 }else if(t.scene==='circle-area'){
 if(p===0){art=<>{Array.from({length:16},(_,i)=>{const start=i*Math.PI/8,end=(i+1)*Math.PI/8;return <path key={i} d={`M260 135L${260+105*Math.cos(start)} ${135+105*Math.sin(start)}A105 105 0 0 1 ${260+105*Math.cos(end)} ${135+105*Math.sin(end)}Z`} fill={i%2?GOLD:BLUE} stroke='white'/>;})}{text(260,275,'Cut the circle into equal sectors','cut')}</>;}else{const count=p>=2?32:16,R=105,half=R*Math.sin(Math.PI/count),height=R*Math.cos(Math.PI/count),left=260-(count-1)*half/2;
 art=<>{Array.from({length:count},(_,i)=>{const x=left+i*half,y=65;return <path key={i} d={i%2?`M${x} ${y+height}L${x-half} ${y}A${R} ${R} 0 0 1 ${x+half} ${y}Z`:`M${x} ${y}L${x+half} ${y+height}A${R} ${R} 0 0 1 ${x-half} ${y+height}Z`} fill={i%2?GOLD:BLUE} stroke='white' strokeWidth='.6'/>;})}{text(260,224,'about half the circumference = πr','w')}{text(463,130,'r','r')}{p>=2&&text(260,263,'finer sectors make a closer rectangle','fine')}</>;}

 }else if(t.scene==='money'){art=<>{t.values.map((v,i)=><g key={i}><circle cx={80+i*115} cy={130} r={42} fill='#f8d997' stroke='#c69445' strokeWidth='4'/>{text(80+i*115,138,`${v}¢`,'coin')}</g>)}</>;}else if(t.scene==='place'){
  const str=String(a),cols=str.length,w=Math.min(74,480/cols);
  art=<>{str.split('').map((digit,i)=>{const x=260-cols*w/2+i*w,exp=cols-i-1-(b||0),unit=10**exp;return <g key={i} opacity={p===1&&i!==Math.min(c,cols-1)?.3:1}><rect x={x+2} y="30" width={w-4} height="195" rx="14" fill={i%2?'#fff3df':'#edf0ff'}/>{text(x+w/2,60,unit>=1?String(unit):String(Number(unit.toFixed(3))),'u')}{Array.from({length:Number(digit)},(_,k)=><circle key={k} cx={x+20+(k%3)*14} cy={88+Math.floor(k/3)*18} r="5" fill={i%2?GOLD:BLUE}/>)}{text(x+w/2,180,digit,'d')}{p>=2&&text(x+w/2,208,String(Number((Number(digit)*unit).toFixed(3))),'v')}</g>;})}</>;
 }else if(t.scene==='fraction'){
  // a/b and c/d are shown on equally long strips. Later frames rename to b*d parts.
  const common=b*d,den=p===1?common:b,den2=p===1?common:d;
  art=<>{[0,1].map(row=>{const n=row?c:a,D=row?d:b,parts=row?den2:den,shade=n*parts/D;return <g key={row}>{Array.from({length:parts},(_,i)=>rect(30+i*460/parts,45+row*95,460/parts,54,i<shade?(row?GOLD:BLUE):'#e7e9ee',i))}{text(260,123+row*95,`${n}/${D}${p===1?` = ${shade}/${parts}`:''}`,'label')}</g>;})}</>;
 }else if(t.scene==='fraction-product'){
  art=<>{Array.from({length:b*d},(_,i)=>{const row=Math.floor(i/d),col=i%d,both=row<a&&col<c;return rect(105+col*300/d,25+row*200/b,300/d,200/b,p===0?(col<c?GOLD:'#eef0f4'):p===1?(both?BLUE:col<c?'#f8d6a4':'#eef0f4'):(both?GREEN:'#eef0f4'),i);})}{text(260,252,p===0?`${c} of ${d} columns`:p===1?`Take ${a} of the ${b} rows`:`${a*c} of ${b*d} equal pieces`,'label')}</>;
 }else if(t.scene==='area'||t.scene==='triangle'){
  const x=90,y=30,w=340,h=180;
  art=<><rect x={x} y={y} width={w} height={h} fill="#edf0ff" stroke={BLUE} strokeWidth="2"/>{t.scene==='area'?Array.from({length:a*b},(_,i)=>rect(x+(i%a)*w/a,y+Math.floor(i/a)*h/b,w/a,h/b,p===0?(i<a?GOLD:'#edf0ff'):i<a?GOLD:BLUE,i)):<><path d={`M${x} ${y+h}L${x+w} ${y+h}L${x} ${y}Z`} fill={BLUE}/>{p>=1&&<path d={`M${x} ${y}L${x+w} ${y}L${x+w} ${y+h}Z`} fill={GOLD}/>}<path d={`M${x+18} ${y+h}v-18h-18`} fill="none" stroke="white" strokeWidth="3"/></>}{text(260,240,`${a} units`,'base')}{text(55,128,`${b}`,'height')}{t.scene==='triangle'&&text(270,275,p<1?'':p<2?'Two matching triangles fit exactly':`${a} × ${b} ÷ 2 = ${a*b/2}`,'result')}</>;
 }else if(t.scene==='circle'){
  const x=260,y=135,r=98;art=<><circle cx={x} cy={y} r={r} fill="#edf0ff" stroke={BLUE} strokeWidth="3"/>{p===0?<><path d={`M${x} ${y}h${r}`} stroke={GOLD} strokeWidth="5"/>{text(x+45,y-12,`r = ${a}`,'r')}</>:p===1?<><path d={`M${x-r} ${y}h${r*2}`} stroke={GOLD} strokeWidth="5"/>{text(x,y-14,`${a} + ${a} = ${2*a}`,'d')}</>:<><circle cx={x} cy={y} r={r} fill="none" stroke={GOLD} strokeWidth="7" strokeDasharray="8 3"/>{text(x,y,p===2?'around the edge':'cover the inside','c')}</>}</>;
 }else if(t.scene==='average'){
  const vals=p===0?[a,b,c]:p===1?[a+1,b,c-1]:[(a+b+c)/3,(a+b+c)/3,(a+b+c)/3];art=<>{vals.map((v,i)=><g key={i}><rect x={65+i*135} y="30" width="110" height="190" rx="20" fill="#f0f2f8"/>{Array.from({length:v},(_,j)=><circle key={j} cx={92+i*135+j%2*40} cy={185-Math.floor(j/2)*40} r="15" fill={[BLUE,GOLD,GREEN][i]}/>)}{text(120+i*135,253,String(v),'n')}</g>)}</>;
 }else if(t.scene==='scale'){
  art=<><path d="M60 135H460" stroke={INK} strokeWidth="3"/>{Array.from({length:11},(_,i)=><g key={i}><path d={`M${60+i*40} 125v20`} stroke={INK}/>{i%2===0&&text(60+i*40,170,String(i*a),'n')}</g>)}<path d={`M${60+b*40} 58v56l-9-13m9 13l9-13`} stroke={GOLD} strokeWidth="5" fill="none"/>{text(260,230,p===0?`Each interval is ${a}`:p===1?`${b} intervals from zero`:`${b} × ${a} = ${b*a}`,'reading')}</>;
 }else if(t.scene==='timeline'){
  const vals=[a,a+b,a+b+c],show=p===0?1:p===1?2:3;
  art=<><path d="M50 160H470" stroke={INK} strokeWidth="3"/>{vals.slice(0,show).map((v,i)=><g key={i}><circle cx={65+i*195} cy="160" r="7" fill={i?GOLD:BLUE}/>{text(65+i*195,205,`${Math.floor(v/60)%12||12}:${String(v%60).padStart(2,'0')}`,'time')}{i>0&&<><path d={`M${65+(i-1)*195} 150q97-160 195 0`} stroke={GOLD} strokeWidth="4" fill="none"/>{text(65+(i-.5)*195,62,`+${i===1?b:c} min`,'jump')}</>}</g>)}</>;
 }else if(t.scene==='angles'){
  const known=a*Math.PI/180,x=260,y=205;art=<><path d={`M70 ${y}H450 M${x} ${y}L${x+170*Math.cos(known)} ${y-170*Math.sin(known)}`} stroke={INK} strokeWidth="4" fill="none"/><path d={`M${x+65} ${y}A65 65 0 0 0 ${x+65*Math.cos(known)} ${y-65*Math.sin(known)}`} fill="none" stroke={BLUE} strokeWidth="6"/>{p>=1&&<path d={`M${x+90*Math.cos(known)} ${y-90*Math.sin(known)}A90 90 0 0 0 ${x-90} ${y}`} fill="none" stroke={GOLD} strokeWidth="6"/>}{text(335,182,`${a}°`,'given')}{text(183,140,p>=2?`${180-a}°`:'?','missing')}{text(260,255,'One straight turn = 180°','total')}</>;
 }else{
  art=<>{[a,b].map((n,row)=><g key={row}>{Array.from({length:n},(_,i)=>rect(60+i*70,48+row*95,66,55,row?GOLD:BLUE,i))}{Array.from({length:n},(_,i)=>text(93+i*70,83+row*95,p>=1?String(c):'?','l'+i,'white'))}{text(445,83+row*95,p>=2?String(n*c):`${n} units`,'total')}</g>)}</>;
 }
 return <svg className={`lesson-scene scene-${t.scene}`} viewBox="0 0 520 290" role="img" aria-label={t.labels?.join('. ')||`${t.scene} model, step ${p+1}`}>{art}</svg>;
}
export function FoundationPicture({t}:{t:FoundationTool}){return <Visual spec={t.visual}/>;}

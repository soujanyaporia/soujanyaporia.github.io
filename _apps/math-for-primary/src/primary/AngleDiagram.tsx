export type AngleDiagramModel={type:'angleProblem';layout:'line'|'point'|'opposite'|'triangle'|'parallelogram';a:number;b?:number;target?:'adjacent'|'opposite'};
const radians=(a:number)=>a*Math.PI/180;
const point=(x:number,y:number,r:number,angle:number)=>[x+r*Math.cos(radians(angle)),y-r*Math.sin(radians(angle))];
const arc=(x:number,y:number,r:number,start:number,end:number)=>{const [a,b]=point(x,y,r,start),[c,d]=point(x,y,r,end);return `M${a} ${b}A${r} ${r} 0 ${end-start>180?1:0} 0 ${c} ${d}`;};

/** Given angles determine the geometry. Question marks identify the requested angle, never its value. */
export function AngleDiagram({model:m}:{model:AngleDiagramModel}){
 const stroke='#527c69',fill='#e0ecd5',gold='#b7843f';
 if(m.layout==='triangle'){
  const b=m.b!,height=240/(1/Math.tan(radians(m.a))+1/Math.tan(radians(b))),scale=Math.min(1,170/height),w=240*scale,h=height*scale,x=(400-w)/2,y=245,peakX=x+h/Math.tan(radians(m.a)),peakY=y-h;
  return <svg className="game-figure angle-problem" viewBox="0 0 400 285" role="img" aria-label={`Triangle with two given angles ${m.a} degrees and ${b} degrees; find the angle marked question mark`}>
   <polygon data-triangle="true" points={`${x},${y} ${x+w},${y} ${peakX},${peakY}`} fill={fill} stroke={stroke} strokeWidth="3"/>
   <path d={arc(x,y,22,0,m.a)} fill="none" stroke={gold}/><path d={arc(x+w,y,22,180-b,180)} fill="none" stroke={gold}/>
   <text x={x-9} y={y+6} textAnchor="end" fontSize="19">{m.a}°</text><text x={x+w+9} y={y+6} fontSize="19">{b}°</text><text x={peakX} y={peakY-13} textAnchor="middle" fontSize="23" fontWeight="850">?</text>
  </svg>;
 }
 if(m.layout==='parallelogram'){
  const h=115,w=175,slant=h/Math.tan(radians(m.a)),x=(400-w-Math.abs(slant))/2+Math.max(0,-slant),y=220,targetX=m.target==='opposite'?x+w+slant:x+w,targetY=m.target==='opposite'?y-h:y;
  return <svg className="game-figure angle-problem" viewBox="0 0 400 275" role="img" aria-label={`Parallelogram with a given angle of ${m.a} degrees; find the ${m.target??'adjacent'} angle marked question mark`}>
   <polygon data-parallelogram="true" points={`${x},${y} ${x+w},${y} ${x+w+slant},${y-h} ${x+slant},${y-h}`} fill={fill} stroke={stroke} strokeWidth="3"/>
   <path d={arc(x,y,24,0,m.a)} fill="none" stroke={gold}/><text x={x-9} y={y+8} textAnchor="end" fontSize="19">{m.a}°</text><text x={targetX+9} y={targetY+(m.target==='opposite'?-8:8)} fontSize="23" fontWeight="850">?</text>
  </svg>;
 }
 const x=200,y=145,r=118,[rayX,rayY]=point(x,y,r,m.a),[opX,opY]=point(x,y,r,m.a+180);
 const known=point(x,y,53,m.a/2),unknown=point(x,y,m.layout==='point'?70:56,m.layout==='line'?(m.a+180)/2:m.layout==='point'?(m.a+360)/2:m.a/2+180);
 return <svg className="game-figure angle-problem" viewBox="0 0 400 290" role="img" aria-label={`${m.layout==='line'?'Angles on a straight line':m.layout==='point'?'Angles making a full turn':'Vertically opposite angles'}: one angle is ${m.a} degrees; find the angle marked question mark`}>
  <path d={`M${m.layout==='point'?x:55} ${y}H345M${m.layout==='opposite'?opX:x} ${m.layout==='opposite'?opY:y}L${rayX} ${rayY}`} fill="none" stroke={stroke} strokeWidth="3"/>
  <path d={arc(x,y,34,0,m.a)} fill="none" stroke={gold} strokeWidth="2"/><path d={arc(x,y,43,m.layout==='opposite'?180:m.a,m.layout==='line'?180:m.layout==='point'?360:m.a+180)} fill="none" stroke="#6298b2" strokeWidth="2"/>
  <circle cx={x} cy={y} r="4" fill={stroke}/><text x={known[0]} y={known[1]+5} textAnchor="middle" fontSize="18">{m.a}°</text><text x={unknown[0]} y={unknown[1]+6} textAnchor="middle" fontSize="23" fontWeight="850">?</text>
 </svg>;
}

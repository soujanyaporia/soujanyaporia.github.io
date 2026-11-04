/** Spoken maths uses words for operations and units, while retaining the original numbers. */
export function speechText(text:string):string{
 return text
 .replace(/\$(\d+)(?:\.(\d{1,2}))?/g,(_,d,c)=>`${d} ${Number(d)===1?'dollar':'dollars'}${c&&Number(c)?` and ${Number(c.padEnd(2,'0'))} cents`:''}`)
 .replace(/cm³/g,' cubic centimetres ').replace(/cm²/g,' square centimetres ').replace(/m³/g,' cubic metres ').replace(/m²/g,' square metres ')
 .replace(/\bcm\b/g,' centimetres ').replace(/\bmm\b/g,' millimetres ').replace(/\bkm\b/g,' kilometres ').replace(/\bml\b/gi,' millilitres ').replace(/\bkg\b/g,' kilograms ')
 .replace(/(\d+)\s+(\d+)\/(\d+)/g,'$1 and $2 over $3').replace(/(\d+)\/(\d+)/g,'$1 over $2')
 .replace(/=\s*\?/g,' equals what ').replace(/□/g,' the missing number ').replace(/[−–]/g,' minus ').replace(/\+/g,' plus ').replace(/[×*]/g,' times ').replace(/÷/g,' divided by ').replace(/=/g,' equals ').replace(/≠/g,' is not equal to ').replace(/</g,' is less than ').replace(/>/g,' is greater than ').replace(/%/g,' percent ').replace(/°/g,' degrees ').replace(/○/g,' circle ').replace(/→/g,', then ').replace(/…/g,' ').replace(/\s+/g,' ').replace(/\.\s*\./g,'.').trim();
}
export function narrationKey(text:string):string{const s=speechText(text);let h=0x811c9dc5;for(let i=0;i<s.length;i++)h=Math.imul(h^s.charCodeAt(i),0x01000193);return `${(h>>>0).toString(36)}-${s.length.toString(36)}`;}

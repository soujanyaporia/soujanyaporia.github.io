/** Number-name helper retained from the original whole-number builder. */
const ONES=['zero','one','two','three','four','five','six','seven','eight','nine','ten','eleven','twelve','thirteen','fourteen','fifteen','sixteen','seventeen','eighteen','nineteen'];
const TENS=['','','twenty','thirty','forty','fifty','sixty','seventy','eighty','ninety'];
const under100=(n:number):string=>n<20?ONES[n]:TENS[Math.floor(n/10)]+(n%10?`-${ONES[n%10]}`:'');
const under1000=(n:number):string=>{const h=Math.floor(n/100),r=n%100;return `${h?`${ONES[h]} hundred`:''}${h&&r?' and ':''}${r?under100(r):''}`;};
/** A whole number in words, Singapore style: “one thousand two hundred and thirty-four”. */
export function words(n:number):string{
 if(n===0)return 'zero';
 const parts:string[]=[],m=Math.floor(n/1e6),th=Math.floor((n%1e6)/1000),rest=n%1000;
 if(m)parts.push(`${under1000(m)} million`);
 if(th)parts.push(`${under1000(th)} thousand`);
 if(rest)parts.push(under1000(rest));
 return parts.join(' ');
}

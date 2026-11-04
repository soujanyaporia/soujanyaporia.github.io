/** A clean learning check is not evidence that the later challenge was solved independently. */
export function challengeEvidence(results:{correct:boolean;firstTry:boolean}[]){
 const independent=results.filter(r=>r.correct&&r.firstTry).length;
 const supported=results.filter(r=>r.correct&&!r.firstTry).length;
 const shown=results.filter(r=>!r.correct).length;
 return {independent,supported,shown,total:results.length,needsPractice:results.length>0&&independent<results.length};
}

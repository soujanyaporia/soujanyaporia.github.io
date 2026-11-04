export type MissingDigit=number|'A'|'B';
/** Only visible givens belong here; neither hidden digit is stored in the question diagram. */
export interface MissingDigitColumnModel {
 type:'missing-column';operation:'+';top:MissingDigit[];bottom:MissingDigit[];total:number[];target:'A'|'B';
}

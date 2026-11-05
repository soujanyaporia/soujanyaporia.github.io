export type ArithmeticNode={slot:number}|{op:'+'|'-'|'×'|'÷';a:ArithmeticNode;b:ArithmeticNode};
export interface OperandDomain {digits:number;places:number;belowOne:boolean;trailingZeros:number;fixed?:string}
export interface ArithmeticVariant {tree:ArithmeticNode;domains:OperandDomain[];maxAnswerPlaces:number;regroup?:boolean}
export interface ArithmeticFamily {id:string;level:number;title:string;objective:string;skillIds:string[];canonicalPatternId:string;sourceUnits:{paperId:string;sourceQuestion:string;sourcePage:number}[];variants:ArithmeticVariant[]}

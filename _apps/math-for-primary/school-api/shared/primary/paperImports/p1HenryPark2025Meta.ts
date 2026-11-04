import type {PaperPattern} from '../paperCatalog';

export interface ImportedPaperPattern extends PaperPattern {
 sourceParts:string[];sourcePage:number;group:string;
 canonicalPatternId:string;
 response:'number'|'number-words'|'choice'|'order'|'number-sentence';
 coverage:'complete'|'partial';
}
export const P1_HENRY_PARK_2025_SOURCE={paperId:'0fa004d1786d5dd9',title:'2025 Henry Park Primary 1 Topical Quiz 3',sourceUrl:'https://sgexam.com/subject/maths/2025-p1-maths-quiz-3-henry-park-pdf/',questionPages:9,answerPages:[10],numberedQuestions:21,mainAnswerParts:24,storyEquationTasks:3} as const;
type Row=[string,string,string,number,string[],ImportedPaperPattern['response'],string[]];
const rows:Row[]=[
 ['01','Count the fruit delivery','Count packets of ten and loose fruit.',1,['1'],'choice',['WN.01','WN.02']],
 ['02','Find the different amount','Compare number names, tens-and-ones notation and expanded forms.',2,['2'],'choice',['WN.02','WN.03']],
 ['03','Compare two fruit trays','Count two pictured collections and find their difference.',2,['3'],'choice',['WN.04','AS.05']],
 ['04','One ten fewer','Subtract one ten while preserving the ones.',2,['4'],'choice',['AS.08']],
 ['05','Add across a ten','Add two two-digit numbers with regrouping.',3,['5'],'choice',['AS.05']],
 ['06','Write the number name','Write a two-digit number in words.',3,['6'],'number-words',['WN.03']],
 ['07','Order the number cards','Order four numbers from smallest to greatest.',3,['7'],'order',['WN.04']],
 ['08-tens','Count the tens packets','Read the number of tens in a bundled collection.',4,['8.tens'],'number',['WN.02']],
 ['08-ones','Count the loose ones','Read the ones in the same bundled collection.',4,['8.ones'],'number',['WN.02']],
 ['09','Add without an exchange','Add two two-digit numbers without regrouping.',4,['9'],'number',['AS.05']],
 ['10','Find a missing backward step','Infer a decreasing number pattern and recover its internal gap.',4,['10'],'number',['WN.05']],
 ['11','Make the greatest allowed number','Select and arrange two digit cards within stated bounds.',4,['11'],'number',['WN.02','WN.04']],
 ['12','Build a subtraction sentence','Choose three of four number cards to make a true subtraction sentence.',5,['12'],'number-sentence',['AS.03','AS.04']],
 ['13-a','Read the first collection','Count tens and ones in collection A.',5,['13.A'],'number',['WN.01','WN.02']],
 ['13-b','Read the second collection','Count tens and ones in collection B.',5,['13.B'],'number',['WN.01','WN.02']],
 ['14','Join the two collections','Combine the amounts in the two pictured collections.',5,['14'],'number',['AS.01','AS.05']],
 ['15','Turn tens and ones into a number','Compose a numeral from its tens and ones.',5,['15'],'number',['WN.02']],
 ['16','Find the starting number','Work backwards from a stated increase of several tens.',6,['16'],'number',['AS.03','AS.08']],
 ['17','Fill the bakery order','Count what is ready and find how many more reach a target.',6,['17'],'number',['AS.03','AS.05']],
 ['18-a','Find the missing tens digit','Infer the first addend’s missing tens digit from a column sum.',6,['18.first-tens'],'number',['AS.04','AS.05']],
 ['18-b','Find the missing ones digit','Infer the second addend’s missing ones digit from a column sum.',6,['18.second-ones'],'number',['AS.04','AS.05']],
 ['19-equation','Build a joining story sentence','Construct the addition sentence for two known collections.',7,['19.equation'],'number-sentence',['AS.01','AS.04']],
 ['19-answer','Find the whole collection','Find the combined number of objects in a joining story.',7,['19.answer'],'number',['AS.01','AS.05']],
 ['20-equation','Build a comparison story sentence','Construct subtraction when the larger amount and difference are known.',8,['20.equation'],'number-sentence',['AS.03','AS.04']],
 ['20-answer','Find the smaller collection','Use the larger amount and difference to find the smaller collection.',8,['20.answer'],'number',['AS.03','AS.05']],
 ['21-equation','Build a missing-before sentence','Construct addition to restore a starting amount from remaining and missing parts.',9,['21.equation'],'number-sentence',['AS.03','AS.04']],
 ['21-answer','Restore the starting collection','Join what remains and what was lost to recover the starting amount.',9,['21.answer'],'number',['AS.03','AS.05']],
];
const canonical:Record<string,string>={
 '01':'base-ten-representation','02':'equivalent-number-representations','03':'pictured-difference','04':'tens-change','05':'two-number-addition','06':'number-name','07':'number-order','08-tens':'base-ten-representation','08-ones':'base-ten-representation','09':'two-number-addition','10':'decreasing-pattern-gap','11':'constrained-digit-formation','12':'card-subtraction-equation','13-a':'base-ten-representation','13-b':'base-ten-representation','14':'join-base-ten-collections','15':'base-ten-representation','16':'tens-change','17':'counted-target-deficit','18-a':'missing-column-digits','18-b':'missing-column-digits','19-equation':'joining-story','19-answer':'joining-story','20-equation':'comparison-story-smaller','20-answer':'comparison-story-smaller','21-equation':'restore-start-story','21-answer':'restore-start-story',
};
export const P1_HENRY_PARK_2025_PATTERNS:ImportedPaperPattern[]=rows.map(([slug,title,objective,sourcePage,sourceParts,response,skills])=>({
 parameter:`hp25-${slug}`,title,objective,sourcePage,sourceParts,response,coverage:'complete',
 canonicalPatternId:canonical[slug],
 group:slug.startsWith('13-')||slug==='14'?'13-14':slug.split('-')[0],
 level:1,strand:'Number & Algebra',skillIds:skills.map(s=>`P1.S.${s}`),icon:'✦',
}));

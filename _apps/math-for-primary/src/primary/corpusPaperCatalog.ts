import type {PaperPattern} from './paperCatalog';

/** Pure metadata. The source inspired a structure/context; all questions and diagrams are original. */
export const CORPUS_PATTERNS:PaperPattern[]=[
 {level:1,parameter:'p1-pattern-gap',title:'Missing stepping stone',objective:'Infer a constant step and recover an internal missing term.',strand:'Number & Algebra',skillIds:['P1.S.WN.05'],icon:'✦'},
 {level:2,parameter:'p2-unit-ribbons',title:'Compare equal ribbons',objective:'Compare unit fractions using equal-sized wholes.',strand:'Number & Algebra',skillIds:['P2.S.FRAC.03'],icon:'✦'},
 {level:3,parameter:'p3-juice-left',title:'Juice for the picnic',objective:'Convert litres to millilitres before subtracting several equal pours.',strand:'Measurement & Geometry',skillIds:['P3.S.MEASURE.03','P3.S.MD.03','P3.S.AS.01'],icon:'◇'},
 {level:4,parameter:'p4-path-area',title:'Garden path planner',objective:'Find an inner rectangle and subtract its area from the whole plot.',strand:'Measurement & Geometry',skillIds:['P4.S.AREA.02'],icon:'◇'},
 {level:5,parameter:'p5-giftbags',title:'Pack the gift bags',objective:'Find the greatest common-factor bag count for two supplies, as prerequisite review.',strand:'Number & Algebra',skillIds:['P4.S.FACT.02'],icon:'✦'},
 {level:6,parameter:'p6-equilateral-line',title:'Triangle angle trail',objective:'Combine an equilateral-triangle angle with angles on a straight line.',strand:'Measurement & Geometry',skillIds:['P5.S.SHAPE.01','P5.S.ANGLE.01'],icon:'◇'},
];
export const CORPUS_PATTERN_SOURCES=[
 {parameter:'p1-pattern-gap',url:'https://sgexam.com/subject/maths/2025-p1-maths-quiz-1-henry-park-pdf/',pdfPage:6,question:'13',observed:'A number pattern with an internal missing term.',adaptation:'Fresh constant-step trails, with an explicit rule and an internal gap.'},
 {parameter:'p2-unit-ribbons',url:'https://sgexam.com/subject/maths/2025-p2-maths-quiz-4_5_6-henry-park-pdf/',pdfPage:6,question:'11',observed:'Order four unit fractions.',adaptation:'Choose the greatest or smallest unit fraction using equally long ribbon diagrams.'},
 {parameter:'p3-juice-left',url:'https://sgexam.com/subject/maths/2025-p3-maths-end-of-year-exam-raffles-girls-pdf/',pdfPage:5,question:'9',observed:'Subtract the volume poured into several equal glasses from an initial supply.',adaptation:'Fresh quantities and a litres-to-millilitres conversion before equal pours.'},
 {parameter:'p4-path-area',url:'https://sgexam.com/subject/maths/2025-p4-maths-end-of-year-exam-acs-primary-pdf/',pdfPage:23,question:'38',observed:'A uniform path lies inside the boundary of a rectangular plot.',adaptation:'Fresh dimensions, four-sided width labels and explicit inside-boundary context.'},
 {parameter:'p5-giftbags',url:'https://sgexam.com/subject/maths/2025-p5-maths-end-of-year-exam-acs-junior-pdf/',pdfPage:22,question:'4',observed:'Pack two types of stationery into identical bags, using common factors.',adaptation:'Fresh item totals; find the largest number of identical bags with every item used. Explicit P4 common-factor prerequisite review.'},
 {parameter:'p6-equilateral-line',url:'https://sgexam.com/subject/maths/2026-p6-maths-prelim-exam-acs-junior-pdf/',pdfPage:25,question:'6',observed:'Reason about a composite arrangement containing equilateral triangles.',adaptation:'A fresh, simpler equilateral triangle on a straight line; retain honest P5 prerequisite skill references.'},
] as const;

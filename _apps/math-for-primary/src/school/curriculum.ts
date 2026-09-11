import {ACTIVITIES} from '../primary/catalog';
/** Versioned, paraphrased objective map. Page numbers refer to printed syllabus pages.
 * Prerequisites are this application's instructional choices, not MOE-prescribed edges.
 * A mapped objective does not imply that an interactive lesson has been implemented.
 */
export const CURRICULUM = {
 id: 'moe-2021-oct2025', title: 'Singapore Primary Mathematics', revision: 'October 2025',
 source: 'https://www.moe.gov.sg/api/media/92bff26d-b2b4-4535-b868-b8415c744b91/2021-Primary-Mathematics-Syllabus-P1-to-P6-Updated-October-2025.pdf',
 appliesFrom: 2026, graphVersion: 'instructional-1',
};
export type Track = 'standard' | 'foundation';
export type Strand = 'Number & Algebra' | 'Measurement & Geometry' | 'Statistics';
export interface CurriculumSkill {
 id:string; version:string; level:number; track:Track; strand:Strand; topic:string; subtopic:string;
 title:string; objective:string; prerequisites:string[]; sourcePage:number; lessonIds:string[]; activityIds:string[];
 status:'available'|'mapped'; representations:string[]; vocabulary:string[];
}
type Row = [number,Track,Strand,string,string,number,string];
const N:Strand='Number & Algebra',G:Strand='Measurement & Geometry',S:Strand='Statistics';
const rows:Row[] = [
[1,'standard',N,'WN','Whole numbers',31,'Count and represent numbers to 100|Use tens and ones|Read and write number names to 100|Compare and order numbers to 100|Continue number patterns|Use ordinal numbers from first to tenth'],
[1,'standard',N,'AS','Addition and subtraction',31,'Add by combining two sets|Subtract by taking away|Connect addition and subtraction with number bonds|Use +, − and = correctly|Add and subtract within 100|Add three one-digit numbers|Recall addition and subtraction facts within 20|Add or subtract ones and tens mentally without regrouping'],
[1,'standard',N,'MD','Multiplication and division',31,'Recognise equal groups and multiplication within 40|Share or group equally within 20'],
[1,'standard',N,'MONEY','Money',31,'Count cents up to one dollar|Count dollars up to 100 dollars'],
[1,'standard',G,'LENGTH','Length',32,'Measure and compare lengths in centimetres|Draw a line to the nearest centimetre'],
[1,'standard',G,'TIME','Time',32,'Read clocks to five minutes using am and pm|Relate hours and minutes|Find durations of one hour or half an hour'],
[1,'standard',G,'SHAPE','Two-dimensional shapes',32,'Recognise rectangles squares triangles circles half-circles and quarter-circles|Compose and decompose shapes|Copy figures on dot or square grids'],
[1,'standard',S,'GRAPH','Picture graphs',32,'Read and interpret picture graphs with one object per symbol'],
[2,'standard',N,'WN','Whole numbers',33,'Count and represent numbers to 1000|Use hundreds tens and ones|Read and write number names to 1000|Compare and order numbers to 1000|Continue number patterns|Recognise odd and even numbers'],
[2,'standard',N,'AS','Addition and subtraction',33,'Add and subtract numbers up to three digits|Mentally add or subtract ones tens and hundreds from three-digit numbers'],
[2,'standard',N,'MD','Multiplication and division',33,'Use the 2 3 4 5 and 10 multiplication tables|Connect multiplication with division|Use the division symbol|Recall related multiplication and division facts'],
[2,'standard',N,'FRAC','Fractions',33,'Represent a fraction as part of a whole|Read and write fraction notation|Compare unit fractions with denominators up to 12|Compare like fractions with denominators up to 12|Add and subtract like fractions within one whole'],
[2,'standard',N,'MONEY','Money',33,'Write dollars and cents using decimal notation|Compare amounts of money|Convert between dollars and cents'],
[2,'standard',G,'MEASURE','Length mass and volume',34,'Measure and compare length in metres|Measure and compare mass in grams and kilograms|Measure and compare liquid volume in litres|Choose suitable measurement units'],
[2,'standard',G,'TIME','Time',34,'Read clocks to the minute|Convert between hours and minutes'],
[2,'standard',G,'SHAPE','Shapes and patterns',34,'Continue patterns using size shape colour and orientation|Recognise cubes cuboids cones cylinders and spheres'],
[2,'standard',S,'GRAPH','Picture graphs',34,'Read picture graphs where one symbol represents several objects'],
[3,'standard',N,'WN','Whole numbers',35,'Represent numbers to 10000 using place value|Read and write numbers to 10000|Compare order and continue patterns to 10000'],
[3,'standard',N,'AS','Addition and subtraction',35,'Add and subtract up to four-digit numbers|Mentally add and subtract two-digit numbers'],
[3,'standard',N,'MD','Multiplication and division',35,'Recall the 6 7 8 and 9 multiplication tables|Interpret remainders|Multiply up to three digits by one digit|Divide up to three digits by one digit'],
[3,'standard',N,'FRAC','Equivalent fractions',35,'Generate equivalent fractions|Simplify fractions|Compare unlike fractions with denominators up to 12|Find a missing numerator or denominator|Add and subtract related fractions within one whole'],
[3,'standard',N,'MONEY','Money',35,'Add and subtract money in decimal notation'],
[3,'standard',G,'MEASURE','Length mass and volume',36,'Measure length in kilometres and liquid volume in millilitres|Use compound measurement units|Convert km and m; m and cm; kg and g; litres and ml'],
[3,'standard',G,'TIME','Time',36,'Use seconds as a unit of time|Find start times finish times and durations|Read and use the 24-hour clock'],
[3,'standard',G,'AREA','Area and perimeter',36,'Measure area in square units cm² and m²|Find perimeters of rectilinear figures|Find areas of rectangles and squares'],
[3,'standard',G,'ANGLE','Angles',36,'Identify right angles|Compare angles with a right angle'],
[3,'standard',G,'LINES','Perpendicular and parallel lines',36,'Recognise perpendicular and parallel lines|Draw perpendicular and parallel lines'],
[3,'standard',S,'GRAPH','Bar graphs',36,'Read and interpret bar graphs with different scales'],
[4,'standard',N,'WN','Whole numbers',37,'Represent and compare numbers to 100000|Round to the nearest 10 100 and 1000|Estimate and check calculations'],
[4,'standard',N,'FACT','Factors and multiples',37,'Find factors of numbers up to 100|Find common factors of two numbers|Find multiples and common multiples of one-digit numbers'],
[4,'standard',N,'MD','Multiplication and division',37,'Multiply up to four digits by one digit|Multiply up to three digits by two digits|Divide up to four digits by one digit'],
[4,'standard',N,'FRAC','Fractions',37,'Represent mixed numbers and improper fractions|Convert between mixed numbers and improper fractions|Find a fraction of a set|Add and subtract fractions with denominators up to 12 using at most two different denominators'],
[4,'standard',N,'DEC','Decimals',38,'Use decimal place value to three decimal places|Compare and order decimals|Convert fractions to decimals when the denominator is a factor of 10 or 100|Round decimals to a whole number one or two decimal places|Add and subtract decimals up to two decimal places|Multiply and divide two-place decimals by one-digit numbers|Divide whole numbers with a decimal quotient and round the result'],
[4,'standard',G,'AREA','Area and perimeter',39,'Find missing rectangle or square dimensions from area or perimeter|Find areas and perimeters of composite rectilinear figures'],
[4,'standard',G,'ANGLE','Angles',39,'Use angle notation|Measure angles with a protractor|Draw angles'],
[4,'standard',G,'SHAPE','Rectangles and squares',39,'Use rectangle and square properties excluding diagonals|Draw rectangles and squares'],
[4,'standard',G,'SYM','Line symmetry',39,'Identify lines of symmetry|Complete symmetric figures on a grid'],
[4,'standard',G,'SOLID','Three-dimensional shapes',40,'Represent cubes cuboids cones cylinders prisms and pyramids|Draw cubes cuboids prisms and pyramids|Recognise nets of cubes cuboids prisms and pyramids'],
[4,'standard',S,'GRAPH','Tables and graphs',40,'Read and interpret tables|Read and interpret line graphs|Read and interpret pie charts'],
[5,'standard',N,'WN','Whole numbers',41,'Read and write numbers to 10 million|Multiply and divide by 10 100 1000 and their multiples|Use the order of operations and brackets without a calculator'],
[5,'standard',N,'FRAC','Fractions',41,'Interpret a fraction as division|Express a whole-number division as a fraction|Convert fractions to decimals|Add and subtract mixed numbers|Multiply proper and improper fractions by whole numbers|Multiply fractions by fractions|Multiply mixed numbers by whole numbers'],
[5,'standard',N,'DEC','Decimals',41,'Multiply and divide three-place decimals by powers and multiples of 10|Convert measurements using decimals'],
[5,'standard',N,'PCT','Percentage',41,'Relate percentages to parts out of 100|Convert between percentages fractions and decimals|Find a percentage of a quantity|Solve discount GST and annual-interest problems'],
[5,'standard',N,'RATE','Rate',41,'Interpret an amount per unit|Solve problems involving rate total amount and number of units'],
[5,'standard',G,'AREA','Area of triangles',42,'Identify a triangle base and perpendicular height|Find the area of a triangle|Find areas of composite rectangles squares and triangles'],
[5,'standard',G,'VOL','Volume',42,'Measure volume with unit cubes and cm³ or m³|Draw cubes and cuboids on isometric grids|Find volumes of cubes and cuboids|Find liquid volume in rectangular tanks|Convert between litres millilitres and cm³'],
[5,'standard',G,'ANGLE','Angles',42,'Use angles on a straight line|Use angles around a point|Use vertically opposite angles|Find unknown angles'],
[5,'standard',G,'SHAPE','Triangles and quadrilaterals',42,'Recognise triangle types and use the angle sum of a triangle|Use parallelogram rhombus and trapezium properties|Find unknown angles without adding lines'],
[6,'standard',N,'FRAC','Fraction division',43,'Divide a proper fraction by a whole number|Divide a whole number or proper fraction by a proper fraction without a calculator'],
[6,'standard',N,'PCT','Percentage',43,'Find an original quantity from a percentage|Find percentage increase and decrease'],
[6,'standard',N,'RATIO','Ratio',43,'Interpret ratios of two or three quantities using whole numbers|Find equivalent ratios and simplify ratios|Divide a quantity in a given ratio|Find a missing term in a ratio|Connect ratios and fractions'],
[6,'standard',N,'ALG','Algebra',43,'Use a letter for an unknown number|Form simple expressions involving an unknown|Simplify linear expressions without brackets|Substitute values into expressions|Solve linear equations with whole-number coefficients'],
[6,'standard',G,'CIRCLE','Circles',44,'Find circumference and area of a circle|Find areas and perimeters of semicircles and quarter-circles|Solve composite-circle area and perimeter problems'],
[6,'standard',G,'VOL','Volume',44,'Find unknown dimensions of a cube or cuboid|Relate volume base area and height|Use square and cube roots to recover dimensions'],
[6,'standard',G,'SHAPE','Angles in geometric figures',44,'Find angles in composite figures using special quadrilateral properties without adding lines'],
[6,'standard',S,'AVG','Average',44,'Interpret average as total divided by number of items|Recover a total or number of items from an average'],
[5,'foundation',N,'WN','Whole numbers',45,'Read and write numbers to 10 million|Compare order and continue patterns within 100000|Round to the nearest 10 100 and 1000'],
[5,'foundation',N,'AS','Addition and subtraction',45,'Add and subtract up to three-digit numbers without a calculator|Mentally add and subtract ones tens and hundreds'],
[5,'foundation',N,'MD','Multiplication and division',45,'Multiply and divide up to two digits by one digit without a calculator|Multiply and divide by 10 100 and 1000 without a calculator|Use the order of operations and brackets|Recall multiplication and division facts'],
[5,'foundation',N,'FACT','Factors and multiples',45,'Find factors and common factors of numbers up to 100|Find multiples and common multiples of one-digit numbers'],
[5,'foundation',N,'FRAC','Fractions',46,'Represent fractions of a whole or set|Generate equivalent fractions and simplify|Compare fractions with denominators up to 12|Convert between mixed numbers and improper fractions|Add and subtract fractions with denominators up to 12 without a calculator|Add and subtract mixed numbers|Multiply a proper or improper fraction by a whole number|Multiply a proper fraction by a proper or improper fraction'],
[5,'foundation',N,'DEC','Decimals',46,'Use decimal place value up to three places|Compare and order decimals|Convert fractions whose denominator is a factor of 10 or 100 to decimals|Round decimals|Add and subtract two-place decimals without a calculator|Multiply and divide three-place decimals by 10 100 and 1000 without a calculator|Convert measurement units using decimals'],
[5,'foundation',N,'RATE','Rate',47,'Interpret amount per unit|Solve rate total-amount and number-of-units problems'],
[5,'foundation',G,'TIME','Time',47,'Use hours and minutes|Find start times finish times and durations|Use the 24-hour clock'],
[5,'foundation',G,'AREA','Area and perimeter',47,'Find rectangle and square areas and perimeters|Find missing dimensions|Find areas and perimeters of composite rectilinear figures'],
[5,'foundation',G,'VOL','Volume',47,'Measure volume using unit cubes cm³ and m³|Represent cubes and cuboids on isometric grids'],
[5,'foundation',G,'LINES','Perpendicular and parallel lines',47,'Identify and draw perpendicular and parallel lines'],
[5,'foundation',G,'ANGLE','Angles',48,'Use angle notation and a protractor|Draw angles|Use straight-line around-a-point and vertically opposite angle facts|Find unknown angles'],
[5,'foundation',G,'SHAPE','Rectangles and squares',48,'Use rectangle and square properties excluding diagonals'],
[5,'foundation',S,'GRAPH','Tables and graphs',48,'Read tables|Read bar graphs|Read line graphs'],
[6,'foundation',N,'FRAC','Fractions',49,'Interpret fractions as division|Express whole-number division as a fraction|Convert fractions to decimals|Divide a proper fraction by a whole number|Divide a whole number or proper fraction by a proper fraction'],
[6,'foundation',N,'DEC','Decimals',49,'Multiply and divide decimals|Calculate a decimal quotient of whole numbers without a calculator|Round a calculated answer to the required accuracy'],
[6,'foundation',N,'PCT','Percentage',49,'Interpret percentages as parts out of 100|Find a percentage of a quantity|Solve discount GST and annual-interest problems'],
[6,'foundation',G,'AREA','Area of triangles',50,'Identify a triangle base and perpendicular height|Find the area of a triangle|Find areas and perimeters of composite figures with rectangles squares and triangles'],
[6,'foundation',G,'VOL','Volume',50,'Find volumes of cubes and cuboids|Find liquid volume in rectangular tanks|Convert between litres millilitres and cm³'],
[6,'foundation',G,'SHAPE','Angles in geometric figures',50,'Use rectangle square and triangle properties|Use the angle sum of a triangle|Find angles in composite figures without adding lines'],
[6,'foundation',S,'GRAPH','Pie charts',50,'Read and interpret pie charts'],
[6,'foundation',S,'AVG','Average',50,'Use average total and number-of-items relationships'],
];
const lessonLinks:Record<string,string[]>={
 'P1.S.AS.01':['add-5','add-10','stories-add'],
 'P1.S.AS.02':['sub-5','sub-10','stories-sub','compare'],
 'P1.S.AS.03':['bonds','missing-add-first','missing-add-second','missing-sub-first','missing-sub-second'],
 'P1.S.AS.04':['equality','stories-choose','stories-build','mixed'],
};
const topicNeeds:Record<string,string[]>={AS:['WN'],MD:['AS'],FRAC:['MD'],DEC:['FRAC'],PCT:['FRAC','DEC'],RATIO:['FRAC'],ALG:['AS'],AREA:['LENGTH'],CIRCLE:['AREA'],VOL:['AREA'],AVG:['AS','MD']};
export const CURRICULUM_SKILLS:CurriculumSkill[]=rows.flatMap(([level,track,strand,code,topic,page,objectives])=>objectives.split('|').map((title,i)=>{
 const id=`P${level}.${track==='standard'?'S':'F'}.${code}.${String(i+1).padStart(2,'0')}`;
 return {id,version:CURRICULUM.id,level,track,strand,topic,subtopic:code,title,objective:title,prerequisites:[],sourcePage:page,lessonIds:lessonLinks[id]||[],activityIds:[],status:lessonLinks[id]?'available':'mapped',representations:strand===N?['concrete objects','diagrams','symbols']:strand===S?['tables','graphs']:['physical models','diagrams'],vocabulary:topic.toLowerCase().split(/ and | of /)} as CurriculumSkill;
}));
for(const [index,skill] of CURRICULUM_SKILLS.entries()){
 const earlier=CURRICULUM_SKILLS.slice(0,index).filter(s=>s.id!==skill.id&&(s.level<skill.level||(s.level===skill.level&&s.track===skill.track))&&(s.track===skill.track||(skill.track==='foundation'&&s.level<=4)));
 const previous=earlier.filter(s=>s.subtopic===skill.subtopic).at(-1);
 if(previous)skill.prerequisites.push(previous.id);
 else for(const need of topicNeeds[skill.subtopic]||[]){const p=earlier.filter(s=>s.subtopic===need).at(-1);if(p)skill.prerequisites.push(p.id);}
}
for(const skill of CURRICULUM_SKILLS){skill.activityIds=ACTIVITIES.filter(a=>a.skillIds.includes(skill.id)).map(a=>a.id);if(skill.activityIds.length)skill.status='available';}
export function curriculumPath(level:number,track:Track){return CURRICULUM_SKILLS.filter(s=>s.level===level&&s.track===(level<5?'standard':track));}

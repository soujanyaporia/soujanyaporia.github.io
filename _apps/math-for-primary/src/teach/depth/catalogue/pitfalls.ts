import type {PlanEntry} from '../../build/plan';

/**
 * The mistake this particular objective provokes, named and corrected. Adult guides print it as
 * “Name. Correction”, so the name is the error as a teacher would recognise it and the correction
 * carries a worked instance rather than a slogan. Objectives are matched before their topic, and a
 * topic's own entry is the last resort; `sequence.ts` keeps the family text if nothing matches.
 */
export interface Pitfall {name:string;fix:string}
const P=(name:string,fix:string):Pitfall=>({name,fix});
type Rule=[RegExp,Pitfall];

const WN:Rule[]=[
 [/ordinal/,P('Counting from the wrong end','Position depends on the end we count from. The same child is third from the front and eighth from the back of ten, so the question must say which end.')],
 [/odd|even/,P('Judging by size','Only the ones digit decides. 274 looks large but pairs exactly, so it is even; 13 is small and leaves one over, so it is odd.')],
 [/round|estimate/,P('Reading every following digit','Only the digit in the next smaller place decides. Rounding 2449 to the nearest hundred looks at the 4 tens, so it gives 2400, not 2500.')],
 [/pattern/,P('Testing one gap only','A rule must fit every neighbouring pair. 2, 4, 8 could add 2 then 4, or double; check a third term before deciding.')],
 [/compare|order/,P('Longer looks larger','Compare the greatest place first, not the number of digits on the page. 0 thousands beats nothing: 998 is less than 1002 because the thousands differ.')],
 [/number names|read and write/,P('Writing what you hear','“Three thousand and five” is 3005, not 30005. Each group of three digits needs its empty places filled with zeros.')],
 [/multiply and divide by/,P('Adding a zero','Multiplying by 10 moves every digit one place left; it does not append a character. 2.5 × 10 is 25, not 2.50.')],
 [/order of operations|brackets/,P('Working strictly left to right','Grouping decides what is formed first. In 5 + 8 × 6 the eight sixes are formed before the five is added, giving 53, not 78.')],
 [/count and represent|represent numbers/,P('Counting the marks, not the groups','One ten-rod stands for ten ones. A picture of 2 rods and 6 singles shows 26, not 8 objects.')],
 [/tens and ones|hundreds/,P('The digit is the value','A digit counts units of its own column. The 5 in 52 represents 5 tens, which is 50, not 5.')],
];
const AS:Rule[]=[
 [/combining/,P('Counting the first set again','The first group is already counted. Hold 8 in mind and count on 5 more, rather than starting from one.')],
 [/taking away/,P('Counting the removed group','The crossed counters have left. The answer is the group that stays, so 12 − 4 is the 8 remaining, not the 4 taken.')],
 [/number bond/,P('A part as large as the whole','The two parts must together make the whole. For a whole of 8, parts of 5 and 3 work; 8 and 5 do not.')],
 [/symbol|correctly/,P('“=” means an answer follows','The equals sign says the two sides have equal value. 3 + 2 = 5 and 5 = 3 + 2 are both correct, and 7 = 7 is a complete statement.')],
 [/three one-digit/,P('Stopping after two numbers','Every group must be counted once. In 4 + 6 + 2, pairing 4 and 6 to make ten is a useful start, but the 2 still has to be added.')],
 [/recall|facts within/,P('Counting from one every time','Known facts should be recalled, not rebuilt. Using 8 + 2 = 10 to reach 8 + 5 is faster and less error-prone than counting five steps.')],
 [/mental/,P('Changing the wrong column','Adding tens changes the tens digit only. 523 + 30 is 553; the hundreds and ones stay as they are.')],
 [/within 100|three digits|four-digit|three-digit/,P('Losing the exchange','Ten ones become one ten, which must be recorded in the next column. In 52 − 27 the ones need an exchange, so the answer is 25, not 35 from taking 2 from 7.')],
];
const MD:Rule[]=[
 [/equal groups/,P('Groups that are not equal','Multiplication counts equal groups only. Four plates holding 3, 3, 2 and 3 cannot be read as 4 × 3.')],
 [/share or group/,P('Sharing until it looks fair','Equal sharing ends when no counter is left that everyone can receive. Thirteen between two gives six each with one over, not “about six”.')],
 [/connect multiplication/,P('Reversing the whole and a part','Division starts from the whole. 12 ÷ 3 = 4 asks how many threes are in twelve; 3 ÷ 12 asks something quite different.')],
 [/division symbol/,P('Reading the symbol backwards','The number being shared is written first. “Share 20 among 5” is 20 ÷ 5, not 5 ÷ 20.')],
 [/remainder/,P('Ignoring what is left over','The situation decides what to do with the remainder. If 23 pupils need boats holding 4, the answer is 6 boats, because the 3 left still need one.')],
 [/table|related|recall/,P('Learning each fact separately','One array gives four facts. 6 × 7 = 42 also tells us 7 × 6 = 42, 42 ÷ 6 = 7 and 42 ÷ 7 = 6.')],
 [/multiply up to|multiply and divide up to/,P('Forgetting to carry into the next place','Each place is multiplied, and anything over nine moves on. 570 × 3 is 1710: the 21 tens become 1 hundred and 1 ten.')],
 [/divide up to/,P('Dropping a zero in the answer','Every place of the dividend produces a digit. 618 ÷ 6 is 103, not 13, because the tens place gives a zero.')],
 [/three digits by two digits/,P('Forgetting the second row’s place','The tens digit multiplies into tens. For 402 × 67, the 6 contributes 60 × 402, so its partial product ends in a zero.')],
 [/10, 100|powers|multiples/,P('Adding a zero','Multiplying by 10 moves every digit one place left. 4.3 × 10 is 43, and 200 ÷ 100 is 2 rather than “200 with zeros removed”.')],
 [/order of operations|brackets/,P('Working strictly left to right','Multiplication and division are carried out before addition and subtraction, and brackets before everything.')],
];
const FRAC:Rule[]=[
 [/unit fraction/,P('A bigger denominator means a bigger fraction','More parts means smaller parts. One eighth is less than one third, because the whole is cut into more pieces.')],
 [/notation/,P('Reading the two numbers the wrong way round','The lower number counts all the equal parts of the whole; the upper number counts the chosen parts. Two of five parts is 2/5.')],
 [/part of a whole|represent a fraction|fractions of a whole/,P('Parts that are not equal','A fraction needs equal-sized parts. Three pieces of a strip only show thirds when the three pieces match exactly.')],
 [/equivalent|missing numerator|simplif|rename/,P('Adding instead of multiplying','Both numbers are multiplied or divided by the same amount. 1/2 = 4/8 because both were multiplied by 4; adding 3 to each would give 4/5, a different amount.')],
 [/compare like|compare fractions|compare unlike/,P('Comparing the denominators','With the same whole, compare the numbers of equal parts. 3/5 is greater than 2/5; for unlike fractions, rename them to the same denominator first.')],
 [/add and subtract like|add and subtract related|denominators up to 12/,P('Adding the denominators too','The denominator names the size of the piece and does not change. 2/5 + 1/5 = 3/5, not 3/10.')],
 [/mixed numbers and improper|convert between mixed/,P('Losing the whole number','Each whole contains a full set of parts. 2 1/4 is 9/4, because the two wholes are 8 quarters before the extra quarter is added.')],
 [/add and subtract mixed/,P('Taking the smaller fraction from the larger','The order in the question stands. For 3 1/4 − 1 3/4, exchange one whole into quarters rather than working out 3/4 − 1/4.')],
 [/fraction of a set/,P('Dividing by the numerator','Divide by the denominator to find one part, then take as many as the numerator asks. 2/3 of 12 is 12 ÷ 3 × 2 = 8.')],
 [/fraction as division|whole-number division as a fraction|fractions as division|express whole-number/,P('Dividing the wrong way round','The numerator is shared. 3/4 means 3 ÷ 4, so three pizzas shared among four children give 3/4 each.')],
 [/to decimals/,P('Reading the fraction as digits','A fraction is a division, not a pair of digits. 1/4 is 0.25, not 0.14.')],
 [/multiply.*fraction by a whole|multiply proper and improper|multiply mixed/,P('Multiplying the denominator as well','Only the number of parts grows. 3 × 2/5 = 6/5, because the fifths stay fifths.')],
 [/multiply.*fraction by.*fraction|multiply fractions by fractions/,P('Expecting a larger answer','Taking a fraction of a fraction gives less than either one. 1/2 × 3/4 = 3/8, which is smaller than 3/4.')],
 [/divide a proper fraction by a whole/,P('Dividing both numbers','Sharing a fraction makes the pieces smaller. 1/2 ÷ 3 = 1/6, because each half is split into three.')],
 [/divide a whole number or proper fraction/,P('Expecting a smaller answer','Dividing by a number below one gives more, not fewer. 2 ÷ 1/4 = 8, because eight quarters fit into two wholes.')],
];
const DEC:Rule[]=[
 [/place value/,P('More digits means a larger number','Compare place by place from the left. 0.4 is greater than 0.35, because 4 tenths beats 3 tenths.')],
 [/compare and order/,P('More digits means a larger number','Line up the decimal points and compare tenths first. 0.5 is greater than 0.47, and 0.4 equals 0.40.')],
 [/round/,P('Rounding one digit at a time','Round once, from the digit in the next smaller place. 2.449 to one decimal place is 2.4; rounding the 9, then the 4, would wrongly give 2.5.')],
 [/add and subtract/,P('Lining up the right-hand ends','Align the decimal points, not the last digits. 5.4 + 3.47 is 8.87: the 4 is 4 tenths and must sit above the 4 tenths.')],
 [/express decimals as fractions/,P('Using the wrong denominator','The last digit names the denominator. 0.07 is 7/100, while 0.7 is 7/10.')],
 [/fractions to decimals|denominator is a factor|whose denominator/,P('Writing the digits of the fraction','Make an equivalent fraction in tenths or hundredths first. 3/4 = 75/100 = 0.75, not 0.34.')],
 [/by powers|10, 100|multiples of 10/,P('Adding or deleting a zero','Each digit moves place. 6.7 × 10 = 67, and 4.2 ÷ 100 = 0.042, where a zero must hold the empty tenths place.')],
 [/measurement/,P('Using one multiplier for every unit','The pairs differ: 100 cm make a metre but 1000 g make a kilogram. So 1 kg 250 g is 1.25 kg, while 3 m 45 cm is 3.45 m.')],
 [/quotient|required accuracy/,P('Rounding partway through','Work to one more place than the answer needs, then round once at the end. 2 ÷ 3 is 0.666…, which is 0.67 to two decimal places.')],
 [/multiply and divide/,P('Losing the decimal point','Place the point by the size of the answer. 0.8 × 3 is 2.4, close to 3 lots of 1, not 24.')],
];
const MONEY:Rule[]=[
 [/decimal notation|write dollars/,P('A single digit after the point','The two places after the point are cents. $5.70 is five dollars and seventy cents; $5.7 should be written $5.70.')],
 [/compare/,P('More digits means more money','Compare dollars first, then cents. $6.18 is more than $4.02, and $0.60 is more than $0.55.')],
 [/convert/,P('Using ten instead of a hundred','One dollar is 100 cents. 207 cents is $2.07, not $20.70.')],
 [/count amounts|count cents|count dollars/,P('Counting coins instead of values','Each coin carries its own value. Four coins can be 70 cents when they are 50, 10, 5 and 5.')],
 [/add and subtract/,P('Lining up the digits, not the points','Align the decimal points before calculating. $6.47 − $1.89 is $4.58.')],
];
const PCT:Rule[]=[
 [/relate|parts out of 100|interpret/,P('Reading a percentage as a count','A percentage is a share of a whole, not a number of objects. 30% of 80 pencils is 24 pencils, not 30.')],
 [/convert/,P('Moving the point the wrong way','Per cent means out of a hundred. 25% is 25/100, which is 0.25, not 2.5.')],
 [/original quantity/,P('Taking the same percentage of the part','Work back to the whole. If 25% is 15, the whole is 15 × 4 = 60; taking 25% of 15 gives 3.75, which answers a different question.')],
 [/increase and decrease/,P('Comparing with the new amount','A change is compared with the original amount. From 40 to 36 is a 10% decrease, because 4 is compared with 40.')],
 [/discount|gst|interest/,P('Using the wrong whole','Each percentage applies to a stated amount: a discount to the usual price, GST to the price before tax, interest to the amount at the start of the year.')],
 [/percentage of a quantity/,P('Treating the percentage as the answer','Find one part of a hundred first. 30% of 90 is 27, because one per cent is 0.9.')],
];
const TIME:Rule[]=[
 [/relate hours|convert between hours|use hours and minutes/,P('The hundred-minute hour','An hour holds 60 minutes. 77 minutes is 1 h 17 min, not 1 h 77 min or 1.77 hours.')],
 [/seconds/,P('The hundred-second minute','A minute holds 60 seconds, so 1 min 15 s is 75 s.')],
 [/24-hour/,P('Adding twelve to every time','Only afternoon and evening hours change. 9:15 am is 09:15, while 4:09 pm is 16:09.')],
 [/start times|duration/,P('Writing a time past sixty','Count on to the next hour, then add what is left. 9:45 plus 30 minutes is 10:15, never 9:75.')],
 [/read clocks/,P('Reading the hour the hand is nearest','The hour is the number the short hand has passed. At 3:50 the short hand is close to 4, but the time is ten to four, not 4:50.')],
];
const MEASURE:Rule[]=[
 [/choose suitable/,P('Choosing by the size of the number','Choose the unit by the size of the object. A pencil is about 12 cm; 12 m would be longer than a classroom.')],
 [/convert|compound/,P('One multiplier for every unit','The pairs differ: 100 cm in a metre, 1000 m in a kilometre, 1000 g in a kilogram, 1000 ml in a litre. 2 m 30 cm is 230 cm, and 1 km 50 m is 1050 m.')],
 [/measure and compare/,P('Comparing numbers across different units','Change both amounts to the same unit before comparing. 700 g is less than 1 kg, although 700 is the larger number.')],
 [/measure length in|draw a line|centimetres/,P('Starting at the end of the ruler','Measurement starts at the zero mark, not the edge. Reading from 1 cm makes every length one centimetre too long.')],
];
const AREA:Rule[]=[
 [/measure area/,P('Counting the boundary','Area counts the squares covering the inside; the squares around the edge are the perimeter’s business.')],
 [/perimeter of rectilinear/,P('Adding only the labelled sides','Every side counts, including the ones to be worked out from the others.')],
 [/missing/,P('Halving the perimeter gives the length','Half the perimeter is one length plus one width. With perimeter 22 cm and width 6 cm, the length is 11 − 6 = 5 cm.')],
 [/base and perpendicular height|perpendicular/,P('Using a slanting side as the height','The height meets the base at a right angle. The sloping side is longer and gives too large an area.')],
 [/area of a triangle/,P('Forgetting to halve','Two matching triangles fill the rectangle. With base 8 cm and height 7 cm the area is 56 ÷ 2 = 28 cm².')],
 [/composite/,P('Using the outside measurements only','Split the figure into parts, find each part, then combine. A missing side is found from the sides facing it.')],
 [/area|perimeter/,P('Adding the two sides','Area multiplies the sides; perimeter adds them. A 5 cm by 3 cm rectangle has area 15 cm² and perimeter 16 cm.')],
];
const VOL:Rule[]=[
 [/unit cubes|measure volume/,P('Counting only the cubes on show','Hidden cubes fill the solid too. Count one layer, then multiply by the number of layers.')],
 [/liquid volume/,P('Using the tank’s height','The water’s depth gives its volume, not the height of the container.')],
 [/convert/,P('A hundred millilitres in a litre','A litre holds 1000 ml, and 1 ml fills 1 cm³. So 2.6 litres is 2600 cm³.')],
 [/unknown dimension|base area|roots/,P('Dividing by one edge only','Volume is the product of three lengths. With volume 60 cm³ on a 5 cm by 4 cm base, the height is 60 ÷ 20 = 3 cm.')],
 [/isometric|draw|represent/,P('Drawing what the front looks like','An isometric drawing keeps the depth visible, so each edge length can still be counted.')],
 [/volumes of cubes/,P('Adding the three edges','Volume multiplies length, breadth and height. A 2 cm by 5 cm by 3 cm cuboid holds 30 cm³, not 10 cm³.')],
];
const ANGLE:Rule[]=[
 [/right angle/,P('A tilted corner is not a right angle','A right angle stays a right angle when the figure is turned. Compare it with the corner of a page in the same position.')],
 [/notation/,P('Naming the angle by the wrong letter','The middle letter is the vertex. ∠ABC is the angle at B, between the arms BA and BC.')],
 [/protractor|measure angles/,P('Reading the wrong scale','Start from the zero lying on one arm and read round from there. An angle just under a square corner reads 80°, not 100°.')],
 [/straight line/,P('Any two angles make a straight line','Angles on a straight line total 180°, so the partner of 60° is 120°.')],
 [/around a point/,P('Stopping at a straight line','A full turn is 360°. Three angles about a point of 150° and 100° leave 110°.')],
 [/vertically opposite/,P('Opposite angles add to 180°','Vertically opposite angles are equal. Where lines cross, the angle opposite 40° is also 40°; it is the neighbouring angle that makes 180°.')],
 [/unknown|draw angles/,P('Measuring the drawing','Diagrams are not drawn to scale. Use the stated angles and the angle facts rather than a protractor on the picture.')],
];
const SHAPE:Rule[]=[
 [/recognise rectangles|half-circles/,P('A turned shape gets a new name','Turning a shape does not change what it is. A square resting on a corner is still a square.')],
 [/compose|decompose/,P('Leaving gaps or overlaps','Shapes fit together only when they cover the space exactly, without overlapping.')],
 [/copy figures/,P('Copying the look, not the steps','Count the grid squares between points. A copy matches when every step across and up matches.')],
 [/continue patterns/,P('Following one attribute only','A pattern can repeat in size, shape, colour and orientation at once. Check every attribute before continuing it.')],
 [/cubes, cuboids, cones/,P('Naming a solid from one face','A solid is named by all its faces. A square face may belong to a cube or to a cuboid.')],
 [/rectangle and square properties|draw rectangles/,P('A square is not a rectangle','A square is a rectangle whose sides are all equal. Both have four right angles and opposite sides equal.')],
 [/angle sum|triangle types/,P('The angle sum grows with the triangle','The three angles of any triangle total 180°, whatever its size. With 50° and 60°, the third is 70°.')],
 [/parallelogram|rhombus|trapezium/,P('Every quadrilateral behaves alike','Each has its own properties. In a parallelogram opposite angles are equal and neighbouring angles total 180°; a trapezium needs only one pair of parallel sides.')],
 [/rectangle, square and triangle/,P('Reading equal-looking sides as equal','Only marked or stated equalities count. An isosceles triangle’s two base angles are equal because its two sides are, not because they look alike.')],
 [/composite|without adding lines/,P('Measuring the diagram','Diagrams are not to scale. Use the marked lengths, equal sides and known angle facts.')],
];
const GRAPH:Rule[]=[
 [/one object per symbol/,P('Counting pictures instead of reading the key','Each symbol stands for the number the key states. Five symbols worth two each show ten.')],
 [/several/,P('Ignoring the key','Multiply the symbols by the key’s value, and read a part symbol as part of that value.')],
 [/bar graphs/,P('Reading the bar as its count','Read the height against the scale. On a scale of 5, a bar of seven blocks shows 35.')],
 [/line graphs/,P('Reading the slope as the value','A point’s value is read from the axis; the slope only shows how quickly it changed.')],
 [/pie charts/,P('A bigger slice always means more','A slice is a share of its own whole. Thirty per cent of 200 beats forty per cent of 100.')],
 [/complete tables/,P('Filling the gap with any value','Use the total. If four categories total 180 and three are known, the fourth is what remains.')],
 [/tables/,P('Reading the neighbouring row','Follow the row and the column to the entry they meet, and read its heading and unit.')],
];
const OTHER:Record<string,Rule[]>={
 FACT:[
  [/multiple/,P('Confusing multiples with factors','Multiples are built by multiplying, so they grow: 4, 8, 12. Factors fit exactly into the number and cannot exceed it.')],
  [/common factor/,P('Listing the factors of one number','A common factor must divide both numbers exactly. For 12 and 18 it is 1, 2, 3 or 6.')],
  [/factor/,P('Every smaller number is a factor','A factor leaves no remainder. 5 is not a factor of 12, because 12 ÷ 5 leaves 2.')],
 ],
 RATIO:[
  [/divide a quantity/,P('Dividing by one side of the ratio','Divide by the total number of units. Sharing $40 in 3 : 5 uses 8 units, so one unit is $5.')],
  [/equivalent|simplify/,P('Adding the same amount to both','Equivalent ratios multiply or divide both parts by the same number. 2 : 3 equals 4 : 6, not 3 : 4.')],
  [/missing term/,P('Using the difference between the terms','Ratios keep equal units, not equal gaps. If 2 : 3 becomes 6 : ?, each unit trebles, so the answer is 9.')],
  [/fractions/,P('Reading part-to-part as part-to-whole','In 2 : 3 the whole is five units, so the first share is 2/5 of the total, not 2/3.')],
  [/interpret/,P('Reading a ratio as a total','A ratio compares quantities in equal units; it does not state how many there are. 2 : 3 could be 4 and 6.')],
 ],
 RATE:[
  [/per unit|interpret/,P('Giving the total instead of one unit','A rate is the amount for one unit. If 8 notebooks cost $40, the rate is $5 each.')],
  [/total amount|total-amount|problems/,P('Using the total as the rate','Decide which of the three is missing. Total = rate × units, so 5 notebooks at $3 cost $15, and $15 for 5 gives $3 each.')],
 ],
 AVG:[
  [/recover/,P('Dividing a second time','Work backwards by multiplying. If the average of 4 scores is 7, the total is 28.')],
  [/interpret|total divided/,P('The average is the middle value','The average shares the total equally among the items, so it need not be one of them, and need not be the middle one.')],
  [/relationship/,P('Averaging the averages','Two averages can only be combined through their totals and their numbers of items.')],
 ],
 ALG:[
  [/letter for an unknown/,P('The letter stands for an object','A letter stands for a number. In 6 packets with x stickers each, x is how many stickers one packet holds.')],
  [/form simple expressions/,P('Writing the numbers in the order heard','“Three more than x” is x + 3, while 3x is three lots of x.')],
  [/simplify/,P('Collecting unlike terms','Only like terms combine. 2x + 6x is 8x, but 2x + 6 stays as it is.')],
  [/substitute/,P('Writing the digits side by side','A number before a letter means multiply. When x = 5, 2x is 10, so 2x + 6 is 16, not 256.')],
  [/solve/,P('Changing one side only','An equation stays true when both sides change together. From 2x + 3 = 11, take 3 from each side, then halve each side.')],
 ],
 CIRCLE:[
  [/semicircle|quarter/,P('Forgetting the straight edge','Half a circle’s perimeter is half the circumference plus the diameter; a quarter needs its two radii.')],
  [/composite/,P('Counting a hidden edge','Where shapes join, the shared edge is inside the figure and is not part of its perimeter.')],
  [/circumference and area/,P('Using the diameter in the area','Circumference uses the diameter; area uses the radius. For r = 7 cm, area is 22/7 × 7 × 7 = 154 cm².')],
 ],
 LINES:[
  [/draw/,P('Only upright lines count','Parallel and perpendicular describe a relationship, not a direction. Two slanting lines can be perpendicular.')],
  [/recognise|identify/,P('Lines that look close are parallel','Parallel lines stay exactly the same distance apart however far they are extended, and never meet.')],
 ],
 SYM:[
  [/complete/,P('Copying across instead of reflecting','Each point of a reflection sits the same distance from the mirror line, on the opposite side.')],
  [/identify/,P('Any diagonal is a line of symmetry','Folding must match the halves exactly. A rectangle’s diagonal does not, so a rectangle has two lines of symmetry, not four.')],
 ],
 SOLID:[
  [/net/,P('Any six squares fold into a cube','A net must fold without overlapping and leave no face missing. Some six-square arrangements fail both tests.')],
  [/draw|represent/,P('Drawing only the front','A solid’s drawing keeps its depth, so faces and edges hidden behind can still be counted.')],
 ],
 LENGTH:[
  [/draw a line/,P('Drawing from the ruler’s edge','Start the line at the zero mark and read the end against the scale.')],
  [/measure and compare/,P('Starting at the end of the ruler','Measurement starts at zero. Reading from the edge of the ruler makes every length too long.')],
 ],
};
const BY_CODE:Record<string,Rule[]>={WN,AS,MD,FACT:OTHER.FACT,FRAC,DEC,MONEY,PCT,TIME,MEASURE,LENGTH:OTHER.LENGTH,AREA,VOL,ANGLE,SHAPE,GRAPH,
 RATIO:OTHER.RATIO,RATE:OTHER.RATE,AVG:OTHER.AVG,ALG:OTHER.ALG,CIRCLE:OTHER.CIRCLE,LINES:OTHER.LINES,SYM:OTHER.SYM,SOLID:OTHER.SOLID};

export function pitfall(p:PlanEntry):Pitfall|undefined{
 const o=p.objective.toLowerCase();
 for(const [test,found] of BY_CODE[p.code]??[])if(test.test(o))return found;
 return undefined;
}

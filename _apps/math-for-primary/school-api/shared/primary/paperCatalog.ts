import type {Strand} from '../school/curriculum';
import {CORPUS_PATTERNS} from './corpusPaperCatalog';

/** Original question families, informed by representative Singapore school papers.
 * Skill references include explicit prerequisite review, rather than inventing current-year coverage. */
export interface PaperPattern {parameter:string;level:number;title:string;objective:string;strand:Strand;skillIds:string[];icon:string}
const N:Strand='Number & Algebra',G:Strand='Measurement & Geometry',S:Strand='Statistics';
type Row=[number,string,string,string,Strand,string[]];
const rows:Row[]=[
 [1,'count','Apple counter','Count each pictured object once.',N,['P1.S.WN.01']],
 [1,'more','Compare the picnic','Compare two pictured groups by their difference.',N,['P1.S.WN.04','P1.S.AS.02']],
 [1,'missing','Mystery fruit bag','Use a whole and one known part to find the missing part.',N,['P1.S.AS.03']],
 [1,'join','Three picnic plates','Combine three small groups in a helpful order.',N,['P1.S.AS.06']],
 [1,'left','Picnic leftovers','Match crossed-out objects to subtraction.',N,['P1.S.AS.02']],
 [1,'groups','Basket builder','Count equal groups using repeated addition.',N,['P1.S.MD.01']],
 [2,'groups','Book-bag groups','Find the total in equal groups.',N,['P2.S.MD.01']],
 [2,'share','Fair-share fruit','Share a total equally among children.',N,['P2.S.MD.02']],
 [2,'before','Before the delivery','Work backwards from equal packed groups.',N,['P2.S.MD.02','P2.S.AS.01']],
 [2,'fraction','Join the ribbon','Combine two like fractions without changing the whole.',N,['P2.S.FRAC.05']],
 [2,'shade','Colour a little more','Find the additional equal parts needed for a target fraction.',N,['P2.S.FRAC.01','P2.S.FRAC.05']],
 [2,'bottles','Water-bottle station','Use equal whole-litre bottle capacities.',G,['P2.S.MEASURE.03','P2.S.MD.02']],
 [3,'transfer','Badge swap','Track how a transfer changes both collections.',N,['P3.S.AS.01']],
 [3,'gaps','Trail-marker gaps','Count equal gaps between positions.',G,['P3.S.MD.04','P3.S.MD.03']],
 [3,'boxes','Pack the art fair','Find the fewest whole boxes that cover a shortage.',N,['P3.S.MD.02','P3.S.AS.01']],
 [3,'bundle','Muffin-stall choices','Compare bundles and singles for an exact purchase.',N,['P3.S.MONEY.01','P3.S.MD.03']],
 [3,'timeline','Discovery-centre visit','Separate waiting time from an activity duration.',G,['P3.S.TIME.02']],
 [3,'chart','Read the collection chart','Use a bar-chart scale to read, compare and combine counts.',S,['P3.S.GRAPH.01']],
 [4,'round','Attendance estimate','Round a count to a specified place.',N,['P4.S.WN.02']],
 [4,'decimal','Decimal ribbon','Convert a whole number and a fraction to a decimal.',N,['P4.S.DEC.03']],
 [4,'share','Album organiser','Subtract a reserved amount before equal sharing.',N,['P4.S.MD.03']],
 [4,'factor','Twin-pack factors','Choose a number that divides both totals exactly.',N,['P4.S.FACT.02']],
 [4,'perimeter','Corner-cut garden','Find the perimeter of a rectilinear figure.',G,['P4.S.AREA.02']],
 [4,'freebie','Free-book offer','Count paid and free items in repeated offer groups.',N,['P4.S.MD.03']],
 [5,'convert','Measure exchange','Express a compound mass as decimal kilograms.',N,['P5.S.DEC.02']],
 [5,'percent','Mosaic percentages','Convert shaded equal parts to a percentage.',N,['P5.S.PCT.02']],
 [5,'equivalent','Fraction bridge review','Find a missing term in equivalent fractions.',N,['P3.S.FRAC.04']],
 [5,'triangle','Triangle canvas','Identify the perpendicular height and calculate triangle area.',G,['P5.S.AREA.01','P5.S.AREA.02']],
 [5,'water','Fill the water tank','Find the unfilled fraction of a cuboid tank.',G,['P5.S.VOL.03','P5.S.VOL.04']],
 [5,'bundles','Compare two baskets','Find a unit price by removing the common cost.',N,['P5.S.RATE.02']],
 [6,'ratio','Share in proportion','Find one share from a ratio and a total.',N,['P6.S.RATIO.03']],
 [6,'change','Track the price change','Compare a change with the original value.',N,['P6.S.PCT.02']],
 [6,'algebra','Expression machine','Substitute a value and follow the order of operations.',N,['P6.S.ALG.04']],
 [6,'average','Missing reading day','Recover a missing count from an average.',S,['P6.S.AVG.02']],
 [6,'charge','Time-block tickets','Apply a charge for each started time block.',N,['P5.S.RATE.02','P3.S.TIME.02']],
 [6,'redistribute','Repack the collection','Keep a total fixed while the number of equal groups changes.',N,['P4.S.MD.03']],
];
export const PAPER_PATTERNS:PaperPattern[]=[...rows.map(([level,slug,title,objective,strand,skillIds])=>({
 parameter:`p${level}-${slug}`,level,title,objective,strand,skillIds,icon:strand===G?'◇':strand===S?'▥':'✦',
})),...CORPUS_PATTERNS];

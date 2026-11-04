/** Lightweight original-adaptation inventory. No generator, React or PDF dependencies. */
export type RafflesPart={id:string;sourceQuestion:string;sourcePage:number;title:string;skillIds:string[];canonicalPatternId:string};
const PATTERNS:Record<string,string>={
 '1':'place-digit','2':'fraction-simplify','3':'compound-mass','4':'hours-to-minutes','5':'acute-angle-in-polygon','6':'alternating-number-pattern','7':'equivalent-fraction-missing-denominator','8':'money-change-pair','9':'equal-groups-then-remainder','10':'grid-area-equivalence','11':'write-number-words','12':'missing-addend','13':'fraction-number-line','14':'related-fraction-addition','15':'relevant-route-lengths','16':'parallel-lines-grid','17':'comparison-smaller','18':'division-remainder','19a':'rectangle-area','19b':'rectangle-perimeter','19c':'rectangle-area','19d':'rectangle-perimeter','19e':'area-perimeter-comparison','19f':'area-perimeter-comparison','20':'unitary-volume-comparison','21a':'comparison-smaller','21b':'comparison-then-remaining-total','22a':'single-price-multiplication','22b':'bundle-price-minimum','23a':'duration-excluding-wait','23b':'start-time-backwards','24a':'grouped-bar-difference-search','24b':'grouped-bar-difference','24c':'grouped-bar-total','24d':'grouped-bar-total','25a':'equal-sharing','25b':'equal-units-and-extra',
};
const row=(id:string,sourcePage:number,title:string,...skills:string[]):RafflesPart=>({id,canonicalPatternId:PATTERNS[id],sourceQuestion:id,sourcePage,title,skillIds:skills.map(s=>s.startsWith('P')?s:`P3.S.${s}`)});
export const RAFFLES_2025_PARTS:RafflesPart[]=[
 row('1',2,'Find the tens digit','WN.01'),row('2',2,'Simplest fraction','FRAC.02'),row('3',2,'Kilograms and grams','MEASURE.02','MEASURE.03'),
 row('4',3,'Hours into minutes','P2.S.TIME.02'),row('5',3,'Find the acute angle','ANGLE.02'),
 row('6',4,'Two-step number pattern','WN.03'),row('7',4,'Missing fraction denominator','FRAC.04'),row('8',4,'Use change to find a pair of purchases','MONEY.01'),
 row('9',5,'Equal pours and juice left','MD.03','AS.01'),row('10',5,'Equal areas on square grids','AREA.01'),
 row('11',6,'Four-digit number names','WN.02'),row('12',6,'Missing addend','AS.01'),row('13',6,'Fraction on a number line','P2.S.FRAC.02'),
 row('14',7,'Add related fractions','FRAC.05'),row('15',7,'Choose the relevant route lengths','MEASURE.01','AS.01'),
 row('16',8,'Parallel segments on a grid','LINES.01'),row('17',8,'Smaller number from a difference','AS.01'),row('18',8,'Division remainder','MD.02','MD.04'),
 row('19a',9,'Square area','AREA.03'),row('19b',9,'Square perimeter','AREA.02'),row('19c',9,'Rectangle area','AREA.03'),row('19d',9,'Rectangle perimeter','AREA.02'),
 row('19e',9,'Compare equal perimeters','AREA.02','AREA.03'),row('19f',9,'Compare different areas','AREA.02','AREA.03'),
 row('20',9,'Find one unit then compare volumes','MD.04','AS.01'),row('21a',10,'A smaller daily amount','AS.01'),row('21b',10,'Remaining amount after two days','AS.01'),
 row('22a',11,'Single-item prices','MD.03','MONEY.01'),row('22b',11,'Cheapest exact purchase with bundles','MD.03','MONEY.01'),
 row('23a',12,'Duration after a wait','TIME.02'),row('23b',12,'Work backwards to a start time','TIME.02'),
 row('24a',13,'Find a day from a bar difference','GRAPH.01'),row('24b',13,'Compare two bars across days','GRAPH.01'),row('24c',13,'Add categories on one day','GRAPH.01'),row('24d',13,'Total one category across days','GRAPH.01'),
 row('25a',14,'Share a total equally','MD.04'),row('25b',14,'Equal units with an extra amount','MD.04','AS.01'),
];

/** Fast implementation batch. Source associations are private, unaudited leads. */
const rows:[string,number,string,string,string[],string,string,number][]=[
 ['working-time',3,'Working time with a break','duration-excluding-middle-break',['P3.S.TIME.02'],'145d3896e8edd36d','11',5],
 ['latest-start',3,'Latest walking start time','latest-start-before-deadline-buffer',['P3.S.TIME.02'],'145d3896e8edd36d','12',6],
 ['unit-price-multiple',3,'Find one price then a related price','unit-price-then-multiplicative-comparison',['P3.S.MD.04','P3.S.MD.03'],'237f21a325e1d4d7','20',10],
 ['rectangle-measures',3,'Area and perimeter of one rectangle','rectangle-area-and-perimeter-pair',['P3.S.AREA.02','P3.S.AREA.03'],'237f21a325e1d4d7','15',8],
 ['equal-start-gift',4,'Equal starting amounts after a gift','equal-start-one-loss-final-ratio',['P4.S.MD.03'],'15ba781249365499','12',6],
 ['paired-price',4,'Find a price from equal item counts','equal-count-two-prices-total-and-difference',['P4.S.MD.03','P3.S.MONEY.01'],'145d3896e8edd36d','19',10],
 ['bundle-cost',3,'Total cost at a bundle price','exact-bundle-count-times-price',['P3.S.MD.04','P3.S.MONEY.01'],'145d3896e8edd36d','33',16],
 ['promotion-change',4,'Change with free promotional items','buy-paid-get-free-exact-bundles-change',['P4.S.MD.03','P3.S.MONEY.01'],'145d3896e8edd36d','34',17],
 ['fraction-more-total',4,'Total of two related fractional masses','fraction-quantity-plus-fraction-more-total',['P4.S.FRAC.04'],'15ba781249365499','13',6],
 ['remaining-pages',4,'Recover a whole from pages left','whole-from-complement-of-two-fractions',['P4.S.FRAC.03'],'0ffa04ed552be00f','13',7],
 ['rainfall-increase',4,'Find a month from a rainfall increase','bar-chart-adjacent-increase-search',['P4.S.GRAPH.01'],'274c10b4918ba9fd','22',8],
 ['fruit-table',4,'Complete two cells of a fruit table','table-missing-part-and-row-total-pair',['P4.S.GRAPH.01','P4.S.GRAPH.04'],'274c10b4918ba9fd','23',9],
];
export const BATCH7_MIDDLE_PARTS=rows.map(([id,level,title,canonicalPatternId,skillIds,paperId,sourceQuestion,sourcePage])=>({id,level,title,objective:title,skillIds,canonicalPatternId,sourceUnits:[{paperId,sourceQuestion,sourcePage}]}));

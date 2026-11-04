/** Source-response inventory for six reusable structures; no whole-paper coverage. */
export const BATCH4_MIDDLE_PARTS=[
 {id:'age-sum-difference',group:'age-sum-difference',level:3,title:'Two ages with a fixed difference',canonicalPatternId:'pair-sum-difference-older',skillIds:['P3.S.AS.01','P3.S.MD.04'],source:{paperId:'242042bf41a05791',question:'15',page:8,bankLine:5271,reviewOrder:53}},
 {id:'three-offset-total',group:'three-offset-total',level:4,title:'Three related amounts',canonicalPatternId:'three-quantities-additive-offsets-total',skillIds:['P4.S.MD.03','P3.S.AS.01'],source:{paperId:'09144ff47dbdd61e',question:'14',page:7,bankLine:5299,reviewOrder:62}},
 {id:'equal-remainders',group:'equal-remainders',level:4,title:'Equal amounts left after spending',canonicalPatternId:'equal-remainders-fraction-and-fixed-use',skillIds:['P4.S.FRAC.03','P4.S.MD.03'],source:{paperId:'09144ff47dbdd61e',question:'17',page:10,bankLine:5302,reviewOrder:64}},
 {id:'chart-transfer',group:'chart-transfer',level:3,title:'Share a chart’s difference equally',canonicalPatternId:'bar-chart-transfer-equalize-two-groups',skillIds:['P3.S.GRAPH.01','P3.S.AS.01','P3.S.MD.04'],source:{paperId:'51e68abb93b217ab',question:'10',page:6,bankLine:6090,reviewOrder:60}},
 {id:'fraction-left-two',group:'fraction-left-two',level:3,title:'A whole after two fractions are used',canonicalPatternId:'fraction-complement-two-consumptions',skillIds:['P3.S.FRAC.05'],source:{paperId:'51e68abb93b217ab',question:'11',page:7,bankLine:6090,reviewOrder:60}},
 {id:'boxes-a',group:'boxes',level:3,title:'Find the number of filled boxes',canonicalPatternId:'equal-groups-count',skillIds:['P3.S.MD.04'],source:{paperId:'3c1726989dbd14b7',question:'13a',page:7,bankLine:4151,reviewOrder:55}},
 {id:'boxes-b',group:'boxes',level:3,title:'Find the money from all boxes',canonicalPatternId:'equal-bundle-count-then-revenue',skillIds:['P3.S.MD.03','P3.S.MD.04','P3.S.MONEY.01'],source:{paperId:'3c1726989dbd14b7',question:'13b',page:7,bankLine:4151,reviewOrder:55}},
] as const;
export type Batch4MiddlePart=typeof BATCH4_MIDDLE_PARTS[number]['id'];

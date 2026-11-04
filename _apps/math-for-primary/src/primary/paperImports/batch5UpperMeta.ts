/** Complete response inventory for the two sections of Rulang P5 WA3. */
export const BATCH5_UPPER_PATTERNS = [
 {id:'divide-hundreds',question:'P1 Q1',page:2,title:'Divide by a multiple of 100'},
 {id:'reading-rate',question:'P1 Q2',page:2,title:'Reading at a constant rate'},
 {id:'cuboid-volume',question:'P1 Q3',page:2,title:'Volume of a cuboid'},
 {id:'tank-to-fill',question:'P1 Q4',page:3,title:'Water needed to fill a tank'},
 {id:'book-mass',question:'P1 Q5',page:3,title:'Mass of one book'},
 {id:'packing-time',question:'P1 Q6',page:3,title:'Packing time at a constant rate'},
 {id:'parking-charge',question:'P2 Q1',page:5,title:'Parking charges'},
 {id:'pail-difference',question:'P2 Q2a',page:6,title:'Compare water after pouring'},
 {id:'pail-bottles',question:'P2 Q2b',page:6,title:'Fill complete bottles'},
 {id:'tank-poured',question:'P2 Q3',page:7,title:'Water poured out'},
 {id:'tank-shorter',question:'P2 Q3a',page:7,title:'Water poured from a shorter tank'},
 {id:'tank-fraction',question:'P2 Q3b',page:7,title:'Water poured from a tank with a different fraction'},
] as const;
export type Batch5UpperId = typeof BATCH5_UPPER_PATTERNS[number]['id'];

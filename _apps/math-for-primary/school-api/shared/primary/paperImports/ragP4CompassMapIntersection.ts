import type {Question} from '../generate';

export const RAG_PATTERN = {
  id: 'p4-compass-map-intersection',
  level: 4,
  title: 'Find a place from compass clues',
  objective: 'Use two compass clues and a map grid to identify a place.',
  skillIds: ['P4.S.ANGLE.02'],
  canonicalPatternId: 'p4-compass-map-two-clue-intersection',
};

type Site = {name:string;x:number;y:number};
type MapCase = {northWest:string;east:string;sites:Site[]};

// y increases southwards. Each case shows the places at grid intersections.
const maps:MapCase[] = [
  {northWest:'Museum',east:'Sports hall',sites:[
    {name:'Museum',x:1,y:0},{name:'Library',x:3,y:2},{name:'Sports hall',x:5,y:2},
    {name:'Clinic',x:0,y:4},{name:'Gallery',x:6,y:0},
  ]},
  {northWest:'Garden',east:'Fountain',sites:[
    {name:'Garden',x:0,y:1},{name:'Bakery',x:2,y:3},{name:'Fountain',x:5,y:3},
    {name:'Town hall',x:4,y:0},{name:'Bookshop',x:6,y:4},
  ]},
  {northWest:'Theatre',east:'Market',sites:[
    {name:'Theatre',x:2,y:0},{name:'Clinic',x:4,y:2},{name:'Market',x:6,y:2},
    {name:'Museum',x:1,y:4},{name:'Pool',x:5,y:0},
  ]},
  {northWest:'School',east:'Post office',sites:[
    {name:'School',x:1,y:1},{name:'Bakery',x:3,y:3},{name:'Post office',x:6,y:3},
    {name:'Park',x:5,y:0},{name:'Library',x:0,y:4},
  ]},
];
const columns=7,rows=5;

function mapRows(sites:Site[]):string[]{
  return Array.from({length:rows},(_,y)=>{
    const cells=Array.from({length:columns},()=> '·');
    for(const site of sites) cells[site.x]=site.y===y?site.name:cells[site.x];
    return `Row ${y+1}: ${cells.join(' | ')}`;
  });
}

function locate(m:MapCase):Site{
  const northwest=m.sites.find(s=>s.name===m.northWest)!;
  const eastern=m.sites.find(s=>s.name===m.east)!;
  const matches=m.sites.filter(s=>s.x>northwest.x&&s.y>northwest.y&&s.y===eastern.y&&s.x<eastern.x);
  if(matches.length!==1) throw new Error('Map clues must identify exactly one place.');
  return matches[0];
}

export function makeRagQuestion(seed:number,index=0):Question{
  const pick=((Math.trunc(seed)*31+Math.trunc(index)*17)%maps.length+maps.length)%maps.length;
  const m=maps[pick],answer=locate(m),northwest=m.sites.find(s=>s.name===m.northWest)!,eastern=m.sites.find(s=>s.name===m.east)!;
  const context=[
    'Here is a map of places. North is at the top; east is to the right. Each column and row is one grid step.',
    ...mapRows(m.sites),
    `The ${northwest.name} is north-west of John.`,
    `The ${eastern.name} is east of John.`,
  ];
  const workedSteps=[
    `The ${northwest.name} is north-west of John, so John must be east and south of it.`,
    `The ${eastern.name} is east of John, so John must be in the same row and west of it.`,
    `The only place on the map that fits both clues is the ${answer.name}.`,
  ];
  return {
    key:`${RAG_PATTERN.id}:${seed}:${index}`,
    prompt:'John is standing at one of the places on the map. Which place is it?',
    context,
    answer:answer.name,
    hint:'Reverse the north-west clue to find the area where John could be. Then use the east clue to narrow it to one place.',
    explanation:workedSteps.join(' '),
    workedSteps:workedSteps.map(text=>({text})),
  };
}

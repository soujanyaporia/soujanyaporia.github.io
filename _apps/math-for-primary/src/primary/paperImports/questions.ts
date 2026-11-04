import type {Activity} from '../catalog';
import type {Question} from '../generate';
import {adaptedPattern} from './catalog';
import {makeP1HenryPark2025Question} from './p1HenryPark2025';
import {makeP2HenryPark2025Question} from './p2HenryPark2025';
import {makeP4Nanyang2025} from './p4Nanyang2025';
import {makeP5MahaBodhi2025} from './p5MahaBodhi2025';
import {makeP6Catholic2025Question} from './p6Catholic2025';
import {makeP3Raffles2025} from './p3Raffles2025';

export function makeAdaptedPaperQuestion(activity:Activity,seed:number,index:number):Question{
 const pattern=adaptedPattern(activity.parameter);if(!pattern)throw Error(`Unknown adapted pattern: ${activity.parameter}`);
 const q=pattern.level===1?makeP1HenryPark2025Question(activity,seed,index):pattern.level===2?makeP2HenryPark2025Question(activity,seed,index):pattern.level===3?makeP3Raffles2025(pattern.sourceParts[0],seed,index):pattern.level===4?makeP4Nanyang2025(pattern.sourceParts[0],seed,index):pattern.level===5?makeP5MahaBodhi2025(pattern.sourceParts[0],seed,index):pattern.level===6?makeP6Catholic2025Question(activity,seed,index):null;
 if(!q)throw Error(`Unsupported adapted level: ${pattern.level}`);
 return {...q,key:`${activity.id}:${seed}:${index}`};
}

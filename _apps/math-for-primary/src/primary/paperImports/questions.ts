import type {Activity} from '../catalog';
import type {Question} from '../generate';
import {adaptedPattern} from './catalog';
import {makeP1HenryPark2025Question} from './p1HenryPark2025';
import {makeP2HenryPark2025Question} from './p2HenryPark2025';
import {makeP4Nanyang2025} from './p4Nanyang2025';
import {makeP5MahaBodhi2025} from './p5MahaBodhi2025';
import {makeP6Catholic2025Question} from './p6Catholic2025';
import {makeP3Raffles2025} from './p3Raffles2025';
import {makeBatch2Early,type Batch2EarlyPart} from './batch2Early';
import {makeBatch2Upper,type Batch2UpperId} from './batch2Upper';
import {makeBatch2RoundingQuestion} from './batch2Reuse';
import {makeBatch3Upper,type Batch3UpperId} from './batch3Upper';
import {makeBatch3Early,type Batch3EarlyPart} from './batch3Early';
import {makeBatch4Early,type Batch4EarlyPart} from './batch4Early';
import {makeBatch4Middle,type Batch4MiddlePart} from './batch4Middle';
import {makeBatch4Upper,type Batch4UpperId} from './batch4Upper';
import {makeBatch5Early,type Batch5EarlyPart} from './batch5Early';
import {makeBatch5MiddleP3} from './batch5Middle';
import {makeBatch5Upper,type Batch5UpperId} from './batch5Upper';

export function makeAdaptedPaperQuestion(activity:Activity,seed:number,index:number):Question{
 const pattern=adaptedPattern(activity.parameter);if(!pattern)throw Error(`Unknown adapted pattern: ${activity.parameter}`);
 if(pattern.parameter.startsWith('b5e-'))return {...makeBatch5Early(pattern.parameter.slice(4) as Batch5EarlyPart,seed,index),key:`${activity.id}:${seed}:${index}`};
 if(pattern.parameter.startsWith('b5m-'))return {...makeBatch5MiddleP3(pattern.parameter.slice(4),seed,index),key:`${activity.id}:${seed}:${index}`};
 if(pattern.parameter.startsWith('b5u-'))return {...makeBatch5Upper(pattern.parameter.slice(4) as Batch5UpperId,seed,index),key:`${activity.id}:${seed}:${index}`};
 if(pattern.parameter.startsWith('b4e-'))return {...makeBatch4Early(pattern.parameter.slice(4) as Batch4EarlyPart,seed,index),key:`${activity.id}:${seed}:${index}`};
 if(pattern.parameter.startsWith('b4m-'))return {...makeBatch4Middle(pattern.parameter.slice(4) as Batch4MiddlePart,seed,index),key:`${activity.id}:${seed}:${index}`};
 if(pattern.parameter.startsWith('b4u-'))return {...makeBatch4Upper(pattern.parameter.slice(4) as Batch4UpperId,seed,index),key:`${activity.id}:${seed}:${index}`};
 if(pattern.parameter.startsWith('b2e-'))return {...makeBatch2Early(pattern.parameter.slice(4) as Batch2EarlyPart,seed,index),key:`${activity.id}:${seed}:${index}`};
 if(pattern.parameter.startsWith('b2u-'))return {...makeBatch2Upper(pattern.parameter.slice(4) as Batch2UpperId,seed,index),key:`${activity.id}:${seed}:${index}`};
 if(pattern.parameter.startsWith('b2r-'))return makeBatch2RoundingQuestion(activity,seed,index);
 if(pattern.parameter.startsWith('b3u-'))return {...makeBatch3Upper(pattern.parameter.slice(4) as Batch3UpperId,seed,index),key:`${activity.id}:${seed}:${index}`};
 if(pattern.parameter.startsWith('b3e-'))return {...makeBatch3Early(pattern.parameter.slice(4) as Batch3EarlyPart,seed,index),key:`${activity.id}:${seed}:${index}`};
 const q=pattern.level===1?makeP1HenryPark2025Question(activity,seed,index):pattern.level===2?makeP2HenryPark2025Question(activity,seed,index):pattern.level===3?makeP3Raffles2025(pattern.sourceParts[0],seed,index):pattern.level===4?makeP4Nanyang2025(pattern.sourceParts[0],seed,index):pattern.level===5?makeP5MahaBodhi2025(pattern.sourceParts[0],seed,index):pattern.level===6?makeP6Catholic2025Question(activity,seed,index):null;
 if(!q)throw Error(`Unsupported adapted level: ${pattern.level}`);
 return {...q,key:`${activity.id}:${seed}:${index}`};
}

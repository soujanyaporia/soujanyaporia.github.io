import type {ProgressState} from '../state/progress';
import type {Track} from './curriculum';
/** A guest setup updates preferences and keeps every existing learning record. */
export function guestSetup(progress:ProgressState,name:string,level:number,track:Track):ProgressState{
 if(!Number.isInteger(level)||level<1||level>6)throw new Error('Choose Primary 1 to Primary 6.');
 return {...progress,profile:{name:name.trim().slice(0,30)||'Explorer',onboarded:true},primary:{...progress.primary,selection:{level,track:level<5?'standard':track==='foundation'?'foundation':'standard'}}};
}

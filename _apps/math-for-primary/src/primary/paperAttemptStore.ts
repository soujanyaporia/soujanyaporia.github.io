import type {KV} from './sessionStore';

/** Small storage boundary for account cleanup; importing it never loads question generators. */
export const paperAttemptKey=(scope:string)=>`singapore-maths.practice-paper.v1:${scope}`;
export function clearPaperAttempt(kv:KV|null,scope:string){try{kv?.removeItem(paperAttemptKey(scope));}catch{/* Storage may already be unavailable. */}}

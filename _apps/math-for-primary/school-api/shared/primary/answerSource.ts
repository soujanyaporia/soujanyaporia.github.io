/** The wire activity ID is retained for API compatibility; lesson evidence has its own stats key. */
export function answerStatsKey(activityId:string,questionKey?:string):string{
 const lesson=questionKey?.match(/^learn:([-a-z0-9]{1,80}):\d+:.+$/)?.[1];
 return lesson?`learn.${lesson}`:activityId;
}

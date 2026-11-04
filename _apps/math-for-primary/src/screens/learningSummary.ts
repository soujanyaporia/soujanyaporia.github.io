import type { ProgressState } from '../state/progress';
import type { Track } from '../school/curriculum';
import { activitiesFor } from '../primary/catalog';
import { lessonsForLevel } from '../teach/index';
import { missionsFor } from '../playground/catalog';
export function learningSummary(p:ProgressState,level:number,track:Track){
 const activities=activitiesFor(level,track),lessons=lessonsForLevel(level,track),missions=missionsFor(level,track);
 const finishedActivities=activities.filter(a=>(p.primary?.activities[a.id]?.sessions??0)>0),finishedLessons=lessons.filter(l=>(p.nodes[`learn.${l.id}`]?.completions??0)>0),finishedMissions=missions.filter(m=>(p.nodes[`mission.${m.id}`]?.completions??0)>0);
 const started=activities.filter(a=>(p.primary?.activities[a.id]?.attempts??0)>0),attempts=started.reduce((n,a)=>n+p.primary.activities[a.id].attempts,0),firstTry=started.reduce((n,a)=>n+p.primary.activities[a.id].firstTry,0);
 return {activities,lessons,missions,finishedActivities,finishedLessons,finishedMissions,attempts,firstTry,percent:Math.round(100*(finishedActivities.length+finishedLessons.length+finishedMissions.length)/(activities.length+lessons.length+missions.length))};
}

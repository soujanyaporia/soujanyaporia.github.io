import { playerLevel,XP_RULES } from '../game/xp';
import type { ProgressState } from '../state/progress';
/**
 * Learning rewards are derived from recorded learning rather than stored separately, so they agree on
 * every device and with the school account: answers earn XP (more for a clean first try, some for
 * persisting), finished lessons and mastery earn XP and Math Gems, reviews earn XP. Nothing is lost by
 * a broken streak, and speed earns nothing.
 */
export const REWARDS={mission:25,missionGems:3,lesson:XP_RULES.lesson,mastery:40,review:XP_RULES.review,lessonGems:5,masteryGems:15,activityStarGems:2,badgeGems:5};
export function learningRewards(p:ProgressState){
 const acts=Object.values(p.primary?.activities||{});
 const practice=acts.reduce((s,a)=>s+a.firstTry*(XP_RULES.correct+XP_RULES.cleanBonus)+Math.max(0,a.correct-a.firstTry)*(XP_RULES.correct+XP_RULES.persisted)+Math.max(0,a.attempts-a.correct)*XP_RULES.revealed,0);
 const nodes=Object.entries(p.nodes||{}),learn=nodes.filter(([id])=>id.startsWith('learn.')&&!id.endsWith('.review')),reviews=nodes.filter(([id])=>id.startsWith('learn.')&&id.endsWith('.review')),missions=nodes.filter(([id])=>id.startsWith('mission.')),classic=nodes.filter(([id])=>!id.startsWith('learn.')&&!id.startsWith('mission.'));
 const mastered=learn.filter(([,n])=>n.bestStars>=3).length;
 const xp=practice+learn.length*REWARDS.lesson+mastered*REWARDS.mastery+reviews.reduce((s,[,n])=>s+n.completions*REWARDS.review,0)+classic.length*XP_RULES.lesson+missions.length*REWARDS.mission;
 const gems=missions.length*REWARDS.missionGems+learn.length*REWARDS.lessonGems+mastered*REWARDS.masteryGems+acts.filter(a=>a.stars>=3).length*REWARDS.activityStarGems+(p.badges?.length||0)*REWARDS.badgeGems;
 return {xp,gems,missions:missions.length,level:playerLevel(xp),learned:learn.length,mastered,streak:p.streak?.current??0};
}

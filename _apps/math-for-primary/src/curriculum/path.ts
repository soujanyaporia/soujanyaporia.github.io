import { SKILLS, type TopicId } from '../engine/skills';
import type { SkillId } from '../engine/types';
import type { NodeRecord } from '../state/progress';
import type { ChestNode, GameNode, LessonNode, PathNode, WorldDef } from './types';
import { WORLDS } from './worlds';

/** The whole journey in order, and the rules for moving along it. */
export const PATH: readonly PathNode[] = WORLDS.flatMap((w) => w.nodes);

const INDEX = new Map(PATH.map((n, i) => [n.id, i]));

export type NodeMap = Record<string, NodeRecord>;

export const nodeById = (id: string): PathNode | undefined => PATH.find((n) => n.id === id);
export const worldOf = (node: PathNode): WorldDef => WORLDS.find((w) => w.id === node.world)!;
export const LESSON_NODES = PATH.filter((n): n is LessonNode => n.type === 'lesson');
export const GAME_NODES = PATH.filter((n): n is GameNode => n.type === 'game');

export function prerequisiteOf(node: PathNode): string | undefined {
  if (node.prerequisite) return node.prerequisite;
  const i = INDEX.get(node.id) ?? 0;
  return i > 0 ? PATH[i - 1].id : undefined;
}

export const isDone = (nodes: NodeMap, id: string) => (nodes[id]?.completions ?? 0) > 0;

export function isUnlocked(node: PathNode, nodes: NodeMap, unlockAll = false): boolean {
  if (unlockAll) return true;
  const prereq = prerequisiteOf(node);
  return !prereq || isDone(nodes, prereq);
}

/** The recommended next step: the first unlocked node not yet finished. */
export function nextNode(nodes: NodeMap, unlockAll = false): PathNode {
  return PATH.find((n) => !isDone(nodes, n.id) && isUnlocked(n, nodes, unlockAll)) ?? PATH[PATH.length - 1];
}

export function worldProgress(world: WorldDef, nodes: NodeMap): { done: number; total: number } {
  const steps = world.nodes.filter((n) => n.type !== 'chest');
  return { done: steps.filter((n) => isDone(nodes, n.id)).length, total: steps.length };
}

/** 1-based lesson number across the whole journey. */
export function lessonNumber(node: PathNode): number {
  return LESSON_NODES.findIndex((n) => n.id === node.id) + 1;
}

/** The next treasure chest on the path and how many steps away it is. */
export function nextChest(nodes: NodeMap): { chest: ChestNode; stepsAway: number } | null {
  const start = INDEX.get(nextNode(nodes).id) ?? 0;
  for (let i = start; i < PATH.length; i++) {
    const n = PATH[i];
    if (n.type === 'chest' && !isDone(nodes, n.id)) {
      const stepsAway = PATH.slice(start, i).filter((m) => m.type !== 'chest' && !isDone(nodes, m.id)).length;
      return { chest: n, stepsAway };
    }
  }
  return null;
}

/** Skills met in finished lessons (for mixed practice, review and quests). */
export function learnedSkills(nodes: NodeMap): SkillId[] {
  const skills = new Set<SkillId>();
  for (const n of PATH) {
    if (!isDone(nodes, n.id)) continue;
    if (n.type === 'lesson') n.skills.forEach((s) => skills.add(s));
    if (n.type === 'game') skills.add(n.skill);
  }
  return [...skills];
}

export function learnedTopics(nodes: NodeMap): TopicId[] {
  return [...new Set(learnedSkills(nodes).map((s) => SKILLS[s].topic))];
}

export const gamesUnlocked = (nodes: NodeMap, unlockAll = false) => GAME_NODES.some((g) => isUnlocked(g, nodes, unlockAll));

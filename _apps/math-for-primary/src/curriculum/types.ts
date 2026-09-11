import type { ProblemRequest } from '../engine/skills';
import type { LevelId, SkillId, Token, VisualSpec } from '../engine/types';
import type { IconName } from '../ui/Icon';

/**
 * The curriculum is configuration, not code: worlds contain nodes (lessons,
 * mini-games, treasure chests, challenges) with prerequisites and rewards.
 * Screens read these definitions; nothing about the curriculum is
 * hard-coded in components, so hundreds of lessons can be added as data.
 */
export type Tone = 'blue' | 'orange' | 'green' | 'purple' | 'teal' | 'yellow' | 'pink';

export type NodeType = 'lesson' | 'game' | 'chest' | 'challenge';
export type GameId = 'monster' | 'train' | 'balance' | 'picnic';
export type LessonType = 'guided' | 'translate';
export type Scenery = 'hills' | 'valley' | 'cave' | 'forest' | 'meadow' | 'desert' | 'mountain';

export interface IntroCard {
  say: string;
  visual?: VisualSpec;
  tokens?: Token[];
}

/** Lesson content: Understand (intro) → See (examples) → Try (practice). */
export interface LessonContent {
  id: string;
  title: string;
  /** "I can …" statement shown before and after the lesson. */
  goal: string;
  level: LevelId;
  icon: IconName;
  skills: SkillId[];
  intro: IntroCard[];
  examples: ProblemRequest[];
  practice: ProblemRequest[];
  /** Practice topic for "Practise more". */
  topic: string;
}

interface NodeBase {
  id: string;
  type: NodeType;
  title: string;
  world: string;
  icon: IconName;
  xpReward: number;
  gemReward: number;
  /** Node that must be finished first (default: the node before it). */
  prerequisite?: string;
}

export interface LessonNode extends NodeBase {
  type: 'lesson';
  lessonType: LessonType;
  skills: SkillId[];
  level: LevelId;
  numberRange: [number, number];
  lesson: LessonContent;
}

export interface GameNode extends NodeBase {
  type: 'game';
  game: GameId;
  skill: SkillId;
  level: LevelId;
  rounds: number;
  blurb: string;
}

export interface ChestNode extends NodeBase {
  type: 'chest';
}

export interface ChallengeNode extends NodeBase {
  type: 'challenge';
  requests: ProblemRequest[];
  /** Fraction of questions to get right (without the answer shown) to pass. */
  passMark: number;
  blurb: string;
}

export type PathNode = LessonNode | GameNode | ChestNode | ChallengeNode;

export interface WorldDef {
  id: string;
  title: string;
  subtitle: string;
  tone: Tone;
  scenery: Scenery;
  nodes: PathNode[];
}

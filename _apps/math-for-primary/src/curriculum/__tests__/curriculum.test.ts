import { describe, expect, it } from 'vitest';
import { ALL_TOPICS } from '../../content/topics';
import { explain } from '../../engine/explain';
import { buildSession } from '../../engine/session';
import { hasGenerator, SKILLS } from '../../engine/skills';
import { isUnlocked, nextChest, nextNode, PATH, prerequisiteOf, learnedSkills } from '../path';
import { WORLDS } from '../worlds';

describe('curriculum configuration', () => {
  it('has unique node ids that belong to their world', () => {
    expect(new Set(PATH.map((n) => n.id)).size).toBe(PATH.length);
    for (const world of WORLDS) for (const node of world.nodes) expect(node.world).toBe(world.id);
  });

  it('only depends on earlier nodes (no cycles, nothing missing)', () => {
    const seen = new Set<string>();
    for (const node of PATH) {
      const prereq = prerequisiteOf(node);
      if (prereq) expect(seen.has(prereq), `${node.id} needs ${prereq}`).toBe(true);
      seen.add(node.id);
    }
  });

  it('gives every world a treasure chest and ends it with a challenge', () => {
    for (const world of WORLDS) {
      expect(world.nodes.some((n) => n.type === 'chest'), world.id).toBe(true);
      expect(world.nodes[world.nodes.length - 1].type).toBe('challenge');
    }
  });

  it('has complete lessons whose questions generate and explain', () => {
    const lessons = PATH.filter((n) => n.type === 'lesson');
    expect(lessons.length).toBeGreaterThanOrEqual(35);
    for (const node of lessons) {
      if (node.type !== 'lesson') continue;
      const l = node.lesson;
      expect(l.intro.length, l.id).toBeGreaterThan(0);
      expect(l.examples).toHaveLength(5);
      expect(l.practice).toHaveLength(5);
      expect(ALL_TOPICS.some((t) => t.id === l.topic), `${l.id} topic ${l.topic}`).toBe(true);
      for (const seed of [1, 2, 3]) {
        const problems = buildSession([...l.examples, ...l.practice], seed);
        expect(problems).toHaveLength(10);
        for (const p of problems) expect(explain(p).steps.length).toBeGreaterThan(0);
      }
    }
  });

  it('has playable games and challenges', () => {
    for (const node of PATH) {
      if (node.type === 'game') {
        expect(hasGenerator(node.skill)).toBe(true);
        expect(node.rounds).toBeGreaterThan(3);
      }
      if (node.type === 'challenge') {
        expect(node.requests.length).toBeGreaterThanOrEqual(8);
        expect(node.passMark).toBeGreaterThan(0);
        expect(buildSession(node.requests, 11)).toHaveLength(node.requests.length);
      }
    }
  });

  it('every practice topic uses real skills', () => {
    for (const t of ALL_TOPICS) for (const s of t.skills) expect(SKILLS[s], `${t.id}: ${s}`).toBeDefined();
  });
});

describe('moving along the path', () => {
  const done = (ids: string[]) => Object.fromEntries(ids.map((id) => [id, { completions: 1, bestStars: 3, lastStars: 3, bestAccuracy: 1, lastAt: 0 }]));

  it('starts at the first lesson and moves on as nodes are finished', () => {
    expect(nextNode({}).id).toBe(PATH[0].id);
    expect(nextNode(done([PATH[0].id])).id).toBe(PATH[1].id);
    expect(isUnlocked(PATH[2], done([PATH[0].id]))).toBe(false);
    expect(isUnlocked(PATH[2], {}, true)).toBe(true);
  });

  it('knows how far away the next treasure chest is', () => {
    const next = nextChest({});
    expect(next).not.toBeNull();
    expect(next!.stepsAway).toBeGreaterThan(0);
  });

  it('collects the skills from finished lessons', () => {
    expect(learnedSkills(done(['add-5']))).toContain('add.result');
  });
});

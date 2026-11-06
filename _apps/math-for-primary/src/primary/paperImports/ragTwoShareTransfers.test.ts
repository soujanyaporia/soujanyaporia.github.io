import { expect, it } from 'vitest';
import { makeRagQuestion } from './ragTwoShareTransfers';

function readNumbers(story: string, pattern: RegExp): number[] {
  const match = pattern.exec(story);
  if (!match) throw new Error(`Missing or ambiguous transfer givens in: ${story}`);
  return match.slice(1).map(Number);
}

// Find every feasible answer by playing the move forwards from the visible story.
function solveVisible(story: string, prompt: string, unit: string | undefined): number[] {
  const solutions: number[] = [];
  if (unit === 'beads') {
    expect(prompt).toMatch(/from the blue box to the green box so that the boxes hold equal numbers/);
    const [green, factor] = readNumbers(story, /^The green box holds (\d+) beads\. The blue box holds (\d+) times as many beads as the green box\.$/);
    const blue = green * factor;
    expect(green).toBeGreaterThan(0);
    expect(factor).toBeGreaterThan(1);
    expect(factor).toBeLessThan(10);
    expect(blue).toBeLessThan(1000);
    for (let moved = 0; moved <= blue; moved++) {
      if (blue - moved === green + moved) solutions.push(moved);
    }
  } else if (unit === 'buttons') {
    expect(prompt).toMatch(/left in the round tray/);
    const [moved, squareAfter] = readNumbers(story, /^Two trays started with the same number of buttons\. Ravi moved (\d+) buttons from the round tray to the square tray\. The square tray then held (\d+) buttons\.$/);
    expect(moved).toBeGreaterThan(0);
    expect(squareAfter).toBeLessThan(100);
    for (let eachBefore = moved; eachBefore <= squareAfter; eachBefore++) {
      if (eachBefore + moved === squareAfter) solutions.push(eachBefore - moved);
    }
  } else if (unit === 'cards') {
    expect(prompt).toMatch(/cards did Evan start with/);
    const [total, moved, factor] = readNumbers(story, /^Priya and Evan had (\d+) cards between them\. Priya passed (\d+) of her cards to Evan\. After that, Priya had (\d+) times as many cards as Evan\.$/);
    expect(total).toBeLessThan(1000);
    expect(moved).toBeGreaterThan(0);
    expect(factor).toBeGreaterThan(1);
    expect(factor + 1).toBeLessThan(10);
    for (let evanBefore = 0; evanBefore <= total - moved; evanBefore++) {
      const priyaBefore = total - evanBefore;
      if (priyaBefore - moved === factor * (evanBefore + moved)) solutions.push(evanBefore);
    }
  } else {
    throw new Error(`Unexpected answer unit: ${unit}`);
  }
  return solutions;
}

it('finds exactly one possible count from each visible story across seeds and indices', () => {
  for (let seed = -12; seed <= 48; seed++) {
    const units = new Set<string | undefined>();
    for (let index = 0; index < 3; index++) {
      const q = makeRagQuestion(seed, index);
      const solutions = solveVisible((q.context ?? []).join(' '), q.prompt, q.unit);
      expect(solutions).toHaveLength(1);
      expect(solutions[0]).toBeGreaterThan(0);
      expect(q.answer).toBe(String(solutions[0]));
      units.add(q.unit);
    }
    expect(units).toEqual(new Set(['beads', 'buttons', 'cards']));
  }
});

it('reproduces each indexed question and varies the visible numbers within each task', () => {
  const stories = new Map<string, Set<string>>();
  for (let seed = 0; seed < 24; seed++) {
    for (let index = 3; index < 6; index++) {
      const q = makeRagQuestion(seed, index);
      expect(makeRagQuestion(seed, index)).toEqual(q);
      const seen = stories.get(q.prompt) ?? new Set<string>();
      seen.add((q.context ?? []).join(' '));
      stories.set(q.prompt, seen);
    }
  }
  expect(stories.size).toBe(3);
  for (const seen of stories.values()) expect(seen.size).toBeGreaterThan(1);
});

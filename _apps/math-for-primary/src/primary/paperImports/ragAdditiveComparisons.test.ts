import { expect, it } from 'vitest';
import { structuredResponseCorrect } from './batch6MiddleResponse';
import { makeRagQuestion } from './ragAdditiveComparisons';

it('solves each visible comparison and checks what the pupil must submit', () => {
  const forms = new Set<string>();
  for (let seed = -8; seed < 40; seed++) {
    for (let index = 0; index < 6; index++) {
      const q = makeRagQuestion(seed, index);
      const clues = q.context?.join(' ') ?? '';
      const equations = q.workedSteps?.map(step => step.equation);
      const numberClue = /^Two numbers are (\d+) apart\. The smaller one is (\d+)\.$/.exec(clues);
      const beadClue = /^A shop has (\d+) red beads\. It has (\d+) more blue beads than red beads\.$/.exec(clues);
      const albumClue = /^The red album holds (\d+) stamps\. The green album has (\d+) more stamps than the red album\. The green album has (\d+) fewer stamps than the blue album\.$/.exec(clues);
      expect(q.picture).toBeUndefined();
      expect(q.prompt).toMatch(/show your working/i);

      if (numberClue) {
        forms.add('number');
        const [, gap, smaller] = numberClue.map(Number);
        const larger = smaller + gap;
        expect(gap).toBeGreaterThan(0);
        expect(smaller).toBeGreaterThan(0);
        expect(larger).toBeLessThan(100);
        expect(q.prompt).toContain('larger number');
        expect(q.unit).toBeUndefined();
        expect(q.structuredResponse).toBeUndefined();
        expect(q.answer).toBe(String(larger));
        expect(equations).toEqual([`${smaller} + ${gap} = ${larger}`]);
      } else if (beadClue) {
        forms.add('linked pair');
        const [, red, extra] = beadClue.map(Number);
        const total = 2 * red + extra;
        const blue = total - red;
        expect(red).toBeGreaterThan(0);
        expect(blue).toBeGreaterThan(red);
        expect(total).toBeLessThan(10000);
        expect(q.prompt).toMatch(/\(a\).*blue beads.*\(b\).*red and blue beads/);
        const spec = q.structuredResponse;
        if (spec?.kind !== 'number-pair') throw new Error('Both bead counts need answer fields');
        expect(spec.firstLabel).toContain('Blue beads');
        expect(spec.secondLabel).toContain('in all');
        expect(spec.decimal).toBeFalsy();
        const pair = [String(blue), String(total)];
        expect(structuredResponseCorrect(spec, q.answer, JSON.stringify(pair))).toBe(true);
        expect(structuredResponseCorrect(spec, q.answer, JSON.stringify([pair[1], pair[0]]))).toBe(false);
        expect(structuredResponseCorrect(spec, q.answer, JSON.stringify([pair[0]]))).toBe(false);
        expect(equations).toEqual([`${red} + ${extra} = ${blue} beads`, `${red} + ${blue} = ${total} beads`]);
      } else if (albumClue) {
        forms.add('chain');
        const [, red, greenOverRed, greenBelowBlue] = albumClue.map(Number);
        const blue = red + (greenOverRed + greenBelowBlue);
        const green = blue - greenBelowBlue;
        expect(red).toBeGreaterThan(0);
        expect(green).toBeGreaterThan(red);
        expect(blue).toBeGreaterThan(green);
        expect(blue).toBeLessThan(10000);
        expect(q.prompt).toContain('blue album');
        expect(q.unit).toBe('stamps');
        expect(q.structuredResponse).toBeUndefined();
        expect(q.answer).toBe(String(blue));
        expect(equations).toEqual([`${red} + ${greenOverRed} = ${green} stamps`, `${green} + ${greenBelowBlue} = ${blue} stamps`]);
      } else {
        throw new Error(`Cannot solve the visible clues: ${clues}`);
      }
    }
  }
  expect(forms).toEqual(new Set(['number', 'linked pair', 'chain']));
});

it('repeats the same seed and index and varies the visible clues across indices', () => {
  const clues = new Set<string>();
  for (let index = 0; index < 16; index++) {
    const q = makeRagQuestion(24, index);
    expect(makeRagQuestion(24, index)).toEqual(q);
    clues.add(JSON.stringify(q.context));
  }
  expect(makeRagQuestion(24)).toEqual(makeRagQuestion(24, 0));
  expect(clues.size).toBeGreaterThan(1);
});

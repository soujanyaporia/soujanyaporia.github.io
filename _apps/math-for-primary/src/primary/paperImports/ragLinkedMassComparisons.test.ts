import {strict as assert} from 'node:assert';
import {test} from 'vitest';
import type {Question} from '../generate';
import {structuredResponseCorrect, structuredResponseReady} from './batch6MiddleResponse';
import {makeRagQuestion, RAG_PATTERN} from './ragLinkedMassComparisons';

function readStatement(q: Question, pattern: RegExp): RegExpMatchArray {
  const matches = (q.context ?? [])
    .map(line => line.match(pattern))
    .filter((match): match is RegExpMatchArray => match !== null);
  assert.equal(matches.length, 1, `Expected exactly one visible statement matching ${pattern}`);
  return matches[0]!;
}

// This solver reads only the pupil-visible statements, never the answer,
// worked steps, random generator or private construction parameters.
function solveVisible(q: Question) {
  const base = readStatement(q, /^The green parcel has a mass of (\d+) kg (\d+) g\.$/);
  const more = readStatement(q, /^The blue parcel weighs (\d+) g more than the green parcel\.$/);
  const fewer = readStatement(q, /^The red parcel weighs (\d+) g less than the blue parcel\.$/);
  const greenKg = Number(base[1]);
  const greenGrams = Number(base[2]);
  const extra = Number(more[1]);
  const less = Number(fewer[1]);
  const green = greenKg * 1000 + greenGrams;
  const blue = green + extra;
  const red = blue - less;
  assert.ok(red > 0 && red < 10000);
  // Independently form kilograms by exchanging groups of 1000 grams.
  let redKg = 0;
  let redGrams = red;
  while (redGrams >= 1000) {
    redGrams -= 1000;
    redKg += 1;
  }
  return {
    greenKg, greenGrams, extra, less, green, blue, red, redKg, redGrams,
    expected: [String(blue), String(redKg), String(redGrams)],
  };
}

function responseSpec(q: Question) {
  const spec = q.structuredResponse;
  assert.ok(spec);
  assert.equal(spec.kind, 'number-fields');
  if (spec.kind !== 'number-fields') throw new Error('Expected three numeric fields');
  assert.deepEqual(spec.fields.map(field => field.label), [
    '(a) Blue parcel (g)',
    '(b) Red parcel: kilograms',
    '(b) Red parcel: remaining grams',
  ]);
  assert.ok(spec.fields.every(field => !field.decimal));
  return spec;
}

 test('solves both linked parts from visible givens across varied seeds and indices', () => {
  const seen = new Set<string>();
  const carryCases = new Set<boolean>();
  const borrowCases = new Set<boolean>();
  const seeds = [...Array.from({length: 256}, (_, i) => i), -31, 65537, 2147483647];
  for (const seed of seeds) {
    for (const index of [0, 1, 4, 9]) {
      const q = makeRagQuestion(seed, index);
      const s = solveVisible(q);
      const spec = responseSpec(q);
      assert.equal(q.context?.length, 3);
      assert.match(q.prompt, /\(a\).*blue parcel in grams/);
      assert.match(q.prompt, /\(b\).*red parcel in kilograms and grams/);
      assert.equal(q.picture, undefined);
      assert.equal(q.choices, undefined);
      assert.ok(q.hint.length > 0 && q.explanation.length > 0);
      for (const value of [s.green, s.blue, s.red, s.extra, s.less]) {
        assert.ok(Number.isSafeInteger(value) && value > 0 && value < 10000);
      }
      assert.ok(s.greenGrams > 0 && s.greenGrams < 1000);
      assert.ok(s.green < s.red && s.red < s.blue);
      assert.ok(s.redKg >= 1 && s.redGrams >= 0 && s.redGrams < 1000);
      assert.deepEqual(JSON.parse(q.answer), s.expected);
      const submission = JSON.stringify(s.expected);
      assert.equal(structuredResponseReady(spec, submission), true);
      assert.equal(structuredResponseCorrect(spec, q.answer, submission), true);
      const equations = q.workedSteps?.map(step => step.equation);
      assert.deepEqual(equations, [
        `${s.greenKg} kg ${s.greenGrams} g = ${s.green} g`,
        `${s.green} g + ${s.extra} g = ${s.blue} g`,
        `${s.blue} g − ${s.less} g = ${s.red} g`,
        `${s.red} g = ${s.redKg} kg ${s.redGrams} g`,
      ]);
      for (const equation of equations ?? []) assert.ok(q.explanation.includes(equation!));
      seen.add(JSON.stringify(q.context));
      carryCases.add(s.greenGrams + s.extra % 1000 >= 1000);
      borrowCases.add(s.blue % 1000 < s.less % 1000);
    }
  }
  assert.ok(seen.size > 100, 'Seeds and indices must produce varied visible givens');
  assert.equal(carryCases.size, 2, 'Exercise addition with and without a kilogram carry');
  assert.equal(borrowCases.size, 2, 'Exercise subtraction with and without a kilogram exchange');
});

 test('rejects comparison errors, lost dependencies and noncanonical compound answers', () => {
  for (const seed of [0, 7, 29, 83, 401]) {
    const q = makeRagQuestion(seed, 3);
    const s = solveVisible(q);
    const spec = responseSpec(q);
    const accepts = (values: string[]) => structuredResponseCorrect(spec, q.answer, JSON.stringify(values));
    assert.equal(accepts(s.expected), true);
    assert.equal(accepts([String(s.green - s.extra), ...s.expected.slice(1)]), false);
    assert.equal(accepts([String(s.greenKg + s.greenGrams + s.extra), ...s.expected.slice(1)]), false);
    const wrongRed = s.blue + s.less;
    assert.equal(accepts([String(s.blue), String(Math.floor(wrongRed / 1000)), String(wrongRed % 1000)]), false);
    assert.equal(accepts([String(s.blue), String(s.greenKg), String(s.greenGrams)]), false);
    assert.equal(accepts([String(s.blue), String(s.redKg - 1), String(s.redGrams + 1000)]), false);
    assert.equal(accepts([String(s.blue), String(s.redGrams), String(s.redKg)]), false);
    assert.equal(structuredResponseReady(spec, JSON.stringify(s.expected.slice(0, 2))), false);
    assert.equal(structuredResponseReady(spec, JSON.stringify([`${s.blue}.5`, ...s.expected.slice(1)])), false);
    assert.equal(structuredResponseReady(spec, 'not an array'), false);
  }
});

 test('has stable candidate metadata and reproducible questions', () => {
  assert.equal(RAG_PATTERN.level, 3);
  assert.match(RAG_PATTERN.id, /^[a-z0-9]+(?:-[a-z0-9]+)*$/);
  assert.equal(RAG_PATTERN.canonicalPatternId, 'compound-mass-add-then-subtract-linked-parts');
  assert.deepEqual(RAG_PATTERN.skillIds, ['P3.S.AS.01', 'P3.S.MEASURE.02', 'P3.S.MEASURE.03']);
  for (const seed of [-11, 0, 19, 104729]) {
    assert.deepEqual(makeRagQuestion(seed), makeRagQuestion(seed, 0));
    assert.deepEqual(makeRagQuestion(seed, 5), makeRagQuestion(seed, 5));
    assert.notEqual(makeRagQuestion(seed, 0).key, makeRagQuestion(seed, 5).key);
  }
});

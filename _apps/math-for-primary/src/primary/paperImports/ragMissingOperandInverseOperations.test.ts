import {describe, expect, it} from 'vitest';
import {makeRagQuestion, RAG_PATTERN} from './ragMissingOperandInverseOperations';

// This solver parses only the displayed equality. It does not use answers,
// worked steps, seeds, generation parameters or generator helpers.
type Operator = '+' | '−' | '×' | '÷';
type Node =
  | {kind: 'number'; value: number}
  | {kind: 'blank'}
  | {kind: 'operation'; op: Operator; left: Node; right: Node};

function parseExpression(text: string): Node {
  const compact = text.replace(/\s+/g, '');
  const tokens = compact.match(/\d+|[□()+−×÷]/g) ?? [];
  if (!compact || tokens.join('') !== compact) throw new Error('Unsupported expression');
  let position = 0;

  function primary(): Node {
    const token = tokens[position++];
    if (token === '□') return {kind: 'blank'};
    if (token === '(') {
      const node = sum();
      if (tokens[position++] !== ')') throw new Error('Unclosed bracket');
      return node;
    }
    if (token !== undefined && /^\d+$/.test(token)) {
      return {kind: 'number', value: Number(token)};
    }
    throw new Error('Expected a number, box or bracket');
  }

  function term(): Node {
    let node = primary();
    while (tokens[position] === '×' || tokens[position] === '÷') {
      const op = tokens[position++] as Operator;
      node = {kind: 'operation', op, left: node, right: primary()};
    }
    return node;
  }

  function sum(): Node {
    let node = term();
    while (tokens[position] === '+' || tokens[position] === '−') {
      const op = tokens[position++] as Operator;
      node = {kind: 'operation', op, left: node, right: term()};
    }
    return node;
  }

  const node = sum();
  if (position !== tokens.length) throw new Error('Unexpected trailing tokens');
  return node;
}

function parseEquality(display: string): readonly [Node, Node] {
  const sides = display.split('=');
  if (sides.length !== 2) throw new Error('Expected exactly one equality');
  return [parseExpression(sides[0]!), parseExpression(sides[1]!)];
}

function evaluate(node: Node, box: number): number {
  if (node.kind === 'number') return node.value;
  if (node.kind === 'blank') return box;
  const left = evaluate(node.left, box);
  const right = evaluate(node.right, box);
  switch (node.op) {
    case '+': return left + right;
    case '−': return left - right;
    case '×': return left * right;
    case '÷': return left / right;
  }
}

function satisfies(equality: readonly [Node, Node], box: number): boolean {
  const difference = evaluate(equality[0], box) - evaluate(equality[1], box);
  return Number.isFinite(difference) && Math.abs(difference) < 1e-9;
}

function solveVisible(display: string): number {
  if ((display.match(/□/g) ?? []).length !== 1) throw new Error('Expected one unknown');
  const [left, right] = parseEquality(display);
  const gap = (box: number) => evaluate(left, box) - evaluate(right, box);
  let low = 1;
  let high = 1000000;
  const first = gap(low);
  const last = gap(high);
  if (!Number.isFinite(first) || !Number.isFinite(last) || first * last > 0) {
    throw new Error('No positive solution within the search bounds');
  }
  const increasing = last > first;
  // All supported visible forms are strictly monotone for a positive box.
  // Numerical search avoids reusing the generator's inverse formula.
  while (low <= high) {
    const middle = Math.floor((low + high) / 2);
    const difference = gap(middle);
    if (Math.abs(difference) < 1e-9) return middle;
    if ((difference < 0) === increasing) low = middle + 1;
    else high = middle - 1;
  }
  throw new Error('No whole-number solution');
}

function checkWholeArithmetic(node: Node, solution: number): void {
  const value = evaluate(node, solution);
  expect(Number.isSafeInteger(value)).toBe(true);
  expect(value).toBeGreaterThan(0);
  expect(value).toBeLessThanOrEqual(150000);
  if (node.kind !== 'operation') return;
  checkWholeArithmetic(node.left, solution);
  checkWholeArithmetic(node.right, solution);
  if (node.op === '÷') {
    const divisor = evaluate(node.right, solution);
    expect(divisor).toBeGreaterThan(0);
    expect(evaluate(node.left, solution) % divisor).toBe(0);
  }
}

function visibleVariant(display: string): string {
  if (display.startsWith('(')) return 'bracketed-divisor';
  if (/= □ ×/.test(display)) return 'affine-multiplier';
  if (/× \d+ \+ □ =/.test(display)) return 'product-addend';
  throw new Error('Unexpected visible form');
}

describe('missing operands by inverse operations', () => {
  it('independently solves hand-calculated examples with the correct precedence', () => {
    expect(solveVisible('17 × 5 + 17 × 10 − 3 × 15 = □ × 5 + 15')).toBe(39);
    expect(solveVisible('(8 × 5 + 8) ÷ 6 × (168 ÷ □) = 56')).toBe(24);
    expect(solveVisible('640 × 30 + □ = 90000')).toBe(70800);
  });

  it('solves visible givens across varied seeds and checks arithmetic and response requirements', () => {
    const seeds = [
      -2147483648, 2147483647, Number.MAX_SAFE_INTEGER,
      ...Array.from({length: 81}, (_, i) => i - 40),
    ];
    const variants = new Set<string>();
    const displays = new Set<string>();
    const correctPositions = new Set<number>();
    for (const seed of seeds) {
      for (let index = 0; index < 6; index++) {
        const question = makeRagQuestion(seed, index);
        expect(typeof question.display).toBe('string');
        const display = question.display!;
        const variant = visibleVariant(display);
        variants.add(variant);
        displays.add(display);
        const solved = solveVisible(display);
        const equality = parseEquality(display);
        expect(question.answer).toBe(String(solved));
        expect(satisfies(equality, solved)).toBe(true);
        expect(satisfies(equality, solved + 1)).toBe(false);
        if (solved > 1) expect(satisfies(equality, solved - 1)).toBe(false);
        for (const side of equality) checkWholeArithmetic(side, solved);

        expect(question.prompt.length).toBeGreaterThan(0);
        expect(question.hint.length).toBeGreaterThan(0);
        expect(question.explanation.length).toBeGreaterThan(0);
        expect(question.picture).toBeUndefined();
        expect(question.unit).toBeUndefined();
        expect(question.structuredResponse).toBeUndefined();
        expect(question.numberSentence).toBeUndefined();
        expect(question.workedSteps!.length).toBeGreaterThanOrEqual(3);
        for (const step of question.workedSteps!) {
          expect(step.text.length).toBeGreaterThan(0);
          expect(typeof step.equation).toBe('string');
          expect(step.equation).not.toContain('□');
          const [left, right] = parseEquality(step.equation!);
          expect(evaluate(left, 0)).toBeCloseTo(evaluate(right, 0), 10);
        }

        if (variant === 'product-addend') {
          expect(question.choices).toBeUndefined();
          expect(question.prompt).toContain(display.split(' = ')[1]!);
        } else {
          const choices = question.choices!;
          expect(choices).toHaveLength(4);
          expect(new Set(choices).size).toBe(4);
          for (const choice of choices) {
            expect(/^[1-9]\d*$/.test(choice)).toBe(true);
          }
          const satisfyingChoices = choices.filter(choice => satisfies(equality, Number(choice)));
          expect(satisfyingChoices).toEqual([String(solved)]);
          correctPositions.add(choices.indexOf(String(solved)));
        }
      }
    }
    expect([...variants].sort()).toEqual([
      'affine-multiplier', 'bracketed-divisor', 'product-addend',
    ]);
    expect(displays.size).toBeGreaterThan(100);
    expect(correctPositions.size).toBe(4);
  });

  it('is deterministic and makes all three variants available in consecutive indices', () => {
    for (const seed of [-19, 0, 42, 20261105]) {
      const variants = new Set<string>();
      for (let index = 0; index < 3; index++) {
        const first = makeRagQuestion(seed, index);
        expect(makeRagQuestion(seed, index)).toEqual(first);
        variants.add(visibleVariant(first.display!));
        expect(first.key).toBe(`${RAG_PATTERN.id}:${seed}:${index}`);
      }
      expect(variants.size).toBe(3);
      expect(makeRagQuestion(seed)).toEqual(makeRagQuestion(seed, 0));
    }
  });

  it('declares the requested family and only permitted curriculum skills', () => {
    expect(RAG_PATTERN.level).toBe(5);
    expect(RAG_PATTERN.id).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    expect(RAG_PATTERN.canonicalPatternId).toBe('p5-missing-operand-inverse-operations');
    expect(RAG_PATTERN.skillIds).toEqual(['P5.S.WN.03', 'P5.S.WN.02']);
    expect(() => makeRagQuestion(NaN)).toThrow(RangeError);
    expect(() => makeRagQuestion(1, 0.5)).toThrow(RangeError);
  });
});

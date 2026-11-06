import { expect, it } from 'vitest';
import { correctAnswer, type Question } from '../generate';
import { makeRagQuestion } from './ragP2TicketCosts';

function readPrices(q: Question) {
  const board = q.picture;
  if (board?.type !== 'paper' || board.layout !== 'cards') throw new Error('Missing ticket prices');
  const { cards } = board;
  expect(cards).toHaveLength(2);
  function read(label: string) {
    const card = cards.find(item => item.label === label);
    const match = /^\$(\d+)(?:\.00)?$/.exec(card?.value ?? '');
    if (!match) throw new Error(`Missing whole-dollar price for ${label}`);
    return Number(match[1]);
  }
  const adult = read('Adult');
  const child = read('Child');
  expect(child).toBeGreaterThan(0);
  expect(adult).toBeGreaterThan(child);
  expect(adult).toBeLessThanOrEqual(10);
  return { adult, child };
}

function checkVisibleQuestion(q: Question): string {
  const prices = readPrices(q);
  const story = q.context?.join(' ') ?? '';
  const order = /Tickets ordered: ([A-Za-z, ]+)\./.exec(story);
  if (order) {
    expect(q.prompt).toContain('just the adult tickets');
    const tickets = order[1].split(', ');
    expect(tickets.every(ticket => ticket === 'Adult' || ticket === 'Child')).toBe(true);
    const adults = tickets.filter(ticket => ticket === 'Adult');
    expect(adults.length).toBeGreaterThanOrEqual(2);
    expect(adults.length).toBeLessThanOrEqual(4);
    expect(tickets).toContain('Child');
    const subtotal = adults.reduce(sum => sum + prices.adult, 0);
    const wholeOrder = subtotal + (tickets.length - adults.length) * prices.child;
    expect(q.unit).toBe('dollars');
    expect(correctAnswer(q, String(subtotal))).toBe(true);
    expect(correctAnswer(q, String(wholeOrder))).toBe(false);
    return 'adult subtotal';
  }

  const family = /Mum and Dad take (\d+) children/.exec(story);
  if (!family) throw new Error('Missing family headcounts');
  expect(story).toContain('Each person needs one ticket');
  const children = Number(family[1]);
  expect(children).toBeGreaterThanOrEqual(2);
  expect(children).toBeLessThanOrEqual(5);
  const childCost = Array.from({ length: children }).reduce<number>(sum => sum + prices.child, 0);
  const total = childCost + prices.adult + prices.adult;
  expect(q.prompt).toContain('all its tickets');
  if (q.prompt.includes('(a)')) {
    expect(q.prompt).toContain('children’s tickets cost');
    expect(q.structuredResponse).toMatchObject({ kind: 'number-pair', firstLabel: '(a) Children’s tickets ($)', secondLabel: '(b) Whole family ($)' });
    const pair = (a: number, b: number) => JSON.stringify([String(a), String(b)]);
    expect(correctAnswer(q, pair(childCost, total))).toBe(true);
    expect(correctAnswer(q, pair(total, childCost))).toBe(false);
    expect(correctAnswer(q, pair(childCost, total - prices.adult))).toBe(false);
    return 'linked amounts';
  }
  expect(q.unit).toBe('dollars');
  expect(q.structuredResponse).toBeUndefined();
  expect(correctAnswer(q, String(total))).toBe(true);
  expect(correctAnswer(q, String(childCost))).toBe(false);
  return 'family total';
}

it('grades the amount requested from the displayed prices and people across seeds and indices', () => {
  const forms = new Set<string>();
  for (let seed = 0; seed < 80; seed++) {
    for (let index = 0; index < 4; index++) {
      forms.add(checkVisibleQuestion(makeRagQuestion(seed, index)));
    }
  }
  expect(forms).toEqual(new Set(['adult subtotal', 'linked amounts', 'family total']));
});

it('replays a question exactly and varies its visible givens within a session', () => {
  const givens = new Set<string>();
  for (let index = 0; index < 32; index++) {
    const q = makeRagQuestion(19, index);
    expect(makeRagQuestion(19, index)).toEqual(q);
    givens.add(JSON.stringify([q.context, q.picture]));
  }
  expect(givens.size).toBeGreaterThanOrEqual(8);
});

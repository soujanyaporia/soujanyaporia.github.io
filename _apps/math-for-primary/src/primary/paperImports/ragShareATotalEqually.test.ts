import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {expect, it} from 'vitest';
import {correctAnswer, type Question} from '../generate';
import {GroupingObjects} from '../GroupingBuilder';
import {PaperMaterials} from '../PaperMaterials';
import {makeRagQuestion} from './ragShareATotalEqually';

// Count the printable objects, or read the story and count the people named in it.
function readDeal(q: Question) {
  const story = (q.context ?? []).join(' ');
  if (q.grouping || q.picture) {
    const figure = q.grouping
      ? renderToStaticMarkup(createElement(GroupingObjects, {spec: q.grouping}))
      : renderToStaticMarkup(createElement(PaperMaterials, {model: q.picture!}));
    const total = (figure.match(q.grouping ? /<svg\b/g : /<i\b/g) ?? []).length;
    const recipients = /(\d+) (boxes|children)\b/.exec(story);
    if (!recipients) throw Error('Missing recipients for the pictured collection');
    expect(story.match(/\d+/g)).toEqual([recipients[1]]);
    return {total, groups: Number(recipients[1]), scene: recipients[2]};
  }
  const supply = /(\w+) has (\d+) tickets\./.exec(story);
  const guests = /equally with ([^.]+)\./.exec(story);
  if (!supply || !guests) throw Error('Missing supply or people');
  expect(story).toContain(supply[1] + ' gets a share too.');
  const people = [supply[1], ...guests[1].split(/, | and /)];
  expect(new Set(people).size).toBe(people.length);
  return {total: Number(supply[2]), groups: people.length, scene: 'holder'};
}

it('deals the visible items one at a time and checks both kinds of answer', () => {
  const modes = new Set<string>();
  for (let seed = 0; seed < 40; seed++) for (let index = 0; index < 5; index++) {
    const q = makeRagQuestion(seed, index);
    const {total, groups, scene} = readDeal(q);
    expect(groups).toBeGreaterThanOrEqual(2);
    expect(total).toBeGreaterThan(0);
    expect(total).toBeLessThanOrEqual(20);
    expect([14, 18]).not.toContain(total);
    const piles: number[][] = Array.from({length: groups}, () => []);
    for (let id = 0; id < total; id++) piles[id % groups].push(id);
    const sizes = piles.map(p => p.length);
    expect(new Set(sizes).size).toBe(1);
    expect(q.workedSteps?.some(s => s.equation === sizes.join(' + ') + ' = ' + total)).toBe(true);
    modes.add(scene + (q.grouping ? ':build' : ':number'));
    if (q.grouping) {
      expect(correctAnswer(q, JSON.stringify(piles.slice().reverse()))).toBe(true);
      expect(correctAnswer(q, q.answer)).toBe(true);
      piles[1].push(piles[0].pop()!);
      expect(correctAnswer(q, JSON.stringify(piles))).toBe(false);
    } else {
      expect(q.unit).toBe(scene === 'holder' ? 'tickets' : 'gifts');
      expect(q.answer).toBe(String(sizes[0]));
      expect(correctAnswer(q, String(total))).toBe(false);
      if (scene === 'holder') expect(correctAnswer(q, String(total / (groups - 1)))).toBe(false);
    }
  }
  expect([...modes].sort()).toEqual(['boxes:build', 'boxes:number', 'children:build', 'children:number', 'holder:number']);
});

it('keeps the same whole and recipients when a child moves from making groups to writing the share', () => {
  for (let seed = 0; seed < 15; seed++) for (let i = 0; i < 5; i++) {
    const build = makeRagQuestion(seed, i);
    if (!build.grouping) continue;
    const next = makeRagQuestion(seed, i + 1);
    expect(next.grouping).toBeUndefined();
    expect(readDeal(next)).toEqual(readDeal(build));
    expect(makeRagQuestion(seed, i)).toEqual(build);
  }
});

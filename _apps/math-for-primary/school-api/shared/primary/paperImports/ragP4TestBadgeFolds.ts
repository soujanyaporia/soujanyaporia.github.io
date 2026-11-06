import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';
import type { Batch11UpperPicture } from './batch11UpperPicture';

export const RAG_PATTERN = {
  id: 'rag-p4-test-badge-folds',
  level: 4,
  title: 'Which fold matches the spots?',
  objective: 'Test a marked line by folding the whole figure, including the marks inside it.',
  skillIds: ['P4.S.SYM.01'],
  canonicalPatternId: 'p4-test-proposed-lines-of-symmetry',
};

type Fold = { letter: string; hour: number };
type Badge = { x: number; y: number; rim: number; orbit: number; spots: number[]; folds: Fold[] };
const letters = ['J', 'K', 'L', 'M'];
// Hours increase clockwise from the top. A diameter has the same direction after six hours.
const diameters = [0, 1.5, 3, 4.5];
const wrap = (hour: number) => (hour % 12 + 12) % 12;
const hourName = (hour: number) => String(wrap(hour) || 12);
function direction(hour: number) {
  return Number.isInteger(hour) ? hourName(hour) + " o'clock"
    : 'halfway between ' + hourName(Math.floor(hour)) + ' and ' + hourName(Math.ceil(hour));
}
function spotPair(r: Rng, axis: number) {
  const middle = axis + r.pick([0, 6]);
  const gap = r.pick(Number.isInteger(axis) ? [1, 2] : [1.5, 2.5]);
  return [wrap(middle - gap), wrap(middle + gap)];
}

function makeBadges(r: Rng, shared: boolean, seekMatch: boolean): Badge[] {
  if (shared) {
    const start = r.int(0, 11);
    const spots = seekMatch ? spotPair(r, r.pick(diameters)) : [start, wrap(start + 4), wrap(start + 8)];
    // Three equally spaced spots give three true folds. A fourth diameter misses every spot.
    const hours = seekMatch ? diameters : [...spots.map(h => h % 6), (start + r.pick([1, 3, 5])) % 6];
    const folds = r.shuffle(hours).map((hour, i) => ({ hour, letter: letters[i] }));
    return [{ x: 160, y: 100, rim: 63, orbit: r.int(32, 42), spots, folds }];
  }
  const special = r.int(0, 3);
  return r.shuffle(diameters).map((symmetry, i) => {
    const shouldMatch = i === special ? seekMatch : !seekMatch;
    const hour = shouldMatch ? symmetry : r.pick(diameters.filter(h => h !== symmetry));
    return {
      x: 88 + 148 * (i % 2), y: 50 + 100 * Math.floor(i / 2), rim: 32,
      orbit: r.int(16, 21), spots: spotPair(r, symmetry), folds: [{ letter: letters[i], hour }],
    };
  });
}

function picture(badges: Badge[]): Batch11UpperPicture {
  const marks: Batch11UpperPicture['marks'] = [];
  const descriptions: string[] = [];
  for (const { x, y, rim, orbit, spots, folds } of badges) {
    const point = (hour: number, distance: number) => ({
      x: x + distance * Math.sin(hour * Math.PI / 6),
      y: y - distance * Math.cos(hour * Math.PI / 6),
    });
    marks.push({ kind: 'circle', cx: x, cy: y, r: rim });
    const name = badges.length === 1 ? 'The badge' : 'Badge ' + folds[0].letter;
    descriptions.push(name + ' has equal spots at the same distance from the centre, towards ' + spots.map(direction).join(', ') + '.');
    for (const { letter, hour } of folds) {
      const a = point(hour, rim + 6), b = point(hour + 6, rim + 6);
      const label = badges.length === 1 ? point(hour, rim + 22) : { x: x - rim - 19, y };
      marks.push({ kind: 'line', x1: a.x, y1: a.y, x2: b.x, y2: b.y, dashed: true },
        { kind: 'text', x: label.x - 5, y: label.y + 5, text: letter });
      descriptions.push('Fold ' + letter + ' goes through the centre towards ' + direction(hour) + '.');
    }
    for (const hour of spots) {
      const p = point(hour, orbit);
      marks.push({ kind: 'circle', cx: p.x, cy: p.y, r: rim * 0.115, fill: '#235b4c' });
    }
  }
  return { type: 'batch11-upper', label: descriptions.join(' '), marks };
}

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = [RAG_PATTERN.id, seed, index].join(':');
  const r = new Rng(hashString(key));
  const mode = ((hashString(RAG_PATTERN.id + ':' + seed) % 4 + index) % 4 + 4) % 4;
  const shared = mode < 2, seekMatch = mode % 2 === 0;
  const badges = makeBadges(r, shared, seekMatch);
  const noun = shared ? 'Line' : 'Badge';
  const workedSteps = [{ text: 'Every fold goes through the centre, so the round edge matches. To follow the spots, imagine a clock with 12 at the top.' }];
  const hits: string[] = [];
  for (const { spots, folds } of badges) {
    for (const { letter, hour } of folds) {
      const across = (spot: number) => wrap(2 * hour - spot);
      const missed = spots.find(spot => !spots.includes(across(spot)));
      const name = noun + ' ' + letter;
      if ((missed === undefined) === seekMatch) hits.push(name);
      if (missed !== undefined) {
        workedSteps.push({ text: name + ': the spot near ' + direction(missed) + ' folds onto a blank place near ' + direction(across(missed)) + '.' });
      } else {
        const moved = spots.find(spot => across(spot) !== spot)!;
        const fixed = spots.find(spot => across(spot) === spot);
        workedSteps.push({ text: name + ': the spots near ' + direction(moved) + ' and ' + direction(across(moved)) + ' swap places.' +
          (fixed === undefined ? '' : ' The spot near ' + direction(fixed) + ' stays on the fold.') });
      }
    }
  }
  if (hits.length !== 1) throw new Error('Expected one answer to the fold question');
  const answer = hits[0];
  const prompt = shared
    ? (seekMatch ? 'Which line makes the two halves of the badge match when folded?' : 'Which line leaves a spot without a match when the badge is folded?')
    : (seekMatch ? 'Which badge has matching halves when folded along its dashed line?' : 'Which badge has a spot without a match when folded along its dashed line?');
  workedSteps.push({ text: answer + (seekMatch ? ' is the only choice where everything matches.' : ' is the only choice where a spot lands on a blank place.') });
  return {
    key, prompt, context: [shared ? 'The letters name possible folds. Match the round edge and the spots, trying one dashed line at a time.'
      : 'Each round badge has its own dashed fold line. The letter beside it names the badge.'],
    picture: picture(badges), choices: letters.map(letter => noun + ' ' + letter), answer,
    hint: 'Imagine folding along the dashed line. Look directly across it from each spot, the same distance away.',
    workedSteps, explanation: workedSteps.map(step => step.text).join(' '),
  };
}

import { NOUNS as n, units, type Frame, type Scene } from './frame';

/** Stories about two groups at once: part-part-whole and comparison. */

const colourScenes: Scene[] = [
  { unit: n.balloon, vars: { c1: 'red', c2: 'blue' } },
  { unit: n.bead, vars: { c1: 'green', c2: 'yellow' } },
  { unit: n.marble, vars: { c1: 'blue', c2: 'white' } },
  { unit: n.crayon, vars: { c1: 'pink', c2: 'purple' } },
  { unit: n.ball, vars: { c1: 'orange', c2: 'green' } },
];

const childScenes: Scene[] = [
  { unit: n.child, nouns: { k1: n.boy, k2: n.girl }, vars: { where: 'in the reading corner' } },
  { unit: n.child, nouns: { k1: n.girl, k2: n.boy }, vars: { where: 'in the school hall' } },
  { unit: n.pupil, nouns: { k1: n.boy, k2: n.girl }, vars: { where: 'on the school bus' } },
];

const fruitScenes: Scene[] = [
  { unit: n.fruit, nouns: { k1: n.apple, k2: n.orange } },
  { unit: n.fruit, nouns: { k1: n.mango, k2: n.pear } },
  { unit: n.fruit, nouns: { k1: n.banana, k2: n.rambutan } },
];

const owned = units(n.sticker, n.marble, n.card, n.shell, n.pencil, n.stamp);

// ---------------------------------------------------------------- combine: whole unknown

const combineWhole: Frame[] = [
  {
    id: 'comb-colours',
    structure: 'combine.whole',
    scenes: colourScenes,
    variants: [['There {part1:are} {part1} {c1} {part1:noun} and {part2} {c2} {part2:noun} in a box.', 'How many {items} are there altogether?']],
    answer: 'There {whole:are} {whole:n} altogether.',
  },
  {
    id: 'comb-colours-own',
    structure: 'combine.whole',
    scenes: colourScenes,
    variants: [['{A} has {part1} {c1} {part1:noun} and {part2} {c2} {part2:noun}.', 'How many {items} does {he} have in all?']],
    answer: '{He} has {whole:n} in all.',
  },
  {
    id: 'comb-two-people',
    structure: 'combine.whole',
    scenes: [...owned, ...units(n.storyBook)],
    variants: [
      ['{A} has {part1:n}.', '{B} has {part2:n}.', 'How many {items} do they have altogether?'],
      ['{A} collected {part1:n} and {B} collected {part2:n}.', 'How many {items} did they collect in all?'],
    ],
    answer: 'They have {whole:n} altogether.',
  },
  {
    id: 'comb-children',
    structure: 'combine.whole',
    scenes: childScenes,
    variants: [['There {part1:are} {part1:n:k1} and {part2:n:k2} {where}.', 'How many {items} are there in all?']],
    answer: 'There {whole:are} {whole:n} {where}.',
  },
  {
    id: 'comb-fruit',
    structure: 'combine.whole',
    scenes: fruitScenes,
    variants: [['{A} bought {part1:n:k1} and {part2:n:k2} at the market.', 'How many {items} did {he} buy altogether?']],
    answer: '{He} bought {whole:n} altogether.',
    maxValue: 30,
  },
  {
    id: 'comb-pond',
    structure: 'combine.whole',
    scenes: units(n.duck, n.goose),
    variants: [['{part1:n} {part1:are} swimming in the pond.', '{part2:n} {part2:are} resting on the grass.', 'How many {items} are there in all?']],
    answer: 'There {whole:are} {whole:n} in all.',
  },
  {
    id: 'comb-folding',
    structure: 'combine.whole',
    scenes: units(n.crane, n.star),
    variants: [['{A} folded {part1:n} on {day}.', 'On {day2}, {he} folded {part2:n}.', 'How many {items} did {he} fold altogether?']],
    answer: '{He} folded {whole:n} altogether.',
  },
  {
    id: 'comb-shelves',
    structure: 'combine.whole',
    scenes: units(n.book, n.storyBook),
    variants: [['There {part1:are} {part1:n} on the top shelf and {part2:n} on the bottom shelf.', 'How many {items} are on the two shelves?']],
    answer: 'There {whole:are} {whole:n} on the two shelves.',
  },
];

// ---------------------------------------------------------------- combine: part unknown

const combinePart: Frame[] = [
  {
    id: 'combp-colours',
    structure: 'combine.part',
    scenes: colourScenes,
    variants: [['There are {whole:n} in a box.', '{part1} of them are {c1} and the rest are {c2}.', 'How many {c2} {items} are there?']],
    answer: 'There are {part2} {c2} {items}.',
    minValue: 2,
  },
  {
    id: 'combp-children',
    structure: 'combine.part',
    scenes: childScenes,
    variants: [['There are {whole:n} {where}.', '{part1} of them are {k1s}.', 'How many {k2s} are there?']],
    answer: 'There are {part2:n:k2}.',
    minValue: 2,
  },
  {
    id: 'combp-people',
    structure: 'combine.part',
    scenes: owned,
    variants: [['{A} and {B} have {whole:n} altogether.', '{A} has {part1}.', 'How many {items} does {B} have?']],
    answer: '{B} has {part2:n}.',
  },
  {
    id: 'combp-basket',
    structure: 'combine.part',
    scenes: fruitScenes,
    variants: [['A basket has {whole:n}.', '{part1} of them are {k1s}.', 'The rest are {k2s}.', 'How many {k2s} are in the basket?']],
    answer: 'There are {part2:n:k2} in the basket.',
    minValue: 2,
    maxValue: 30,
  },
];

// ---------------------------------------------------------------- compare: difference unknown

const compareDifference: Frame[] = [
  {
    id: 'cmpd-more',
    structure: 'compare.difference',
    scenes: owned,
    variants: [
      ['{A} has {big:n}.', '{B} has {small:n}.', 'How many more {items} does {A} have than {B}?'],
      ['{B} has {small:n}.', '{A} has {big:n}.', 'How many more {items} does {A} have than {B}?'],
    ],
    answer: '{A} has {diff:more} than {B}.',
  },
  {
    id: 'cmpd-fewer',
    structure: 'compare.difference',
    scenes: owned,
    variants: [['{A} has {big:n}.', '{B} has {small:n}.', 'How many fewer {items} does {B} have than {A}?']],
    answer: '{B} has {diff:fewer} than {A}.',
  },
  {
    id: 'cmpd-tower',
    structure: 'compare.difference',
    scenes: units(n.block, n.cup),
    variants: [['{A} built a tower with {big:n}.', '{B} built a tower with {small:n}.', 'How many more {items} did {A} use?']],
    answer: '{A} used {diff:more}.',
  },
  {
    id: 'cmpd-buses',
    structure: 'compare.difference',
    scenes: units(n.person, n.passenger),
    variants: [['The red bus has {big:n} on it.', 'The blue bus has {small:n} on it.', 'How many more {items} are on the red bus?']],
    answer: 'There {diff:are} {diff:more} on the red bus.',
  },
  {
    id: 'cmpd-reading',
    structure: 'compare.difference',
    scenes: units(n.storyBook, n.page),
    variants: [['{A} read {big:n} this week.', '{B} read {small:n}.', 'How many more {items} did {A} read than {B}?']],
    answer: '{A} read {diff:more} than {B}.',
  },
  {
    id: 'cmpd-goals',
    structure: 'compare.difference',
    scenes: units(n.goal),
    variants: [['In a football match, the Tigers scored {big:n}.', 'The Eagles scored {small:n}.', 'How many more {items} did the Tigers score?']],
    answer: 'The Tigers scored {diff:more}.',
    maxValue: 12,
  },
];

// ---------------------------------------------------------------- compare: "more than" / "fewer than"

const compareMore: Frame[] = [
  {
    id: 'cmpm-has',
    structure: 'compare.more',
    scenes: owned,
    variants: [['{A} has {small:n}.', '{B} has {diff:more} than {A}.', 'How many {items} does {B} have?']],
    answer: '{B} has {big:n}.',
  },
  {
    id: 'cmpm-goals',
    structure: 'compare.more',
    scenes: units(n.goal),
    variants: [['The blue team scored {small:n}.', 'The red team scored {diff:more} than the blue team.', 'How many {items} did the red team score?']],
    answer: 'The red team scored {big:n}.',
    maxValue: 12,
  },
  {
    id: 'cmpm-age',
    structure: 'compare.more',
    scenes: units(n.year),
    variants: [["{A}'s little brother is {small} years old.", '{A} is {diff:n} older than him.', 'How old is {A}?']],
    answer: '{A} is {big} years old.',
    minValue: 2,
    maxValue: 12,
  },
  {
    id: 'cmpm-shelf',
    structure: 'compare.more',
    scenes: units(n.book, n.plant),
    variants: [['There {small:are} {small:n} on the first shelf.', 'The second shelf has {diff:more} than the first shelf.', 'How many {items} are on the second shelf?']],
    answer: 'There {big:are} {big:n} on the second shelf.',
  },
];

const compareFewer: Frame[] = [
  {
    id: 'cmpf-has',
    structure: 'compare.fewer',
    scenes: owned,
    variants: [['{A} has {big:n}.', '{B} has {diff:fewer} than {A}.', 'How many {items} does {B} have?']],
    answer: '{B} has {small:n}.',
  },
  {
    id: 'cmpf-canteen',
    structure: 'compare.fewer',
    scenes: units(n.curryPuff, n.bun, n.sandwich),
    variants: [['The school canteen sold {big:n} on {day}.', 'On {day2}, it sold {diff:fewer}.', 'How many {items} did it sell on {day2}?']],
    answer: 'It sold {small:n} on {day2}.',
  },
  {
    id: 'cmpf-age',
    structure: 'compare.fewer',
    scenes: units(n.year),
    variants: [['{A} is {big} years old.', '{His} little sister is {diff:n} younger.', 'How old is {his} little sister?']],
    answer: '{His} little sister is {small} years old.',
    minValue: 2,
    maxValue: 12,
  },
  {
    id: 'cmpf-garden',
    structure: 'compare.fewer',
    scenes: units(n.plant, n.flower),
    variants: [['{A} planted {big:n} in the school garden.', '{B} planted {diff:fewer} than {A}.', 'How many {items} did {B} plant?']],
    answer: '{B} planted {small:n}.',
  },
];

export const GROUP_FRAMES: Frame[] = [
  ...combineWhole,
  ...combinePart,
  ...compareDifference,
  ...compareMore,
  ...compareFewer,
];

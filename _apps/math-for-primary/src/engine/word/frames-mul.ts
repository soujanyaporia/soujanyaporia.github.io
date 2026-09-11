import { NOUNS as n, units, type Frame, type Scene } from './frame';

/**
 * Stories about equal groups (multiplication and division) and about
 * comparison language that does not match the operation ("fewer" that
 * needs adding). Every multiplication story really is about equal groups.
 */

const owned = units(n.sticker, n.marble, n.card, n.shell, n.pencil, n.stamp);

// ---------------------------------------------------------------- equal groups: total unknown

const groupsTotal: Frame[] = [
  {
    id: 'mul-bags',
    structure: 'groups.total',
    scenes: units(n.apple, n.orange, n.sweet, n.marble),
    variants: [
      ['There are {groups} bags.', 'Each bag has {each:n}.', 'How many {items} are there altogether?'],
      ['{A} has {groups} bags of {items}.', 'There are {each:n} in each bag.', 'How many {items} does {he} have?'],
    ],
    answer: 'There are {total:n} altogether.',
  },
  {
    id: 'mul-boxes',
    structure: 'groups.total',
    scenes: units(n.crayon, n.pencil, n.cookie, n.cupcake),
    variants: [['{A} buys {groups} boxes of {items}.', 'Each box has {each:n}.', 'How many {items} does {he} buy?']],
    answer: '{He} buys {total:n}.',
  },
  {
    id: 'mul-plates',
    structure: 'groups.total',
    scenes: units(n.curryPuff, n.dumpling, n.cookie, n.strawberry),
    variants: [['The canteen auntie puts {each:n} on each plate.', 'She fills {groups} plates.', 'How many {items} does she use?']],
    answer: 'She uses {total:n}.',
  },
  {
    id: 'mul-tables',
    structure: 'groups.total',
    scenes: units(n.child, n.pupil),
    variants: [
      ['There are {groups} tables in the classroom.', '{each:n} sit at each table.', 'How many {items} are there?'],
      ['{groups} tables each have {each:n} sitting at them.', 'How many {items} are there altogether?'],
    ],
    answer: 'There are {total:n}.',
  },
  {
    id: 'mul-packets',
    structure: 'groups.total',
    scenes: units(n.sticker, n.card, n.stamp),
    variants: [['{A} has {groups} packets of {items}.', 'Each packet has {each:n}.', 'How many {items} does {he} have?']],
    answer: '{He} has {total:n}.',
  },
  {
    id: 'mul-vases',
    structure: 'groups.total',
    scenes: units(n.flower),
    variants: [['Grandma puts {each:n} in each vase.', 'She fills {groups} vases.', 'How many {items} does she use?']],
    answer: 'She uses {total:n}.',
  },
];

// ---------------------------------------------------------------- arrays

const arrayTotal: Frame[] = [
  {
    id: 'arr-chairs',
    structure: 'array.total',
    scenes: units(n.chair),
    variants: [
      ['The chairs in the school hall are in {groups} rows.', 'There are {each:n} in each row.', 'How many {items} are there?'],
      ['{groups} rows of {items} are set out for the concert.', 'Each row has {each}.', 'How many {items} are there altogether?'],
    ],
    answer: 'There are {total:n}.',
  },
  {
    id: 'arr-garden',
    structure: 'array.total',
    scenes: units(n.flower, n.plant),
    variants: [['{A} plants {items} in {groups} rows.', '{He} puts {each:n} in each row.', 'How many {items} does {he} plant?']],
    answer: '{He} plants {total:n}.',
  },
  {
    id: 'arr-tray',
    structure: 'array.total',
    scenes: units(n.muffin, n.cupcake, n.cookie),
    variants: [['A baking tray has {groups} rows of {items}.', 'Each row has {each:n}.', 'How many {items} are on the tray?']],
    answer: 'There are {total:n} on the tray.',
  },
  {
    id: 'arr-sheet',
    structure: 'array.total',
    scenes: units(n.sticker, n.stamp),
    variants: [['{A} has a sheet of {items}.', 'It has {groups} rows with {each:n} in each row.', 'How many {items} are on the sheet?']],
    answer: 'There are {total:n} on the sheet.',
  },
];

// ---------------------------------------------------------------- repeated quantities

const rateTotal: Frame[] = [
  {
    id: 'rate-children',
    structure: 'rate.total',
    scenes: units(n.pencil, n.sticker, n.sweet, n.crayon),
    variants: [['Each child gets {each:n}.', 'There are {groups} children.', 'How many {items} are given out?']],
    answer: '{total:n} are given out.',
  },
  {
    id: 'rate-savings',
    structure: 'rate.total',
    scenes: units(n.coin),
    variants: [['{A} saves {each:n} every day.', 'How many {items} does {he} save in {groups} days?']],
    answer: '{He} saves {total:n}.',
  },
  {
    id: 'rate-reading',
    structure: 'rate.total',
    scenes: units(n.page),
    variants: [['{A} reads {each:n} of {his} book every day.', 'How many {items} does {he} read in {groups} days?']],
    answer: '{He} reads {total:n}.',
  },
  {
    id: 'rate-cars',
    structure: 'rate.total',
    scenes: units(n.person),
    variants: [['Each car can take {each:n}.', '{groups} cars are full.', 'How many {items} are in the cars?']],
    answer: 'There are {total:n} in the cars.',
  },
];

// ---------------------------------------------------------------- missing group size

const groupsSize: Frame[] = [
  {
    id: 'size-boxes',
    structure: 'groups.size',
    scenes: units(n.pencil, n.crayon, n.marble),
    variants: [['{groups} boxes have the same number of {items}.', 'Altogether there are {total:n}.', 'How many {items} are in each box?']],
    answer: 'There are {each:n} in each box.',
  },
  {
    id: 'size-plates',
    structure: 'groups.size',
    scenes: units(n.cookie, n.strawberry, n.curryPuff),
    variants: [['{A} puts the same number of {items} on {groups} plates.', '{He} uses {total:n} altogether.', 'How many {items} are on each plate?']],
    answer: 'There are {each:n} on each plate.',
  },
  {
    id: 'size-rows',
    structure: 'groups.size',
    scenes: units(n.chair),
    variants: [['There are {total:n} in {groups} equal rows.', 'How many {items} are in each row?']],
    answer: 'There are {each:n} in each row.',
  },
];

// ---------------------------------------------------------------- sharing (how many in each?)

const shareEach: Frame[] = [
  {
    id: 'share-children',
    structure: 'share.each',
    scenes: units(n.sweet, n.sticker, n.strawberry, n.marble),
    variants: [['{total:n} are shared equally among {groups} children.', 'How many {items} does each child get?']],
    answer: 'Each child gets {each:n}.',
  },
  {
    id: 'share-boxes',
    structure: 'share.each',
    scenes: units(n.cookie, n.muffin, n.cupcake),
    variants: [['Mum puts {total:n} equally into {groups} boxes.', 'How many {items} are in each box?']],
    answer: 'There are {each:n} in each box.',
  },
  {
    id: 'share-teacher',
    structure: 'share.each',
    scenes: units(n.crayon, n.pencil, n.book),
    variants: [['The teacher gives out {total:n} equally to {groups} groups.', 'How many {items} does each group get?']],
    answer: 'Each group gets {each:n}.',
  },
  {
    id: 'share-teams',
    structure: 'share.each',
    scenes: units(n.child, n.pupil),
    variants: [['{total:n} are split equally into {groups} teams.', 'How many {items} are in each team?']],
    answer: 'There are {each:n} in each team.',
  },
  {
    id: 'share-friends',
    structure: 'share.each',
    scenes: units(n.strawberry, n.grape, n.cookie),
    variants: [['{A} shares {total:n} equally among {groups} friends.', 'How many {items} does each friend get?']],
    answer: 'Each friend gets {each:n}.',
  },
];

// ---------------------------------------------------------------- grouping (how many groups?)

const containerScenes: Scene[] = [
  { unit: n.strawberry, vars: { box: 'basket', boxes: 'baskets' } },
  { unit: n.sweet, vars: { box: 'bag', boxes: 'bags' } },
  { unit: n.apple, vars: { box: 'bag', boxes: 'bags' } },
  { unit: n.marble, vars: { box: 'box', boxes: 'boxes' } },
];

const groupCount: Frame[] = [
  {
    id: 'count-teams',
    structure: 'group.count',
    scenes: units(n.pupil, n.child),
    variants: [['There are {total:n}.', 'Each team has {each}.', 'How many teams are there?']],
    answer: 'There are {groups} teams.',
  },
  {
    id: 'count-bags',
    structure: 'group.count',
    scenes: containerScenes,
    variants: [['{A} has {total:n}.', '{He} puts {each} in each {box}.', 'How many {boxes} does {he} need?']],
    answer: '{He} needs {groups} {boxes}.',
  },
  {
    id: 'count-cars',
    structure: 'group.count',
    scenes: units(n.person),
    variants: [['{total:n} are going on a trip to {park}.', 'Each car can take {each}.', 'How many cars are needed?']],
    answer: '{groups} cars are needed.',
  },
  {
    id: 'count-baker',
    structure: 'group.count',
    scenes: units(n.muffin, n.cupcake, n.cookie),
    variants: [['A baker has {total:n}.', 'She packs {each} in each box.', 'How many boxes can she fill?']],
    answer: 'She can fill {groups} boxes.',
  },
  {
    id: 'count-rows',
    structure: 'group.count',
    scenes: units(n.chair),
    variants: [['There are {total:n} in the hall.', 'They are put in rows of {each}.', 'How many rows are there?']],
    answer: 'There are {groups} rows.',
  },
];

// ---------------------------------------------------------------- tricky comparison language

const trickyCompare: Frame[] = [
  // Consistent language, harder sentence: the answer does come from "fewer" → subtract.
  {
    id: 'cmpf-who',
    structure: 'compare.fewer',
    scenes: owned,
    variants: [['{A} has {diff:fewer} than {B}, who has {big}.', 'How many {items} does {A} have?']],
    answer: '{A} has {small:n}.',
  },
  {
    id: 'cmpm-who',
    structure: 'compare.more',
    scenes: owned,
    variants: [['{A} has {diff:more} than {B}, who has {small}.', 'How many {items} does {A} have?']],
    answer: '{A} has {big:n}.',
  },
  // Inconsistent language: "more" that needs subtracting, "fewer" that needs adding.
  {
    id: 'ref-more',
    structure: 'compare.more_ref',
    scenes: owned,
    variants: [['{A} has {big:n}.', '{He} has {diff:more} than {B}.', 'How many {items} does {B} have?']],
    answer: '{B} has {small:n}.',
  },
  {
    id: 'ref-more-tower',
    structure: 'compare.more_ref',
    scenes: units(n.block, n.cup),
    variants: [['{A} used {big:n} to build a tower.', 'That is {diff:more} than {B} used.', 'How many {items} did {B} use?']],
    answer: '{B} used {small:n}.',
  },
  {
    id: 'ref-fewer',
    structure: 'compare.fewer_ref',
    scenes: [...owned, ...units(n.apple)],
    variants: [['{A} has {small:n}.', '{He} has {diff:fewer} than {B}.', 'How many {items} does {B} have?']],
    answer: '{B} has {big:n}.',
  },
  {
    id: 'ref-fewer-read',
    structure: 'compare.fewer_ref',
    scenes: units(n.storyBook),
    variants: [['{A} read {small:n} this month.', 'That is {diff:fewer} than {B} read.', 'How many {items} did {B} read?']],
    answer: '{B} read {big:n}.',
    maxValue: 30,
  },
];

export const MUL_FRAMES: Frame[] = [
  ...groupsTotal,
  ...arrayTotal,
  ...rateTotal,
  ...groupsSize,
  ...shareEach,
  ...groupCount,
  ...trickyCompare,
];

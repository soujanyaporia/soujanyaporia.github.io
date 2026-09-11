import { NOUNS as n, units, type Frame } from './frame';

/** Stories where an amount changes over time: joining and separating. */

const collectibles = units(n.sticker, n.marble, n.card, n.toyCar, n.stamp, n.bead, n.crayon);
const riders = units(n.person, n.passenger);

// ---------------------------------------------------------------- join: result unknown

const joinResult: Frame[] = [
  {
    id: 'join-gift',
    structure: 'join.result',
    scenes: [...collectibles, ...units(n.storyBook)],
    variants: [
      ['{A} has {start:n}.', '{Giver} gives {him} {change} more.', 'How many {items} does {A} have now?'],
      ['{A} had {start:n}.', '{He} got {change:more} from {giver}.', 'How many {items} does {he} have now?'],
    ],
    answer: '{A} has {result:n} now.',
    extra: '{B} has {extra:n}.',
  },
  {
    id: 'join-bus',
    structure: 'join.result',
    scenes: riders,
    variants: [
      ['There {start:were} {start:n} on the bus.', 'At the next bus stop, {change:more} got on.', 'How many {items} are on the bus now?'],
      ['{start:n} {start:were} on a bus to {park}.', '{change:more} got on at the next stop.', 'How many {items} are on the bus now?'],
    ],
    answer: 'There {result:are} {result:n} on the bus now.',
  },
  {
    id: 'join-mrt',
    structure: 'join.result',
    scenes: riders,
    variants: [
      ['There {start:were} {start:n} in the MRT carriage.', 'At {station}, {change:more} got on.', 'How many {items} are in the carriage now?'],
    ],
    answer: 'There {result:are} {result:n} in the carriage now.',
  },
  {
    id: 'join-animals',
    structure: 'join.result',
    scenes: [
      { unit: n.duck, vars: { where: 'in the pond', doing: 'swimming' } },
      { unit: n.turtle, vars: { where: 'in the pond', doing: 'swimming' } },
      { unit: n.sparrow, vars: { where: 'on the tree', doing: 'sitting' } },
      { unit: n.otter, vars: { where: 'on the riverbank', doing: 'resting' } },
      { unit: n.butterfly, vars: { where: 'in the garden', doing: 'flying' } },
    ],
    variants: [
      ['{start:n} {start:were} {doing} {where}.', 'Then {change:more} came along.', 'How many {items} are {where} now?'],
      ['There {start:were} {start:n} {where}.', '{change:more} joined them.', 'How many {items} are {where} now?'],
    ],
    answer: 'There {result:are} {result:n} {where} now.',
  },
  {
    id: 'join-baking',
    structure: 'join.result',
    scenes: units(n.muffin, n.cookie, n.curryPuff, n.tart),
    variants: [
      ['{A} baked {start:n} in the morning.', 'In the afternoon, {he} baked {change:more}.', 'How many {items} did {he} bake altogether?'],
    ],
    answer: '{He} baked {result:n} altogether.',
    maxValue: 50,
  },
  {
    id: 'join-reading',
    structure: 'join.result',
    scenes: units(n.page),
    variants: [
      ['{A} read {start:n} of {his} book on {day}.', 'On {day2}, {he} read {change:more}.', 'How many {items} did {he} read in all?'],
    ],
    answer: '{He} read {result:n} in all.',
  },
  {
    id: 'join-library',
    structure: 'join.result',
    scenes: units(n.storyBook, n.book, n.comic),
    variants: [
      ['{A} borrowed {start:n} from the National Library.', 'A week later, {he} borrowed {change:more}.', 'How many {items} did {he} borrow altogether?'],
    ],
    answer: '{He} borrowed {result:n} altogether.',
    extra: '{B} borrowed {extra:n}.',
    maxValue: 20,
  },
  {
    id: 'join-savings',
    structure: 'join.result',
    scenes: units(n.coin),
    variants: [['{A} had {start:n} in {his} money box.', '{He} put in {change:more}.', 'How many {items} are in the money box now?']],
    answer: 'There {result:are} {result:n} in the money box now.',
  },
  {
    id: 'join-play',
    structure: 'join.result',
    scenes: [
      { unit: n.child, vars: { where: 'at the playground' } },
      { unit: n.child, vars: { where: 'at the void deck' } },
      { unit: n.child, vars: { where: 'in the swimming pool' } },
    ],
    variants: [['{start:n} {start:were} playing {where}.', 'Then {change:more} came to play.', 'How many {items} are {where} now?']],
    answer: 'There {result:are} {result:n} {where} now.',
  },
];

// ---------------------------------------------------------------- join: change unknown

const joinChange: Frame[] = [
  {
    id: 'change-gift',
    structure: 'join.change',
    scenes: units(n.sticker, n.marble, n.card, n.stamp, n.bead, n.toyCar),
    variants: [
      ['{A} had {start:n}.', '{Giver} gave {him} some more.', 'Now {he} has {result:n}.', 'How many {items} did {giver} give {him}?'],
    ],
    answer: '{Giver} gave {him} {change:n}.',
    extra: '{B} has {extra:n}.',
  },
  {
    id: 'change-need',
    structure: 'join.change',
    scenes: units(n.sticker, n.stamp, n.card, n.shell),
    variants: [['{A} wants to collect {result:n}.', '{He} already has {start}.', 'How many more {items} does {he} need?']],
    answer: '{He} needs {change:more}.',
  },
  {
    id: 'change-bus',
    structure: 'join.change',
    scenes: riders,
    variants: [
      ['There {start:were} {start:n} on the bus.', 'At the next stop, some more {items} got on.', 'Now there {result:are} {result:n} on the bus.', 'How many {items} got on?'],
    ],
    answer: '{change:n} got on.',
  },
  {
    id: 'change-pond',
    structure: 'join.change',
    scenes: units(n.duck, n.goose, n.turtle),
    variants: [
      ['{start:n} {start:were} swimming in the pond.', 'Some more {items} jumped in.', 'Now there {result:are} {result:n} in the pond.', 'How many {items} jumped in?'],
    ],
    answer: '{change:n} jumped in.',
  },
  {
    id: 'change-reading',
    structure: 'join.change',
    scenes: units(n.page),
    variants: [
      ['{A} read {start:n} of {his} new book after school.', 'By bedtime, {he} had read {result:n} altogether.', 'How many more {items} did {he} read before bedtime?'],
    ],
    answer: '{He} read {change:more} before bedtime.',
  },
];

// ---------------------------------------------------------------- join: start unknown

const joinStart: Frame[] = [
  {
    id: 'start-gift',
    structure: 'join.start',
    scenes: units(n.sticker, n.marble, n.card, n.stamp, n.bead, n.crayon),
    variants: [
      ['{A} had some {items}.', '{Giver} gave {him} {change:more}.', 'Now {he} has {result:n}.', 'How many {items} did {A} have at first?'],
    ],
    answer: '{A} had {start:n} at first.',
    extra: '{B} has {extra:n}.',
  },
  {
    id: 'start-bus',
    structure: 'join.start',
    scenes: riders,
    variants: [
      ['There were some {items} on the bus.', 'At the next stop, {change:more} got on.', 'Now there {result:are} {result:n} on the bus.', 'How many {items} were on the bus at first?'],
    ],
    answer: 'There {start:were} {start:n} on the bus at first.',
  },
  {
    id: 'start-jar',
    structure: 'join.start',
    scenes: units(n.marble, n.button, n.bead, n.sweet),
    variants: [
      ['There were some {items} in a jar.', '{A} put in {change:more}.', 'Now there {result:are} {result:n} in the jar.', 'How many {items} were in the jar before?'],
    ],
    answer: 'There {start:were} {start:n} in the jar before.',
  },
  {
    id: 'start-birds',
    structure: 'join.start',
    scenes: units(n.sparrow, n.pigeon, n.mynah),
    variants: [
      ['Some {items} were on the roof.', '{change:more} landed next to them.', 'Now there {result:are} {result:n} on the roof.', 'How many {items} were on the roof at first?'],
    ],
    answer: 'There {start:were} {start:n} on the roof at first.',
  },
];

// ---------------------------------------------------------------- separate: result unknown

const separateResult: Frame[] = [
  {
    id: 'sep-eat',
    structure: 'separate.result',
    scenes: units(n.strawberry, n.grape, n.cookie, n.rambutan, n.dumpling),
    variants: [['{A} has {start:n}.', '{He} eats {change} of them.', 'How many {items} are left?']],
    answer: '{A} has {result:n} left.',
    extra: '{B} has {extra:n}.',
    maxValue: 20,
  },
  {
    id: 'sep-recess',
    structure: 'separate.result',
    scenes: units(n.curryPuff, n.fishBall, n.bun, n.dumpling),
    variants: [['{A} bought {start:n} from the school canteen.', '{He} ate {change} of them at recess.', 'How many {items} does {he} have left?']],
    answer: '{He} has {result:n} left.',
    maxValue: 20,
  },
  {
    id: 'sep-give',
    structure: 'separate.result',
    scenes: units(n.sticker, n.marble, n.pencil, n.eraser, n.card, n.stamp, n.sweet),
    variants: [
      ['{A} has {start:n}.', '{He} gives {change} to {B}.', 'How many {items} does {A} have left?'],
      ['{A} had {start:n}.', '{He} gave {change:n} to {his} friend {B}.', 'How many {items} does {A} have now?'],
    ],
    answer: '{A} has {result:n} left.',
  },
  {
    id: 'sep-bus',
    structure: 'separate.result',
    scenes: riders,
    variants: [['There {start:were} {start:n} on the bus.', 'At the bus interchange, {change:n} got off.', 'How many {items} are still on the bus?']],
    answer: 'There {result:are} {result:n} still on the bus.',
  },
  {
    id: 'sep-mrt',
    structure: 'separate.result',
    scenes: riders,
    variants: [['An MRT carriage had {start:n} in it.', 'At {station}, {change:n} got off.', 'How many {items} are still in the carriage?']],
    answer: '{result:n} {result:are} still in the carriage.',
  },
  {
    id: 'sep-fly',
    structure: 'separate.result',
    scenes: units(n.sparrow, n.pigeon, n.mynah, n.butterfly),
    variants: [['{start:n} {start:were} sitting on a fence.', '{change:n} flew away.', 'How many {items} are still on the fence?']],
    answer: '{result:n} {result:are} still on the fence.',
  },
  {
    id: 'sep-balloons',
    structure: 'separate.result',
    scenes: units(n.balloon),
    variants: [["There {start:were} {start:n} at {A}'s birthday party.", '{change} of them popped.', 'How many {items} are left?']],
    answer: 'There {result:are} {result:n} left.',
  },
  {
    id: 'sep-canteen',
    structure: 'separate.result',
    scenes: units(n.curryPuff, n.bun, n.sandwich),
    variants: [['The canteen auntie had {start:n}.', 'She sold {change} of them during recess.', 'How many {items} does she have left?']],
    answer: 'She has {result:n} left.',
  },
  {
    id: 'sep-card',
    structure: 'separate.result',
    scenes: units(n.sticker),
    variants: [['{A} had {start:n}.', '{He} used {change} of them to make a card for {giver}.', 'How many {items} does {he} have now?']],
    answer: '{He} has {result:n} now.',
    extra: '{B} has {extra:n}.',
  },
  {
    id: 'sep-library',
    structure: 'separate.result',
    scenes: units(n.book, n.storyBook),
    variants: [['{A} borrowed {start:n} from the library.', 'On {day}, {he} returned {change} of them.', 'How many {items} does {he} still have?']],
    answer: '{He} still has {result:n}.',
    maxValue: 20,
  },
];

// ---------------------------------------------------------------- separate: change unknown

const separateChange: Frame[] = [
  {
    id: 'sepc-box',
    structure: 'separate.change',
    scenes: units(n.ball, n.marble, n.crayon),
    variants: [['A box had {start:n}.', 'Some {items} were taken out.', 'Now {result:n} {result:are} left in the box.', 'How many {items} were taken out?']],
    answer: '{change:n} {change:were} taken out.',
  },
  {
    id: 'sepc-eat',
    structure: 'separate.change',
    scenes: units(n.cookie, n.grape, n.strawberry, n.dumpling),
    variants: [['{A} had {start:n}.', '{He} ate some of them.', 'Now {he} has {result} left.', 'How many {items} did {he} eat?']],
    answer: '{He} ate {change:n}.',
    maxValue: 20,
  },
  {
    id: 'sepc-fly',
    structure: 'separate.change',
    scenes: units(n.sparrow, n.pigeon, n.mynah),
    variants: [['There {start:were} {start:n} on a tree.', 'Some of them flew away.', 'Now there {result:are} {result:n} on the tree.', 'How many {items} flew away?']],
    answer: '{change:n} flew away.',
  },
  {
    id: 'sepc-give',
    structure: 'separate.change',
    scenes: units(n.sticker, n.marble, n.card, n.pencil),
    variants: [['{A} had {start:n}.', '{He} gave some to {B}.', 'Now {A} has {result} left.', 'How many {items} did {A} give to {B}?']],
    answer: '{A} gave {change:n} to {B}.',
  },
  {
    id: 'sepc-bus',
    structure: 'separate.change',
    scenes: riders,
    variants: [
      ['There {start:were} {start:n} on the bus.', 'At {station} Interchange, some {items} got off.', 'Now there {result:are} {result:n} on the bus.', 'How many {items} got off?'],
    ],
    answer: '{change:n} got off.',
  },
];

// ---------------------------------------------------------------- separate: start unknown

const separateStart: Frame[] = [
  {
    id: 'seps-pond',
    structure: 'separate.start',
    scenes: units(n.duck, n.goose, n.turtle),
    variants: [['Some {items} were in a pond.', '{change:n} swam away and {result} {result:were} left.', 'How many {items} were in the pond at first?']],
    answer: 'There {start:were} {start:n} in the pond at first.',
  },
  {
    id: 'seps-give',
    structure: 'separate.start',
    scenes: units(n.sticker, n.marble, n.card, n.bead),
    variants: [['{A} had some {items}.', '{He} gave {change} to {B}.', 'Now {he} has {result} left.', 'How many {items} did {A} have at first?']],
    answer: '{A} had {start:n} at first.',
  },
  {
    id: 'seps-bakery',
    structure: 'separate.start',
    scenes: units(n.bun, n.muffin, n.loaf),
    variants: [['The baker had some {items}.', 'She sold {change:n} in the morning.', 'She had {result} left.', 'How many {items} did the baker have at first?']],
    answer: 'The baker had {start:n} at first.',
  },
  {
    id: 'seps-mrt',
    structure: 'separate.start',
    scenes: riders,
    variants: [
      ['Some {items} were on an MRT train.', 'At {station}, {change:n} got off.', 'Then there {result:were} {result:n} on the train.', 'How many {items} were on the train before {station}?'],
    ],
    answer: 'There {start:were} {start:n} on the train before {station}.',
  },
];

export const CHANGE_FRAMES: Frame[] = [
  ...joinResult,
  ...joinChange,
  ...joinStart,
  ...separateResult,
  ...separateChange,
  ...separateStart,
];

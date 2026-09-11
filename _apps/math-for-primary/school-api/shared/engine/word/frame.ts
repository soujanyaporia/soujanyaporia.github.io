import type { ItemKind, Noun, StoryStructure } from '../types';

/**
 * A story frame is a small, natural scenario for one story structure.
 * Frames are written as templates; see render.ts for the placeholder syntax:
 *
 *   {A} {B}                 character names
 *   {he} {him} {his} {He}   pronouns of A     ({heB} {himB} {hisB} for B)
 *   {giver} {Giver}         "Mum" / "his aunt"
 *   {role}                  a highlighted number, e.g. {start}, {groups}, {each}
 *   {role:n}                number + unit noun  -> "1 sticker" / "4 stickers"
 *   {role:n:k1}             number + scene noun k1
 *   {role:more} {role:fewer}-> "3 more stickers" / "3 fewer stickers"
 *   {role:noun}             unit noun agreeing with the number
 *   {role:are} {role:were}  is/are, was/were agreeing with the number
 *   {items} {item}          unit noun plural / singular
 *   {k1} {k1s}              scene noun singular / plural
 *   {station} {day} {day2} {park} and any scene variable
 */
export interface Scene {
  unit: Noun;
  nouns?: Record<string, Noun>;
  vars?: Record<string, string>;
}

export interface Frame {
  id: string;
  structure: StoryStructure;
  scenes: Scene[];
  /** Each variant is a list of sentences; the last sentence is the question. */
  variants: string[][];
  /** Full-sentence answer, e.g. "{A} has {result:n} now." */
  answer: string;
  /** Optional sentence with a number that is not needed (harder levels). */
  extra?: string;
  /** Every quantity in the story must be within these bounds. */
  maxValue?: number;
  minValue?: number;
}

export const N = (one: string, many = `${one}s`, item: ItemKind = 'dot'): Noun => ({ one, many, item });

export const units = (...nouns: Noun[]): Scene[] => nouns.map((unit) => ({ unit }));

export const NOUNS = {
  sticker: N('sticker', 'stickers', 'star'),
  marble: N('marble', 'marbles', 'ball'),
  card: N('trading card', 'trading cards', 'star'),
  bead: N('bead', 'beads', 'ball'),
  toyCar: N('toy car', 'toy cars', 'car'),
  stamp: N('stamp', 'stamps', 'star'),
  shell: N('seashell'),
  pencil: N('pencil', 'pencils', 'pencil'),
  eraser: N('eraser'),
  crayon: N('crayon', 'crayons', 'pencil'),
  book: N('book', 'books', 'book'),
  storyBook: N('story book', 'story books', 'book'),
  comic: N('comic', 'comics', 'book'),
  apple: N('apple', 'apples', 'apple'),
  orange: N('orange', 'oranges', 'orange'),
  banana: N('banana'),
  mango: N('mango', 'mangoes', 'orange'),
  pear: N('pear'),
  rambutan: N('rambutan'),
  strawberry: N('strawberry', 'strawberries', 'strawberry'),
  grape: N('grape'),
  fruit: N('fruit', 'fruits', 'apple'),
  cookie: N('cookie', 'cookies', 'cookie'),
  curryPuff: N('curry puff', 'curry puffs', 'cookie'),
  muffin: N('muffin', 'muffins', 'cupcake'),
  cupcake: N('cupcake', 'cupcakes', 'cupcake'),
  dumpling: N('dumpling'),
  bun: N('bun', 'buns', 'cookie'),
  sandwich: N('sandwich', 'sandwiches'),
  fishBall: N('fish ball'),
  tart: N('pineapple tart', 'pineapple tarts', 'cookie'),
  loaf: N('loaf', 'loaves'),
  sweet: N('sweet', 'sweets', 'sweet'),
  person: N('person', 'people', 'person'),
  passenger: N('passenger', 'passengers', 'person'),
  child: N('child', 'children', 'person'),
  pupil: N('pupil', 'pupils', 'person'),
  boy: N('boy', 'boys', 'person'),
  girl: N('girl', 'girls', 'person'),
  duck: N('duck', 'ducks', 'bird'),
  goose: N('goose', 'geese', 'bird'),
  turtle: N('turtle'),
  sparrow: N('sparrow', 'sparrows', 'bird'),
  mynah: N('mynah', 'mynahs', 'bird'),
  pigeon: N('pigeon', 'pigeons', 'bird'),
  otter: N('otter'),
  butterfly: N('butterfly', 'butterflies'),
  fish: N('fish', 'fish', 'fish'),
  balloon: N('balloon', 'balloons', 'balloon'),
  ball: N('ball', 'balls', 'ball'),
  block: N('block'),
  cup: N('paper cup'),
  crane: N('paper crane', 'paper cranes', 'star'),
  star: N('paper star', 'paper stars', 'star'),
  coin: N('coin', 'coins', 'coin'),
  page: N('page'),
  goal: N('goal', 'goals', 'ball'),
  year: N('year'),
  button: N('button'),
  plant: N('plant', 'plants', 'flower'),
  flower: N('flower', 'flowers', 'flower'),
  chair: N('chair'),
} as const;

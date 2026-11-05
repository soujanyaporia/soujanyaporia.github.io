/** Fixed protocol-v1 dictionary. Do not reorder or remove words after release. */
export const WORDLIST_256 = `acorn almond amber apple apricot aqua arctic arrow aster atlas avocado azure
badger bamboo banana basket beaver beetle berry birch biscuit blossom bobcat bonsai
bottle bubble bucket buffalo bunny butter button cabbage cactus camel carrot cashew
castle catfish cedar celery cherry chick circle citrus clam clover coconut comet
cookie coral cosmos cotton cougar cricket crystal cuboid cupcake cygnet dahlia daisy
dolphin dragon dune eagle earth eclipse elm emerald falcon fern fig finch
flannel flower forest fossil fox frog fuchsia falafel garden garlic gazelle gecko
gerbil ginger giraffe glider globe goose gorilla granite grape guava hamster hazel
heron hexagon hippo honey humming humus ibis iceberg igloo indigo insect island
ivory jackal jaguar jasmine jelly jigsaw jungle juniper kitten koala kumquat ladybug
lantern lemon leopard lettuce lilac lily lime lizard lobster lotus lychee magnet
magpie mango maple marble melon meteor mint monkey moss muffin nectar noodle
nugget nutmeg ocelot octagon olive orange orchid otter oval owl panda papaya
parrot pasta pebble pelican penguin petal pickle pigeon planet plum pocket polar
poppy potato prism puffin pumpkin puppy purple quartz quokka rabbit raccoon radish
raisin rainbow raven ribbon robin rocket rose ruby saffron salmon sandy scarlet
sesame shell shrimp silver snail snowy spinach spiral sponge spring sprout square
summer sunny sunset swan teapot thistle thunder tiger tomato toucan tulip turtle
urchin vanilla velvet violet volcano walnut walrus wasabi willow wombat xenon yam
yellow yoghurt zebra zinnia anchor cheetah compass cypress diamond feather glacier gondola
hammock horizon jupiter lattice mercury mineral moonlit octopus oregano oyster pancake parsley
peanut pepper petunia rhombus`.split(/\s+/) as readonly string[];
const words = new Set(WORDLIST_256);
export class PassphraseError extends Error {
  constructor() { super('Use four words from your recovery card, followed by a number from 10 to 99.'); this.name = 'PassphraseError'; }
}
export function normalizePassphrase(input: string): string {
  const value = input.trim().toLowerCase().replace(/[\s_-]+/g, '-');
  const parts = value.split('-');
  if (parts.length !== 5 || !parts.slice(0, 4).every(w => words.has(w)) || !/^[1-9][0-9]$/.test(parts[4])) throw new PassphraseError();
  return value;
}
export function generatePassphrase(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(4));
  // Rejection sampling avoids bias when mapping a random byte to 90 choices.
  let digit: number;
  do { digit = crypto.getRandomValues(new Uint8Array(1))[0]; } while (digit >= 180);
  return [...bytes].map(b => WORDLIST_256[b]).join('-') + '-' + (10 + digit % 90);
}
export function maskedHint(phrase: string): string {
  const p = normalizePassphrase(phrase).split('-');
  return `${p[0]}-••••-••••-••••-${p[4]}`;
}

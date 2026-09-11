/**
 * The reward shop. Everything is cosmetic and bought with Math Gems earned
 * by learning — there are no real-money purchases anywhere. Items are data,
 * so adding a new hat or theme is one line here plus (optionally) a drawing
 * in the mascot component.
 */
export type Slot = 'color' | 'hat' | 'glasses' | 'neck' | 'pet' | 'theme' | 'frame' | 'effect' | 'sticker';

export interface StoreItem {
  id: string;
  name: string;
  slot: Slot;
  price: number;
  /** Only found in treasure chests. */
  chestOnly?: boolean;
  /** Main colour used for previews. */
  swatch?: string;
}

export const SLOT_LABEL: Record<Slot, string> = {
  color: 'Colours',
  hat: 'Hats',
  glasses: 'Glasses',
  neck: 'Scarves & capes',
  pet: 'Pets',
  theme: 'Map themes',
  frame: 'Frames',
  effect: 'Celebrations',
  sticker: 'Stickers',
};

const item = (id: string, name: string, slot: Slot, price: number, swatch?: string, chestOnly = false): StoreItem => ({
  id,
  name,
  slot,
  price,
  swatch,
  chestOnly,
});

export const CATALOG: readonly StoreItem[] = [
  item('color-blue', 'Sky blue', 'color', 0, '#4a6cf7'),
  item('color-coral', 'Coral', 'color', 40, '#ff7a59'),
  item('color-mint', 'Mint', 'color', 40, '#22b07d'),
  item('color-grape', 'Grape', 'color', 60, '#8b5cf6'),
  item('color-sunny', 'Sunny', 'color', 60, '#f5b400'),
  item('color-berry', 'Berry', 'color', 80, '#e0457b'),
  item('color-galaxy', 'Galaxy', 'color', 150, '#3b2a8f'),
  item('hat-party', 'Party hat', 'hat', 50, '#ff7a59'),
  item('hat-cap', 'Cap', 'hat', 60, '#4a6cf7'),
  item('hat-beanie', 'Beanie', 'hat', 60, '#22b07d'),
  item('hat-crown', 'Crown', 'hat', 120, '#f5b400'),
  item('hat-wizard', 'Wizard hat', 'hat', 150, '#8b5cf6'),
  item('hat-flower', 'Flower crown', 'hat', 0, '#e0457b', true),
  item('glasses-round', 'Round glasses', 'glasses', 40, '#1d2742'),
  item('glasses-sun', 'Sunglasses', 'glasses', 60, '#1d2742'),
  item('glasses-star', 'Star glasses', 'glasses', 70, '#f5b400'),
  item('glasses-heart', 'Heart glasses', 'glasses', 0, '#e0457b', true),
  item('neck-bowtie', 'Bow tie', 'neck', 40, '#e0457b'),
  item('neck-scarf', 'Scarf', 'neck', 50, '#ff7a59'),
  item('neck-cape', 'Hero cape', 'neck', 120, '#4a6cf7'),
  item('neck-medal', 'Gold medal', 'neck', 0, '#f5b400', true),
  item('pet-plus', 'Plus the bird', 'pet', 150, '#22b07d'),
  item('pet-zero', 'Zero the snail', 'pet', 120, '#ff7a59'),
  item('pet-star', 'Twinkle', 'pet', 180, '#f5b400'),
  item('theme-classic', 'Classic', 'theme', 0, '#fff4e4'),
  item('theme-ocean', 'Ocean', 'theme', 100, '#dff3ff'),
  item('theme-garden', 'Garden', 'theme', 100, '#e6f7df'),
  item('theme-space', 'Space', 'theme', 150, '#262b58'),
  item('theme-sunset', 'Sunset', 'theme', 120, '#ffe4d6'),
  item('frame-none', 'Plain', 'frame', 0, '#e3d3bd'),
  item('frame-leaf', 'Leafy', 'frame', 60, '#22b07d'),
  item('frame-gold', 'Gold', 'frame', 80, '#f5b400'),
  item('frame-rainbow', 'Rainbow', 'frame', 120, '#8b5cf6'),
  item('effect-confetti', 'Confetti', 'effect', 0, '#4a6cf7'),
  item('effect-stars', 'Shooting stars', 'effect', 80, '#f5b400'),
  item('effect-bubbles', 'Bubbles', 'effect', 80, '#14a3a8'),
  item('effect-hearts', 'Hearts', 'effect', 0, '#e0457b', true),
  item('sticker-rocket', 'Rocket', 'sticker', 20),
  item('sticker-rainbow', 'Rainbow', 'sticker', 20),
  item('sticker-owl', 'Owl', 'sticker', 20),
  item('sticker-sun', 'Sunshine', 'sticker', 20),
  item('sticker-cat', 'Cat', 'sticker', 0, undefined, true),
  item('sticker-planet', 'Planet', 'sticker', 0, undefined, true),
  item('sticker-fish', 'Fish', 'sticker', 0, undefined, true),
  item('sticker-crown', 'Crown', 'sticker', 0, undefined, true),
  item('sticker-dino', 'Dino', 'sticker', 0, undefined, true),
  item('sticker-merlion', 'Merlion', 'sticker', 0, undefined, true),
  item('sticker-kite', 'Kite', 'sticker', 0, undefined, true),
  item('sticker-otter', 'Otter', 'sticker', 0, undefined, true),
];

export const itemById = (id: string) => CATALOG.find((i) => i.id === id);

export const DEFAULT_OWNED = ['color-blue', 'theme-classic', 'frame-none', 'effect-confetti'];

export type Equipped = Partial<Record<Slot, string>>;

export const DEFAULT_EQUIPPED: Equipped = {
  color: 'color-blue',
  theme: 'theme-classic',
  frame: 'frame-none',
  effect: 'effect-confetti',
};

/** Slots where "nothing" is a valid choice (you can take a hat off). */
export const OPTIONAL_SLOTS: Slot[] = ['hat', 'glasses', 'neck', 'pet'];

export const colorOf = (equipped: Equipped) => itemById(equipped.color ?? 'color-blue')?.swatch ?? '#4a6cf7';

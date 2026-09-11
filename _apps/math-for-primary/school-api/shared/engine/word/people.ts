/**
 * Characters and settings for story problems. Names reflect Singapore's
 * classrooms; local places appear in some frames but are never forced.
 */
export interface Person {
  name: string;
  pronoun: 'he' | 'she';
}

export const PEOPLE: readonly Person[] = [
  { name: 'Arjun', pronoun: 'he' },
  { name: 'Mei Ling', pronoun: 'she' },
  { name: 'Wei Jie', pronoun: 'he' },
  { name: 'Aisha', pronoun: 'she' },
  { name: 'Siti', pronoun: 'she' },
  { name: 'Haziq', pronoun: 'he' },
  { name: 'Priya', pronoun: 'she' },
  { name: 'Ravi', pronoun: 'he' },
  { name: 'Jun Hao', pronoun: 'he' },
  { name: 'Hui Min', pronoun: 'she' },
  { name: 'Daniel', pronoun: 'he' },
  { name: 'Farah', pronoun: 'she' },
  { name: 'Kavya', pronoun: 'she' },
  { name: 'Ethan', pronoun: 'he' },
  { name: 'Chloe', pronoun: 'she' },
  { name: 'Zi Xuan', pronoun: 'she' },
  { name: 'Imran', pronoun: 'he' },
  { name: 'Nurul', pronoun: 'she' },
  { name: 'Ryan', pronoun: 'he' },
  { name: 'Sofia', pronoun: 'she' },
  { name: 'Lina', pronoun: 'she' },
  { name: 'Ben', pronoun: 'he' },
  { name: 'Mia', pronoun: 'she' },
  { name: 'Jay', pronoun: 'he' },
  { name: 'Sarah', pronoun: 'she' },
  { name: 'Tom', pronoun: 'he' },
  { name: 'Lily', pronoun: 'she' },
  { name: 'Amy', pronoun: 'she' },
  { name: 'Sam', pronoun: 'he' },
  { name: 'Divya', pronoun: 'she' },
  { name: 'Marcus', pronoun: 'he' },
  { name: 'Yi Xin', pronoun: 'she' },
  { name: 'Hafiz', pronoun: 'he' },
  { name: 'Kai', pronoun: 'he' },
];

export const PRONOUNS = {
  he: { he: 'he', him: 'him', his: 'his' },
  she: { he: 'she', him: 'her', his: 'her' },
} as const;

/** Someone who gives a child something. `own` means "his aunt" rather than "Mum". */
export interface Giver {
  word: string;
  own: boolean;
}

export const GIVERS: readonly Giver[] = [
  { word: 'Mum', own: false },
  { word: 'Dad', own: false },
  { word: 'Grandma', own: false },
  { word: 'Grandpa', own: false },
  { word: 'aunt', own: true },
  { word: 'uncle', own: true },
  { word: 'big sister', own: true },
  { word: 'big brother', own: true },
  { word: 'cousin', own: true },
  { word: 'best friend', own: true },
];

export const MRT_STATIONS = [
  'Bishan',
  'Tampines',
  'Jurong East',
  'Toa Payoh',
  'Ang Mo Kio',
  'Serangoon',
  'Woodlands',
  'Bugis',
  'Clementi',
  'Punggol',
  'Yishun',
  'Bedok',
] as const;

export const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const;

export const PARKS = [
  'East Coast Park',
  'the Botanic Gardens',
  'Bishan Park',
  'the park near the flats',
  'the playground',
] as const;

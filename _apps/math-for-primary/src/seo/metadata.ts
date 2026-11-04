import type { Lesson } from '../teach/model';

// Short editorial labels for search results. The full curriculum titles remain
// in the lesson headings, breadcrumbs, navigation and interactive lessons.
const SEARCH_TOPICS: Readonly<Record<string, string>> = {
  'p1s-shape-01': 'Recognising 2D shapes and parts of circles',
  'p2s-as-02': 'Mental addition and subtraction of three-digit numbers',
  'p2s-graph-01': 'Reading picture graphs with scales',
  'p4s-frac-04': 'Adding and subtracting fractions',
  'p4s-dec-03': 'Converting fractions to decimals',
  'p4s-dec-07': 'Dividing whole numbers to get decimal answers',
  'p4s-area-01': 'Missing dimensions from area and perimeter',
  'p4s-solid-01': 'Representing cubes, cuboids and other 3D shapes',
  'p5s-dec-01': 'Multiplying and dividing decimals by powers of 10',
  'p5s-rate-02': 'Solving rate and total-amount problems',
  'p5f-as-01': 'Adding and subtracting three-digit numbers',
  'p5f-md-01': 'Multiplying and dividing by one-digit numbers',
  'p5f-md-02': 'Multiplying and dividing by 10, 100 and 1000',
  'p5f-fact-01': 'Factors and common factors up to 100',
  'p5f-fact-02': 'Multiples and common multiples',
  'p5f-frac-04': 'Mixed numbers and improper fractions',
  'p5f-frac-05': 'Adding and subtracting fractions',
  'p5f-frac-07': 'Multiplying fractions by whole numbers',
  'p5f-frac-08': 'Multiplying a proper fraction by a fraction',
  'p5f-frac-09': 'Missing values in equivalent fractions',
  'p5f-dec-03': 'Converting fractions to decimals',
  'p5f-dec-05': 'Adding and subtracting two-place decimals',
  'p5f-dec-06': 'Multiplying and dividing decimals by powers of 10',
  'p5f-rate-02': 'Rate, total amount and number of units',
  'p5f-area-03': 'Area and perimeter of composite rectilinear figures',
  'p5f-angle-03': 'Angles on lines, at points and vertically opposite',
  'p5f-shape-01': 'Rectangle and square properties',
  'p6s-frac-02': 'Dividing by a proper fraction without a calculator',
  'p6s-ratio-01': 'Ratios of two or three quantities',
  'p6s-shape-01': 'Angles in composite quadrilateral figures',
  'p6f-frac-05': 'Dividing by a proper fraction',
  'p6f-dec-02': 'Dividing whole numbers to get decimal answers',
  'p6f-area-03': 'Area and perimeter of composite figures',
  'p6f-shape-03': 'Angles in composite figures',
};

export const lessonSearchTopic = (lesson: Pick<Lesson, 'id' | 'title'>) => SEARCH_TOPICS[lesson.id] ?? lesson.title;

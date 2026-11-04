import { renderToStaticMarkup } from 'react-dom/server';
import type { ReactNode } from 'react';
import { LESSONS, lessonsFor } from '../teach/catalog';
import { TOPIC_NAMES } from '../teach/learningUi';
import { REP_LABEL, type Lesson, type RevealStep, type Tool, type WorldId } from '../teach/model';
import { ToolView } from '../teach/tools/Tools';
import { ACTIVITIES, activitiesFor } from '../primary/catalog';
import { CURRICULUM, CURRICULUM_SKILLS, type Track } from '../school/curriculum';
import { PUBLIC_BASE, SITE_URL, gradePath, guidePath } from './paths';
import { lessonSearchTopic } from './metadata';

const NAME = 'Maths for SG Primary Schools';
const paths: { level: number; track: Track; intro: string }[] = [
  { level: 1, track: 'standard', intro: 'Start with counting to 100, tens and ones, number bonds, addition and subtraction. Use pictures to explore equal groups, money, clocks, shapes and picture graphs.' },
  { level: 2, track: 'standard', intro: 'Build numbers to 1000, connect multiplication with division, and represent fractions as equal parts. Practise money, measurement, clocks and picture graphs with scales.' },
  { level: 3, track: 'standard', intro: 'Work with four-digit numbers, multiplication and division with remainders. Explore equivalent fractions, time and duration, area, perimeter, angles and bar graphs.' },
  { level: 4, track: 'standard', intro: 'Connect factors, multiples, mixed numbers and decimal place value. Explore composite areas, symmetry, angles, solids, nets, tables and graphs.' },
  { level: 5, track: 'standard', intro: 'Learn fraction multiplication, mixed-number calculations, percentages and rate. Connect triangle area, volume and angle properties to pictures and worked examples.' },
  { level: 6, track: 'standard', intro: 'Reason about fraction division, percentages, ratio and algebra. Use visual models to explore circles, volume and averages, then explain each step of your solution.' },
  { level: 5, track: 'foundation', intro: 'Revisit whole numbers, fractions and decimals with smaller steps. Connect rate, money, measurement, angles and graphs to concrete pictures before practising.' },
  { level: 6, track: 'foundation', intro: 'Build on fractions and decimals, then explore percentages, area, volume, angles and averages. Use the models and worked examples to check the meaning of each calculation.' },
];
const topicSlugs: Record<WorldId, string> = {
  'number-kingdom': 'whole-numbers', 'operation-station': 'addition-subtraction-multiplication-division',
  'fraction-forest': 'fractions', 'decimal-depths': 'decimals', 'measurement-metro': 'measurement-time-money',
  'geometry-galaxy': 'geometry', 'data-city': 'data-graphs', 'ratio-realm': 'ratio-rate-percentage', 'algebra-academy': 'algebra',
};
const topicIntroductions: Record<WorldId, string> = {
  'number-kingdom': 'Use counters and place-value models to connect quantities with written numbers. Start with counting and comparing, then move to rounding, factors, multiples and order of operations.',
  'operation-station': 'Explore what joining, taking away, equal groups and fair sharing mean. Number bonds, arrays and bar models connect these ideas to addition, subtraction, multiplication and division.',
  'fraction-forest': 'Begin with equal parts of one whole. Compare fraction strips, find equivalent fractions, and connect mixed numbers and fraction calculations to pictures rather than memorising rules alone.',
  'decimal-depths': 'Connect tenths, hundredths and thousandths to place value and fractions. Compare and round decimals before using their place values to explain calculations.',
  'measurement-metro': 'Choose a unit before measuring. Explore length, mass, volume, money and time, then connect conversions and calculations to the quantity being measured.',
  'geometry-galaxy': 'Look for shape properties, perpendicular heights and equal angles. Use diagrams to explain area and perimeter, explore symmetry and nets, and connect circles and solids to measurements.',
  'data-city': 'Read the labels and scale before reading a graph. Explore picture graphs, bar graphs, tables and other data displays, then connect averages to equal sharing.',
  'ratio-realm': 'Identify what the quantities compare. Use equal units to reason about ratios, parts out of 100 for percentages, and an amount per unit for rate.',
  'algebra-academy': 'Use a letter to represent an unknown quantity. A balance model shows why both sides of an equation must stay equal while you find the missing value.',
};
const gradeName = (level: number, track = 'standard') => `Primary ${level}${track === 'foundation' ? ' Foundation' : ''}`;
const topicPath = (world: WorldId) => `${PUBLIC_BASE}topics/${topicSlugs[world]}/`;
const absolute = (path: string) => `https://soujanyaporia.github.io${path}`;
const list = (values: string[]) => <ul>{values.map((value, i) => <li key={i}>{value}</li>)}</ul>;
const paragraph = (text?: string) => text ? <p>{text}</p> : null;

function GradeLinks() {
  return <div className="resource-grid">{paths.map(p => <a className="resource-card" key={`${p.level}${p.track}`} href={gradePath(p.level, p.track)}><strong>{gradeName(p.level, p.track)} maths</strong><span>{lessonsFor(p.level, p.track).length} lessons · {activitiesFor(p.level, p.track).length} activities</span><span>{p.intro}</span></a>)}</div>;
}
function TopicLinks() {
  return <ul className="resource-topic-links">{(Object.keys(topicSlugs) as WorldId[]).map(world => <li key={world}><a href={topicPath(world)}>{TOPIC_NAMES[world]}</a></li>)}</ul>;
}
function ContentNote() {
  return <aside className="resource-note"><h2>About these lessons</h2><p>Made with the help of AI. Questions, explanations and diagrams can contain mistakes; a qualified teacher has not reviewed every item. Use these resources with a teacher or parent and check anything that looks wrong.</p><p>The app maps selected objectives from the <a href={CURRICULUM.source}>MOE Primary Mathematics syllabus, updated {CURRICULUM.revision}</a>. It is an independent resource, not an official or MOE-endorsed assessment. Automated checks do not establish teaching effectiveness.</p><p>Developed by <a href="https://soujanyaporia.github.io/">Soujanya Poria</a>. <a href={`${PUBLIC_BASE}#/about`}>About, privacy and AI</a>.</p></aside>;
}
export function HomeDirectory() {
  return <section className="resource-home" id="public-maths-resources" aria-labelledby="resource-home-title"><p className="resource-eyebrow">Lessons to read, explore and practise</p><h2 id="resource-home-title">Free Singapore primary maths lessons</h2><p>Explore {LESSONS.length} visual lessons and {ACTIVITIES.length} maths activities for Primary 1–6. Read explanations and worked examples, then open the interactive lesson for guided practice. Guest learning needs no sign-in. Primary 5 and Primary 6 include separate Standard and Foundation paths.</p><h3>Browse by primary level</h3><GradeLinks/><h3>Browse by topic</h3><TopicLinks/><p><a href={`${PUBLIC_BASE}lessons/`}>Browse all lesson guides</a> · <a href={`${PUBLIC_BASE}#/lab`}>Explore the Math Lab</a></p></section>;
}
function LessonLinks({ lessons }: { lessons: Lesson[] }) {
  return <ul className="resource-lesson-list">{lessons.map(l => <li key={l.id}><a href={guidePath(l.id)}>{l.title}</a><span>{l.objectives[0]} · About {l.minutes} minutes</span></li>)}</ul>;
}
function Model({ tool }: { tool?: Tool }) {
  return tool ? <div className="resource-model"><ToolView tool={tool}/></div> : null;
}
function Steps({ steps }: { steps: RevealStep[] }) {
  return <ol className="resource-steps">{steps.map((step, i) => <li key={i}>{paragraph(step.caption)}<p>{step.text}</p>{step.math && <p className="resource-equation">{step.math}</p>}{paragraph(step.because)}<Model tool={step.tool}/>{step.ask && <details><summary>{step.ask.prompt}</summary><p>{step.ask.answer}{step.ask.unit ? ` ${step.ask.unit}` : ''}</p></details>}{step.wonder && <details><summary>{step.wonder.question}</summary><p>{step.wonder.answer}</p></details>}</li>)}</ol>;
}
function LessonArticle({ lesson }: { lesson: Lesson }) {
  const worked = lesson.stages.filter(s => s.kind === 'worked');
  const explain = lesson.stages.filter(s => s.kind === 'explain');
  const prerequisites = lesson.prerequisites.map(id => {
    const earlier = LESSONS.find(l => l.id === id) ?? LESSONS.find(l => l.skillIds.includes(id));
    return <li key={id}>{earlier ? <a href={guidePath(earlier.id)}>{earlier.title}</a> : CURRICULUM_SKILLS.find(s => s.id === id)?.title ?? id}</li>;
  });
  const related = LESSONS.filter(l => l.id !== lesson.id && l.level === lesson.level && l.world === lesson.world && (l.track === lesson.track || l.track === 'both' || lesson.track === 'both')).slice(0, 6);
  return <>
    <p className="resource-eyebrow">{gradeName(lesson.level, lesson.track)} maths · {TOPIC_NAMES[lesson.world]} · About {lesson.minutes} minutes</p>
    <h1>{lesson.title}</h1>{paragraph(lesson.mission?.connection ?? lesson.objectives[0])}
    <p className="resource-actions"><a className="resource-button" href={`${PUBLIC_BASE}#/teach/${lesson.id}`}>Start the interactive lesson →</a><a href={`${PUBLIC_BASE}#/activity/${lesson.activityId}`}>Open practice activity</a></p>
    <section className="resource-panel"><h2>What you will learn</h2>{list(lesson.objectives)}<p>Models used: {lesson.representations.map(r => REP_LABEL[r]).join(', ')}.</p>{prerequisites.length > 0 && <><h3>Before you start</h3><ul>{prerequisites}</ul></>}</section>
    {explain.map((s, i) => <section className="resource-panel" key={`explain${i}`}><h2>{s.title}</h2>{paragraph(s.example)}{s.frames?.length ? <Steps steps={s.frames}/> : <>{paragraph(s.text)}{s.math && <p className="resource-equation">{s.math}</p>}<Model tool={s.tool}/></>}{s.why && <details><summary>{s.why.question}</summary><p>{s.why.answer}</p><Model tool={s.why.tool}/></details>}</section>)}
    {worked.map((s, i) => <section className="resource-panel" key={`worked${i}`}><h2>Worked example{i ? ` ${i + 1}` : ''}{s.title.toLowerCase() !== 'worked example' ? `: ${s.title}` : ''}</h2><p>{s.problem}</p><Model tool={s.tool}/><Steps steps={s.steps}/></section>)}
    <section className="resource-panel"><h2>Common mistakes to discuss</h2><ul>{lesson.misconceptions.map((m, i) => <li key={i}><strong>{m.name}.</strong> {m.fix}</li>)}</ul><h2>Check your understanding</h2>{list(lesson.canDo)}<p>Explain your reasoning to an adult, then try a fresh question in the interactive lesson. A result from one attempt is not proof of lasting mastery.</p><a className="resource-button" href={`${PUBLIC_BASE}#/teach/${lesson.id}`}>Try this lesson →</a></section>
    {related.length > 0 && <section><h2>Related {gradeName(lesson.level, lesson.track)} lessons</h2><LessonLinks lessons={related}/></section>}
    <ContentNote/>
  </>;
}
export interface PublicPage { path: string; title: string; description: string; html: string; schema: Record<string, unknown>[] }
function page(path: string, title: string, description: string, body: ReactNode, crumbs: { name: string; path: string }[], resource?: Lesson): PublicPage {
  const url = absolute(path);
  const breadcrumb = { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: crumbs.map((c, i) => ({ '@type': 'ListItem', position: i + 1, name: c.name, item: absolute(c.path) })) };
  const schema: Record<string, unknown>[] = [breadcrumb, {
    '@context': 'https://schema.org', '@type': resource ? 'LearningResource' : 'CollectionPage',
    name: title, description, url, inLanguage: 'en-SG', isAccessibleForFree: true,
    isPartOf: { '@type': 'WebSite', name: NAME, url: SITE_URL },
    ...(resource ? { learningResourceType: 'Lesson', educationalLevel: gradeName(resource.level, resource.track), teaches: resource.objectives, about: TOPIC_NAMES[resource.world] } : {}),
  }];
  const html = renderToStaticMarkup(<><a className="resource-skip" href="#content">Skip to content</a><header className="resource-header"><a href={PUBLIC_BASE}>{NAME}</a><nav aria-label="Main navigation"><a href={`${PUBLIC_BASE}lessons/`}>Lesson guides</a><a href={`${PUBLIC_BASE}#/`}>Interactive learning →</a></nav></header><main id="content" className="resource-main"><nav aria-label="Breadcrumb"><ol className="resource-breadcrumbs">{crumbs.map((c, i) => <li key={c.path}>{i === crumbs.length - 1 ? <span aria-current="page">{c.name}</span> : <a href={c.path}>{c.name}</a>}</li>)}</ol></nav>{body}</main><footer className="resource-footer"><a href={PUBLIC_BASE}>Maths for SG Primary Schools</a><a href={`${PUBLIC_BASE}#/about`}>About, privacy &amp; AI</a></footer></>);
  return { path, title, description, html, schema };
}
export function publicPages(): PublicPage[] {
  const home = { name: 'Maths home', path: PUBLIC_BASE };
  const directory = { name: 'Lesson guides', path: `${PUBLIC_BASE}lessons/` };
  const pages = [page(directory.path, 'Free Singapore Primary Maths Lessons | P1–P6', `Browse ${LESSONS.length} free Singapore Primary 1–6 maths lessons with visual explanations, worked examples and interactive practice, including Foundation maths.`, <><h1>Singapore primary maths lessons</h1><p>Choose a year or topic, read a worked example and explore the idea through interactive practice. All {LESSONS.length} lesson guides can be read without an account. Guest progress in the app stays on your device.</p><h2>Choose your primary level</h2><GradeLinks/><h2>Choose a maths topic</h2><TopicLinks/><h2>How to use a lesson</h2><ol><li>Read the objective and revisit any earlier ideas linked under “Before you start”.</li><li>Follow the explanation and worked example. Explain what the model represents.</li><li>Open the interactive lesson to move the models, practise, ask for a clue and check your understanding.</li></ol><ContentNote/></>, [home, directory])];
  for (const p of paths) {
    const lessons = lessonsFor(p.level, p.track), name = gradeName(p.level, p.track), path = gradePath(p.level, p.track);
    const worlds = [...new Set(lessons.map(l => l.world))];
    pages.push(page(path, `${name} Maths: Free Lessons & Practice | Singapore`, `${name} maths for Singapore: ${lessons.length} free lessons with visual models, worked examples and interactive practice. No sign-in needed.`, <><p className="resource-eyebrow">Singapore · {p.track === 'foundation' ? 'Foundation Mathematics' : 'Standard Mathematics'}</p><h1>{name} maths lessons</h1><p>{p.intro}</p><p>{lessons.length} lessons and {activitiesFor(p.level, p.track).length} interactive activities. No sign-in is needed to read or practise.</p>{p.level >= 5 && <p>Looking for the other path? <a href={gradePath(p.level, p.track === 'standard' ? 'foundation' : 'standard')}>{gradeName(p.level, p.track === 'standard' ? 'foundation' : 'standard')} maths</a>.</p>}<nav aria-label="Topics in this year"><ul className="resource-topic-links">{worlds.map(world => <li key={world}><a href={`#${topicSlugs[world]}`}>{TOPIC_NAMES[world]}</a></li>)}</ul></nav>{worlds.map(world => <section key={world} id={topicSlugs[world]} className="resource-panel"><h2>{name} {TOPIC_NAMES[world].toLowerCase()}</h2><LessonLinks lessons={lessons.filter(l => l.world === world)}/><p><a href={topicPath(world)}>Explore {TOPIC_NAMES[world].toLowerCase()} across primary years →</a></p></section>)}<ContentNote/></>, [home, directory, { name: `${name} maths`, path }]));
  }
  for (const world of Object.keys(topicSlugs) as WorldId[]) {
    const path = topicPath(world), name = TOPIC_NAMES[world];
    pages.push(page(path, `${name} Lessons for Singapore Primary Maths`, `Free ${name.toLowerCase()} lessons for Singapore primary pupils. Read visual explanations and worked examples, then practise with interactive models.`, <><h1>{name} for Singapore primary maths</h1><p>{topicIntroductions[world]}</p><p>Choose your primary level and path. Each guide links to the interactive lesson and its prerequisite ideas.</p>{paths.map(p => {
      const lessons = lessonsFor(p.level, p.track).filter(l => l.world === world);
      return lessons.length > 0 && <section className="resource-panel" key={`${p.level}${p.track}`}><h2>{gradeName(p.level, p.track)} {name.toLowerCase()}</h2><LessonLinks lessons={lessons}/><a href={gradePath(p.level, p.track)}>All {gradeName(p.level, p.track)} maths lessons →</a></section>;
    })}<ContentNote/></>, [home, directory, { name, path }]));
  }
  for (const l of LESSONS) {
    const path = guidePath(l.id), name = gradeName(l.level, l.track), topic = lessonSearchTopic(l);
    pages.push(page(path, `${topic} | ${name} Maths`, `Singapore ${name} maths: ${topic}. Free lesson with visual models, worked examples and practice.`, <LessonArticle lesson={l}/>, [home, directory, { name: `${name} maths`, path: gradePath(l.level, l.track) }, { name: l.title, path }], l));
  }
  return pages;
}
export const homeDirectoryHtml = () => renderToStaticMarkup(<HomeDirectory/>);
export const homeSchema = {
  '@context': 'https://schema.org', '@type': 'WebSite', name: NAME, alternateName: 'Singapore Primary Maths',
  url: SITE_URL, inLanguage: 'en-SG', description: `Free Singapore Primary 1–6 maths with ${LESSONS.length} visual lessons and ${ACTIVITIES.length} activities.`,
};

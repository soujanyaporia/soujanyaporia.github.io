import { Suspense } from 'react';
import { PrimaryHome } from './primary/PrimaryHome';
import { SessionProvider } from './primary/SessionContext';
import { useRoute, type Route } from './app/router';
import { lazyScreen, RouteBoundary, RouteLoading } from './app/boundary';
import { ProgressProvider } from './state/ProgressContext';
import { AccountProvider, useAccount } from './school/AccountContext';
import { SchoolNav } from './school/SchoolNav';

// Route code loads on demand: the activity player, school pages and the original lessons.
const game = () => import('./primary/PrimaryGame');
const school = () => import('./school/SchoolScreens');
const foundations = () => import('./screens/foundations');
const PrimaryGame = lazyScreen(() => game().then((m) => m.PrimaryGame));
const GuestScreen = lazyScreen(() => import('./school/GuestScreen').then(m => m.GuestScreen));
const AccountScreen = lazyScreen(() => school().then((m) => m.AccountScreen));
const CurriculumScreen = lazyScreen(() => school().then((m) => m.CurriculumScreen));
const SchoolScreen = lazyScreen(() => school().then((m) => m.SchoolScreen));
const DemoSchoolScreen = lazyScreen(() => school().then((m) => m.DemoSchoolScreen));
const SchoolStartScreen = lazyScreen(() => school().then((m) => m.SchoolStartScreen));
const RegisterSchoolScreen = lazyScreen(() => school().then((m) => m.RegisterSchoolScreen));
const AboutScreen = lazyScreen(() => import('./school/AboutScreen').then((m) => m.AboutScreen));
const teach = () => import('./teach/screens');
const LessonPlayer = lazyScreen(() => teach().then((m) => m.LessonPlayer));
const LearnIndex = lazyScreen(() => teach().then((m) => m.LearnIndex));
const MathLab = lazyScreen(() => teach().then((m) => m.MathLab));
const LessonGuide = lazyScreen(() => teach().then((m) => m.LessonGuide));
const Coverage = lazyScreen(() => teach().then((m) => m.Coverage));
const HomeScreen = lazyScreen(() => foundations().then((m) => m.HomeScreen));
const LearnScreen = lazyScreen(() => foundations().then((m) => m.LearnScreen));
const LessonScreen = lazyScreen(() => foundations().then((m) => m.LessonScreen));
const MixedScreen = lazyScreen(() => foundations().then((m) => m.MixedScreen));
const PracticeScreen = lazyScreen(() => foundations().then((m) => m.PracticeScreen));
const ProgressScreen = lazyScreen(() => foundations().then((m) => m.ProgressScreen));
const TopicsScreen = lazyScreen(() => foundations().then((m) => m.TopicsScreen));

function Screen({ route }: { route: Route }) {
  switch (route.name) {
    case 'school-start': return <SchoolStartScreen />;
    case 'register': return <RegisterSchoolScreen />;
    case 'foundations': return <HomeScreen />;
    case 'activity': return <PrimaryGame key={route.id} id={route.id} />;
    case 'guest': return <GuestScreen />;
    case 'account': return <AccountScreen />;
    case 'school': return <SchoolScreen />;
    case 'demo': return <DemoSchoolScreen />;
    case 'curriculum': return <CurriculumScreen />;
    case 'about': return <AboutScreen section={route.section} />;
    case 'teach': return route.id ? <LessonPlayer key={route.id + (route.mode ?? '')} id={route.id} mode={route.mode} /> : <LearnIndex />;
    case 'lab': return <MathLab key={route.tool ?? 'all'} tool={route.tool} />;
    case 'guide': return <LessonGuide key={route.id} id={route.id} />;
    case 'coverage': return <Coverage />;
    default:
    case 'home':
      return <PrimaryHome />;
    case 'learn':
      return <LearnScreen />;
    case 'lesson':
      return <LessonScreen key={route.id} lessonId={route.id} />;
    case 'practice':
      return <TopicsScreen area="practice" />;
    case 'words':
      return <TopicsScreen area="words" />;
    case 'practice-topic':
      return <PracticeScreen key={route.topic} topicId={route.topic} />;
    case 'mixed':
      return <MixedScreen />;
    case 'progress':
      return <ProgressScreen />;
  }
}

const SCHOOL_ROUTES = ['account', 'school', 'demo', 'curriculum', 'school-start', 'register', 'about', 'coverage', 'guide', 'lab'];
const loadingLabel = (route: Route) => (route.name === 'activity' ? 'Opening your activity…' : route.name === 'teach' ? 'Opening your lesson…' : SCHOOL_ROUTES.includes(route.name) ? 'Opening…' : 'Opening the guided lessons…');

function AccountApp() {
  const route = useRoute();
  const {user,loading,connection,error,retry,continueAsGuest}=useAccount();
  if(loading)return <main className="school-page loading-page" aria-busy="true"><p className="school-eyebrow">School account</p><h1>Opening your account…</h1></main>;
  if(connection==='unreachable')return <main className="school-page loading-page"><p className="school-eyebrow">School account</p><h1>We can’t reach your school account right now.</h1><p role="status">{error}</p><p>Answers already waiting on this device are kept and will be saved the next time you sign in.</p><div className="loading-actions"><button className="btn" onClick={retry}>Try again</button><button className="btn btn-soft" onClick={continueAsGuest}>Play as a guest instead</button></div></main>;
  const screen=user?.mustChange?{name:'account' as const}:route;
  const focus=['lesson','practice-topic','mixed','activity'].includes(screen.name)||(screen.name==='teach'&&!!screen.id);
  const routeKey=JSON.stringify(screen);
  return <ProgressProvider key={user?.id+(user?.mustChange?'change':'ready')}><SessionProvider><div className="app">
    {!focus&&<SchoolNav/>}<RouteBoundary resetKey={routeKey}><Suspense fallback={<RouteLoading label={loadingLabel(screen)}/>}><Screen route={screen}/></Suspense></RouteBoundary>
  </div></SessionProvider></ProgressProvider>;
}
export function App(){return <AccountProvider><AccountApp/></AccountProvider>;}

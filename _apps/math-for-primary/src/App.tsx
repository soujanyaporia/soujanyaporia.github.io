import {stopSpeaking} from './lib/speech';
import {useEffect} from 'react';
import { Suspense } from 'react';
import { Experience } from './ui/Adventure';
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
const PracticePapers = lazyScreen(() => import('./primary/PracticePapers').then(m => m.PracticePapers));
const DailyPractice = lazyScreen(() => import('./primary/DailyPractice').then(m => m.DailyPractice));
const GuestScreen = lazyScreen(() => import('./school/GuestScreen').then(m => m.GuestScreen));
const AccountScreen = lazyScreen(() => school().then((m) => m.AccountScreen));
const CurriculumScreen = lazyScreen(() => school().then((m) => m.CurriculumScreen));
const SchoolScreen = lazyScreen(() => school().then((m) => m.SchoolScreen));
const DemoSchoolScreen = lazyScreen(() => school().then((m) => m.DemoSchoolScreen));
const SchoolStartScreen = lazyScreen(() => school().then((m) => m.SchoolStartScreen));
const RegisterSchoolScreen = lazyScreen(() => school().then((m) => m.RegisterSchoolScreen));
const AboutScreen = lazyScreen(() => import('./school/AboutScreen').then((m) => m.AboutScreen));
const LessonPlayer = lazyScreen(() => import('./teach/LessonPlayer').then(m => m.LessonPlayer));
const LearnIndex = lazyScreen(() => import('./teach/LearnIndex').then(m => m.LearnIndex));
const MathLab = lazyScreen(() => import('./teach/MathLab').then(m => m.MathLab));
const LessonGuide = lazyScreen(() => import('./teach/LessonGuide').then(m => m.LessonGuide));
const Coverage = lazyScreen(() => import('./teach/Coverage').then(m => m.Coverage));
const MissionLibrary = lazyScreen(() => import('./playground/Missions').then(m => m.MissionLibrary));
const MissionScreen = lazyScreen(() => import('./playground/Missions').then(m => m.MissionScreen));
const WatchLibrary = lazyScreen(() => import('./media/Watch').then(m => m.WatchLibrary));
const WatchLesson = lazyScreen(() => import('./media/WatchLesson').then(m => m.WatchLesson));
const LearningProgress = lazyScreen(() => import('./screens/LearningProgress').then(m => m.LearningProgress));
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
    case 'daily': return <DailyPractice />;
    case 'papers': return <PracticePapers />;
    case 'guest': return <GuestScreen />;
    case 'account': return <AccountScreen />;
    case 'school': return <SchoolScreen />;
    case 'demo': return <DemoSchoolScreen />;
    case 'curriculum': return <CurriculumScreen />;
    case 'about': return <AboutScreen section={route.section} />;
    case 'teach': return route.id ? <LessonPlayer key={route.id + (route.mode ?? '')} id={route.id} mode={route.mode} /> : <LearnIndex />;
    case 'watch': return route.id ? <WatchLesson key={route.id} id={route.id}/> : <WatchLibrary/>;
    case 'missions': return route.id ? <MissionScreen key={route.id} id={route.id}/> : <MissionLibrary/>;
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
      return <LearningProgress />;
    case 'legacy-progress': return <ProgressScreen/>;
    case 'play': case 'game': return <MissionLibrary/>;
    case 'review': return <LearnIndex/>;
    case 'rewards': return <LearningProgress/>;
    case 'profile': return <GuestScreen/>;
  }
}

const SCHOOL_ROUTES = ['account', 'school', 'demo', 'curriculum', 'school-start', 'register', 'about', 'coverage', 'guide', 'lab'];
const loadingLabel = (route: Route) => (route.name === 'activity' ? 'Opening your activity…' : route.name === 'papers' ? 'Preparing your practice paper…' : route.name === 'daily' ? 'Opening daily practice…' : route.name === 'missions' ? 'Opening your mission…' : route.name === 'progress' ? 'Opening your progress…' : route.name === 'teach' ? 'Opening your lesson…' : SCHOOL_ROUTES.includes(route.name) ? 'Opening…' : 'Opening the guided lessons…');

function AccountApp() {
  const route = useRoute();
  useEffect(()=>()=>stopSpeaking(),[JSON.stringify(route)]);
  const {user,loading,connection,error,retry,continueAsGuest}=useAccount();
  if(loading)return <main className="school-page loading-page" aria-busy="true"><p className="school-eyebrow">School account</p><h1>Opening your account…</h1></main>;
  if(connection==='unreachable')return <main className="school-page loading-page"><p className="school-eyebrow">School account</p><h1>We can’t reach your school account right now.</h1><p role="status">{error}</p><p>Answers already waiting on this device are kept and will be saved the next time you sign in.</p><div className="loading-actions"><button className="btn" onClick={retry}>Try again</button><button className="btn btn-soft" onClick={continueAsGuest}>Play as a guest instead</button></div></main>;
  const screen=user?.mustChange?{name:'account' as const}:route;
  const focus=['lesson','practice-topic','mixed','activity'].includes(screen.name)||((screen.name==='teach'||screen.name==='missions'||screen.name==='watch')&&!!screen.id);
  const routeKey=JSON.stringify(screen);
  return <ProgressProvider key={user?.id+(user?.mustChange?'change':'ready')}><SessionProvider><Experience><div className={`app adventure-app ${focus?'focus-mode':'has-sidebar'}`}>
    {!focus&&<SchoolNav/>}<RouteBoundary resetKey={routeKey}><Suspense fallback={<RouteLoading label={loadingLabel(screen)}/>}><Screen route={screen}/></Suspense></RouteBoundary>
  </div></Experience></SessionProvider></ProgressProvider>;
}
export function App(){return <AccountProvider><AccountApp/></AccountProvider>;}

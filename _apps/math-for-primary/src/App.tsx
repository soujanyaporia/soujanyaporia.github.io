import { PrimaryHome, PrimaryGame } from './primary/PrimaryScreens';
import { useRoute, type Route } from './app/router';
import { LessonScreen } from './lesson/LessonScreen';
import { HomeScreen } from './screens/HomeScreen';
import { LearnScreen } from './screens/LearnScreen';
import { MixedScreen } from './screens/MixedScreen';
import { PracticeScreen } from './screens/PracticeScreen';
import { ProgressScreen } from './screens/ProgressScreen';
import { TopicsScreen } from './screens/TopicsScreen';
import { ProgressProvider } from './state/ProgressContext';
import './screens/screens.css';
import { AccountProvider, useAccount } from './school/AccountContext';
import { SchoolNav, AccountScreen, CurriculumScreen, SchoolScreen, DemoSchoolScreen, SchoolStartScreen, RegisterSchoolScreen } from './school/SchoolScreens';

function Screen({ route }: { route: Route }) {
  switch (route.name) {
    case 'school-start': return <SchoolStartScreen />;
    case 'register': return <RegisterSchoolScreen />;
    case 'foundations': return <HomeScreen />;
    case 'activity': return <PrimaryGame key={route.id} id={route.id} />;
    case 'account': return <AccountScreen />;
    case 'school': return <SchoolScreen />;
    case 'demo': return <DemoSchoolScreen />;
    case 'curriculum': return <CurriculumScreen />;
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

function AccountApp() {
  const route = useRoute();
  const {user,loading}=useAccount();
  if(loading)return <main className="school-page"><h1>Opening your account…</h1></main>;
  const screen=user?.mustChange?{name:'account' as const}:route;
  const focus=['lesson','practice-topic','mixed','activity'].includes(screen.name);
  return <ProgressProvider key={user?.id+(user?.mustChange?'change':'ready')}><div className="app">
    {!focus&&<SchoolNav/>}<Screen route={screen}/>
  </div></ProgressProvider>;
}
export function App(){return <AccountProvider><AccountApp/></AccountProvider>;}

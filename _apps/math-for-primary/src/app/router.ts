import { useEffect, useState } from 'react';
import type { GameId } from '../curriculum/types';

/**
 * Tiny hash router. Hash URLs work from any static host (and file://),
 * and the browser back button behaves as children expect.
 */
export type RewardsTab = 'quests' | 'chests' | 'shop' | 'stickers';

export type Route =
  | { name: 'home' }
  | { name: 'guest' | 'account' | 'school' | 'demo' | 'curriculum' | 'foundations' | 'school-start' | 'register' | 'coverage' }
  | { name: 'about'; section?: string }
  | { name: 'teach'; id?: string; mode?: 'learn' | 'challenge' | 'review' }
  | { name: 'guide'; id: string }
  | { name: 'lab'; tool?: string }
  | { name: 'lesson'; id: string }
  | { name: 'activity'; id: string }
  | { name: 'words' }
  | { name: 'learn' }
  | { name: 'node'; id: string }
  | { name: 'practice' }
  | { name: 'practice-topic'; topic: string }
  | { name: 'mixed' }
  | { name: 'review' }
  | { name: 'play' }
  | { name: 'game'; id: GameId }
  | { name: 'rewards'; tab?: RewardsTab }
  | { name: 'progress' }
  | { name: 'profile' };

export type TabId = 'learn' | 'practice' | 'play' | 'rewards' | 'progress';

const GAMES: GameId[] = ['monster', 'train', 'balance', 'picnic'];
const TABS: RewardsTab[] = ['quests', 'chests', 'shop', 'stickers'];

export function parseRoute(hash: string): Route {
  let parts: string[];
  try { parts = hash.replace(/^#\/?/, '').split('/').filter(Boolean).map(decodeURIComponent); }
  catch { return { name: 'home' }; }
  switch (parts[0]) {
    case 'guest': case 'account': case 'school': case 'demo': case 'curriculum': case 'foundations': case 'school-start': case 'register':
      return {name:parts[0]};
    case 'activity': return parts[1]?{name:'activity',id:parts[1]}:{name:'home'};
    case 'about': case 'privacy': return parts[1]?{name:'about',section:parts[1]}:{name:'about'};
    case 'coverage': return {name:'coverage'};
    case 'teach': return parts[1]?(parts[2]==='challenge'||parts[2]==='review'?{name:'teach',id:parts[1],mode:parts[2]}:{name:'teach',id:parts[1]}):{name:'teach'};
    case 'guide': return parts[1]?{name:'guide',id:parts[1]}:{name:'teach'};
    case 'lab': return parts[1]?{name:'lab',tool:parts[1]}:{name:'lab'};
    case 'learn':
      return { name: 'learn' };
    case 'node':
    case 'lesson':
      return parts[1] ? { name: 'lesson', id: parts[1] } : { name: 'learn' };
    case 'practice':
      return parts[1] ? { name: 'practice-topic', topic: parts[1] } : { name: 'practice' };
    case 'words':
      return { name: 'words' };
    case 'mixed':
      return { name: 'mixed' };
    case 'review':
      return { name: 'review' };
    case 'play':
      return parts[1] && GAMES.includes(parts[1] as GameId) ? { name: 'game', id: parts[1] as GameId } : { name: 'play' };
    case 'rewards':
      return { name: 'rewards', tab: TABS.includes(parts[1] as RewardsTab) ? (parts[1] as RewardsTab) : undefined };
    case 'progress':
      return { name: 'progress' };
    case 'profile':
      return { name: 'profile' };
    default:
      return { name: 'home' };
  }
}

export function href(route: Route): string {
  switch (route.name) {
    case 'home':
      return '#/';
    case 'activity': return `#/activity/${encodeURIComponent(route.id)}`;
    case 'about': return route.section ? `#/about/${encodeURIComponent(route.section)}` : '#/about';
    case 'teach': return route.id ? `#/teach/${encodeURIComponent(route.id)}${route.mode && route.mode !== 'learn' ? '/' + route.mode : ''}` : '#/teach';
    case 'guide': return `#/guide/${encodeURIComponent(route.id)}`;
    case 'lab': return route.tool ? `#/lab/${encodeURIComponent(route.tool)}` : '#/lab';
    case 'lesson':
      return `#/lesson/${encodeURIComponent(route.id)}`;
    case 'node':
      return `#/node/${encodeURIComponent(route.id)}`;
    case 'practice-topic':
      return `#/practice/${encodeURIComponent(route.topic)}`;
    case 'game':
      return `#/play/${route.id}`;
    case 'rewards':
      return route.tab ? `#/rewards/${route.tab}` : '#/rewards';
    default:
      return `#/${route.name}`;
  }
}

export function navigate(route: Route): void {
  const target = href(route);
  if (window.location.hash !== target) window.location.hash = target;
}

/** Which bottom tab a route belongs to (null = full-screen focus mode). */
export function tabOf(route: Route): TabId | null {
  switch (route.name) {
    case 'learn':
      return 'learn';
    case 'practice':
      return 'practice';
    case 'play':
      return 'play';
    case 'rewards':
      return 'rewards';
    case 'progress':
    case 'profile':
      return 'progress';
    default:
      return null;
  }
}

export function useRoute(): Route {
  const [route, setRoute] = useState<Route>(() => parseRoute(window.location.hash));
  useEffect(() => {
    const onChange = () => {
      setRoute(parseRoute(window.location.hash));
      window.scrollTo({ top: 0 });
    };
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return route;
}

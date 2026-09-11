import type { ReactNode } from 'react';
import { href, type TabId } from '../app/router';
import { playerLevel } from '../game/xp';
import { questDone } from '../game/quests';
import { useGame } from '../state/GameContext';
import { FlameIcon, GemIcon } from './GameIcons';
import { Icon, type IconName } from './Icon';
import { Mascot } from './Mascot';
import './shell.css';

const TABS: { id: TabId; label: string; icon: IconName; to: string }[] = [
  { id: 'learn', label: 'Learn', icon: 'map', to: '#/' },
  { id: 'practice', label: 'Practice', icon: 'target', to: '#/practice' },
  { id: 'play', label: 'Play', icon: 'puzzle', to: '#/play' },
  { id: 'rewards', label: 'Rewards', icon: 'gift', to: '#/rewards' },
  { id: 'progress', label: 'Progress', icon: 'chart', to: '#/progress' },
];

/** Top: who I am and what I have. Always the same place, never in the way. */
export function StatusBar() {
  const { state } = useGame();
  const level = playerLevel(state.xp);
  const streakToday = state.streak.lastDay !== null && state.streak.current > 0;
  return (
    <header className="status-bar">
      <a className="status-me" href={href({ name: 'profile' })} aria-label="My profile">
        <span className="status-avatar">
          <Mascot size={44} equipped={state.equipped} animate={false} />
        </span>
        <span className="status-level">
          <strong>
            {state.profile.name ? `${state.profile.name} · ` : ''}Level {level.level}
          </strong>
          <span className="xp-track" title={`${level.into} / ${level.needed} XP`}>
            <span className="xp-fill" style={{ width: `${Math.round(level.progress * 100)}%` }} />
          </span>
        </span>
      </a>
      <div className="status-chips">
        <a className={`status-chip streak${streakToday ? '' : ' cold'}`} href={href({ name: 'rewards', tab: 'quests' })} title="Day streak">
          <FlameIcon size={24} lit={streakToday} />
          <strong>{state.streak.current}</strong>
        </a>
        <a className="status-chip gems" href={href({ name: 'rewards', tab: 'shop' })} title="Math Gems">
          <GemIcon size={24} />
          <strong>{state.gems}</strong>
        </a>
      </div>
    </header>
  );
}

export function TabBar({ active }: { active: TabId }) {
  const { state } = useGame();
  const claimable = (state.quests?.quests.some((q) => questDone(q) && !q.claimed) ?? false) || state.chests.length > 0;
  return (
    <nav className="tab-bar" aria-label="Main">
      {TABS.map((t) => (
        <a key={t.id} href={t.to} className={`tab${active === t.id ? ' active' : ''}`} aria-current={active === t.id ? 'page' : undefined}>
          <span className="tab-icon">
            <Icon name={t.icon} size={26} strokeWidth={2.4} />
            {t.id === 'rewards' && claimable && <span className="tab-dot" aria-label="Rewards to collect" />}
          </span>
          <span className="tab-label">{t.label}</span>
        </a>
      ))}
    </nav>
  );
}

export function AppShell({ tab, children }: { tab: TabId; children: ReactNode }) {
  return (
    <div className="shell">
      <StatusBar />
      <div className="shell-content">{children}</div>
      <TabBar active={tab} />
    </div>
  );
}

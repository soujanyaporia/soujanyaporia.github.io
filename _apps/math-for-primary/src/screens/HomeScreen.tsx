import { useAccount } from '../school/AccountContext';
import { useDialogFocus } from '../ui/useDialogFocus';
import { useState } from 'react';
import { href } from '../app/router';
import type { Tone } from '../content/lessons';
import { nextLessonFor } from '../lib/mastery';
import { useProgress } from '../state/ProgressContext';
import { SettingsToggles, Logo } from '../ui/controls';
import { Icon, type IconName } from '../ui/Icon';

const TILES: { id: string; title: string; text: string; icon: IconName; tone: Tone; to: string; glyph: string }[] = [
  { id: 'learn', title: 'Learn', text: 'Lessons with examples', icon: 'book', tone: 'blue', to: '#/learn', glyph: '+' },
  { id: 'practice', title: 'Practice', text: 'Pick a topic', icon: 'target', tone: 'green', to: '#/practice', glyph: '=' },
  { id: 'mixed', title: 'Mixed practice', text: 'Picked just for you', icon: 'shuffle', tone: 'orange', to: '#/mixed', glyph: '−' },
  { id: 'words', title: 'Word problems', text: 'Read, think, solve', icon: 'story', tone: 'purple', to: '#/words', glyph: '?' },
  { id: 'progress', title: 'Progress', text: 'See how you are growing', icon: 'chart', tone: 'teal', to: '#/progress', glyph: '★' },
];

function greeting(): string {
  const hour = new Date().getHours();
  return hour < 12 ? 'Good morning!' : hour < 18 ? 'Good afternoon!' : 'Good evening!';
}

export function HomeScreen() {
  const { progress, updateSettings } = useProgress();
  const {user,classes}=useAccount();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const dialogRef = useDialogFocus(settingsOpen, () => setSettingsOpen(false));
  const next = nextLessonFor(progress);
  const started = Object.keys(progress.nodes).length > 0 || progress.totals.attempted > 0;
  const streak = progress.streak.current;

  return (
    <main className="screen home">
      <header className="home-header">
        <div className="brand">
          <Logo />
          <span>Maths for SG Primary Schools</span>
        </div>
        <div className="home-meta">
          <span className="chip meta-chip streak" title="Days in a row">
            <Icon name="flame" size={20} filled strokeWidth={1.5} /> {streak} {streak === 1 ? 'day' : 'days'}
          </span>
          <span className="chip meta-chip stars-chip" title="Stars collected">
            <Icon name="star" size={20} filled strokeWidth={1.5} /> {progress.totals.stars}
          </span>
          <button type="button" className="icon-btn" onClick={() => setSettingsOpen(true)} aria-label="Settings" title="Settings">
            <Icon name="sliders" />
          </button>
        </div>
      </header>

      <section className="hello">
        <h1>{user?.role==='student'?`Hello, ${user.name}!`:greeting()}</h1>
        <p>What shall we do today?</p>
        {user?.role==='student'&&classes[0]&&<p className="home-school-note">{classes[0].year} · P{classes[0].level} {classes[0].name} · {classes[0].track==='foundation'?'Foundation':'Standard / common curriculum'}</p>}
      </section>

      <a href={href({ name: 'lesson', id: next.id })} className={`continue card tone-${next.tone}`}>
        <span className="continue-icon">
          <Icon name={next.icon} size={40} strokeWidth={2.6} />
        </span>
        <span className="continue-text">
          <span className="eyebrow">
            {started ? 'Continue learning' : 'Start here'} · Lesson {next.number}
          </span>
          <strong>{next.title}</strong>
          <span className="muted">{next.goal}</span>
        </span>
        <span className="btn btn-lg continue-btn">
          {started ? 'Continue' : 'Start'} <Icon name="arrowRight" />
        </span>
      </a>

      <p className="home-school-note"><span>Build confidence with addition, subtraction and word problems.</span><a href="#/curriculum">Explore the P1–P6 curriculum →</a></p>
      <nav className="home-tiles" aria-label="Main menu">
        {TILES.map((tile) => (
          <a key={tile.id} href={tile.to} className={`home-tile card tone-${tile.tone} tile-${tile.id}`}>
            <span className="tile-glyph" aria-hidden="true">
              {tile.glyph}
            </span>
            <span className="tile-icon">
              <Icon name={tile.icon} size={34} strokeWidth={2.4} />
            </span>
            <span className="tile-title">{tile.title}</span>
            <span className="tile-text">{tile.text}</span>
          </a>
        ))}
      </nav>

      {settingsOpen && (
        <div className="dialog-backdrop" onClick={() => setSettingsOpen(false)}>
          <div ref={dialogRef} className="dialog card" role="dialog" aria-modal="true" aria-label="Settings" onClick={(e) => e.stopPropagation()}>
            <h2>Settings</h2>
            <SettingsToggles settings={progress.settings} onChange={updateSettings} />
            <button type="button" className="btn" onClick={() => setSettingsOpen(false)}>
              Done
            </button>
          </div>
        </div>
      )}
    </main>
  );
}

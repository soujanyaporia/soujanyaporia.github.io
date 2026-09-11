import { useAccount } from '../school/AccountContext';
import { useState } from 'react';
import { href, navigate } from '../app/router';
import { BADGES } from '../content/badges';
import { LESSONS, type Tone } from '../content/lessons';
import { ENABLED_TOPICS } from '../content/topics';
import { focusSkills, strongSkills } from '../engine/adaptive';
import { LEVELS } from '../engine/levels';
import { ALL_SKILLS, SKILLS, type TopicId } from '../engine/skills';
import type { SkillId } from '../engine/types';
import { skillMastery } from '../lib/mastery';
import { useProgress } from '../state/ProgressContext';
import { BadgeMedal } from '../ui/BadgeMedal';
import { ConfirmDialog, TopBar } from '../ui/common';
import { MasteryPips, SettingsToggles } from '../ui/controls';
import { Icon, type IconName } from '../ui/Icon';

const GROUPS: { id: TopicId; title: string; tone: Tone }[] = [
  { id: 'addition', title: 'Adding', tone: 'blue' },
  { id: 'subtraction', title: 'Taking away', tone: 'orange' },
  { id: 'missing', title: 'Missing numbers', tone: 'green' },
  { id: 'bonds', title: 'Number bonds', tone: 'purple' },
  { id: 'reasoning', title: 'Reasoning', tone: 'yellow' },
  { id: 'equality', title: 'Equality', tone: 'teal' },
  { id: 'words', title: 'Word problems', tone: 'purple' },
  { id: 'translation', title: 'Understanding stories', tone: 'teal' },
];

const enabledSkills = new Set(ENABLED_TOPICS.flatMap(t => t.skills));
const topicFor = (id: SkillId) => ENABLED_TOPICS.find((t) => t.skills.includes(id));

function Stat({ icon, tone, value, label }: { icon: IconName; tone: Tone; value: string | number; label: string }) {
  return (
    <div className={`progress-stat card tone-${tone}`}>
      <span className="progress-stat-icon">
        <Icon name={icon} size={24} filled={icon === 'star' || icon === 'flame'} strokeWidth={icon === 'star' || icon === 'flame' ? 1.5 : 2.4} />
      </span>
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

function SkillChips({ ids, empty }: { ids: SkillId[]; empty: string }) {
  if (ids.length === 0) return <p className="muted small-text">{empty}</p>;
  return (
    <div className="choice-chips">
      {ids.map((id) => {
        const topic = topicFor(id);
        return (
          <a key={id} className="chip link-chip" href={topic ? href({ name: 'practice-topic', topic: topic.id }) : '#/practice'}>
            {SKILLS[id].title} <span className="chip-pattern">{SKILLS[id].pattern}</span>
          </a>
        );
      })}
    </div>
  );
}

export function ProgressScreen() {
  const { progress, updateSettings, reset } = useProgress();
  const {user}=useAccount();
  const [confirmReset, setConfirmReset] = useState(false);
  const { totals, skills } = progress;
  const firstTryRate = totals.attempted ? Math.round((100 * totals.firstTry) / totals.attempted) : 0;
  const lessonsDone = LESSONS.filter((l) => progress.nodes[l.id]?.completions).length;
  const avgTries = totals.attempted ? (totals.tries / totals.attempted).toFixed(1) : '–';

  return (
    <main className="screen">
      <TopBar title="My progress" subtitle="Every question helps you grow" onBack={() => navigate({ name: 'home' })} backIcon="home" backLabel="Home" />

      <div className="progress-stats">
        <Stat icon="star" tone="yellow" value={totals.stars} label="stars" />
        <Stat icon="flame" tone="orange" value={progress.streak.current} label={`day streak (best ${progress.streak.best})`} />
        <Stat icon="check" tone="green" value={totals.attempted} label="questions answered" />
        <Stat icon="target" tone="blue" value={`${firstTryRate}%`} label="right first time" />
        <Stat icon="book" tone="purple" value={`${lessonsDone}/${LESSONS.length}`} label="lessons done" />
      </div>

      <div className="progress-split">
        <section className="card progress-panel">
          <h2 className="section-title">
            <Icon name="sparkle" /> Going well
          </h2>
          <SkillChips ids={strongSkills(skills).filter(id => enabledSkills.has(id))} empty="Keep practising and your strongest skills will show here." />
        </section>
        <section className="card progress-panel">
          <h2 className="section-title">
            <Icon name="target" /> Let's practise
          </h2>
          <SkillChips ids={focusSkills(skills).filter(id => enabledSkills.has(id))} empty="Nothing tricky yet. Great job!" />
        </section>
      </div>

      <section className="card progress-panel">
        <h2 className="section-title">Skills</h2>
        <div className="skill-groups">
          {GROUPS.map((group) => (
            <div key={group.id} className={`skill-group tone-${group.tone}`}>
              <h3>{group.title}</h3>
              {ALL_SKILLS.filter((id) => enabledSkills.has(id) && SKILLS[id].topic === group.id).map((id) => {
                const s = skills[id];
                return (
                  <div key={id} className="skill-row">
                    <span className="skill-name">
                      <strong>{SKILLS[id].title}</strong>
                      <span className="skill-pattern">{SKILLS[id].pattern}</span>
                    </span>
                    <MasteryPips view={skillMastery(s)} />
                    <span className="skill-level">{s ? LEVELS[s.level].label : ''}</span>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </section>

      <section className="card progress-panel">
        <h2 className="section-title">Badges</h2>
        <div className="badge-grid">
          {BADGES.map((b) => (
            <BadgeMedal key={b.id} badge={b} earned={progress.badges.includes(b.id)} />
          ))}
        </div>
      </section>

      <section className="card progress-panel grownups">
        <h2 className="section-title">For grown-ups</h2>
        <div className="grownup-facts">
          <p>
            <strong>{totals.hints}</strong> hints used · <strong>{avgTries}</strong> tries per question on average ·{' '}
            <strong>{totals.sessions}</strong> sessions finished
          </p>
          <p className="muted">{user?.role==='student'?'Progress is saved to your school account. Check the sync status before signing out.':'Guest progress is saved in this browser on this device only.'}</p>
        </div>
        <SettingsToggles settings={progress.settings} onChange={updateSettings} />
        {!user && <button type="button" className="btn btn-soft reset-btn" onClick={() => setConfirmReset(true)}>
          <Icon name="refresh" /> Reset progress
        </button>}
      </section>

      {confirmReset && (
        <ConfirmDialog
          title="Reset all progress?"
          message="Stars, badges, lessons and skill levels will be cleared on this device."
          confirmLabel="Reset"
          cancelLabel="Cancel"
          onConfirm={() => {
            reset();
            setConfirmReset(false);
          }}
          onCancel={() => setConfirmReset(false)}
        />
      )}
    </main>
  );
}

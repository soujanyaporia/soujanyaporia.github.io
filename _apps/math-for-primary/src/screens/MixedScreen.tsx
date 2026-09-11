import { useState } from 'react';
import { navigate } from '../app/router';
import { focusSkills, simplePolicy } from '../engine/adaptive';
import { freshSeed, Rng } from '../engine/random';
import { buildSession } from '../engine/session';
import { SKILLS } from '../engine/skills';
import type { Problem } from '../engine/types';
import { mixedPool } from '../lib/mastery';
import { useProgress } from '../state/ProgressContext';
import { TopBar } from '../ui/common';
import { Icon } from '../ui/Icon';
import { SessionRunner } from './SessionRunner';

const COUNT = 10;

/** Adaptive practice across everything learned so far. */
export function MixedScreen() {
  const { progress } = useProgress();
  const [session, setSession] = useState<{ key: number; problems: Problem[] } | null>(null);
  const pool = mixedPool(progress);
  const focus = focusSkills(progress.skills);
  const home = () => navigate({ name: 'home' });

  const start = () => {
    const seed = freshSeed();
    const picks = simplePolicy.chooseSkills(progress.skills, pool, COUNT, new Rng(seed), Date.now());
    const requests = picks.map((skill) => ({ skill, level: simplePolicy.levelFor(skill, progress.skills, 2) }));
    setSession({ key: seed, problems: buildSession(requests, seed, { sortByDifficulty: true }) });
  };

  if (session) {
    return <SessionRunner key={session.key} title="Mixed practice" tone="orange" problems={session.problems} onExit={home} onAgain={start} />;
  }

  return (
    <main className="screen tone-orange">
      <TopBar title="Mixed practice" subtitle="A bit of everything you have learned" onBack={home} backIcon="home" backLabel="Home" />
      <section className="setup card">
        <span className="topic-icon big">
          <Icon name="shuffle" size={40} strokeWidth={2.5} />
        </span>
        <p className="setup-lead">
          {COUNT} questions picked just for you. You will see more of the ones that need practice.
        </p>
        {focus.length > 0 && (
          <div className="setup-group">
            <p className="eyebrow">Extra practice on</p>
            <div className="choice-chips">
              {focus.map((id) => (
                <span key={id} className="chip focus-chip">
                  <Icon name="target" size={18} /> {SKILLS[id].pattern}
                </span>
              ))}
            </div>
          </div>
        )}
        <div className="setup-group">
          <p className="eyebrow">Mixing together</p>
          <div className="choice-chips">
            {pool.map((id) => (
              <span key={id} className="chip">
                {SKILLS[id].title}
              </span>
            ))}
          </div>
        </div>
        <button type="button" className="btn btn-lg btn-green setup-start" onClick={start}>
          Start <Icon name="play" filled />
        </button>
      </section>
    </main>
  );
}

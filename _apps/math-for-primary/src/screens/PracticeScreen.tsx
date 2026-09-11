import { useState } from 'react';
import { navigate } from '../app/router';
import { topicById, type PracticeTopic } from '../content/topics';
import { simplePolicy } from '../engine/adaptive';
import { LEVEL_IDS, LEVELS } from '../engine/levels';
import { freshSeed, Rng } from '../engine/random';
import { buildSession } from '../engine/session';
import type { LevelId, Problem } from '../engine/types';
import { suggestedLevel } from '../lib/mastery';
import { useProgress } from '../state/ProgressContext';
import { TopBar } from '../ui/common';
import { Icon } from '../ui/Icon';
import { SessionRunner } from './SessionRunner';

export function PracticeScreen({ topicId }: { topicId: string }) {
  const topic = topicById(topicId);
  if (!topic) {
    navigate({ name: 'practice' });
    return null;
  }
  return <TopicPractice topic={topic} />;
}

function TopicPractice({ topic }: { topic: PracticeTopic }) {
  const { progress } = useProgress();
  const suggested = suggestedLevel(progress.skills, topic.skills);
  const [level, setLevel] = useState<LevelId>(suggested);
  const [count, setCount] = useState(10);
  const [session, setSession] = useState<{ key: number; problems: Problem[] } | null>(null);
  const back = () => navigate({ name: topic.area === 'words' ? 'words' : 'practice' });

  const start = () => {
    const seed = freshSeed();
    // With several skills, weaker ones come up more often.
    const skills =
      topic.skills.length === 1
        ? Array.from({ length: count }, () => topic.skills[0])
        : simplePolicy.chooseSkills(progress.skills, topic.skills, count, new Rng(seed), Date.now());
    const problems = buildSession(
      skills.map((skill) => ({ skill, level })),
      seed,
      { sortByDifficulty: true },
    );
    setSession({ key: seed, problems });
  };

  if (session) {
    return <SessionRunner key={session.key} title={topic.title} tone={topic.tone} problems={session.problems} onExit={back} onAgain={start} />;
  }

  return (
    <main className={`screen tone-${topic.tone}`}>
      <TopBar title={topic.title} subtitle={topic.area === 'words' ? 'Word problems' : 'Practice'} onBack={back} />
      <section className="setup card">
        <span className="topic-icon big">
          <Icon name={topic.icon} size={40} strokeWidth={2.5} />
        </span>
        <p className={`setup-pattern${topic.area === 'words' ? ' words' : ''}`}>{topic.pattern}</p>

        <div className="setup-group">
          <p className="eyebrow">Choose your numbers</p>
          <div className="choice-chips">
            {LEVEL_IDS.map((id) => (
              <button key={id} type="button" className={`level-chip${id === level ? ' on' : ''}`} onClick={() => setLevel(id)} aria-pressed={id === level}>
                <strong>{LEVELS[id].label}</strong>
                <span>{id === suggested ? 'Suggested' : LEVELS[id].short}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="setup-group">
          <p className="eyebrow">How many questions?</p>
          <div className="choice-chips">
            {[5, 10].map((n) => (
              <button key={n} type="button" className={`level-chip small${n === count ? ' on' : ''}`} onClick={() => setCount(n)} aria-pressed={n === count}>
                <strong>{n}</strong>
              </button>
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

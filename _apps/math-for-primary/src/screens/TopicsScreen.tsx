import { href, navigate } from '../app/router';
import { PRACTICE_TOPICS, WORD_TOPICS } from '../content/topics';
import { topicMastery } from '../lib/mastery';
import { useProgress } from '../state/ProgressContext';
import { TopBar } from '../ui/common';
import { MasteryPips } from '../ui/controls';
import { Icon } from '../ui/Icon';

export function TopicsScreen({ area }: { area: 'practice' | 'words' }) {
  const { progress } = useProgress();
  const topics = area === 'practice' ? PRACTICE_TOPICS : WORD_TOPICS;
  return (
    <main className="screen">
      <TopBar
        title={area === 'practice' ? 'Practice' : 'Word problems'}
        subtitle={area === 'practice' ? 'Choose what you would like to practise' : 'Read the story, think, then solve'}
        onBack={() => navigate({ name: 'home' })}
        backIcon="home"
        backLabel="Home"
      />
      <div className="topic-grid">
        {topics.map((topic) => (
          <a key={topic.id} href={href({ name: 'practice-topic', topic: topic.id })} className={`topic-card card tone-${topic.tone}`}>
            <span className="topic-icon">
              <Icon name={topic.icon} size={30} strokeWidth={2.5} />
            </span>
            <span className="topic-title">{topic.title}</span>
            <span className={`topic-pattern${area === 'words' ? ' words' : ''}`}>{topic.pattern}</span>
            <MasteryPips view={topicMastery(progress.skills, topic.skills)} />
          </a>
        ))}
      </div>
    </main>
  );
}

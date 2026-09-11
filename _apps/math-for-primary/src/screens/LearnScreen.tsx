import { href, navigate } from '../app/router';
import { LESSONS, UNITS } from '../content/lessons';
import { nextLessonFor } from '../lib/mastery';
import { useProgress } from '../state/ProgressContext';
import { Stars, TopBar } from '../ui/common';
import { Icon } from '../ui/Icon';

/** The learning path: units of lessons, with stars and what to do next. */
export function LearnScreen() {
  const { progress } = useProgress();
  const next = nextLessonFor(progress);
  const done = LESSONS.filter((l) => progress.nodes[l.id]?.completions).length;

  return (
    <main className="screen">
      <TopBar
        title="Lessons"
        subtitle="Watch the examples, then try it yourself"
        onBack={() => navigate({ name: 'home' })}
        backIcon="home"
        backLabel="Home"
        right={
          <span className="chip">
            <Icon name="check" size={18} strokeWidth={3} /> {done} of {LESSONS.length}
          </span>
        }
      />
      {UNITS.map((unit) => (
        <section key={unit.id} className={`unit tone-${unit.tone}`}>
          <div className="unit-head">
            <span className="unit-badge">{unit.id}</span>
            <div>
              <h2>{unit.title}</h2>
              <p>{unit.subtitle}</p>
            </div>
          </div>
          <div className="lesson-grid">
            {unit.lessons.map((lesson) => {
              const record = progress.nodes[lesson.id];
              const isNext = lesson.id === next.id && !record;
              return (
                <a
                  key={lesson.id}
                  href={href({ name: 'lesson', id: lesson.id })}
                  className={`lesson-card card${isNext ? ' is-next' : ''}${record ? ' is-done' : ''}`}
                >
                  <span className="lesson-num">{record ? <Icon name="check" size={24} strokeWidth={3} /> : lesson.number}</span>
                  <span className="lesson-info">
                    <strong>{lesson.title}</strong>
                    <span>{lesson.goal}</span>
                  </span>
                  <span className="lesson-end">
                    {record ? (
                      <Stars count={record.bestStars} size={20} still />
                    ) : isNext ? (
                      <span className="up-next">
                        Start <Icon name="arrowRight" size={18} />
                      </span>
                    ) : (
                      <Icon name="arrowRight" size={22} className="lesson-arrow" />
                    )}
                  </span>
                </a>
              );
            })}
          </div>
        </section>
      ))}
    </main>
  );
}

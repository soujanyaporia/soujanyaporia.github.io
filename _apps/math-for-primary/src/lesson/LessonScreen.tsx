import { useMemo, useState } from 'react';
import { navigate } from '../app/router';
import type { BadgeDef } from '../content/badges';
import { lessonById, nextLesson, type LessonDef } from '../content/lessons';
import { freshSeed } from '../engine/random';
import { buildSession } from '../engine/session';
import type { Problem } from '../engine/types';
import { dotResults, similarProblem, starsFor } from '../lib/session';
import { QuestionPlayer, type QuestionOutcome } from '../question/QuestionPlayer';
import { useProgress } from '../state/ProgressContext';
import { ConfirmDialog, ProgressDots, TopBar } from '../ui/common';
import { Icon } from '../ui/Icon';
import { Completion } from './Completion';
import { IntroCards } from './IntroCards';
import { WorkedExample } from './WorkedExample';
import './lesson.css';

type Phase = 'intro' | 'teach' | 'practice' | 'done';

const PHASES: { id: Phase; label: string }[] = [
  { id: 'intro', label: 'Learn' },
  { id: 'teach', label: 'Watch' },
  { id: 'practice', label: 'Try' },
];

const MAX_EXTRA = 2;

export function LessonScreen({ lessonId }: { lessonId: string }) {
  const lesson = lessonById(lessonId);
  if (!lesson) {
    navigate({ name: 'learn' });
    return null;
  }
  return <LessonRun lesson={lesson} />;
}

function LessonRun({ lesson }: { lesson: LessonDef }) {
  const { progress, recordAttempt, completeSession } = useProgress();
  const { sound, readAloud } = progress.settings;
  const seed = useMemo(() => freshSeed(), []);
  // Build examples and practice together so nothing repeats across them.
  const [examples, initialPractice] = useMemo(() => {
    const all = buildSession([...lesson.examples, ...lesson.practice], seed);
    return [all.slice(0, lesson.examples.length), all.slice(lesson.examples.length)];
  }, [lesson, seed]);

  const [phase, setPhase] = useState<Phase>('intro');
  const [exampleIndex, setExampleIndex] = useState(0);
  const [practice, setPractice] = useState<Problem[]>(initialPractice);
  const [practiceIndex, setPracticeIndex] = useState(0);
  const [outcomes, setOutcomes] = useState<QuestionOutcome[]>([]);
  const [extras, setExtras] = useState(0);
  const [stars, setStars] = useState(0);
  const [badges, setBadges] = useState<BadgeDef[]>([]);
  const [confirmExit, setConfirmExit] = useState(false);

  const onPracticeNext = (outcome: QuestionOutcome) => {
    const problem = practice[practiceIndex];
    recordAttempt({ skill: problem.skill, level: problem.level, ...outcome, at: Date.now() });
    const all = [...outcomes, outcome];
    setOutcomes(all);
    let list = practice;
    if (!outcome.firstTry && extras < MAX_EXTRA) {
      list = [...practice, similarProblem(problem, [...examples, ...practice], seed + 101 * (practiceIndex + 1))];
      setPractice(list);
      setExtras((n) => n + 1);
    }
    if (practiceIndex + 1 < list.length) {
      setPracticeIndex((i) => i + 1);
      return;
    }
    const earned = starsFor(all);
    setStars(earned);
    setBadges(completeSession(earned, lesson.id));
    setPhase('done');
  };

  const leave = () => (phase === 'teach' || phase === 'practice' ? setConfirmExit(true) : navigate({ name: 'learn' }));
  const next = nextLesson(lesson);
  const phaseIndex = PHASES.findIndex((p) => p.id === phase);
  const isExtra = phase === 'practice' && practiceIndex >= initialPractice.length;

  const subtitle =
    phase === 'intro'
      ? `Lesson ${lesson.number}`
      : phase === 'teach'
        ? `Example ${exampleIndex + 1} of ${examples.length}`
        : phase === 'practice'
          ? `Your turn · ${practiceIndex + 1} of ${practice.length}`
          : 'Lesson complete';

  return (
    <main className={`screen lesson tone-${lesson.tone}`}>
      <TopBar
        title={lesson.title}
        subtitle={subtitle}
        onBack={leave}
        backIcon="close"
        backLabel="Leave lesson"
        right={
          phase !== 'done' && (
            <div className="phase-steps" aria-label="Lesson steps">
              {PHASES.map((p, i) => (
                <span key={p.id} className={`phase-step${i === phaseIndex ? ' current' : i < phaseIndex ? ' done' : ''}`}>
                  <span className="num">{i < phaseIndex ? <Icon name="check" size={16} strokeWidth={3.2} /> : i + 1}</span>
                  <span className="phase-label">{p.label}</span>
                </span>
              ))}
            </div>
          )
        }
      />

      {phase === 'intro' && <IntroCards lesson={lesson} readAloud={readAloud} onDone={() => setPhase('teach')} />}

      {phase === 'teach' && (
        <>
          <ProgressDots total={examples.length} current={exampleIndex} results={examples.slice(0, exampleIndex).map(() => 'done')} />
          <WorkedExample
            key={examples[exampleIndex].id}
            problem={examples[exampleIndex]}
            isLast={exampleIndex === examples.length - 1}
            readAloud={readAloud}
            onNext={() => (exampleIndex + 1 < examples.length ? setExampleIndex((i) => i + 1) : setPhase('practice'))}
          />
        </>
      )}

      {phase === 'practice' && (
        <>
          <div className="session-status">
            <ProgressDots total={practice.length} current={practiceIndex} results={dotResults(outcomes)} />
            {isExtra && (
              <span className="chip extra-chip">
                <Icon name="refresh" size={18} /> One more like this
              </span>
            )}
          </div>
          <QuestionPlayer
            equipped={progress.equipped}
            key={practice[practiceIndex].id}
            problem={practice[practiceIndex]}
            sound={sound}
            readAloud={readAloud}
            nextLabel={practiceIndex + 1 < practice.length ? 'Next' : 'Finish'}
            onNext={onPracticeNext}
          />
        </>
      )}

      {phase === 'done' && (
        <Completion title={`Lesson ${lesson.number} complete`} goal={lesson.goal} stars={stars} outcomes={outcomes} badges={badges} sound={sound}>
          {next && (
            <button type="button" className="btn btn-lg btn-green" onClick={() => navigate({ name: 'lesson', id: next.id })}>
              Next lesson <Icon name="arrowRight" />
            </button>
          )}
          <button type="button" className="btn btn-soft" onClick={() => navigate({ name: 'practice-topic', topic: lesson.topic })}>
            Practise more
          </button>
          <button type="button" className="btn btn-ghost" onClick={() => navigate({ name: 'learn' })}>
            All lessons
          </button>
        </Completion>
      )}

      {confirmExit && (
        <ConfirmDialog
          title="Leave this lesson?"
          message="You can start it again any time."
          confirmLabel="Leave"
          onConfirm={() => navigate({ name: 'learn' })}
          onCancel={() => setConfirmExit(false)}
        />
      )}
    </main>
  );
}

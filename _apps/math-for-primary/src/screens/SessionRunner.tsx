import { useState } from 'react';
import type { BadgeDef } from '../content/badges';
import type { Tone } from '../content/lessons';
import { LEVELS } from '../engine/levels';
import type { Problem } from '../engine/types';
import { Completion } from '../lesson/Completion';
import { dotResults, starsFor } from '../lib/session';
import { QuestionPlayer, type QuestionOutcome } from '../question/QuestionPlayer';
import { useProgress } from '../state/ProgressContext';
import { ConfirmDialog, ProgressDots, TopBar } from '../ui/common';
import { Icon } from '../ui/Icon';

/** Runs a list of questions (topic practice, mixed practice, word problems). */
export function SessionRunner({
  title,
  problems,
  tone,
  onExit,
  onAgain,
}: {
  title: string;
  problems: Problem[];
  tone: Tone;
  onExit: () => void;
  onAgain: () => void;
}) {
  const { progress, recordAttempt, completeSession } = useProgress();
  const { sound, readAloud } = progress.settings;
  const [index, setIndex] = useState(0);
  const [outcomes, setOutcomes] = useState<QuestionOutcome[]>([]);
  const [finished, setFinished] = useState<{ stars: number; badges: BadgeDef[] } | null>(null);
  const [confirmExit, setConfirmExit] = useState(false);

  const onNext = (outcome: QuestionOutcome) => {
    const problem = problems[index];
    recordAttempt({ skill: problem.skill, level: problem.level, ...outcome, at: Date.now() });
    const all = [...outcomes, outcome];
    setOutcomes(all);
    if (index + 1 < problems.length) {
      setIndex((i) => i + 1);
    } else {
      const stars = starsFor(all);
      setFinished({ stars, badges: completeSession(stars) });
    }
  };

  const current = problems[index];
  const leave = () => (finished || outcomes.length === 0 ? onExit() : setConfirmExit(true));

  return (
    <main className={`screen tone-${tone}`}>
      <TopBar
        title={title}
        subtitle={finished ? 'All done!' : `Question ${index + 1} of ${problems.length}`}
        onBack={leave}
        backIcon="close"
        backLabel="Stop"
        right={!finished && <span className="chip level-tag">{LEVELS[current.level].label}</span>}
      />
      {!finished && (
        <>
          <ProgressDots total={problems.length} current={index} results={dotResults(outcomes)} />
          <QuestionPlayer
            equipped={progress.equipped}
            key={current.id}
            problem={current}
            sound={sound}
            readAloud={readAloud}
            nextLabel={index + 1 < problems.length ? 'Next' : 'Finish'}
            onNext={onNext}
          />
        </>
      )}
      {finished && (
        <Completion title={`${title} complete`} stars={finished.stars} outcomes={outcomes} badges={finished.badges} sound={sound}>
          <button type="button" className="btn btn-lg btn-green" onClick={onAgain}>
            <Icon name="refresh" /> Practise again
          </button>
          <button type="button" className="btn btn-soft" onClick={onExit}>
            Done
          </button>
        </Completion>
      )}
      {confirmExit && (
        <ConfirmDialog
          title="Stop practising?"
          message="Your answers so far are saved."
          confirmLabel="Stop"
          onConfirm={onExit}
          onCancel={() => setConfirmExit(false)}
        />
      )}
    </main>
  );
}

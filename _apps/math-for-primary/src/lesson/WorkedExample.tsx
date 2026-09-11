import { useEffect, useMemo, useState } from 'react';
import { explain } from '../engine/explain';
import type { Problem } from '../engine/types';
import { speak } from '../lib/speech';
import { promptFor, ProblemView } from '../question/ProblemView';
import { StepPlayer } from '../question/StepPlayer';
import { Icon } from '../ui/Icon';

const THINK_MS = 4000;

function thinkPrompt(problem: Problem): string {
  switch (problem.kind) {
    case 'truefalse':
      return 'Is it true or false?';
    case 'relation':
      return 'Which side is bigger?';
    case 'choice':
      return 'Should we add or subtract?';
    case 'translate':
      return 'Which numbers? Add or subtract?';
    default:
      return problem.kind === 'number' && problem.format === 'story' ? 'What do we need to find?' : 'What goes in the box?';
  }
}

/**
 * "See": show the problem, give the child a moment to think, then explain
 * it step by step with pictures.
 */
export function WorkedExample({
  problem,
  isLast,
  onNext,
  readAloud,
}: {
  problem: Problem;
  isLast: boolean;
  onNext: () => void;
  readAloud: boolean;
}) {
  const explanation = useMemo(() => explain(problem), [problem]);
  const [phase, setPhase] = useState<'think' | 'explain'>('think');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const id = window.setTimeout(() => setReady(true), THINK_MS);
    return () => window.clearTimeout(id);
  }, []);

  useEffect(() => {
    if (readAloud && phase === 'think') {
      const story = 'story' in problem && problem.story ? `${problem.story.text} ` : '';
      speak(`${story}${thinkPrompt(problem)}`);
    }
  }, [phase, problem, readAloud]);

  if (phase === 'explain') {
    return (
      <div className="example-card card">
        <StepPlayer
          problem={problem}
          explanation={explanation}
          readAloud={readAloud}
          doneLabel={isLast ? "Let's practise" : 'Next example'}
          onDone={onNext}
        />
      </div>
    );
  }

  return (
    <div className="example-card card">
      <p className="qp-prompt">{promptFor(problem)}</p>
      <ProblemView problem={problem} revealed={false} />
      <div className="think">
        <div className="think-bubble">
          <svg className={`think-ring${ready ? ' done' : ''}`} viewBox="0 0 44 44" aria-hidden="true">
            <circle cx="22" cy="22" r="18" className="track" />
            <circle cx="22" cy="22" r="18" className="fill" pathLength={1} style={{ animationDuration: `${THINK_MS}ms` }} />
          </svg>
          <span>
            Have a think first. <strong>{thinkPrompt(problem)}</strong>
          </span>
        </div>
        <button type="button" className={`btn btn-lg${ready ? ' pulse' : ''}`} onClick={() => setPhase('explain')}>
          <Icon name="play" filled /> Show me how
        </button>
      </div>
    </div>
  );
}

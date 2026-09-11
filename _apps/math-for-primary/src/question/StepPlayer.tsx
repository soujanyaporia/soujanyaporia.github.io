import { useEffect, useState } from 'react';
import type { Explanation, Problem, Step } from '../engine/types';
import { speak } from '../lib/speech';
import { WorkLines } from '../math/WorkLines';
import { Icon } from '../ui/Icon';
import { SpeakButton } from '../ui/SpeakButton';
import { Visual } from '../visuals/Visual';
import { ProblemView } from './ProblemView';

/**
 * Plays a worked solution one step at a time: the tutor's sentence, a
 * picture that changes with each step, and the working written out.
 * When there is more than one good strategy, children can switch
 * ("Make 10", "Doubles", "Count on" …) and compare.
 */
export function StepPlayer({
  problem,
  explanation,
  onDone,
  doneLabel,
  showProblem = true,
  readAloud = false,
}: {
  problem: Problem;
  explanation: Explanation;
  onDone: () => void;
  doneLabel: string;
  showProblem?: boolean;
  readAloud?: boolean;
}) {
  const strategies: { id: string; label: string; steps: Step[] }[] = [
    { id: 'main', label: explanation.strategy ?? 'Explain', steps: explanation.steps },
    ...(explanation.alternatives ?? []),
  ];
  const [strategy, setStrategy] = useState(0);
  const [index, setIndex] = useState(0);
  const steps = strategies[strategy].steps;
  const step = steps[Math.min(index, steps.length - 1)];
  const last = index >= steps.length - 1;
  const revealed = steps.slice(0, index + 1).some((s) => s.reveal);

  useEffect(() => {
    if (readAloud) speak(step.say);
  }, [readAloud, step.say]);

  return (
    <div className="steps">
      {strategies.length > 1 && (
        <div className="strategy-tabs" role="tablist" aria-label="Ways to solve it">
          {strategies.map((s, i) => (
            <button
              key={s.id}
              type="button"
              role="tab"
              aria-selected={i === strategy}
              className={i === strategy ? 'on' : ''}
              onClick={() => {
                setStrategy(i);
                setIndex(0);
              }}
            >
              {i > 0 && <Icon name="sparkle" size={16} />} {s.label}
            </button>
          ))}
        </div>
      )}
      {showProblem && (
        <div className="steps-problem">
          <ProblemView problem={problem} revealed={revealed} size="lg" />
        </div>
      )}
      <div className="steps-visual">{step.visual ? <Visual spec={step.visual} /> : null}</div>
      <div className="tutor-say" key={`${strategy}-${index}`}>
        <p>{step.say}</p>
        <SpeakButton text={step.say} />
      </div>
      <WorkLines lines={step.work} />
      <div className="steps-nav">
        <button type="button" className="icon-btn" onClick={() => setIndex((i) => i - 1)} disabled={index === 0} aria-label="Previous step">
          <Icon name="back" />
        </button>
        <div className="step-count" aria-live="polite">
          {steps.map((_, i) => (
            <span key={i} className={i <= index ? 'on' : ''} />
          ))}
        </div>
        {last ? (
          <button type="button" className="btn btn-green" onClick={onDone}>
            {doneLabel}
            <Icon name="arrowRight" />
          </button>
        ) : (
          <button type="button" className="btn" onClick={() => setIndex((i) => i + 1)} autoFocus>
            Next step
            <Icon name="arrowRight" />
          </button>
        )}
      </div>
    </div>
  );
}

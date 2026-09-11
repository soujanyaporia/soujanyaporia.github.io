import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { equationText, equationTokens, factTokens, line, tok } from '../engine/equation';
import { explain, storyModel, whatWeKnow } from '../engine/explain';
import type { ActionId, CheckResult, Equation, Misconception, StorySegment, TileSpec, TranslateProblem, TranslateStep } from '../engine/types';
import { checkAction, checkAnswer, checkBuilt, checkQuantity, parseNumber, parseTiles } from '../engine/validate';
import { oopsFor, praiseFor } from '../lib/praise';
import { playSound } from '../lib/sound';
import { speak } from '../lib/speech';
import { EquationView } from '../math/EquationView';
import { NumberPad } from '../math/NumberPad';
import { StoryText } from '../math/StoryText';
import { WorkLines } from '../math/WorkLines';
import { Icon } from '../ui/Icon';
import { Visual } from '../visuals/Visual';
import { ActionPicker, Buddy, FeedbackBanner, HintPanel, Sparkles } from './parts';
import type { QuestionProps } from './QuestionPlayer';
import { SolutionSheet } from './SolutionSheet';
import { TileBuilder } from './TileBuilder';

const STEP_LABEL: Record<TranslateStep, string> = {
  quantities: 'Numbers',
  action: 'What happened?',
  build: 'Equation',
  solve: 'Solve',
  check: 'Check',
};

/** Put the tiles for an equation into the builder's boxes. */
function slotsFor(tiles: TileSpec[], eq: Equation): (number | null)[] {
  const used = new Set<number>();
  const find = (match: (t: TileSpec) => boolean, reusable = false) => {
    const i = tiles.findIndex((t, k) => match(t) && (reusable || !used.has(k)));
    if (i >= 0 && !reusable) used.add(i);
    return i >= 0 ? i : null;
  };
  const side = (terms: (number | null)[], ops: string[]) =>
    terms.flatMap((t, i) => {
      const term = t === null ? find((x) => x.kind === 'unknown') : find((x) => x.kind === 'num' && x.value === t);
      return i === 0 ? [term] : [find((x) => x.kind === 'op' && x.op === ops[i - 1], true), term];
    });
  return [...side(eq.left.terms, eq.left.ops), find((x) => x.kind === 'eq'), ...side(eq.right.terms, eq.right.ops)];
}

/**
 * Story → numbers → what happened → equation → solve → does it make sense?
 * The equation that describes the story (□ + 4 = 9) is kept separate from
 * the calculation that finds the answer (9 − 4 = 5).
 */
export function TranslatePlayer({ problem, onNext, nextLabel = 'Continue', sound, readAloud, equipped, scaffold = 'full', inRow = 0 }: QuestionProps & { problem: TranslateProblem }) {
  const story = problem.story;
  const explanation = useMemo(() => explain(problem), [problem]);
  const steps = useMemo<TranslateStep[]>(() => {
    if (!problem.steps.includes('build')) return problem.steps;
    if (scaffold === 'none') return problem.steps.filter((s) => s === 'build' || s === 'solve');
    if (scaffold === 'partial') return problem.steps.filter((s) => s !== 'quantities');
    return problem.steps;
  }, [problem, scaffold]);

  const [stageIndex, setStageIndex] = useState(0);
  const stage = steps[stageIndex];
  const [tapped, setTapped] = useState<Record<string, 'yes' | 'no'>>({});
  const [action, setAction] = useState<ActionId | null>(null);
  const [showAction, setShowAction] = useState(false);
  const [slots, setSlots] = useState<(number | null)[]>([null, null, null, null, null]);
  const [built, setBuilt] = useState<{ equation: Equation; form?: CheckResult['form'] } | null>(null);
  const [input, setInput] = useState('');
  const [feedback, setFeedback] = useState<CheckResult | null>(null);
  const [showWrong, setShowWrong] = useState(false);
  const [wrong, setWrong] = useState(0);
  const [stageWrong, setStageWrong] = useState(0);
  const [hintLevel, setHintLevel] = useState(0);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [solutionOpen, setSolutionOpen] = useState(false);
  const [finished, setFinished] = useState(false);
  const [misconception, setMisconception] = useState<Misconception>();
  const tries = useRef(0);
  const transitioning = useRef(false);
  const advanceTimer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(advanceTimer.current), []);
  const neededCount = story.given.filter((g) => g.role !== 'extra').length;
  const foundCount = Object.values(tapped).filter((v) => v === 'yes').length;

  useEffect(() => {
    if (readAloud) speak(story.text);
  }, [readAloud, story.text]);

  const advance = () => {
    transitioning.current = false;
    setFeedback(null);
    setShowWrong(false);
    setStageWrong(0);
    setHintLevel(0);
    if (stageIndex + 1 >= steps.length) setFinished(true);
    else setStageIndex((i) => i + 1);
  };

  const miss = (result: CheckResult) => {
    tries.current += 1;
    setFeedback(result);
    setShowWrong(true);
    setWrong((w) => w + 1);
    setStageWrong((w) => w + 1);
    if (!misconception && result.misconception) setMisconception(result.misconception);
    playSound('retry', sound);
    return stageWrong + 1;
  };

  const hit = (result: CheckResult, auto = true) => {
    tries.current += 1;
    setFeedback(result);
    setShowWrong(false);
    playSound('correct', sound);
    transitioning.current = true;
    if (auto) advanceTimer.current = window.setTimeout(advance, 1100);
  };

  const giveHint = (level: number) => {
    if (level > hintLevel) {
      setHintsUsed((h) => h + (level - hintLevel));
      setHintLevel(level);
    }
  };

  // ---------------------------------------------------------------- stage handlers
  const tapNumber = (seg: StorySegment, key: string) => {
    if (transitioning.current || tapped[key] === 'yes' || stage !== 'quantities') return;
    const result = checkQuantity(story, seg.role ?? '', seg.num ?? 0);
    if (!result.correct) {
      setTapped((t) => ({ ...t, [key]: 'no' }));
      miss(result);
      return;
    }
    const next = { ...tapped, [key]: 'yes' as const };
    setTapped(next);
    setShowWrong(false);
    playSound('tap', sound);
    if (Object.values(next).filter((v) => v === 'yes').length === neededCount) hit({ correct: true, message: 'You found the numbers that matter!' });
  };

  const pickAction = (a: ActionId) => {
    if (transitioning.current) return;
    setAction(a);
    const result = checkAction(story, a);
    if (result.correct) {
      hit(result, stageIndex + 1 < steps.length);
      if (stageIndex + 1 >= steps.length) advanceTimer.current = window.setTimeout(() => setFinished(true), 600);
      return;
    }
    if (miss(result) >= 2) {
      setShowAction(true);
      giveHint(1);
    }
  };

  const checkBuild = () => {
    if (transitioning.current) return;
    const tiles = slots.map((i) => (i === null ? null : problem.tiles[i])).filter((t): t is TileSpec => t !== null);
    if (tiles.length < slots.length && !parseTiles(tiles).equation) {
      miss({ correct: false, message: 'Almost!', detail: 'Fill every box to make an equation.' });
      return;
    }
    const result = checkBuilt(problem, tiles);
    if (result.correct) {
      setBuilt({ equation: parseTiles(tiles).equation!, form: result.form });
      hit(result);
      return;
    }
    const n = miss(result);
    giveHint(Math.min(4, n));
    if (n >= 4) {
      setRevealed(true);
      setSlots(slotsFor(problem.tiles, story.equation));
      setBuilt({ equation: story.equation, form: 'story' });
      transitioning.current = true;
      advanceTimer.current = window.setTimeout(advance, 1600);
    }
  };

  const submitNumber = () => {
    if (transitioning.current) return;
    const value = parseNumber(input);
    if (value === null) return;
    const result = checkAnswer(problem, { kind: 'number', value });
    if (result.correct) {
      hit(result);
      return;
    }
    const n = miss(result);
    giveHint(Math.min(4, n));
    if (n >= 4 && !revealed) {
      setRevealed(true);
      setSolutionOpen(true);
    }
  };

  const typeDigit = (d: string) => {
    if (stage !== 'solve' || finished) return;
    setInput((v) => (showWrong ? d : (v + d).replace(/^0(?=\d)/, '')).slice(0, 3));
    setShowWrong(false);
  };

  const finish = () =>
    onNext({
      firstTry: wrong === 0 && !revealed,
      correct: !revealed,
      tries: Math.max(1, tries.current),
      hints: hintsUsed,
      revealed,
      misconception,
      built: steps.includes('build') && !revealed,
    });

  // Keyboard: digits in the solve step, Enter to check or continue.
  const keys = useRef<(e: KeyboardEvent) => void>(() => {});
  keys.current = (e: KeyboardEvent) => {
    if (document.querySelector('[role="dialog"]') || solutionOpen || e.metaKey || e.ctrlKey) return;
    if (finished) {
      if (e.key === 'Enter') {
        e.preventDefault();
        finish();
      }
      return;
    }
    if (stage === 'solve' && /^\d$/.test(e.key)) typeDigit(e.key);
    else if (stage === 'solve' && e.key === 'Backspace') setInput((v) => v.slice(0, -1));
    else if (e.key === 'Enter' && stage === 'solve') submitNumber();
  };
  useEffect(() => {
    const listener = (e: KeyboardEvent) => keys.current(e);
    window.addEventListener('keydown', listener);
    return () => window.removeEventListener('keydown', listener);
  }, []);

  // ---------------------------------------------------------------- what the child sees
  const equation = built?.equation ?? story.equation;
  const blankAlone = equation.left.terms.length === 1 ? equation.left.terms[0] === null : equation.right.terms.length === 1 && equation.right.terms[0] === null;
  const hints = stage === 'solve' ? explanation.solveHints ?? explanation.hints : explanation.hints;
  const hint = hintLevel > 0 && !finished ? hints[hintLevel - 1] : undefined;
  const firstTry = wrong === 0 && !revealed;
  const reaction = finished
    ? praiseFor({ firstTry, hints: hintsUsed, wrong, revealed, form: built?.form, inRow: firstTry && !hintsUsed ? inRow + 1 : 0, kind: 'translate' }, problem.seed)
    : null;

  let body: ReactNode;
  let controls: ReactNode = null;
  if (stage === 'quantities') {
    body = (
      <>
        <StoryText story={story} onTapNumber={tapNumber} tapped={tapped} />
        <p className="know-title">
          Tap the numbers that matter. <strong>{foundCount}</strong> of {neededCount} found.
        </p>
      </>
    );
  } else {
    body = <StoryText story={story} compact />;
  }

  const knows =
    stage !== 'quantities' ? (
      <div className="know-panel">
        <span className="eyebrow">What do we know?</span>
        <p>{whatWeKnow(story)}</p>
        <span className="eyebrow">What are we looking for?</span>
        <p>{story.question}</p>
      </div>
    ) : null;

  if (stage === 'action') {
    controls = <ActionPicker choices={problem.actionChoices} picked={action} onPick={pickAction} locked={finished || feedback?.correct === true} correct={showAction || finished ? story.actions : undefined} />;
  }
  if (stage === 'build') {
    body = (
      <>
        {body}
        <TileBuilder tiles={problem.tiles} value={slots} onChange={(v) => { setSlots(v); setShowWrong(false); }} state={showWrong ? 'wrong' : feedback?.correct ? 'correct' : 'idle'} disabled={feedback?.correct === true} />
      </>
    );
  }
  if (stage === 'solve') {
    body = (
      <>
        {body}
        <div className="translate-solve">
          <span className="eyebrow">The story as an equation</span>
          <EquationView tokens={equationTokens(equation)} size="lg" input={blankAlone ? input : ''} blankState={blankAlone ? (showWrong ? 'wrong' : 'active') : 'idle'} />
          {!blankAlone && (
            <>
              <span className="eyebrow">To find ?, calculate</span>
              <EquationView tokens={factTokens(story.solve, { hide: 'c' })} size="lg" input={input} blankState={showWrong ? 'wrong' : 'active'} />
            </>
          )}
        </div>
      </>
    );
    controls = <NumberPad onDigit={typeDigit} onBackspace={() => setInput((v) => v.slice(0, -1))} onSubmit={submitNumber} canSubmit={input.length > 0 && !showWrong} disabled={feedback?.correct === true} />;
  }
  if (stage === 'check' || (finished && steps.includes('check'))) {
    body = (
      <div className="check-card">
        <span className="eyebrow">Does it make sense?</span>
        <p className="check-sentence">{story.answerSentence}</p>
        <Visual spec={storyModel(story, true)} />
        <WorkLines lines={[line(equationTokens(story.equation, story.solve.c), 'check', 'Check')]} />
      </div>
    );
    if (!finished) {
      controls = (
        <button type="button" className="btn btn-green btn-lg btn-block" onClick={() => { playSound('correct', sound); setFinished(true); }}>
          <Icon name="check" strokeWidth={3} /> Yes, it makes sense!
        </button>
      );
    }
  }
  if (finished && !steps.includes('check')) {
    body = (
      <>
        <StoryText story={story} compact />
        <div className="translate-solve">
          <span className="eyebrow">The story as an equation</span>
          <EquationView tokens={equationTokens(story.equation, steps.includes('solve') ? story.solve.c : undefined)} size="lg" blankState={steps.includes('solve') ? 'correct' : 'idle'} />
          <p className="muted">{equationText(story.equation).includes('□') && !steps.includes('solve') ? 'Next time, we will solve it too!' : story.answerSentence}</p>
        </div>
      </>
    );
  }

  return (
    <div className={`qp translate${finished ? ' is-done' : ''}`}>
      <section className="qp-stage card" aria-label="Story problem">
        <div className="translate-steps" aria-label="Steps">
          {steps.map((s, i) => (
            <span key={s} className={`tstep${i === stageIndex && !finished ? ' current' : ''}${i < stageIndex || finished ? ' done' : ''}`}>
              <span className="tstep-num">{i < stageIndex || finished ? <Icon name="check" size={14} strokeWidth={3.2} /> : i + 1}</span>
              <span className="tstep-label">{STEP_LABEL[s]}</span>
            </span>
          ))}
          <button type="button" className="explain-link" onClick={() => { if (!finished) setRevealed(true); setSolutionOpen(true); }}>
            <Icon name="eye" size={18} /> Explain this
          </button>
        </div>
        <div className="qp-problem translate-body">
          {body}
          {finished && (
            <>
              <Sparkles />
            </>
          )}
        </div>
        {knows}
        {feedback && !finished && (showWrong || feedback.correct) && <FeedbackBanner result={feedback} />}
        {hint && <HintPanel hint={hint} />}
      </section>

      <aside className="qp-controls" aria-label="Answer">
        {finished && reaction ? <Buddy mood={reaction.mood} line={reaction.line} equipped={equipped} /> : controls}
        {showWrong && !finished && <p className="oops-line">{oopsFor(feedback?.misconception, problem.seed + wrong).line}</p>}
        <div className="qp-actions">
          {finished ? (
            <button type="button" className="btn btn-green btn-lg btn-block" onClick={finish} autoFocus>
              {nextLabel} <Icon name="arrowRight" />
            </button>
          ) : (
            <>
              {(stage === 'build' || stage === 'solve' || stage === 'action') && hintLevel < 4 && (
                <button type="button" className="btn btn-hint" onClick={() => giveHint(hintLevel + 1)}>
                  <Icon name="bulb" /> {hintLevel === 0 ? 'Hint' : `More help ${hintLevel + 1}/4`}
                </button>
              )}
              {stage === 'build' && (
                <button type="button" className="btn btn-lg" onClick={checkBuild} disabled={slots.every((s) => s === null) || feedback?.correct === true}>
                  Check
                </button>
              )}
            </>
          )}
        </div>
      </aside>

      {solutionOpen && (
        <SolutionSheet
          problem={problem}
          explanation={explanation}
          readAloud={readAloud}
          doneLabel={finished ? 'Close' : 'Now you try'}
          onClose={() => setSolutionOpen(false)}
        />
      )}
    </div>
  );
}

export { tok };

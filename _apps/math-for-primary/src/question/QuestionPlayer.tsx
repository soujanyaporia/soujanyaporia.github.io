import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { equationTokens, factTokens, OP_SYMBOL, tok } from '../engine/equation';
import { explain } from '../engine/explain';
import type { CheckResult, Misconception, Problem, Relation, Token } from '../engine/types';
import { checkAnswer, parseNumber, type Answer } from '../engine/validate';
export type { QuestionOutcome } from '../game/engine';
import type { QuestionOutcome } from '../game/engine';
import type { Equipped } from '../game/store';
import { oopsFor, praiseFor } from '../lib/praise';
import { playSound } from '../lib/sound';
import { speak, speechText } from '../lib/speech';
import { EquationView, tokensToText, type BlankState } from '../math/EquationView';
import { NumberPad } from '../math/NumberPad';
import { StoryText } from '../math/StoryText';
import { Icon } from '../ui/Icon';
import { NumberBond } from '../visuals/NumberBond';
import { Visual } from '../visuals/Visual';
import {
  Buddy,
  FeedbackBanner,
  HintPanel,
  MakeInput,
  MatchInput,
  OptionsInput,
  RelationInput,
  Sparkles,
  TrueFalseInput,
  type MakePick,
} from './parts';
import { bondSpecOf, promptFor, RelationView, unitFor } from './ProblemView';
import { SequenceTrain } from './SequenceTrain';
import { ShareBoard } from './ShareBoard';
import { SolutionSheet } from './SolutionSheet';
import { TranslatePlayer } from './TranslatePlayer';
import './question.css';
import './question2.css';

export interface AnswerReport extends QuestionOutcome {
  misconception?: Misconception;
  /** A story was turned into an equation by the child. */
  built?: boolean;
}

export interface QuestionProps {
  problem: Problem;
  onNext: (report: AnswerReport) => void;
  nextLabel?: string;
  sound: boolean;
  readAloud: boolean;
  equipped: Equipped;
  /** Challenges: prompts do not say which operation to use. */
  neutral?: boolean;
  /** Story-to-equation scaffolding, removed as mastery grows. */
  scaffold?: 'full' | 'partial' | 'none';
  /** Clean answers in a row before this question. */
  inRow?: number;
}

/**
 * One question, taught patiently:
 *   answer → (wrong) feedback + hint → more hints → worked solution
 *   → the child still enters the answer themselves → continue.
 */
export function QuestionPlayer(props: QuestionProps) {
  if (props.problem.kind === 'translate') return <TranslatePlayer {...props} problem={props.problem} />;
  return <StandardPlayer {...props} />;
}

type Selected = boolean | Relation | number | null;

function StandardPlayer({ problem, onNext, nextLabel = 'Continue', sound, readAloud, equipped, neutral = false, inRow = 0 }: QuestionProps) {
  const explanation = useMemo(() => explain(problem), [problem]);
  const [phase, setPhase] = useState<'share' | 'answer'>(problem.kind === 'number' && problem.activity === 'share' ? 'share' : 'answer');
  const [input, setInput] = useState('');
  const [selected, setSelected] = useState<Selected>(null);
  const [make, setMake] = useState<MakePick>({ a: null, op: problem.kind === 'make' ? problem.ops[0] : '+', b: null });
  const [wrong, setWrong] = useState(0);
  const [hintLevel, setHintLevel] = useState(0);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [feedback, setFeedback] = useState<CheckResult | null>(null);
  const [showWrong, setShowWrong] = useState(false);
  const [done, setDone] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [solutionOpen, setSolutionOpen] = useState(false);
  const [misconception, setMisconception] = useState<Misconception>();
  const tries = useRef(0);

  const numeric = problem.kind === 'number' || problem.kind === 'sequence';
  const hint = hintLevel > 0 ? explanation.hints[hintLevel - 1] : undefined;

  useEffect(() => {
    if (!readAloud) return;
    const story = problem.kind === 'number' || problem.kind === 'choice' ? problem.story?.text : undefined;
    speak(story ?? `${promptFor(problem, neutral)}. ${speechText(tokensToText(mainTokens(problem)))}`);
  }, [problem, readAloud, neutral]);

  const answer = (): Answer | null => {
    switch (problem.kind) {
      case 'number':
      case 'sequence': {
        const value = parseNumber(input);
        return value === null ? null : { kind: 'number', value };
      }
      case 'truefalse':
        return typeof selected === 'boolean' ? { kind: 'truefalse', value: selected } : null;
      case 'relation':
        return typeof selected === 'string' ? { kind: 'relation', value: selected } : null;
      case 'choice':
      case 'match':
        return typeof selected === 'number' ? { kind: 'choice', index: selected } : null;
      case 'make':
        return make.a !== null && make.b !== null ? { kind: 'make', a: make.a, op: make.op, b: make.b } : null;
      default:
        return null;
    }
  };

  const giveHint = (level: number) => {
    if (level > hintLevel) {
      setHintsUsed((h) => h + (level - hintLevel));
      setHintLevel(level);
    }
  };

  const openSolution = () => {
    if (!done) setRevealed(true);
    setSolutionOpen(true);
  };

  const submit = (override?: Answer) => {
    if (done) return;
    const given = override ?? answer();
    if (!given) return;
    const result = checkAnswer(problem, given);
    tries.current += 1;
    setFeedback(result);
    if (result.correct) {
      setShowWrong(false);
      setDone(true);
      playSound('correct', sound);
      if (readAloud) speak(result.message);
      return;
    }
    const n = wrong + 1;
    setWrong(n);
    setShowWrong(true);
    playSound('retry', sound);
    if (!misconception && result.misconception) setMisconception(result.misconception);
    giveHint(Math.min(4, n));
    if (n >= 4 && !revealed) openSolution();
  };

  const typeDigit = (digit: string) => {
    if (done || !numeric || phase !== 'answer') return;
    setInput((value) => (showWrong ? digit : (value + digit).replace(/^0(?=\d)/, '')).slice(0, 3));
    setShowWrong(false);
  };

  const backspace = () => {
    if (done) return;
    setInput((value) => (showWrong ? '' : value.slice(0, -1)));
    setShowWrong(false);
  };

  const finish = () =>
    onNext({ firstTry: wrong === 0 && !revealed, correct: !revealed, tries: tries.current, hints: hintsUsed, revealed, misconception });

  const keyHandler = useRef<(e: KeyboardEvent) => void>(() => {});
  keyHandler.current = (e: KeyboardEvent) => {
    if (document.querySelector('[role="dialog"]') || solutionOpen || e.metaKey || e.ctrlKey || e.altKey) return;
    if (done) {
      if (e.key === 'Enter') {
        e.preventDefault();
        finish();
      }
      return;
    }
    if (numeric && /^\d$/.test(e.key)) typeDigit(e.key);
    else if (numeric && e.key === 'Backspace') backspace();
    else if (e.key === 'Enter') {
      e.preventDefault();
      submit();
    }
  };
  useEffect(() => {
    const listener = (e: KeyboardEvent) => keyHandler.current(e);
    window.addEventListener('keydown', listener);
    return () => window.removeEventListener('keydown', listener);
  }, []);

  const blankState: BlankState = done ? 'correct' : showWrong ? 'wrong' : 'active';
  const firstTry = wrong === 0 && !revealed;
  const reaction = done
    ? praiseFor({ firstTry, hints: hintsUsed, wrong, revealed, inRow: firstTry && hintsUsed === 0 ? inRow + 1 : 0, kind: problem.kind }, problem.seed)
    : null;
  const oops = showWrong ? oopsFor(feedback?.misconception, problem.seed + wrong) : null;

  // ---------------------------------------------------------------- the question itself
  let stageView: ReactNode;
  if (phase === 'share' && problem.kind === 'number') {
    stageView = (
      <ShareBoard total={problem.fact.a} groups={problem.fact.b} item={problem.item} sound={sound} onShared={() => setPhase('answer')} />
    );
  } else if (problem.kind === 'number' && problem.format === 'bond') {
    const { spec, active } = bondSpecOf(problem);
    stageView = <NumberBond spec={spec} input={done ? String(problem.answer) : input} active={active} />;
  } else if (problem.kind === 'number' && problem.format === 'story') {
    stageView = (
      <div className="problem-story">
        <StoryText story={problem.story!} />
        <div className="story-answer">
          <EquationView tokens={[tok.blank()]} size="lg" input={input} blankState={blankState} />
          <span className="story-unit">{unitFor(problem, input || '2')}</span>
        </div>
      </div>
    );
  } else if (problem.kind === 'number') {
    stageView = (
      <div className="problem-stack">
        {problem.picture && problem.activity !== 'share' && (
          <div className="problem-picture">
            <Visual spec={problem.picture} />
          </div>
        )}
        {problem.activity === 'share' && <p className="share-done-note">Everyone has a fair share. How many does each friend get?</p>}
        {problem.related && <EquationView tokens={equationTokens(problem.related)} size="lg" input={input} blankState={blankState} className="related-eq" />}
        <EquationView tokens={equationTokens(problem.equation!)} size={problem.picture || problem.related ? 'lg' : 'xl'} input={input} blankState={blankState} />
      </div>
    );
  } else if (problem.kind === 'truefalse') {
    stageView = <EquationView tokens={equationTokens(problem.equation)} size="xl" />;
  } else if (problem.kind === 'relation') {
    stageView = <RelationView problem={problem} value={(selected as Relation) ?? null} size="xl" state={done ? 'correct' : showWrong ? 'wrong' : 'idle'} />;
  } else if (problem.kind === 'choice') {
    stageView = (
      <div className="problem-story">
        <StoryText story={problem.story} />
      </div>
    );
  } else if (problem.kind === 'match') {
    stageView = (
      <div className="problem-stack">
        <EquationView tokens={factTokens(problem.equation)} size="xl" />
        <p className="muted match-tip">Read each story. Which one does the same thing?</p>
      </div>
    );
  } else if (problem.kind === 'make') {
    const card = (i: number | null) => (i === null ? '' : String(problem.cards[i]));
    stageView = (
      <div className="problem-stack">
        <span className="make-target" aria-label={`Target ${problem.target}`}>
          {problem.target}
        </span>
        <div className={`make-slots eq eq-lg${showWrong ? ' wrong' : ''}${done ? ' right' : ''}`}>
          <span className={`make-slot${make.a === null ? ' empty' : ''}`}>{card(make.a)}</span>
          <span className="eq-op">{OP_SYMBOL[make.op]}</span>
          <span className={`make-slot${make.b === null ? ' empty' : ''}`}>{card(make.b)}</span>
          <span className="eq-op">=</span>
          <span className="eq-num">{problem.target}</span>
        </div>
      </div>
    );
  } else if (problem.kind === 'sequence') {
    stageView = <SequenceTrain terms={problem.terms} input={input} state={done ? 'correct' : showWrong ? 'wrong' : 'active'} moving={done} />;
  }

  // ---------------------------------------------------------------- the answer area
  let controls: ReactNode = null;
  if (phase === 'share') {
    controls = <p className="controls-note">Share them out so every friend gets the same.</p>;
  } else if (numeric) {
    controls = <NumberPad onDigit={typeDigit} onBackspace={backspace} onSubmit={() => submit()} canSubmit={input.length > 0 && !showWrong} disabled={done} />;
  } else if (problem.kind === 'truefalse') {
    controls = (
      <TrueFalseInput
        picked={selected as boolean | null}
        locked={done}
        onPick={(value) => {
          setSelected(value);
          submit({ kind: 'truefalse', value });
        }}
      />
    );
  } else if (problem.kind === 'relation') {
    controls = (
      <RelationInput
        picked={selected as Relation | null}
        locked={done}
        onPick={(value) => {
          setSelected(value);
          submit({ kind: 'relation', value });
        }}
      />
    );
  } else if (problem.kind === 'choice') {
    controls = (
      <OptionsInput
        options={problem.options}
        style={problem.style}
        picked={selected as number | null}
        locked={done}
        correctIndex={done ? problem.answer : undefined}
        onPick={(index) => {
          setSelected(index);
          setShowWrong(false);
        }}
      />
    );
  } else if (problem.kind === 'match') {
    controls = (
      <MatchInput
        options={problem.options}
        picked={selected as number | null}
        locked={done}
        correctIndex={done ? problem.answer : undefined}
        onPick={(index) => {
          setSelected(index);
          setShowWrong(false);
        }}
      />
    );
  } else if (problem.kind === 'make') {
    controls = (
      <MakeInput
        cards={problem.cards}
        ops={problem.ops}
        pick={make}
        locked={done}
        onChange={(p) => {
          setMake(p);
          setShowWrong(false);
        }}
      />
    );
  }

  const needsCheck = !numeric && (problem.kind === 'choice' || problem.kind === 'match' || problem.kind === 'make');
  const canCheck = answer() !== null && !showWrong;

  return (
    <div className={`qp${done ? ' is-done' : ''}`}>
      <section className="qp-stage card" aria-label="Question">
        <div className="qp-head">
          <p className="qp-prompt">{phase === 'share' ? 'Share it out fairly' : promptFor(problem, neutral)}</p>
          {phase === 'answer' && (
            <button type="button" className="explain-link" onClick={openSolution}>
              <Icon name="eye" size={18} /> Explain this
            </button>
          )}
        </div>
        <div className="qp-problem">
          {stageView}
          {done && (
            <>
              <Sparkles />
            </>
          )}
        </div>
        {feedback && (showWrong || feedback.correct) && <FeedbackBanner result={feedback} />}
        {hint && !done && <HintPanel hint={hint} />}
      </section>

      <aside className="qp-controls" aria-label="Answer">
        {done && reaction ? <Buddy mood={reaction.mood} line={reaction.line} equipped={equipped} /> : controls}
        {oops && !done && <p className="oops-line">{oops.line}</p>}
        <div className="qp-actions">
          {done ? (
            <button type="button" className="btn btn-green btn-lg btn-block" onClick={finish} autoFocus>
              {nextLabel}
              <Icon name="arrowRight" />
            </button>
          ) : (
            phase === 'answer' && (
              <>
                {hintLevel < 4 ? (
                  <button type="button" className="btn btn-hint" onClick={() => giveHint(hintLevel + 1)}>
                    <Icon name="bulb" /> {hintLevel === 0 ? 'Hint' : `More help ${hintLevel + 1}/4`}
                  </button>
                ) : (
                  <button type="button" className="btn btn-hint" onClick={openSolution}>
                    <Icon name="eye" /> Show me how
                  </button>
                )}
                {needsCheck && (
                  <button type="button" className="btn btn-lg" onClick={() => submit()} disabled={!canCheck}>
                    Check
                  </button>
                )}
              </>
            )
          )}
        </div>
      </aside>

      {solutionOpen && (
        <SolutionSheet
          problem={problem}
          explanation={explanation}
          readAloud={readAloud}
          doneLabel={done ? 'Close' : 'Now you try'}
          onClose={() => setSolutionOpen(false)}
        />
      )}
    </div>
  );
}

function mainTokens(problem: Problem): Token[] {
  if (problem.kind === 'number' && problem.equation) return equationTokens(problem.equation);
  if (problem.kind === 'truefalse') return equationTokens(problem.equation);
  if (problem.kind === 'match') return factTokens(problem.equation);
  return [];
}

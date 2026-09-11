import type { CSSProperties } from 'react';
import { calcTokens, factTokens, OP_SYMBOL } from '../engine/equation';
import type { ActionId, CheckResult, Fact, Hint, Op, Relation } from '../engine/types';
import { ACTION_INFO } from '../engine/word/storyMath';
import type { Equipped } from '../game/store';
import { EquationView } from '../math/EquationView';
import { WorkLines } from '../math/WorkLines';
import { Icon } from '../ui/Icon';
import { Mascot, type Mood } from '../ui/Mascot';
import { SpeakButton } from '../ui/SpeakButton';
import { Visual } from '../visuals/Visual';

// ---------------------------------------------------------------- feedback

export function FeedbackBanner({ result }: { result: CheckResult }) {
  return (
    <div className={`feedback ${result.correct ? 'good' : 'try'}`} role="status" aria-live="polite">
      <span className="feedback-icon">
        <Icon name={result.correct ? 'check' : 'refresh'} size={26} strokeWidth={3} />
      </span>
      <div className="feedback-text">
        <p className="feedback-msg">{result.message}</p>
        {result.detail && <p className="feedback-detail">{result.detail}</p>}
        {!result.correct && !result.detail && <p className="feedback-detail">Have another go.</p>}
      </div>
    </div>
  );
}

/** Dot's short reaction next to the answer buttons. */
export function Buddy({ mood, line, equipped }: { mood: Mood; line: string; equipped: Equipped }) {
  return (
    <div className="buddy">
      <Mascot mood={mood} size={74} equipped={equipped} bubble={line} />
    </div>
  );
}

export function XpFloat({ amount }: { amount: number }) {
  if (amount <= 0) return null;
  return (
    <span className="xp-float" aria-hidden="true">
      +{amount} XP
    </span>
  );
}

export function Sparkles() {
  return (
    <span className="sparkles" aria-hidden="true">
      {Array.from({ length: 10 }, (_, i) => (
        <span key={i} style={{ '--a': `${i * 36}deg`, '--d': `${(i % 3) * 40}ms` } as CSSProperties} />
      ))}
    </span>
  );
}

export function HintPanel({ hint }: { hint: Hint }) {
  return (
    <div className="hint" key={hint.level}>
      <div className="hint-head">
        <Icon name="bulb" size={22} />
        <span>Hint {hint.level} of 4</span>
        <SpeakButton text={hint.say} label="Read the hint" />
      </div>
      <p className="hint-say">{hint.say}</p>
      {hint.work && <WorkLines lines={[hint.work]} />}
      {hint.visual && (
        <div className="hint-visual">
          <Visual spec={hint.visual} />
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- choice inputs

export function TrueFalseInput({ onPick, picked, locked }: { onPick: (value: boolean) => void; picked: boolean | null; locked: boolean }) {
  return (
    <div className="choice-row two">
      {[true, false].map((value) => (
        <button
          key={String(value)}
          type="button"
          className={`choice-btn tf ${value ? 'yes' : 'no'}${picked === value ? ' picked' : ''}`}
          onClick={() => onPick(value)}
          disabled={locked}
        >
          <Icon name={value ? 'check' : 'close'} size={30} strokeWidth={3} />
          {value ? 'True' : 'False'}
        </button>
      ))}
    </div>
  );
}

const RELATIONS: { value: Relation; words: string }[] = [
  { value: '<', words: 'less than' },
  { value: '=', words: 'equal to' },
  { value: '>', words: 'more than' },
];

export function RelationInput({ onPick, picked, locked }: { onPick: (r: Relation) => void; picked: Relation | null; locked: boolean }) {
  return (
    <div className="choice-row three">
      {RELATIONS.map((r) => (
        <button key={r.value} type="button" className={`choice-btn rel${picked === r.value ? ' picked' : ''}`} onClick={() => onPick(r.value)} disabled={locked}>
          <span className="rel-symbol">{r.value}</span>
          <span className="rel-words">{r.words}</span>
        </button>
      ))}
    </div>
  );
}

export function OptionsInput({
  options,
  style,
  picked,
  onPick,
  locked,
  correctIndex,
}: {
  options: Fact[];
  style: 'equation' | 'expression';
  picked: number | null;
  onPick: (index: number) => void;
  locked: boolean;
  correctIndex?: number;
}) {
  return (
    <div className={`options${options.length > 3 ? ' grid' : ''}`}>
      {options.map((option, i) => (
        <button
          key={i}
          type="button"
          className={`option-btn${picked === i ? ' picked' : ''}${correctIndex === i ? ' right' : ''}`}
          onClick={() => onPick(i)}
          disabled={locked}
        >
          <span className="option-letter">{String.fromCharCode(65 + i)}</span>
          <EquationView tokens={style === 'expression' ? calcTokens(option) : factTokens(option)} size="sm" />
        </button>
      ))}
    </div>
  );
}

export function MatchInput({
  options,
  picked,
  onPick,
  locked,
  correctIndex,
}: {
  options: string[];
  picked: number | null;
  onPick: (index: number) => void;
  locked: boolean;
  correctIndex?: number;
}) {
  return (
    <div className="options stories">
      {options.map((text, i) => (
        <button
          key={i}
          type="button"
          className={`option-btn story-option${picked === i ? ' picked' : ''}${correctIndex === i ? ' right' : ''}`}
          onClick={() => onPick(i)}
          disabled={locked}
        >
          <span className="option-letter">{String.fromCharCode(65 + i)}</span>
          <span className="story-option-text">{text}</span>
        </button>
      ))}
    </div>
  );
}

export interface MakePick {
  a: number | null;
  op: Op;
  b: number | null;
}

/** Pick two cards (and an operation) to make the target. */
export function MakeInput({
  cards,
  ops,
  pick,
  onChange,
  locked,
}: {
  cards: number[];
  ops: Op[];
  pick: MakePick;
  onChange: (pick: MakePick) => void;
  locked: boolean;
}) {
  const tap = (i: number) => {
    if (pick.a === i) onChange({ ...pick, a: pick.b, b: null });
    else if (pick.b === i) onChange({ ...pick, b: null });
    else if (pick.a === null) onChange({ ...pick, a: i });
    else if (pick.b === null) onChange({ ...pick, b: i });
    else onChange({ ...pick, b: i });
  };
  return (
    <div className="make-input">
      <div className="make-cards">
        {cards.map((c, i) => (
          <button
            key={i}
            type="button"
            className={`make-card${pick.a === i || pick.b === i ? ' picked' : ''}`}
            onClick={() => tap(i)}
            disabled={locked}
            aria-pressed={pick.a === i || pick.b === i}
          >
            {c}
          </button>
        ))}
      </div>
      {ops.length > 1 && (
        <div className="make-ops" role="group" aria-label="Operation">
          {ops.map((op) => (
            <button key={op} type="button" className={`tile-chip k-op${pick.op === op ? ' chosen' : ''}`} onClick={() => onChange({ ...pick, op })} disabled={locked}>
              {OP_SYMBOL[op]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

const ACTION_ICON: Record<ActionId, string> = { join: '+', partwhole: '+', separate: '−', compare: '↔', groups: '×', share: '÷' };

export function ActionPicker({
  choices,
  picked,
  onPick,
  locked,
  correct,
}: {
  choices: ActionId[];
  picked: ActionId | null;
  onPick: (a: ActionId) => void;
  locked: boolean;
  correct?: ActionId[];
}) {
  return (
    <div className="action-picker">
      {choices.map((a) => (
        <button
          key={a}
          type="button"
          className={`action-btn a-${a}${picked === a ? ' picked' : ''}${correct?.includes(a) ? ' right' : ''}`}
          onClick={() => onPick(a)}
          disabled={locked}
        >
          <span className="action-symbol" aria-hidden="true">
            {ACTION_ICON[a]}
          </span>
          <span className="action-label">{ACTION_INFO[a].label}</span>
        </button>
      ))}
    </div>
  );
}

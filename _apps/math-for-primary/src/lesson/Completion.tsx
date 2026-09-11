import { useEffect, type ReactNode } from 'react';
import type { BadgeDef } from '../content/badges';
import type { QuestionOutcome } from '../game/engine';
import { playSound } from '../lib/sound';
import { BadgeMedal } from '../ui/BadgeMedal';
import { Confetti, Stars } from '../ui/common';
import { Icon } from '../ui/Icon';

export function Completion({ title, goal, outcomes, stars, badges, sound, children }: {
  title: string; goal?: string; outcomes: QuestionOutcome[]; stars: number;
  badges: BadgeDef[]; sound: boolean; children: ReactNode;
}) {
  useEffect(() => { playSound('complete', sound); }, [sound]);
  const firstTry = outcomes.filter(o => o.firstTry).length;
  const hints = outcomes.reduce((sum, o) => sum + o.hints, 0);
  return <div className="completion card">
    {stars >= 2 && <Confetti />}
    <p className="eyebrow">{title}</p>
    <h2>{stars === 3 ? 'Brilliant work!' : 'Well done for practising!'}</h2>
    <Stars count={stars} size={48} />
    {goal && <p className="completion-goal"><Icon name="check" size={20} /> {goal}</p>}
    <div className="completion-stats">
      <div className="stat tone-blue"><strong>{outcomes.length}</strong><span>questions practised</span></div>
      <div className="stat tone-green"><strong>{firstTry}/{outcomes.length}</strong><span>right on the first try</span></div>
    </div>
    {hints > 0 && <p className="muted">Asking for help is part of learning.</p>}
    {badges.length > 0 && <div className="completion-badges"><p className="eyebrow">New badge!</p>
      <div className="badge-row">{badges.map(b => <BadgeMedal key={b.id} badge={b} earned />)}</div></div>}
    <div className="completion-actions">{children}</div>
  </div>;
}

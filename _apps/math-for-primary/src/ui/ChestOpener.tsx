import { useState } from 'react';
import type { Reward } from '../game/engine';
import { itemById } from '../game/store';
import { playSound } from '../lib/sound';
import { Confetti } from './common';
import { ChestIcon, GemIcon } from './GameIcons';
import { ItemPreview } from './ItemPreview';

type Phase = 'closed' | 'shaking' | 'open';

/**
 * Tap → shake → open → rewards. Short and sweet: about a second from tap
 * to reward, then the child collects and carries on.
 */
export function ChestOpener({
  rare,
  title,
  sound,
  onOpen,
  onDone,
}: {
  rare: boolean;
  title: string;
  sound: boolean;
  /** Performs the opening (dispatch) and returns what was inside. */
  onOpen: () => Reward[];
  onDone: () => void;
}) {
  const [phase, setPhase] = useState<Phase>('closed');
  const [rewards, setRewards] = useState<Reward[]>([]);

  const open = () => {
    if (phase !== 'closed') return;
    setPhase('shaking');
    playSound('tap', sound);
    window.setTimeout(() => {
      setRewards(onOpen());
      setPhase('open');
      playSound('complete', sound);
    }, 750);
  };

  const gems = rewards.reduce((sum, r) => sum + (r.kind === 'gems' ? r.amount : 0), 0);
  const items = rewards.filter((r): r is Extract<Reward, { kind: 'item' }> => r.kind === 'item');

  return (
    <div className="dialog-backdrop chest-backdrop">
      {phase === 'open' && <Confetti pieces={28} />}
      <div className="chest-dialog card" role="dialog" aria-modal="true" aria-label={title}>
        <p className="eyebrow">{title}</p>
        <button type="button" className={`chest-button ${phase}`} onClick={open} disabled={phase !== 'closed'} aria-label="Open the chest">
          <ChestIcon size={150} open={phase === 'open'} rare={rare} />
        </button>
        {phase === 'closed' && <p className="chest-hint">Tap the chest to open it!</p>}
        {phase === 'open' && (
          <div className="chest-rewards">
            {gems > 0 && (
              <div className="chest-reward gems">
                <GemIcon size={40} />
                <strong>+{gems}</strong>
                <span>Math Gems</span>
              </div>
            )}
            {items.map((r) => {
              const item = itemById(r.itemId);
              return item ? (
                <div key={r.itemId} className="chest-reward item">
                  <ItemPreview item={item} size={64} />
                  <strong>{item.name}</strong>
                  <span>{item.slot === 'sticker' ? 'New sticker!' : 'New item for Dot!'}</span>
                </div>
              ) : null;
            })}
          </div>
        )}
        {phase === 'open' && (
          <button type="button" className="btn btn-lg btn-green" onClick={onDone} autoFocus>
            Collect
          </button>
        )}
      </div>
    </div>
  );
}

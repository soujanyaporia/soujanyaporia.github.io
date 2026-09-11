import { useEffect, useState } from 'react';
import { navigate } from '../app/router';
import { ACHIEVEMENTS } from '../game/achievements';
import type { Reward } from '../game/engine';
import { itemById } from '../game/store';
import { SKILLS } from '../engine/skills';
import { playSound } from '../lib/sound';
import { useGame } from '../state/GameContext';
import { BadgeMedal } from './BadgeMedal';
import { Confetti } from './common';
import { ChestIcon, GemIcon, XpIcon } from './GameIcons';
import { Icon } from './Icon';
import { Mascot } from './Mascot';

interface Toast {
  id: number;
  reward: Reward;
}

let toastId = 0;

function ToastBody({ reward }: { reward: Reward }) {
  switch (reward.kind) {
    case 'achievement': {
      const def = ACHIEVEMENTS.find((a) => a.id === reward.id);
      return (
        <>
          {def ? <BadgeMedal badge={def} earned compact /> : <Icon name="trophy" />}
          <span className="toast-text">
            <small>Achievement unlocked</small>
            <strong>{reward.title}</strong>
            <span className="toast-meta">
              +{reward.xp} XP{reward.gems ? ` · +${reward.gems}` : ''} {reward.gems ? <GemIcon size={16} /> : null}
            </span>
          </span>
        </>
      );
    }
    case 'quest':
      return (
        <>
          <span className="toast-icon tone-orange">
            <Icon name="check" strokeWidth={3} />
          </span>
          <span className="toast-text">
            <small>Quest complete — tap to collect</small>
            <strong>{reward.title}</strong>
          </span>
        </>
      );
    case 'questsAll':
      return (
        <>
          <span className="toast-icon tone-yellow">
            <Icon name="trophy" />
          </span>
          <span className="toast-text">
            <small>All quests done today!</small>
            <strong>Bonus chest earned</strong>
          </span>
        </>
      );
    case 'chest':
      return (
        <>
          <ChestIcon size={44} rare={reward.chest.rare} />
          <span className="toast-text">
            <small>New treasure chest</small>
            <strong>Tap to open it</strong>
          </span>
        </>
      );
    case 'mastery':
      return (
        <>
          <span className="toast-icon tone-green">
            <Icon name="star" filled strokeWidth={1.5} />
          </span>
          <span className="toast-text">
            <small>Skill mastered</small>
            <strong>{SKILLS[reward.skill].title}</strong>
          </span>
        </>
      );
    case 'item':
      return (
        <>
          <span className="toast-icon tone-purple">
            <Icon name="gift" />
          </span>
          <span className="toast-text">
            <small>New item</small>
            <strong>{itemById(reward.itemId)?.name ?? 'Surprise'}</strong>
          </span>
        </>
      );
    default:
      return null;
  }
}

const TARGET: Partial<Record<Reward['kind'], () => void>> = {
  quest: () => navigate({ name: 'rewards', tab: 'quests' }),
  questsAll: () => navigate({ name: 'rewards', tab: 'chests' }),
  chest: () => navigate({ name: 'rewards', tab: 'chests' }),
  achievement: () => navigate({ name: 'progress' }),
  item: () => navigate({ name: 'rewards', tab: 'shop' }),
};

/**
 * Celebrations for big moments, shown between activities (never on top of
 * a question). Level-ups get a short full-screen moment; everything else
 * is a toast that can be tapped to go and collect it.
 */
export function RewardsLayer() {
  const { pending, takePending, focus, state } = useGame();
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [levelUp, setLevelUp] = useState<{ level: number; title: string } | null>(null);

  useEffect(() => {
    if (focus || pending.length === 0) return;
    const items = takePending();
    const level = [...items].reverse().find((r) => r.kind === 'level');
    if (level && level.kind === 'level') {
      setLevelUp({ level: level.level, title: level.title });
      playSound('complete', state.settings.sound);
    }
    const fresh = items.filter((r) => r.kind !== 'level').map((reward) => ({ id: ++toastId, reward }));
    if (fresh.length) setToasts((t) => [...t, ...fresh].slice(-4));
  }, [focus, pending, takePending, state.settings.sound]);

  useEffect(() => {
    if (!toasts.length) return;
    const id = window.setTimeout(() => setToasts((t) => t.slice(1)), 3600);
    return () => window.clearTimeout(id);
  }, [toasts]);

  return (
    <>
      <div className="toasts" aria-live="polite">
        {toasts.map((t) => (
          <button
            key={t.id}
            type="button"
            className="toast"
            onClick={() => {
              setToasts((all) => all.filter((x) => x.id !== t.id));
              TARGET[t.reward.kind]?.();
            }}
          >
            <ToastBody reward={t.reward} />
          </button>
        ))}
      </div>
      {levelUp && (
        <div className="dialog-backdrop" onClick={() => setLevelUp(null)}>
          <Confetti />
          <div className="levelup card" role="dialog" aria-modal="true" aria-label="Level up" onClick={(e) => e.stopPropagation()}>
            <Mascot mood="cheer" size={130} equipped={state.equipped} />
            <p className="eyebrow">Level up!</p>
            <h2>Level {levelUp.level}</h2>
            <p className="levelup-title">{levelUp.title}</p>
            <p className="muted">
              <XpIcon size={18} /> Keep learning to reach the next level. +10 <GemIcon size={16} />
            </p>
            <button type="button" className="btn btn-lg btn-green" onClick={() => setLevelUp(null)} autoFocus>
              Yay!
            </button>
          </div>
        </div>
      )}
    </>
  );
}

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { gamesUnlocked, learnedTopics } from '../curriculum/path';
import { dayKey, dueReviews } from '../engine/adaptive';
import { applyEvent, type GameEvent, type Reward } from '../game/engine';
import type { QuestContext } from '../game/quests';
import { initialProgress, localStorageRepository, type ProgressRepository, type ProgressState, type Settings } from './progress';

interface GameApi {
  state: ProgressState;
  /** Apply a learning event; returns the rewards it produced. */
  dispatch: (event: GameEvent) => Reward[];
  updateSettings: (patch: Partial<Settings>) => void;
  reset: () => void;
  /** Big moments waiting to be celebrated (achievements, quests, chests …). */
  pending: Reward[];
  takePending: () => Reward[];
  /** While a question session is running, celebrations wait until the end. */
  focus: boolean;
  setFocus: (focus: boolean) => void;
}

const GameContext = createContext<GameApi | null>(null);

export function questContext(state: ProgressState, now = Date.now()): QuestContext {
  const topics = learnedTopics(state.nodes);
  return {
    topics,
    wordsUnlocked: state.settings.unlockAll || topics.includes('words') || topics.includes('translation'),
    gamesUnlocked: gamesUnlocked(state.nodes, state.settings.unlockAll),
    reviewsDue: dueReviews(state.skills, now).length,
  };
}

/** Rewards worth a toast; XP and gems for single answers are shown in place. */
const CELEBRATE = new Set<Reward['kind']>(['achievement', 'quest', 'questsAll', 'chest', 'level', 'item']);

export function GameProvider({ children, repository = localStorageRepository }: { children: ReactNode; repository?: ProgressRepository }) {
  const [state, setState] = useState<ProgressState>(() => repository.load() ?? initialProgress());
  const current = useRef(state);
  const [pending, setPending] = useState<Reward[]>([]);
  const [focus, setFocus] = useState(false);

  const commit = useCallback((next: ProgressState) => {
    current.current = next;
    setState(next);
  }, []);

  const dispatch = useCallback(
    (event: GameEvent) => {
      const result = applyEvent(current.current, event);
      commit(result.state);
      const notable = result.rewards.filter((r) => CELEBRATE.has(r.kind) || (r.kind === 'mastery' && r.band === 'mastered'));
      if (notable.length && event.type !== 'openChest' && event.type !== 'openNodeChest' && event.type !== 'buy') {
        setPending((p) => [...p, ...notable]);
      }
      return result.rewards;
    },
    [commit],
  );

  // Fresh quests every day (checked on start, every minute, and on return).
  useEffect(() => {
    const refresh = () => {
      const now = Date.now();
      if (current.current.quests?.day !== dayKey(now)) dispatch({ type: 'refreshQuests', ctx: questContext(current.current, now), at: now });
    };
    refresh();
    const id = window.setInterval(refresh, 60_000);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, [dispatch]);

  useEffect(() => {
    repository.save(state);
  }, [state, repository]);

  const updateSettings = useCallback(
    (patch: Partial<Settings>) => commit({ ...current.current, settings: { ...current.current.settings, ...patch } }),
    [commit],
  );

  const reset = useCallback(() => {
    repository.clear();
    const fresh = { ...initialProgress(), settings: current.current.settings };
    commit(fresh);
    setPending([]);
    dispatch({ type: 'refreshQuests', ctx: questContext(fresh), at: Date.now() });
  }, [commit, dispatch, repository]);

  const takePending = useCallback(() => {
    let taken: Reward[] = [];
    setPending((p) => {
      taken = p;
      return [];
    });
    return taken;
  }, []);

  const api = useMemo(
    () => ({ state, dispatch, updateSettings, reset, pending, takePending, focus, setFocus }),
    [state, dispatch, updateSettings, reset, pending, takePending, focus],
  );
  return <GameContext.Provider value={api}>{children}</GameContext.Provider>;
}

export function useGame(): GameApi {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame must be used inside <GameProvider>');
  return ctx;
}

/** Hold celebrations while a focused session is on screen. */
export function useFocusMode(active = true) {
  const { setFocus } = useGame();
  useEffect(() => {
    setFocus(active);
    return () => setFocus(false);
  }, [active, setFocus]);
}

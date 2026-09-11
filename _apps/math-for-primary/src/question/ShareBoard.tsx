import { useEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react';
import type { ItemKind } from '../engine/types';
import { playSound } from '../lib/sound';
import { Icon } from '../ui/Icon';
import { ItemGlyph } from '../ui/ItemGlyph';

const FRIENDS = ['#ff7a59', '#4a6cf7', '#22b07d', '#8b5cf6', '#f5b400', '#e0457b'];

/**
 * Share things out fairly: tap a friend's plate (or drag from the basket)
 * to give them one; tap something on a plate to take it back. When the
 * basket is empty and every plate has the same, the sharing is done.
 */
export function ShareBoard({
  total,
  groups,
  item = 'strawberry',
  sound,
  onShared,
}: {
  total: number;
  groups: number;
  item?: ItemKind;
  sound: boolean;
  onShared: () => void;
}) {
  const [plates, setPlates] = useState<number[]>(() => Array.from({ length: groups }, () => 0));
  const [drag, setDrag] = useState<{ x: number; y: number } | null>(null);
  const [hover, setHover] = useState<number | null>(null);
  const done = useRef(false);
  const inBasket = total - plates.reduce((s, n) => s + n, 0);
  const fair = inBasket === 0 && plates.every((n) => n === plates[0]);

  useEffect(() => {
    if (fair && !done.current) {
      done.current = true;
      playSound('correct', sound);
      const id = window.setTimeout(onShared, 700);
      return () => window.clearTimeout(id);
    }
  }, [fair, onShared, sound]);

  const give = (plate: number) => {
    if (inBasket <= 0 || done.current) return;
    playSound('tap', sound);
    setPlates((p) => p.map((n, i) => (i === plate ? n + 1 : n)));
  };
  const takeBack = (plate: number) => {
    if (done.current) return;
    setPlates((p) => p.map((n, i) => (i === plate && n > 0 ? n - 1 : n)));
  };
  const dealRound = () => {
    if (done.current) return;
    playSound('tap', sound);
    setPlates((p) => {
      let left = total - p.reduce((s, n) => s + n, 0);
      return p.map((n) => (left-- > 0 ? n + 1 : n));
    });
  };

  const plateAt = (x: number, y: number) => {
    const el = document.elementFromPoint(x, y)?.closest('[data-plate]');
    return el ? Number(el.getAttribute('data-plate')) : null;
  };

  useEffect(() => {
    if (!drag) return;
    const move = (e: PointerEvent) => {
      setDrag({ x: e.clientX, y: e.clientY });
      setHover(plateAt(e.clientX, e.clientY));
    };
    const up = (e: PointerEvent) => {
      const plate = plateAt(e.clientX, e.clientY);
      if (plate !== null) give(plate);
      setDrag(null);
      setHover(null);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drag !== null]);

  const startDrag = (e: ReactPointerEvent) => {
    if (inBasket <= 0) return;
    e.preventDefault();
    setDrag({ x: e.clientX, y: e.clientY });
  };

  const size = total > 20 ? 22 : 28;
  return (
    <div className="share-board">
      <div className="share-basket" onPointerDown={startDrag} role="group" aria-label={`${inBasket} left to share`}>
        {inBasket > 0 ? (
          Array.from({ length: inBasket }, (_, i) => (
            <span key={i} className="pile-item">
              <ItemGlyph item={item} size={size} />
            </span>
          ))
        ) : (
          <span className="pile-done">{fair ? 'Fair share!' : 'Is it fair? Check the plates.'}</span>
        )}
      </div>
      <div className="share-friends">
        {plates.map((n, i) => (
          <div key={i} className="friend" style={{ '--friend': FRIENDS[i % FRIENDS.length] } as CSSProperties}>
            <span className="friend-face" aria-hidden="true">
              <svg viewBox="0 0 40 40" width={40} height={40}>
                <circle cx={20} cy={20} r={18} fill="var(--friend)" />
                <circle cx={14} cy={17} r={2.6} fill="#1d2742" />
                <circle cx={26} cy={17} r={2.6} fill="#1d2742" />
                <path d="M13 25 Q20 31 27 25" stroke="#1d2742" strokeWidth={2.4} fill="none" strokeLinecap="round" />
              </svg>
            </span>
            <button
              type="button"
              data-plate={i}
              className={`plate filled friend-plate${hover === i ? ' hover' : ''}`}
              onClick={() => give(i)}
              aria-label={`Friend ${i + 1} has ${n}. Give one more.`}
            >
              <span className="plate-items" style={{ '--cols': Math.min(4, Math.max(2, Math.ceil(total / groups))) } as CSSProperties}>
                {Array.from({ length: n }, (_, k) => (
                  <span
                    key={k}
                    className="plate-item"
                    style={{ '--i': 0 } as CSSProperties}
                    onClick={(e) => {
                      e.stopPropagation();
                      takeBack(i);
                    }}
                  >
                    <ItemGlyph item={item} size={size} />
                  </span>
                ))}
              </span>
            </button>
            <span className={`group-size${inBasket === 0 && !fair && n !== Math.max(...plates) ? ' uneven' : ''}`}>{n}</span>
          </div>
        ))}
      </div>
      <div className="share-actions">
        <button type="button" className="btn btn-soft" onClick={dealRound} disabled={inBasket === 0}>
          <Icon name="share" /> Give one to each
        </button>
        <span className="muted share-tip">Tap a plate to give one. Tap food on a plate to take it back.</span>
      </div>
      {drag && (
        <div className="tile-ghost share-ghost" style={{ left: drag.x, top: drag.y }} aria-hidden="true">
          <ItemGlyph item={item} size={34} />
        </div>
      )}
    </div>
  );
}

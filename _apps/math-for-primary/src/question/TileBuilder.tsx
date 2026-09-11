import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { OP_SYMBOL } from '../engine/equation';
import type { TileSpec } from '../engine/types';

export const tileText = (t: TileSpec) => (t.kind === 'num' ? String(t.value) : t.kind === 'op' ? OP_SYMBOL[t.op] : t.kind === 'eq' ? '=' : '?');

/** Operation tiles can be used more than once; numbers, = and ? only once. */
const reusable = (t: TileSpec) => t.kind === 'op';

interface Drag {
  tile: number;
  from: number | null;
  x: number;
  y: number;
  startX: number;
  startY: number;
  moved: boolean;
}

/**
 * Build an equation from tiles. Children can drag tiles into the boxes
 * (touch or mouse) or simply tap a tile to drop it into the next empty box.
 * Tap a filled box to take its tile back.
 */
export function TileBuilder({
  tiles,
  value,
  onChange,
  state = 'idle',
  disabled = false,
}: {
  tiles: TileSpec[];
  value: (number | null)[];
  onChange: (value: (number | null)[]) => void;
  state?: 'idle' | 'wrong' | 'correct';
  disabled?: boolean;
}) {
  const [drag, setDrag] = useState<Drag | null>(null);
  const [hover, setHover] = useState<number | null>(null);
  const latest = useRef({ value, onChange });
  latest.current = { value, onChange };

  const used = new Set(value.filter((v): v is number => v !== null && !reusable(tiles[v])));

  const place = (tile: number, slot: number | null, from: number | null = null) => {
    const next = [...latest.current.value];
    if (from !== null) next[from] = null;
    const target = slot ?? next.findIndex((v) => v === null);
    if (target < 0) return;
    next[target] = tile;
    latest.current.onChange(next);
  };

  const slotAt = (x: number, y: number): number | null => {
    const el = document.elementFromPoint(x, y)?.closest('[data-slot]');
    return el ? Number(el.getAttribute('data-slot')) : null;
  };

  useEffect(() => {
    if (!drag) return;
    const move = (e: PointerEvent) => {
      setDrag((d) => (d ? { ...d, x: e.clientX, y: e.clientY, moved: d.moved || Math.hypot(e.clientX - d.startX, e.clientY - d.startY) > 6 } : d));
      setHover(slotAt(e.clientX, e.clientY));
    };
    const up = (e: PointerEvent) => {
      setDrag((d) => {
        if (!d) return null;
        const slot = slotAt(e.clientX, e.clientY);
        if (!d.moved) {
          // A tap: palette tile → next empty box; box tile → back to the palette.
          if (d.from === null) place(d.tile, null);
          else {
            const next = [...latest.current.value];
            next[d.from] = null;
            latest.current.onChange(next);
          }
        } else if (slot !== null) {
          place(d.tile, slot, d.from);
        } else if (d.from !== null) {
          const next = [...latest.current.value];
          next[d.from] = null;
          latest.current.onChange(next);
        }
        return null;
      });
      setHover(null);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drag !== null]);

  const start = (e: ReactPointerEvent, tile: number, from: number | null) => {
    if (disabled || e.button > 0) return;
    e.preventDefault();
    setDrag({ tile, from, x: e.clientX, y: e.clientY, startX: e.clientX, startY: e.clientY, moved: false });
  };

  const keyPlace = (tile: number) => !disabled && place(tile, null);

  return (
    <div className={`tile-builder${disabled ? ' locked' : ''}`}>
      <div className={`tile-slots ${state}`} role="group" aria-label="Your equation">
        {value.map((tileIndex, slot) => (
          <button
            key={slot}
            type="button"
            data-slot={slot}
            className={`tile-slot${tileIndex === null ? ' empty' : ''}${hover === slot ? ' hover' : ''}${tileIndex !== null ? ` k-${tiles[tileIndex].kind}` : ''}`}
            onPointerDown={(e) => tileIndex !== null && start(e, tileIndex, slot)}
            onKeyDown={(e) => {
              if ((e.key === 'Enter' || e.key === ' ') && tileIndex !== null) {
                e.preventDefault();
                const next = [...value];
                next[slot] = null;
                onChange(next);
              }
            }}
            aria-label={tileIndex === null ? `Empty box ${slot + 1}` : `Box ${slot + 1}: ${tileText(tiles[tileIndex])}. Press to remove.`}
            disabled={disabled}
          >
            {tileIndex !== null && (drag?.from !== slot || !drag.moved) ? tileText(tiles[tileIndex]) : ''}
          </button>
        ))}
      </div>
      <div className="tile-palette" role="group" aria-label="Tiles">
        {tiles.map((t, i) => {
          const isUsed = used.has(i);
          return (
            <button
              key={i}
              type="button"
              className={`tile-chip k-${t.kind}${isUsed ? ' used' : ''}${drag?.tile === i && drag.from === null && drag.moved ? ' lifting' : ''}`}
              onPointerDown={(e) => !isUsed && start(e, i, null)}
              onKeyDown={(e) => {
                if ((e.key === 'Enter' || e.key === ' ') && !isUsed) {
                  e.preventDefault();
                  keyPlace(i);
                }
              }}
              disabled={disabled || isUsed}
              aria-label={`Tile ${tileText(t)}`}
            >
              {tileText(t)}
            </button>
          );
        })}
      </div>
      {drag?.moved && (
        <div className={`tile-ghost k-${tiles[drag.tile].kind}`} style={{ left: drag.x, top: drag.y }} aria-hidden="true">
          {tileText(tiles[drag.tile])}
        </div>
      )}
    </div>
  );
}

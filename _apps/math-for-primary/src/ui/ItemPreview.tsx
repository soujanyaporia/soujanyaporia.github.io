import type { JSX } from 'react';
import type { StoreItem } from '../game/store';
import { Mascot } from './Mascot';

const STICKER_ART: Record<string, JSX.Element> = {
  'sticker-rocket': (
    <>
      <path d="M32 6c9 7 12 19 8 32H24c-4-13-1-25 8-32z" fill="#ef4444" />
      <circle cx={32} cy={24} r={5} fill="#bfdbfe" stroke="#fff" strokeWidth={2} />
      <path d="M24 38l-7 9 9-2zM40 38l7 9-9-2z" fill="#f59e0b" />
      <path d="M27 40h10l-5 14z" fill="#fbbf24" />
    </>
  ),
  'sticker-rainbow': (
    <>
      {['#ef4444', '#f59e0b', '#fbbf24', '#22b07d', '#3b82f6'].map((c, i) => (
        <path key={c} d={`M${8 + i * 4} 46a${24 - i * 4} ${24 - i * 4} 0 0 1 ${48 - i * 8} 0`} stroke={c} strokeWidth={4} fill="none" />
      ))}
    </>
  ),
  'sticker-owl': (
    <>
      <ellipse cx={32} cy={36} rx={18} ry={20} fill="#a16207" />
      <circle cx={25} cy={30} r={7} fill="#fff" />
      <circle cx={39} cy={30} r={7} fill="#fff" />
      <circle cx={25} cy={30} r={3} fill="#1d2742" />
      <circle cx={39} cy={30} r={3} fill="#1d2742" />
      <path d="M29 38l3 4 3-4z" fill="#f59e0b" />
    </>
  ),
  'sticker-sun': (
    <>
      <circle cx={32} cy={32} r={13} fill="#fbbf24" />
      {Array.from({ length: 8 }, (_, i) => (
        <path key={i} d="M32 6v8" stroke="#f59e0b" strokeWidth={4} strokeLinecap="round" transform={`rotate(${i * 45} 32 32)`} />
      ))}
    </>
  ),
  'sticker-cat': (
    <>
      <path d="M16 24l4-12 8 8h8l8-8 4 12v14c0 10-8 16-16 16s-16-6-16-16z" fill="#fb923c" />
      <circle cx={26} cy={34} r={2.6} fill="#1d2742" />
      <circle cx={38} cy={34} r={2.6} fill="#1d2742" />
      <path d="M29 41q3 3 6 0" stroke="#1d2742" strokeWidth={2} fill="none" />
    </>
  ),
  'sticker-planet': (
    <>
      <circle cx={32} cy={32} r={14} fill="#8b5cf6" />
      <ellipse cx={32} cy={34} rx={26} ry={7} fill="none" stroke="#f472b6" strokeWidth={4} transform="rotate(-15 32 34)" />
    </>
  ),
  'sticker-fish': (
    <>
      <path d="M8 32c8-14 30-14 38 0-8 14-30 14-38 0z" fill="#38bdf8" />
      <path d="M44 32l12-10v20z" fill="#0ea5e9" />
      <circle cx={18} cy={29} r={3} fill="#1d2742" />
    </>
  ),
  'sticker-crown': <path d="M10 46l2-26 11 10 9-16 9 16 11-10 2 26z" fill="#fbbf24" stroke="#d99a00" strokeWidth={2} />,
  'sticker-dino': (
    <>
      <path d="M12 46c0-12 8-20 20-20h6c6 0 10-6 10-12 6 0 8 6 6 12-2 8-8 12-8 20v6H40v-6H24v6H16v-6c-3 0-4-2-4-6z" fill="#22b07d" />
      <circle cx={48} cy={18} r={2} fill="#1d2742" />
    </>
  ),
  'sticker-merlion': (
    <>
      <path d="M22 54c0-10 4-16 10-18-6-2-10-8-8-14 2-8 12-10 16-4 4 6 0 12-4 14 6 2 10 10 8 22z" fill="#e5e7eb" stroke="#9ca3af" strokeWidth={2} />
      <path d="M40 22c6-2 12 2 14 6-4 0-8 2-10 4" stroke="#60a5fa" strokeWidth={3} fill="none" strokeLinecap="round" />
      <circle cx={30} cy={20} r={2} fill="#1d2742" />
    </>
  ),
  'sticker-kite': (
    <>
      <path d="M32 6l16 18-16 22-16-22z" fill="#f472b6" />
      <path d="M32 6v40M16 24h32" stroke="#fff" strokeWidth={2} />
      <path d="M32 46c-4 4 4 6 0 12" stroke="#8a93a8" strokeWidth={2} fill="none" />
    </>
  ),
  'sticker-otter': (
    <>
      <ellipse cx={32} cy={38} rx={16} ry={14} fill="#92400e" />
      <circle cx={32} cy={24} r={11} fill="#b45309" />
      <circle cx={28} cy={22} r={2} fill="#1d2742" />
      <circle cx={36} cy={22} r={2} fill="#1d2742" />
      <ellipse cx={32} cy={28} rx={4} ry={3} fill="#fde68a" />
    </>
  ),
};

/** A picture of a shop item: Dot wearing it, a swatch, or the sticker. */
export function ItemPreview({ item, size = 72 }: { item: StoreItem; size?: number }) {
  if (item.slot === 'sticker') {
    return (
      <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true" className="sticker-art">
        <circle cx={32} cy={32} r={30} fill="#fff" stroke="#f0e4d3" strokeWidth={3} />
        {STICKER_ART[item.id]}
      </svg>
    );
  }
  if (item.slot === 'theme' || item.slot === 'frame' || item.slot === 'effect') {
    return (
      <span className={`swatch-preview slot-${item.slot}`} style={{ width: size, height: size, background: item.swatch }} aria-hidden="true">
        {item.slot === 'effect' && '✦'}
      </span>
    );
  }
  return <Mascot size={size} animate={false} equipped={{ [item.slot]: item.id }} />;
}

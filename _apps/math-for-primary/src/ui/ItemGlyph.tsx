import type { JSX } from 'react';
import type { ItemKind } from '../engine/types';

/**
 * Small, original drawings of everyday objects for concrete explanations
 * ("12 strawberries shared between 3 plates"). Drawn on a 32×32 grid.
 */
export function ItemGlyph({ item, size = 28, className }: { item: ItemKind; size?: number; className?: string }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" focusable="false">
      {GLYPHS[item] ?? GLYPHS.dot}
    </svg>
  );
}

const GLYPHS: Record<ItemKind, JSX.Element> = {
  dot: <circle cx={16} cy={16} r={12} fill="#4a6cf7" />,
  apple: (
    <>
      <path d="M16 9c-3-3-10-2-10 6 0 7 4 13 7 13 1.4 0 2-.6 3-.6s1.6.6 3 .6c3 0 7-6 7-13 0-8-7-9-10-6z" fill="#ef4444" />
      <path d="M16 9c0-3 1-5 3-6" stroke="#7c4a1e" strokeWidth={2} strokeLinecap="round" fill="none" />
      <path d="M17 7c2-3 6-3 7-2-1 3-4 4-7 2z" fill="#22b07d" />
      <ellipse cx={11} cy={14} rx={2} ry={3} fill="#fff" opacity={0.35} />
    </>
  ),
  orange: (
    <>
      <circle cx={16} cy={18} r={11} fill="#fb923c" />
      <path d="M16 7c2-3 6-3 7-2-1 3-4 4-7 2z" fill="#22b07d" />
      <circle cx={12} cy={15} r={0.9} fill="#ea7a1c" />
      <circle cx={19} cy={20} r={0.9} fill="#ea7a1c" />
      <circle cx={14} cy={23} r={0.9} fill="#ea7a1c" />
    </>
  ),
  strawberry: (
    <>
      <path d="M16 29C9 25 5 18 7 13c1-3 5-4 9-4s8 1 9 4c2 5-2 12-9 16z" fill="#f43f5e" />
      <path d="M9 10l3 1 4-4 4 4 3-1-2 3H11z" fill="#22b07d" />
      {[
        [12, 16],
        [19, 16],
        [15, 20],
        [11, 21],
        [20, 21],
        [16, 25],
      ].map(([x, y]) => (
        <ellipse key={`${x}${y}`} cx={x} cy={y} rx={0.8} ry={1.2} fill="#ffe08a" />
      ))}
    </>
  ),
  cookie: (
    <>
      <circle cx={16} cy={16} r={12} fill="#d9a066" stroke="#b97d44" strokeWidth={1.5} />
      {[
        [11, 12],
        [19, 11],
        [15, 18],
        [21, 19],
        [10, 20],
      ].map(([x, y]) => (
        <circle key={`${x}${y}`} cx={x} cy={y} r={1.8} fill="#6b3f1d" />
      ))}
    </>
  ),
  sweet: (
    <>
      <path d="M4 10l6 6-6 6zM28 10l-6 6 6 6z" fill="#f472b6" />
      <circle cx={16} cy={16} r={7.5} fill="#ec4899" />
      <path d="M12 13c2-2 6-2 8 1" stroke="#fff" strokeWidth={1.8} fill="none" strokeLinecap="round" opacity={0.7} />
    </>
  ),
  star: <path d="M16 3l3.9 8.3 9 1-6.7 6.2 1.9 8.9L16 23l-8.1 4.4 1.9-8.9L3.1 12.3l9-1z" fill="#fbbf24" stroke="#d99a00" strokeWidth={1.2} strokeLinejoin="round" />,
  ball: (
    <>
      <circle cx={16} cy={16} r={12} fill="#3b82f6" />
      <path d="M7 11c5 2 13 2 18 0M7 21c5-2 13-2 18 0" stroke="#bfdbfe" strokeWidth={1.6} fill="none" />
      <ellipse cx={11} cy={10} rx={3} ry={2} fill="#fff" opacity={0.5} />
    </>
  ),
  pencil: (
    <>
      <path d="M6 26l2-6L21 7l4 4L12 24z" fill="#fbbf24" stroke="#b7791f" strokeWidth={1.2} strokeLinejoin="round" />
      <path d="M21 7l2-2a2 2 0 0 1 3 0l1 1a2 2 0 0 1 0 3l-2 2z" fill="#f9a8d4" />
      <path d="M6 26l2-6 4 4z" fill="#fde7c4" />
      <path d="M6 26l1-2.6 1.6 1.6z" fill="#1d2742" />
    </>
  ),
  book: (
    <>
      <path d="M5 7h10a3 3 0 0 1 3 3v17a2 2 0 0 0-2-2H5z" fill="#4a6cf7" />
      <path d="M27 7H18a3 3 0 0 0-3 3v17a2 2 0 0 1 2-2h10z" fill="#6b8cff" />
      <path d="M8 12h5M8 16h5M20 12h5M20 16h5" stroke="#fff" strokeWidth={1.4} strokeLinecap="round" opacity={0.7} />
    </>
  ),
  balloon: (
    <>
      <ellipse cx={16} cy={13} rx={9} ry={10.5} fill="#ef4444" />
      <path d="M16 23.5l-1.6 2h3.2z" fill="#c02626" />
      <path d="M16 25.5c-2 2 2 3 0 5" stroke="#8a93a8" strokeWidth={1.2} fill="none" />
      <ellipse cx={12.5} cy={9} rx={2.2} ry={3} fill="#fff" opacity={0.4} />
    </>
  ),
  flower: (
    <>
      <path d="M16 18v11" stroke="#22b07d" strokeWidth={2.4} strokeLinecap="round" />
      <path d="M16 25c-3-3-7-2-7 0 3 1 5 1 7 0z" fill="#22b07d" />
      {[0, 72, 144, 216, 288].map((r) => (
        <ellipse key={r} cx={16} cy={7} rx={3.6} ry={5} fill="#f472b6" transform={`rotate(${r} 16 12)`} />
      ))}
      <circle cx={16} cy={12} r={3.4} fill="#fbbf24" />
    </>
  ),
  fish: (
    <>
      <path d="M4 16c4-7 14-8 19 0-5 8-15 7-19 0z" fill="#fb923c" />
      <path d="M22 16l7-6v12z" fill="#f97316" />
      <circle cx={9} cy={14.5} r={1.6} fill="#1d2742" />
    </>
  ),
  bird: (
    <>
      <circle cx={16} cy={17} r={10} fill="#60a5fa" />
      <path d="M10 18c3 4 8 4 10 0-3 1-7 1-10 0z" fill="#2563eb" />
      <path d="M25 15l5 2-5 2z" fill="#f59e0b" />
      <circle cx={20} cy={13.5} r={1.7} fill="#1d2742" />
    </>
  ),
  person: (
    <>
      <circle cx={16} cy={9} r={5.5} fill="#f2c7a5" />
      <path d="M10.5 8c0-4 3-6 5.5-6s5.5 2 5.5 6c-2-2-9-2-11 0z" fill="#3b2a1a" />
      <path d="M7 29c0-7 4-12 9-12s9 5 9 12z" fill="#22b07d" />
    </>
  ),
  coin: (
    <>
      <circle cx={16} cy={16} r={12} fill="#fbbf24" stroke="#d99a00" strokeWidth={1.6} />
      <circle cx={16} cy={16} r={8} fill="none" stroke="#d99a00" strokeWidth={1.4} />
      <path d="M13 12c2-2 6-1 6 1s-6 2-6 4 4 3 6 1" stroke="#b7791f" strokeWidth={1.6} fill="none" strokeLinecap="round" />
    </>
  ),
  car: (
    <>
      <path d="M4 20l2-6c1-2 2-3 4-3h12c2 0 3 1 4 3l2 6v4H4z" fill="#ef4444" />
      <path d="M9 13h14l2 5H7z" fill="#bfdbfe" />
      <circle cx={10} cy={24} r={3} fill="#1d2742" />
      <circle cx={22} cy={24} r={3} fill="#1d2742" />
    </>
  ),
  cupcake: (
    <>
      <path d="M8 17h16l-2.5 11h-11z" fill="#60a5fa" />
      <path d="M11 17l1 11M16 17v11M21 17l-1 11" stroke="#3b82f6" strokeWidth={1.2} />
      <path d="M7 17c0-5 4-8 9-8s9 3 9 8z" fill="#fbcfe8" />
      <circle cx={16} cy={7} r={2.6} fill="#ef4444" />
    </>
  ),
};

/** Colourful icons for the game layer (gems, streak flame, XP, chests). */

export function GemIcon({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" focusable="false">
      <path d="M9 4h14l6 8-13 17L3 12z" fill="#2cc5d9" />
      <path d="M3 12h26L16 29z" fill="#14a3b8" />
      <path d="M9 4l3 8h8l3-8z" fill="#7de3f0" />
      <path d="M12 12l4 17 4-17z" fill="#22b3c8" />
      <path d="M9 4l3 8H3zM23 4l-3 8h9z" fill="#5ad6e8" />
      <path d="M11 7l2 3" stroke="#fff" strokeWidth={1.6} strokeLinecap="round" opacity={0.8} />
    </svg>
  );
}

export function FlameIcon({ size = 24, lit = true }: { size?: number; lit?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" focusable="false">
      <path
        d="M16 2c1.5 5.5 9 8.5 9 16.5A9 9 0 0 1 7 18.5c0-4.2 2.4-6.8 4-8.4.5 2.7 1.8 4.2 3.6 5C13.2 10.6 13.6 6.2 16 2z"
        fill={lit ? '#ff7a2f' : '#d9d2c7'}
      />
      <path d="M16 13c.8 3 5 4.4 5 9a5 5 0 0 1-10 0c0-2.6 1.6-4 2.6-5 .3 1.3 1 2.1 2 2.4-.7-2.4-.4-4.6.4-6.4z" fill={lit ? '#ffc83d' : '#ebe5dc'} />
    </svg>
  );
}

export function XpIcon({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" focusable="false">
      <circle cx={16} cy={16} r={14} fill="#8b5cf6" />
      <path d="M17.5 5 9 18h6l-1.5 9L23 13.5h-6z" fill="#ffd166" stroke="#fff" strokeWidth={1.2} strokeLinejoin="round" />
    </svg>
  );
}

export function ChestIcon({ size = 56, open = false, rare = false }: { size?: number; open?: boolean; rare?: boolean }) {
  const wood = rare ? '#8b5cf6' : '#c2773a';
  const woodDark = rare ? '#6b3fdc' : '#9a5a26';
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true" focusable="false" className={`chest-icon${open ? ' open' : ''}`}>
      {open && <ellipse cx={32} cy={30} rx={20} ry={10} fill="#ffe27a" opacity={0.8} className="chest-glow" />}
      <rect x={8} y={30} width={48} height={26} rx={5} fill={wood} />
      <rect x={8} y={30} width={48} height={7} fill={woodDark} opacity={0.5} />
      <g className="chest-lid" style={{ transformOrigin: '32px 30px' }}>
        <path d={open ? 'M10 30 L14 12 Q32 4 50 12 L54 30 Z' : 'M8 30 Q8 14 32 14 Q56 14 56 30 Z'} fill={wood} />
        <path d={open ? 'M12 22 Q32 14 52 22' : 'M10 24 Q32 12 54 24'} stroke="#f5c542" strokeWidth={3} fill="none" />
      </g>
      <rect x={6} y={28} width={52} height={5} rx={2.5} fill="#f5c542" />
      <rect x={27} y={30} width={10} height={12} rx={3} fill="#f5c542" />
      <circle cx={32} cy={36} r={2} fill={woodDark} />
    </svg>
  );
}

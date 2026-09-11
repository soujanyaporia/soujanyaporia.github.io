import type { CSSProperties, ReactNode } from 'react';
import { colorOf, type Equipped } from '../game/store';
import './mascot.css';

/**
 * Dot — the app's companion: a friendly, living counter (the same dots
 * children count in every lesson). Original character; it wears whatever
 * the child has earned in the shop.
 */
export type Mood = 'happy' | 'thinking' | 'cheer' | 'oops' | 'wow' | 'calm';

function shade(hex: string, amount: number): string {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.max(0, Math.min(255, ((n >> 16) & 255) + amount));
  const g = Math.max(0, Math.min(255, ((n >> 8) & 255) + amount));
  const b = Math.max(0, Math.min(255, (n & 255) + amount));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

function Eyes({ mood }: { mood: Mood }) {
  if (mood === 'happy' || mood === 'cheer') {
    return (
      <g className="dot-eyes" fill="none" stroke="#1d2742" strokeWidth={4.2} strokeLinecap="round">
        <path d="M40 60 Q46 53 52 60" />
        <path d="M68 60 Q74 53 80 60" />
      </g>
    );
  }
  const big = mood === 'wow';
  const look = mood === 'thinking' ? -3 : 0;
  return (
    <g className="dot-eyes blink">
      <ellipse cx={46} cy={59} rx={big ? 8.5 : 7} ry={big ? 9.5 : 8} fill="#fff" />
      <ellipse cx={74} cy={59} rx={big ? 8.5 : 7} ry={big ? 9.5 : 8} fill="#fff" />
      <circle cx={47 + look} cy={60 + look} r={big ? 5 : 4.4} fill="#1d2742" />
      <circle cx={75 + look} cy={60 + look} r={big ? 5 : 4.4} fill="#1d2742" />
      <circle cx={48.6 + look} cy={58 + look} r={1.5} fill="#fff" />
      <circle cx={76.6 + look} cy={58 + look} r={1.5} fill="#fff" />
      {mood === 'oops' && (
        <g stroke="#1d2742" strokeWidth={3} strokeLinecap="round">
          <path d="M39 48 L50 51" />
          <path d="M81 48 L70 51" />
        </g>
      )}
      {mood === 'thinking' && <path d="M68 47 Q75 43 82 47" stroke="#1d2742" strokeWidth={3} strokeLinecap="round" fill="none" />}
    </g>
  );
}

function Mouth({ mood }: { mood: Mood }) {
  switch (mood) {
    case 'cheer':
      return <path d="M49 71 Q60 86 71 71 Z" fill="#7a2338" stroke="#1d2742" strokeWidth={2.5} strokeLinejoin="round" />;
    case 'wow':
      return <ellipse cx={60} cy={75} rx={5} ry={6} fill="#7a2338" stroke="#1d2742" strokeWidth={2.5} />;
    case 'oops':
      return <path d="M52 76 Q56 72 60 76 Q64 80 68 76" fill="none" stroke="#1d2742" strokeWidth={3} strokeLinecap="round" />;
    case 'thinking':
      return <path d="M54 76 L66 74" fill="none" stroke="#1d2742" strokeWidth={3} strokeLinecap="round" />;
    default:
      return <path d="M51 72 Q60 81 69 72" fill="none" stroke="#1d2742" strokeWidth={3.4} strokeLinecap="round" />;
  }
}

function Hat({ id }: { id?: string }) {
  switch (id) {
    case 'hat-party':
      return (
        <g className="acc">
          <path d="M60 2 L75 32 H45 Z" fill="#ff7a59" stroke="#c4502f" strokeWidth={2} strokeLinejoin="round" />
          <path d="M53 18 L67 16 M49 26 L71 24" stroke="#ffd166" strokeWidth={3} strokeLinecap="round" />
          <circle cx={60} cy={3} r={4} fill="#ffd166" />
        </g>
      );
    case 'hat-cap':
      return (
        <g className="acc">
          <path d="M34 34 Q60 6 86 34 Z" fill="#4a6cf7" stroke="#2f4fc4" strokeWidth={2} />
          <path d="M80 32 Q98 32 102 38 Q90 40 78 36 Z" fill="#2f4fc4" />
          <circle cx={60} cy={15} r={3} fill="#2f4fc4" />
        </g>
      );
    case 'hat-beanie':
      return (
        <g className="acc">
          <path d="M33 36 Q60 0 87 36 Z" fill="#22b07d" stroke="#168a5b" strokeWidth={2} />
          <rect x={32} y={30} width={56} height={9} rx={4.5} fill="#168a5b" />
          <circle cx={60} cy={8} r={6} fill="#fff" stroke="#e3d3bd" strokeWidth={1.5} />
        </g>
      );
    case 'hat-crown':
      return (
        <g className="acc">
          <path d="M38 34 L40 12 L50 22 L60 8 L70 22 L80 12 L82 34 Z" fill="#ffc83d" stroke="#d99a00" strokeWidth={2} strokeLinejoin="round" />
          <circle cx={60} cy={26} r={3.5} fill="#e0457b" />
        </g>
      );
    case 'hat-wizard':
      return (
        <g className="acc">
          <path d="M60 -6 L80 34 H40 Z" fill="#8b5cf6" stroke="#6b3fdc" strokeWidth={2} strokeLinejoin="round" />
          <ellipse cx={60} cy={34} rx={28} ry={5} fill="#6b3fdc" />
          <path d="M58 12 l2 -4 2 4 4 1 -3 3 1 4 -4 -2 -4 2 1 -4 -3 -3 z" fill="#ffd166" />
        </g>
      );
    case 'hat-flower':
      return (
        <g className="acc">
          {[36, 48, 60, 72, 84].map((x, i) => (
            <g key={x} transform={`translate(${x} ${i % 2 ? 24 : 28})`}>
              {[0, 72, 144, 216, 288].map((r) => (
                <ellipse key={r} rx={3} ry={5.5} cy={-4} fill={i % 2 ? '#ff9fc0' : '#ffd6e5'} transform={`rotate(${r})`} />
              ))}
              <circle r={2.6} fill="#ffc83d" />
            </g>
          ))}
        </g>
      );
    default:
      return null;
  }
}

function Glasses({ id }: { id?: string }) {
  if (!id) return null;
  const frame = { fill: 'none', stroke: '#1d2742', strokeWidth: 2.6 };
  switch (id) {
    case 'glasses-round':
      return (
        <g className="acc">
          <circle cx={46} cy={59} r={10} {...frame} />
          <circle cx={74} cy={59} r={10} {...frame} />
          <path d="M56 58 Q60 55 64 58" {...frame} />
        </g>
      );
    case 'glasses-sun':
      return (
        <g className="acc">
          <rect x={34} y={51} width={23} height={15} rx={6} fill="#1d2742" />
          <rect x={63} y={51} width={23} height={15} rx={6} fill="#1d2742" />
          <path d="M57 56 H63" stroke="#1d2742" strokeWidth={3} />
          <path d="M38 55 L44 55" stroke="#fff" strokeWidth={2} strokeLinecap="round" opacity={0.6} />
        </g>
      );
    case 'glasses-star':
    case 'glasses-heart': {
      const star = 'M0 -11 L3.2 -3.5 11 -3.4 4.8 1.7 7 9.5 0 5 -7 9.5 -4.8 1.7 -11 -3.4 -3.2 -3.5 Z';
      const heart = 'M0 9 C-12 0 -10 -10 -4 -10 C-1.5 -10 0 -7 0 -6 C0 -7 1.5 -10 4 -10 C10 -10 12 0 0 9 Z';
      const d = id === 'glasses-star' ? star : heart;
      const fill = id === 'glasses-star' ? '#ffc83d' : '#ff5c93';
      return (
        <g className="acc" opacity={0.92}>
          <path d={d} transform="translate(46 59)" fill={fill} stroke="#1d2742" strokeWidth={2} />
          <path d={d} transform="translate(74 59)" fill={fill} stroke="#1d2742" strokeWidth={2} />
          <path d="M56 57 H64" stroke="#1d2742" strokeWidth={2.5} />
        </g>
      );
    }
    default:
      return null;
  }
}

function Neck({ id, behind }: { id?: string; behind: boolean }) {
  if (id === 'neck-cape') {
    return behind ? <path className="acc" d="M34 78 Q60 92 86 78 L96 112 Q60 122 24 112 Z" fill="#e0457b" /> : null;
  }
  if (behind) return null;
  switch (id) {
    case 'neck-bowtie':
      return (
        <g className="acc">
          <path d="M60 92 L46 84 L46 100 Z M60 92 L74 84 L74 100 Z" fill="#e0457b" stroke="#a82a58" strokeWidth={2} strokeLinejoin="round" />
          <circle cx={60} cy={92} r={4} fill="#a82a58" />
        </g>
      );
    case 'neck-scarf':
      return (
        <g className="acc">
          <path d="M30 86 Q60 100 90 86 L90 94 Q60 108 30 94 Z" fill="#ff7a59" stroke="#c4502f" strokeWidth={1.5} />
          <path d="M74 96 L80 114 L70 112 L68 98 Z" fill="#ff7a59" stroke="#c4502f" strokeWidth={1.5} />
        </g>
      );
    case 'neck-medal':
      return (
        <g className="acc">
          <path d="M50 84 L58 98 M70 84 L62 98" stroke="#4a6cf7" strokeWidth={4} />
          <circle cx={60} cy={101} r={7} fill="#ffc83d" stroke="#d99a00" strokeWidth={2} />
        </g>
      );
    default:
      return null;
  }
}

function Pet({ id }: { id?: string }) {
  switch (id) {
    case 'pet-plus':
      return (
        <g className="pet" transform="translate(104 88)">
          <circle r={11} fill="#22b07d" />
          <path d="M-5 0 H5 M0 -5 V5" stroke="#fff" strokeWidth={2.6} strokeLinecap="round" />
          <path d="M10 -2 L16 0 L10 2 Z" fill="#ffc83d" />
          <circle cx={4} cy={-5} r={1.6} fill="#1d2742" />
        </g>
      );
    case 'pet-zero':
      return (
        <g className="pet" transform="translate(104 98)">
          <ellipse cx={0} cy={6} rx={14} ry={5} fill="#ffb38f" />
          <circle cx={0} cy={-2} r={9} fill="#ff7a59" stroke="#c4502f" strokeWidth={2} />
          <circle cx={0} cy={-2} r={4} fill="none" stroke="#fff" strokeWidth={2} />
          <circle cx={12} cy={-2} r={1.6} fill="#1d2742" />
        </g>
      );
    case 'pet-star':
      return (
        <g className="pet" transform="translate(104 84)">
          <path d="M0 -13 L3.8 -4.2 13 -4 5.7 2 8.3 11.2 0 6 -8.3 11.2 -5.7 2 -13 -4 -3.8 -4.2 Z" fill="#ffc83d" stroke="#d99a00" strokeWidth={1.5} />
          <circle cx={-3} cy={-1} r={1.4} fill="#1d2742" />
          <circle cx={3} cy={-1} r={1.4} fill="#1d2742" />
        </g>
      );
    default:
      return null;
  }
}

export function Mascot({
  mood = 'happy',
  equipped = {},
  size = 96,
  bubble,
  className = '',
  animate = true,
  style,
}: {
  mood?: Mood;
  equipped?: Equipped;
  size?: number;
  bubble?: ReactNode;
  className?: string;
  animate?: boolean;
  style?: CSSProperties;
}) {
  const base = colorOf(equipped);
  const dark = shade(base, -45);
  const light = shade(base, 70);
  const cheer = mood === 'cheer';
  return (
    <div className={`mascot mood-${mood}${animate ? ' animate' : ''} ${className}`} style={style}>
      <svg width={size} height={size} viewBox="-4 -8 128 132" role="img" aria-label="Dot, your maths buddy">
        <Neck id={equipped.neck} behind />
        <ellipse cx={60} cy={116} rx={30} ry={5} fill="rgba(29,39,66,.12)" className="dot-shadow" />
        <g className="dot-body">
          <ellipse cx={46} cy={106} rx={10} ry={6} fill={dark} />
          <ellipse cx={74} cy={106} rx={10} ry={6} fill={dark} />
          <path d={cheer ? 'M24 70 Q12 52 18 42' : 'M24 74 Q14 84 18 92'} stroke={dark} strokeWidth={9} strokeLinecap="round" fill="none" />
          <path d={cheer ? 'M96 70 Q108 52 102 42' : 'M96 74 Q106 84 102 92'} stroke={dark} strokeWidth={9} strokeLinecap="round" fill="none" />
          <circle cx={60} cy={66} r={40} fill={base} />
          <ellipse cx={60} cy={82} rx={25} ry={17} fill={light} opacity={0.55} />
          <ellipse cx={44} cy={44} rx={9} ry={5} fill="#fff" opacity={0.28} transform="rotate(-30 44 44)" />
          <path d="M60 26 V17" stroke={dark} strokeWidth={4} strokeLinecap="round" />
          <path d="M60 6 L62.6 11.6 68.6 12 64 16 65.5 22 60 18.7 54.5 22 56 16 51.4 12 57.4 11.6 Z" fill="#ffc83d" stroke="#d99a00" strokeWidth={1.4} className="dot-star" />
          <ellipse cx={36} cy={70} rx={6} ry={4} fill="#ff8fab" opacity={0.55} />
          <ellipse cx={84} cy={70} rx={6} ry={4} fill="#ff8fab" opacity={0.55} />
          <Eyes mood={mood} />
          <Mouth mood={mood} />
          <Neck id={equipped.neck} behind={false} />
          <Glasses id={equipped.glasses} />
          <Hat id={equipped.hat} />
        </g>
        <Pet id={equipped.pet} />
      </svg>
      {bubble && <div className="mascot-bubble">{bubble}</div>}
    </div>
  );
}

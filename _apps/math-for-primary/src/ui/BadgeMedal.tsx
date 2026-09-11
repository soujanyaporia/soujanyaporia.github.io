import type { BadgeDef } from '../content/badges';
import type { AchievementDef, BadgeIcon } from '../game/achievements';
import { ChestIcon, FlameIcon, GemIcon } from './GameIcons';
import { Icon, type IconName } from './Icon';

const ICONS: Partial<Record<BadgeIcon | BadgeDef['icon'], IconName>> = {
  seed: 'seed',
  plus: 'plus',
  minus: 'minus',
  star: 'star',
  search: 'search',
  book: 'book',
  scale: 'scale',
  mountain: 'mountain',
  bolt: 'bolt',
  grid: 'grid',
  share: 'share',
  trophy: 'trophy',
  pencil: 'pencil',
};

function Glyph({ icon }: { icon: BadgeIcon | BadgeDef['icon'] }) {
  if (icon === 'flame') return <FlameIcon size={32} />;
  if (icon === 'gem') return <GemIcon size={32} />;
  if (icon === 'chest') return <ChestIcon size={36} />;
  return <Icon name={ICONS[icon] ?? 'star'} size={30} filled={icon === 'star'} strokeWidth={icon === 'star' ? 1.5 : 2.6} />;
}

export function BadgeMedal({
  badge,
  earned,
  progress,
  compact = false,
}: {
  badge: AchievementDef | BadgeDef;
  earned: boolean;
  /** 0..1 progress towards the badge (shown when not earned). */
  progress?: number;
  compact?: boolean;
}) {
  if (compact) {
    return (
      <span className={`medal-disc small tone-${('tone' in badge ? badge.tone : badge.color)}${earned ? ' earned' : ''}`}>
        <Glyph icon={badge.icon} />
      </span>
    );
  }
  return (
    <div className={`medal tone-${('tone' in badge ? badge.tone : badge.color)}${earned ? ' earned' : ''}`} title={badge.description}>
      <span className="medal-disc">
        <Glyph icon={badge.icon} />
      </span>
      <span className="medal-title">{badge.title}</span>
      <span className="medal-desc">{badge.description}</span>
      {!earned && progress !== undefined && (
        <span className="medal-progress" aria-label={`${Math.round(progress * 100)}% done`}>
          <span style={{ width: `${Math.round(progress * 100)}%` }} />
        </span>
      )}
    </div>
  );
}

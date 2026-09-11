import { BAND_LABEL, bandIndex, masteryBand, type SkillStats } from '../engine/adaptive';

const SYMBOLS = ['○', '○', '◔', '◑', '◕', '●'];

/**
 * Five steps of mastery: Learning ○, Practising ◔, Getting stronger ◑,
 * Almost mastered ◕, Mastered ●. It never shows a child as "bad".
 */
export function MasteryMeter({ stats, before, compact = false }: { stats?: SkillStats; before?: SkillStats; compact?: boolean }) {
  const band = masteryBand(stats);
  const level = bandIndex(band);
  const was = before ? bandIndex(masteryBand(before)) : level;
  return (
    <span className={`mastery${compact ? ' compact' : ''} band-${band}`} title={BAND_LABEL[band]}>
      <span className="mastery-steps" aria-hidden="true">
        {[1, 2, 3, 4, 5].map((i) => (
          <span key={i} className={`mstep${i <= level ? ' on' : ''}${i > was && i <= level ? ' new' : ''}`} style={{ animationDelay: `${(i - was) * 180 + 300}ms` }} />
        ))}
      </span>
      <span className="mastery-label">
        <span aria-hidden="true">{SYMBOLS[level]}</span> {BAND_LABEL[band]}
      </span>
    </span>
  );
}

import type { WorkLine } from '../engine/types';
import { Icon } from '../ui/Icon';
import { EquationView } from './EquationView';

/** The "whiteboard": equations written out as the explanation goes on. */
export function WorkLines({ lines, size = 'md' }: { lines: WorkLine[]; size?: 'md' | 'lg' }) {
  if (lines.length === 0) return null;
  return (
    <div className="work">
      {lines.map((line, i) => (
        <div key={i} className={`work-line tone-${line.tone ?? 'normal'}`}>
          {line.note && <span className="work-note">{line.note}</span>}
          <EquationView tokens={line.tokens} size={size} />
          {line.tone === 'check' && <Icon name="check" size={26} strokeWidth={3} className="work-tick" />}
        </div>
      ))}
    </div>
  );
}

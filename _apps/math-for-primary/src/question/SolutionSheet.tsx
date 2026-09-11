import { useDialogFocus } from '../ui/useDialogFocus';
import type { Explanation, Problem } from '../engine/types';
import { Icon } from '../ui/Icon';
import { StepPlayer } from './StepPlayer';

/** The worked explanation, in a sheet over the question. */
export function SolutionSheet({
  problem,
  explanation,
  readAloud,
  doneLabel,
  onClose,
}: {
  problem: Problem;
  explanation: Explanation;
  readAloud: boolean;
  doneLabel: string;
  onClose: () => void;
}) {
  const dialogRef = useDialogFocus(true, onClose);
  return (
    <div className="sheet-backdrop">
      <div ref={dialogRef} className="sheet card" role="dialog" aria-modal="true" aria-label="Worked explanation">
        <div className="sheet-head">
          <p className="eyebrow">Let's work it out together</p>
          <button type="button" className="icon-btn small" onClick={onClose} aria-label="Close">
            <Icon name="close" />
          </button>
        </div>
        <StepPlayer problem={problem} explanation={explanation} readAloud={readAloud} doneLabel={doneLabel} onDone={onClose} />
      </div>
    </div>
  );
}

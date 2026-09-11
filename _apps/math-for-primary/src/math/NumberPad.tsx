import { Icon } from '../ui/Icon';

const DIGITS = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];

/** On-screen keypad: big targets for small fingers, no system keyboard. */
export function NumberPad({
  onDigit,
  onBackspace,
  onSubmit,
  canSubmit,
  disabled = false,
}: {
  onDigit: (digit: string) => void;
  onBackspace: () => void;
  onSubmit: () => void;
  canSubmit: boolean;
  disabled?: boolean;
}) {
  return (
    <div className="numpad" role="group" aria-label="Number pad">
      {DIGITS.map((d) => (
        <button key={d} type="button" className="numpad-key" onClick={() => onDigit(d)} disabled={disabled}>
          {d}
        </button>
      ))}
      <button type="button" className="numpad-key numpad-back" onClick={onBackspace} disabled={disabled} aria-label="Delete">
        <Icon name="backspace" size={30} />
      </button>
      <button type="button" className="numpad-key" onClick={() => onDigit('0')} disabled={disabled}>
        0
      </button>
      <button
        type="button"
        className="numpad-key numpad-check"
        onClick={onSubmit}
        disabled={disabled || !canSubmit}
        aria-label="Check my answer"
      >
        <Icon name="check" size={30} strokeWidth={3} />
        <span>Check</span>
      </button>
    </div>
  );
}

import type { Story, StorySegment } from '../engine/types';
import { SpeakButton } from '../ui/SpeakButton';

/** Split segments at a character offset (the start of the question). */
function splitAt(segments: StorySegment[], offset: number): [StorySegment[], StorySegment[]] {
  const before: StorySegment[] = [];
  const after: StorySegment[] = [];
  let pos = 0;
  for (const seg of segments) {
    const end = pos + seg.text.length;
    if (end <= offset) before.push(seg);
    else if (pos >= offset) after.push(seg);
    else {
      const cut = offset - pos;
      before.push({ ...seg, text: seg.text.slice(0, cut) });
      after.push({ ...seg, text: seg.text.slice(cut) });
    }
    pos = end;
  }
  return [before, after];
}

interface TapProps {
  /** Make numbers tappable ("Which numbers matter?"). */
  onTapNumber?: (segment: StorySegment, key: string) => void;
  /** Keys of numbers already tapped (and whether they were needed). */
  tapped?: Record<string, 'yes' | 'no'>;
}

function Segments({ segments, prefix, onTapNumber, tapped }: { segments: StorySegment[]; prefix: string } & TapProps) {
  return (
    <>
      {segments.map((s, i) => {
        if (s.num === undefined) return <span key={i}>{s.text}</span>;
        const key = `${prefix}${i}`;
        const cls = `story-num${s.role === 'extra' ? ' extra' : ''}${tapped?.[key] ? ` tapped-${tapped[key]}` : ''}`;
        return onTapNumber ? (
          <button key={i} type="button" className={`${cls} tappable`} onClick={() => onTapNumber(s, key)} aria-pressed={!!tapped?.[key]}>
            {s.text}
          </button>
        ) : (
          <mark key={i} className={cls}>
            {s.text}
          </mark>
        );
      })}
    </>
  );
}

/** A story problem with its numbers gently highlighted and read-aloud. */
export function StoryText({ story, compact = false, onTapNumber, tapped, plainNumbers = false }: { story: Story; compact?: boolean; plainNumbers?: boolean } & TapProps) {
  const [body, question] = splitAt(story.segments, story.text.length - story.question.length);
  return (
    <div className={`story${compact ? ' compact' : ''}${plainNumbers ? ' plain' : ''}`}>
      <div className="story-text">
        <p>
          <Segments segments={body} prefix="b" onTapNumber={onTapNumber} tapped={tapped} />
        </p>
        <p className="story-question">
          <Segments segments={question} prefix="q" onTapNumber={onTapNumber} tapped={tapped} />
        </p>
      </div>
      <SpeakButton text={story.text} />
    </div>
  );
}

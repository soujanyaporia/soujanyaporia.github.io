import { useEffect, useState } from 'react';
import type { LessonDef } from '../content/lessons';
import { speak } from '../lib/speech';
import { EquationView } from '../math/EquationView';
import { Icon } from '../ui/Icon';
import { SpeakButton } from '../ui/SpeakButton';
import { Visual } from '../visuals/Visual';

/** "Understand": one idea per card, with a picture. */
export function IntroCards({ lesson, onDone, readAloud }: { lesson: LessonDef; onDone: () => void; readAloud: boolean }) {
  const [index, setIndex] = useState(0);
  const card = lesson.intro[index];
  const last = index === lesson.intro.length - 1;

  useEffect(() => {
    if (readAloud) speak(card.say);
  }, [card, readAloud]);

  return (
    <div className="intro">
      <div className={`intro-card card tone-${lesson.tone}`} key={index}>
        <p className="intro-goal">
          <Icon name="target" size={20} /> {lesson.goal}
        </p>
        <div className="intro-say">
          <p>{card.say}</p>
          <SpeakButton text={card.say} />
        </div>
        {card.visual && <Visual spec={card.visual} />}
        {card.tokens && <EquationView tokens={card.tokens} size="lg" />}
      </div>
      <div className="intro-nav">
        <button type="button" className="icon-btn" onClick={() => setIndex((i) => i - 1)} disabled={index === 0} aria-label="Previous card">
          <Icon name="back" />
        </button>
        <div className="step-count">
          {lesson.intro.map((_, i) => (
            <span key={i} className={i <= index ? 'on' : ''} />
          ))}
        </div>
        <button type="button" className="btn btn-lg" onClick={() => (last ? onDone() : setIndex((i) => i + 1))}>
          {last ? 'See examples' : 'Next'}
          <Icon name="arrowRight" />
        </button>
      </div>
    </div>
  );
}

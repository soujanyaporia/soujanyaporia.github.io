import { createContext, useContext, useEffect, useRef, useState, type ReactNode, type CSSProperties } from 'react';
import { useProgress } from '../state/ProgressContext';
import { playSound, stopSounds, type SoundName } from '../lib/sound';
import { Icon } from './Icon';

/** Editable, lightweight companion for the illustrated adventure world. */
export function AdventureBuddy({ happy = false, className = '' }: { happy?: boolean; className?: string }) {
  return <svg className={`adventure-buddy ${happy ? 'happy' : ''} ${className}`} viewBox="0 0 180 180" aria-hidden="true" focusable="false">
    <ellipse cx="91" cy="165" rx="49" ry="8" fill="#234e4320" />
    <path d="M43 132Q8 146 21 112Q25 130 49 111" fill="#42bfa3" stroke="#238d78" strokeWidth="3" />
    <path d="M59 100Q37 128 49 158Q62 171 75 158H111Q126 169 138 157Q145 126 122 102" fill="#62cdb0" stroke="#238d78" strokeWidth="3" />
    <ellipse cx="93" cy="137" rx="26" ry="29" fill="#ffe59a" />
    <path d="M72 131h42M72 141h42M80 151h27" stroke="#edc269" strokeWidth="3" strokeLinecap="round" />
    <path className="buddy-wave" d="M129 117Q153 119 158 91Q166 81 170 95Q172 128 140 137" fill="#62cdb0" stroke="#238d78" strokeWidth="3" />
    <path d="M46 120Q29 125 36 141Q43 150 54 139" fill="#62cdb0" stroke="#238d78" strokeWidth="3" />
    <path d="M55 49L48 23Q64 21 71 44M111 43Q119 20 133 25L128 54" fill="#ffac91" stroke="#e88872" strokeWidth="3" strokeLinejoin="round" />
    <path d="M41 57L24 50L28 74L18 86L40 98M137 55L153 50L150 73L162 86L141 96" fill="#ffdd7c" stroke="#e6b859" strokeWidth="3" strokeLinejoin="round" />
    <path d="M36 85Q31 37 88 36Q147 31 145 85Q149 125 93 127Q38 129 36 85" fill="#80dbbd" stroke="#238d78" strokeWidth="3" />
    <ellipse cx="53" cy="97" rx="11" ry="7" fill="#fba38d" /><ellipse cx="130" cy="97" rx="11" ry="7" fill="#fba38d" />
    <g className="buddy-eyes" fill="#234e43"><ellipse cx="65" cy="78" rx="8" ry="11" /><ellipse cx="118" cy="78" rx="8" ry="11" /><circle cx="67" cy="74" r="3" fill="white" /><circle cx="120" cy="74" r="3" fill="white" /></g>
    <circle cx="84" cy="91" r="2.5" fill="#238d78" /><circle cx="97" cy="91" r="2.5" fill="#238d78" />
    {happy ? <path d="M77 102Q91 128 106 102Z" fill="#234e43" /> : <path d="M80 104Q91 115 103 103" fill="none" stroke="#234e43" strokeWidth="3" strokeLinecap="round" />}
    <path d="M60 52Q73 44 87 46" fill="none" stroke="#bbf1d9" strokeWidth="5" strokeLinecap="round" />
  </svg>;
}

export function SoundToggle({ compact = false }: { compact?: boolean }) {
  const { progress, updateSettings } = useProgress();
  const enabled = progress.settings.sound;
  return <button type="button" className={`sound-toggle ${compact ? 'compact' : ''}`} data-no-tap="true" aria-label={enabled ? 'Mute sound effects' : 'Turn on sound effects'} aria-pressed={enabled} title={enabled ? 'Mute sound effects' : 'Turn on sound effects'} onClick={() => {
    updateSettings({ sound: !enabled });
    if (enabled) stopSounds(); else playSound('toggle', true);
  }}><span className="sound-symbol"><Icon name="speaker" size={20} />{!enabled && <i />}</span>{!compact && <span>Sound {enabled ? 'on' : 'off'}</span>}</button>;
}

const MOTION_KEY = 'math-for-primary.reduced-motion';
const FeedbackSoundContext = createContext(false);
export function useFeedbackSound() {
  const enabled = useContext(FeedbackSoundContext);
  return (name: SoundName) => playSound(name, enabled);
}
export function Experience({ children }: { children: ReactNode }) {
  const { progress } = useProgress();
  useEffect(() => {
    const click = (event: MouseEvent) => {
      const element = event.target instanceof Element ? event.target.closest('button, a, summary, [role="button"]') : null;
      if (!element || element.closest('[data-no-tap]') || element.matches(':disabled, [aria-disabled="true"]')) return;
      playSound(element.hasAttribute('data-hint') ? 'hint' : 'tap', progress.settings.sound);
    };
    document.addEventListener('click', click, true);
    return () => document.removeEventListener('click', click, true);
  }, [progress.settings.sound]);
  useEffect(() => {
    try { document.documentElement.dataset.motion = localStorage.getItem(MOTION_KEY) === 'reduced' ? 'reduced' : 'full'; } catch { /* OS preference still applies. */ }
  }, []);
  return <FeedbackSoundContext.Provider value={progress.settings.sound}>{children}</FeedbackSoundContext.Provider>;
}

export function MotionToggle() {
  const [reduced, setReduced] = useState(() => { try { return localStorage.getItem(MOTION_KEY) === 'reduced'; } catch { return false; } });
  useEffect(() => {
    const sync = () => setReduced(document.documentElement.dataset.motion === 'reduced');
    window.addEventListener('math-motion-change', sync);
    return () => window.removeEventListener('math-motion-change', sync);
  }, []);
  return <button type="button" className="motion-toggle" aria-pressed={reduced} onClick={() => {
    const value = !reduced; setReduced(value); document.documentElement.dataset.motion = value ? 'reduced' : 'full';
    window.dispatchEvent(new Event('math-motion-change'));
    try { localStorage.setItem(MOTION_KEY, value ? 'reduced' : 'full'); } catch { /* Optional preference. */ }
  }}><Icon name={reduced ? 'play' : 'sparkle'} size={18}/>{reduced ? 'Animations paused' : 'Pause animations'}</button>;
}

export function Celebration({ complete = false }: { complete?: boolean }) {
  return <div className={`adventure-confetti ${complete ? 'complete' : ''}`} aria-hidden="true">{Array.from({ length: complete ? 28 : 12 }, (_, i) => <i key={i} style={{ '--i': i, '--x': `${(i * 37 + 11) % 100}%`, '--turn': `${i % 2 ? 230 : -190}deg`, '--delay': `${i % 7 * .055}s`, '--confetti': ['#f6bc43', '#32b696', '#f68d7e', '#8e83d5', '#64bfd9'][i % 5] } as CSSProperties}>{i % 3 === 0 ? '✦' : ''}</i>)}</div>;
}

export function CompletionParty() {
  const { progress } = useProgress();
  // Celebrate arrival once, including React StrictMode's effect replay.
  const celebrated = useRef(false);
  useEffect(() => { if (celebrated.current) return; celebrated.current = true; playSound('complete', progress.settings.sound); }, []);
  return <><Celebration complete /><AdventureBuddy happy className="completion-buddy" /></>;
}

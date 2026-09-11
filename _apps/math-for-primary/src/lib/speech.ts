/**
 * Read-aloud support for early readers (Web Speech API, works offline on
 * iPad). Maths symbols are turned into words a child would hear in class.
 */
const REPLACEMENTS: [RegExp, string][] = [
  [/=\s*\?/g, ' equals what'],
  [/□/g, ' box '],
  [/−/g, ' minus '],
  [/\+/g, ' plus '],
  [/=/g, ' equals '],
  [/</g, ' is less than '],
  [/>/g, ' is more than '],
  [/○/g, ' circle '],
  [/…/g, ' '],
];

export function speechText(text: string): string {
  let out = text;
  for (const [pattern, words] of REPLACEMENTS) out = out.replace(pattern, words);
  return out.replace(/\s+/g, ' ').trim();
}

export const canSpeak = typeof window !== 'undefined' && 'speechSynthesis' in window;

function pickVoice(): SpeechSynthesisVoice | undefined {
  const voices = window.speechSynthesis.getVoices();
  for (const lang of ['en-SG', 'en-GB', 'en-AU', 'en-US']) {
    const match = voices.find((v) => v.lang.replace('_', '-') === lang);
    if (match) return match;
  }
  return voices.find((v) => v.lang.startsWith('en'));
}

export function speak(text: string): void {
  if (!canSpeak) return;
  const synth = window.speechSynthesis;
  synth.cancel();
  const utterance = new SpeechSynthesisUtterance(speechText(text));
  const voice = pickVoice();
  if (voice) utterance.voice = voice;
  utterance.lang = voice?.lang ?? 'en-GB';
  utterance.rate = 0.9;
  utterance.pitch = 1.05;
  synth.speak(utterance);
}

export function stopSpeaking(): void {
  if (canSpeak) window.speechSynthesis.cancel();
}

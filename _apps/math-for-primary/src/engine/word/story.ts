import type { Rng } from '../random';
import type { Fact, Story, StorySegment, StoryStructure } from '../types';
import type { Frame } from './frame';
import { CHANGE_FRAMES } from './frames-change';
import { GROUP_FRAMES } from './frames-group';
import { MUL_FRAMES } from './frames-mul';
import { DAYS, GIVERS, MRT_STATIONS, PARKS, PEOPLE } from './people';
import { renderTemplate, segmentsText, type RenderContext } from './render';
import { STRUCTURES } from './storyMath';

export const ALL_FRAMES: readonly Frame[] = [...CHANGE_FRAMES, ...GROUP_FRAMES, ...MUL_FRAMES];

export interface StoryOptions {
  /** Add a sentence with a number that is not needed (if the frame has one). */
  extra?: boolean;
  /** Largest value for the unneeded number. */
  maxExtra?: number;
  /** Prefer frames not in this set (variety within a session). */
  avoidFrames?: ReadonlySet<string>;
  /** Force a particular frame. */
  frameId?: string;
}

function fits(frame: Frame, values: number[]): boolean {
  return values.every((value) => value >= (frame.minValue ?? 1) && value <= (frame.maxValue ?? Infinity));
}

/** Merge neighbouring text segments so the UI gets clean runs of text. */
function tidy(segments: StorySegment[]): StorySegment[] {
  const out: StorySegment[] = [];
  for (const seg of segments) {
    const last = out[out.length - 1];
    if (seg.num === undefined && last && last.num === undefined) last.text += seg.text;
    else out.push({ ...seg });
  }
  return out;
}

export function framesFor(structure: StoryStructure): Frame[] {
  return ALL_FRAMES.filter((f) => f.structure === structure);
}

/**
 * Render a story for a structure and a sampled fact.
 * Returns null when no frame suits these numbers (caller resamples).
 */
export function buildStory(rng: Rng, structure: StoryStructure, fact: Fact, opts: StoryOptions = {}): Story | null {
  const info = STRUCTURES[structure];
  const quantities = info.roles(fact);
  const values = Object.values(quantities) as number[];

  let candidates = ALL_FRAMES.filter((f) => f.structure === structure && fits(f, values));
  if (opts.frameId) candidates = candidates.filter((f) => f.id === opts.frameId);
  if (candidates.length === 0) return null;
  const fresh = candidates.filter((f) => !opts.avoidFrames?.has(f.id));
  const frame = rng.pick(fresh.length > 0 ? fresh : candidates);

  const scene = rng.pick(frame.scenes);
  const [A, B] = rng.shuffle(PEOPLE).slice(0, 2);
  const [station, station2] = rng.shuffle(MRT_STATIONS).slice(0, 2);
  const dayIndex = rng.int(0, DAYS.length - 2);
  const variant = rng.pick(frame.variants);
  const sentences = variant.slice(0, -1);
  const question = variant[variant.length - 1];

  const q = { ...quantities };
  if (opts.extra && frame.extra) {
    const used = new Set(values);
    const max = Math.max(opts.maxExtra ?? 9, 4);
    let extra = rng.int(2, max);
    for (let i = 0; i < 20 && used.has(extra); i++) extra = rng.int(2, max);
    if (!used.has(extra)) {
      q.extra = extra;
      sentences.push(frame.extra);
    }
  }

  const ctx: RenderContext = {
    A,
    B,
    giver: rng.pick(GIVERS),
    unit: scene.unit,
    nouns: scene.nouns ?? {},
    vars: {
      station,
      station2,
      day: DAYS[dayIndex],
      day2: DAYS[dayIndex + 1],
      park: rng.pick(PARKS),
      ...scene.vars,
    },
    quantities: q,
  };

  const parts: StorySegment[] = [];
  for (const sentence of sentences) {
    parts.push(...renderTemplate(sentence, ctx), { text: ' ' });
  }
  const questionSegments = renderTemplate(question, ctx);
  const segments = tidy([...parts, ...questionSegments]);
  const text = segmentsText(segments);

  return {
    structure,
    frameId: frame.id,
    segments,
    text,
    question: segmentsText(questionSegments),
    unit: scene.unit,
    quantities: q,
    unknownRole: info.unknown,
    given: segments
      .filter((s) => s.num !== undefined && s.role !== undefined)
      .map((s) => ({ role: s.role!, value: s.num! })),
    answerSentence: segmentsText(renderTemplate(frame.answer, ctx)),
    equation: info.equation(quantities),
    solve: info.solve(quantities),
    accepted: info.accepted(quantities),
    actions: info.actions,
    labels: info.labels,
    names: [A.name, B.name].filter((name) => text.includes(name)),
  };
}

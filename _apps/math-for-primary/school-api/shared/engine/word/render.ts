import type { Noun, QuantityRole, StorySegment } from '../types';
import { PRONOUNS, type Giver, type Person } from './people';

export interface RenderContext {
  A: Person;
  B: Person;
  giver: Giver;
  unit: Noun;
  nouns: Record<string, Noun>;
  vars: Record<string, string>;
  quantities: Partial<Record<QuantityRole, number>>;
}

const ROLES: ReadonlySet<string> = new Set<QuantityRole>([
  'start',
  'change',
  'result',
  'part1',
  'part2',
  'whole',
  'big',
  'small',
  'diff',
  'groups',
  'each',
  'total',
  'extra',
]);

export const plural = (n: number, noun: Noun): string => (n === 1 ? noun.one : noun.many);

const capitalise = (text: string): string => text.charAt(0).toUpperCase() + text.slice(1);

/** Render a template into segments; numbers become separate, highlightable segments. */
export function renderTemplate(template: string, ctx: RenderContext): StorySegment[] {
  const out: StorySegment[] = [];
  const pushText = (text: string) => {
    if (!text) return;
    const last = out[out.length - 1];
    if (last && last.num === undefined) last.text += text;
    else out.push({ text });
  };
  const pushNumber = (role: QuantityRole, n: number) => out.push({ text: String(n), num: n, role });

  const pattern = /\{([^}]+)\}/g;
  let cursor = 0;
  for (let match = pattern.exec(template); match; match = pattern.exec(template)) {
    pushText(template.slice(cursor, match.index));
    cursor = pattern.lastIndex;
    const [key, modifier, nounKey] = match[1].split(':');

    if (!ROLES.has(key)) {
      pushText(word(key, ctx));
      continue;
    }
    const role = key as QuantityRole;
    const n = ctx.quantities[role];
    if (n === undefined) throw new Error(`Template uses missing quantity "${role}": ${template}`);
    const noun = nounKey ? ctx.nouns[nounKey] : ctx.unit;
    if (!noun) throw new Error(`Template uses unknown noun "${nounKey}": ${template}`);

    switch (modifier) {
      case undefined:
        pushNumber(role, n);
        break;
      case 'n':
        pushNumber(role, n);
        pushText(` ${plural(n, noun)}`);
        break;
      case 'more':
      case 'fewer':
        pushNumber(role, n);
        pushText(` ${modifier} ${plural(n, noun)}`);
        break;
      case 'noun':
        pushText(plural(n, noun));
        break;
      case 'are':
        pushText(n === 1 ? 'is' : 'are');
        break;
      case 'were':
        pushText(n === 1 ? 'was' : 'were');
        break;
      default:
        throw new Error(`Unknown modifier "${modifier}" in: ${template}`);
    }
  }
  pushText(template.slice(cursor));
  return out;
}

function word(key: string, ctx: RenderContext): string {
  const a = PRONOUNS[ctx.A.pronoun];
  const b = PRONOUNS[ctx.B.pronoun];
  const giver = ctx.giver.own ? `${a.his} ${ctx.giver.word}` : ctx.giver.word;
  switch (key) {
    case 'A':
      return ctx.A.name;
    case 'B':
      return ctx.B.name;
    case 'he':
      return a.he;
    case 'He':
      return capitalise(a.he);
    case 'him':
      return a.him;
    case 'his':
      return a.his;
    case 'His':
      return capitalise(a.his);
    case 'heB':
      return b.he;
    case 'himB':
      return b.him;
    case 'hisB':
      return b.his;
    case 'giver':
      return giver;
    case 'Giver':
      return capitalise(giver);
    case 'items':
      return ctx.unit.many;
    case 'item':
      return ctx.unit.one;
  }
  if (key in ctx.vars) return ctx.vars[key];
  if (key in ctx.nouns) return ctx.nouns[key].one;
  if (key.endsWith('s') && key.slice(0, -1) in ctx.nouns) return ctx.nouns[key.slice(0, -1)].many;
  throw new Error(`Unknown placeholder {${key}}`);
}

export const segmentsText = (segments: StorySegment[]): string =>
  segments.map((s) => s.text).join('');

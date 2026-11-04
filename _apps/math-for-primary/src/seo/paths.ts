/** Public reading pages use real paths; interactive sessions keep their saved hash routes. */
export const PUBLIC_BASE = '/math-for-primary/';
export const SITE_URL = `https://soujanyaporia.github.io${PUBLIC_BASE}`;
export const guidePath = (id: string) => `${PUBLIC_BASE}lessons/${encodeURIComponent(id)}/`;
export const gradePath = (level: number, track = 'standard') => `${PUBLIC_BASE}primary-${level}${track === 'foundation' ? '-foundation' : ''}-maths/`;

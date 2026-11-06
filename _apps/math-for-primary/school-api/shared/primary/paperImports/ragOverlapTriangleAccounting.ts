import {Rng,hashString} from '../../engine/random';
import type {Question} from '../generate';

export const RAG_PATTERN = {
  id: 'p5-rag-overlap-triangle-accounting',
  level: 5,
  title: 'Account for a shared triangle area',
  objective: 'Find the combined area of two identical right triangles outside their shared interior.',
  skillIds: ['P5.S.AREA.02','P5.S.AREA.03'],
  canonicalPatternId: 'p5-overlap-triangle-area-accounting',
} as const;

export function makeRagQuestion(seed: number, index = 0): Question {
  const r = new Rng(hashString(`rag-overlap-triangle-accounting:${seed}:${index}`));
  const base = r.pick([8,10,12,14,16]);
  const height = r.pick([6,8,10,12]);
  const wholeArea = base * height / 2;
  const sharedArea = r.pick([2,4,6,8,10,12].filter(n => n < wholeArea));
  const answer = 2 * (wholeArea - sharedArea);
  const prompt = `Two identical right-angled triangles overlap. Each triangle has perpendicular sides ${base} cm and ${height} cm. Their shared interior has area ${sharedArea} cm². What is the total area of the two parts outside the shared interior?`;
  const workedSteps = [
    {text:'Find the area of one right-angled triangle.',equation:`${base} × ${height} ÷ 2 = ${wholeArea} cm²`},
    {text:'Find the area outside the shared interior in one triangle.',equation:`${wholeArea} − ${sharedArea} = ${wholeArea-sharedArea} cm²`},
    {text:'There are two identical outside parts.',equation:`${wholeArea-sharedArea} × 2 = ${answer} cm²`},
  ];
  return {
    key:`rag-overlap-triangle-accounting:${seed}:${index}`,
    prompt,
    answer:String(answer),
    unit:'cm²',
    hint:'Find one triangle’s area first. Subtract the shared area once for each triangle.',
    explanation:workedSteps.map(s=>`${s.text} ${s.equation}`).join(' '),
    workedSteps,
  };
}

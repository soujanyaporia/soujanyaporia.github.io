import { calcTokens, equationTokens, exprTokens, factTokens, tok } from '../engine/equation';
import type { BondSpec, BondValue, NumberProblem, Problem, Relation } from '../engine/types';
import { EquationView, type BlankState } from '../math/EquationView';
import { StoryText } from '../math/StoryText';
import { NumberBond } from '../visuals/NumberBond';
import { Visual } from '../visuals/Visual';
import { SequenceTrain } from './SequenceTrain';

/** Short instruction shown above a question. Neutral in challenges. */
export function promptFor(problem: Problem, neutral = false): string {
  switch (problem.kind) {
    case 'truefalse':
      return 'Is this true or false?';
    case 'relation':
      return 'Choose <, = or >';
    case 'choice':
      return problem.style === 'expression' ? 'Which calculation answers the question?' : 'Which equation matches the story?';
    case 'match':
      return 'Which story matches the equation?';
    case 'make':
      return `Make ${problem.target}`;
    case 'sequence':
      return 'Find the missing number';
    case 'translate':
      return 'Turn the story into maths';
    case 'number':
      if (problem.prompt && !neutral) return problem.prompt;
      if (problem.format === 'bond') return 'Find the missing number';
      if (problem.format === 'story') return 'Solve the story';
      if (neutral) return 'Solve it';
      if (problem.skill === 'equality.balance') return 'Make both sides the same';
      if (problem.skill.includes('missing')) return 'Find the missing number';
      return { '+': 'Add', '-': 'Take away', '*': 'Multiply', '/': 'Divide' }[problem.fact.op];
  }
}

export function bondSpecOf(p: NumberProblem, fill?: number): { spec: BondSpec; active: 'whole' | 'part1' | 'part2' } {
  const { whole, parts } = p.bond!;
  const v = (slot: number | null): BondValue => (slot === null ? (fill ?? '?') : slot);
  const active = whole === null ? 'whole' : parts[0] === null ? 'part1' : 'part2';
  return { spec: { type: 'bond', whole: v(whole), parts: [v(parts[0]), v(parts[1])] }, active };
}

/** Plural or singular unit for the story answer box. */
export function unitFor(p: Problem, value: string): string {
  const story = p.kind === 'number' ? p.story : undefined;
  if (!story) return '';
  return value === '1' ? story.unit.one : story.unit.many;
}

export function RelationView({ problem, value, size, state }: { problem: Extract<Problem, { kind: 'relation' }>; value: Relation | null; size: 'xl' | 'lg'; state: BlankState }) {
  const tokens = [...exprTokens(problem.left), tok.blank(), ...exprTokens(problem.right)];
  return <EquationView tokens={tokens} size={size} input={value ?? ''} blankShape="circle" blankState={value ? (state === 'idle' ? 'active' : state) : state} />;
}

/**
 * Non-interactive view of a problem, used by worked examples and the
 * explanation sheet. `revealed` fills in the answer.
 */
export function ProblemView({ problem, revealed, size = 'xl' }: { problem: Problem; revealed: boolean; size?: 'xl' | 'lg' }) {
  const state: BlankState = revealed ? 'revealed' : 'idle';
  switch (problem.kind) {
    case 'number': {
      if (problem.format === 'bond') return <NumberBond spec={bondSpecOf(problem, revealed ? problem.answer : undefined).spec} />;
      if (problem.format === 'story') {
        return (
          <div className="problem-story">
            <StoryText story={problem.story!} />
            <div className="story-answer">
              <EquationView tokens={[tok.blank()]} size="lg" input={revealed ? String(problem.answer) : ''} blankState={state} />
              <span className="story-unit">{unitFor(problem, revealed ? String(problem.answer) : '2')}</span>
            </div>
          </div>
        );
      }
      const fill = revealed ? String(problem.answer) : '';
      return (
        <div className="problem-stack">
          {problem.picture && (
            <div className="problem-picture">
              <Visual spec={problem.picture} />
            </div>
          )}
          {problem.related && <EquationView tokens={equationTokens(problem.related)} size="lg" input={fill} blankState={state} className="related-eq" />}
          <EquationView tokens={equationTokens(problem.equation!)} size={problem.picture ? 'lg' : size} input={fill} blankState={state} />
        </div>
      );
    }
    case 'truefalse':
      return (
        <div className="problem-stack">
          <EquationView tokens={equationTokens(problem.equation)} size={size} />
          {revealed && <span className={`verdict ${problem.answer ? 'yes' : 'no'}`}>{problem.answer ? 'True' : 'False'}</span>}
        </div>
      );
    case 'relation':
      return <RelationView problem={problem} value={revealed ? problem.answer : null} size={size} state={state} />;
    case 'choice':
    case 'translate':
      return (
        <div className="problem-story">
          <StoryText story={problem.story} />
          {revealed && (
            <EquationView tokens={problem.kind === 'choice' && problem.style === 'expression' ? calcTokens(problem.story.solve) : factTokens(problem.story.solve)} size="lg" className="story-solved" />
          )}
        </div>
      );
    case 'match':
      return (
        <div className="problem-stack">
          <EquationView tokens={factTokens(problem.equation)} size="lg" />
          {revealed && <p className="match-answer">“{problem.options[problem.answer]}”</p>}
        </div>
      );
    case 'make':
      return (
        <div className="problem-stack">
          <span className="make-target">{problem.target}</span>
          <div className="make-cards static">
            {problem.cards.map((c, i) => (
              <span key={i} className="make-card">
                {c}
              </span>
            ))}
          </div>
        </div>
      );
    case 'sequence':
      return <SequenceTrain terms={problem.terms} input={revealed ? String(problem.answer) : ''} state={revealed ? 'correct' : 'idle'} />;
  }
}

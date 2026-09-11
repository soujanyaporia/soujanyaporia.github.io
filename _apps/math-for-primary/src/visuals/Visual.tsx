import type { VisualSpec } from '../engine/types';
import { ArrayGrid } from './ArrayGrid';
import { Balance } from './Balance';
import { BarModel } from './BarModel';
import { Counters } from './Counters';
import { Groups } from './Groups';
import { NumberBond } from './NumberBond';
import { NumberLine } from './NumberLine';
import { FactFamily, ShareView } from './ShareView';
import './visuals.css';
import './manipulatives.css';

/** Renders any visual spec produced by the explanation engine. */
export function Visual({ spec }: { spec?: VisualSpec }) {
  if (!spec) return null;
  let content;
  switch (spec.type) {
    case 'counters':
      content = <Counters spec={spec} />;
      break;
    case 'numberline':
      content = <NumberLine spec={spec} />;
      break;
    case 'bond':
      content = <NumberBond spec={spec} />;
      break;
    case 'bar':
      content = <BarModel spec={spec} />;
      break;
    case 'balance':
      content = <Balance spec={spec} />;
      break;
    case 'groups':
      content = <Groups spec={spec} />;
      break;
    case 'array':
      content = <ArrayGrid spec={spec} />;
      break;
    case 'share':
      content = <ShareView spec={spec} />;
      break;
    case 'family':
      content = <FactFamily spec={spec} />;
      break;
  }
  return (
    <div className={`visual visual-${spec.type}`} key={spec.type}>
      {content}
    </div>
  );
}

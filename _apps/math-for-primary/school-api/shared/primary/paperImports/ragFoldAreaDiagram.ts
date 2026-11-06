import type {Batch11UpperPicture} from './batch11UpperPicture';

type Point = [number, number];
const shaded = '#b7d6c7';

function reflect(point: Point, start: Point, end: Point): Point {
  const dx = end[0] - start[0];
  const dy = end[1] - start[1];
  const projection = ((point[0] - start[0]) * dx + (point[1] - start[1]) * dy) / (dx * dx + dy * dy);
  return [
    2 * (start[0] + projection * dx) - point[0],
    2 * (start[1] + projection * dy) - point[1],
  ];
}

function drawing(width: number, height: number, description: string) {
  const model: Batch11UpperPicture = {type: 'batch11-upper', label: description, marks: []};
  const scale = Math.min(184 / width, 110 / height);
  const screen = ([x, y]: Point): Point => [160 + (x - width / 2) * scale, 90 + (y - height / 2) * scale];
  const path = (points: Point[]) => 'M ' + points.map(point => point.join(' ')).join(' L ');

  function polygon(points: Point[], fill: string) {
    model.marks.push({kind: 'path', d: path(points.map(screen)) + ' Z', fill});
  }
  function line(start: Point, end: Point, dashed = false) {
    const [x1, y1] = screen(start);
    const [x2, y2] = screen(end);
    model.marks.push({kind: 'line', x1, y1, x2, y2, dashed});
  }
  function label(text: string, point: Point, dx: number, dy: number) {
    const [x, y] = screen(point);
    model.marks.push({kind: 'text', text, x: x + dx, y: y + dy});
  }
  function tick(point: Point, vertical: boolean) {
    const [x, y] = screen(point);
    model.marks.push({
      kind: 'line',
      x1: x - (vertical ? 0 : 4),
      y1: y - (vertical ? 4 : 0),
      x2: x + (vertical ? 0 : 4),
      y2: y + (vertical ? 4 : 0),
    });
  }
  function rightAngle(corner: Point, first: Point, second: Point) {
    const vertex = screen(corner);
    const along = (point: Point): Point => {
      const mapped = screen(point);
      const dx = mapped[0] - vertex[0];
      const dy = mapped[1] - vertex[1];
      const length = Math.hypot(dx, dy);
      return [6 * dx / length, 6 * dy / length];
    };
    const u = along(first);
    const v = along(second);
    const points: Point[] = [
      [vertex[0] + u[0], vertex[1] + u[1]],
      [vertex[0] + u[0] + v[0], vertex[1] + u[1] + v[1]],
      [vertex[0] + v[0], vertex[1] + v[1]],
    ];
    model.marks.push({kind: 'path', d: path(points)});
  }
  return {model, polygon, line, label, tick, rightAngle};
}

export function drawRecoveredRectangle(width: number, height: number, depth: number): Batch11UpperPicture {
  const A: Point = [0, height];
  const B: Point = [0, 0];
  const C: Point = [width, 0];
  const D: Point = [width, height];
  const E: Point = [width, height - depth];
  const F = reflect(D, A, E);
  const diagram = drawing(width, height, 'Rectangle ABCD with A at the lower left. D folds onto F along AE. Region ABCEF is shaded and triangle AFE is white. Dashed edges lead to the original corner D.');
  diagram.polygon([A, B, C, E, F], shaded);
  diagram.polygon([A, F, E], '#ffffff');
  diagram.line(A, D, true);
  diagram.line(D, E, true);
  diagram.rightAngle(F, A, E);
  diagram.label('A', A, -17, 18);
  diagram.label('B', B, -17, -7);
  diagram.label('C', C, 5, -7);
  diagram.label('D', D, 5, 18);
  diagram.label('E', E, 8, 4);
  diagram.label('F', F, -18, -7);
  return diagram.model;
}

export function drawCutRectangle(
  width: number,
  equalSide: number,
  topDepth: number,
  foldedBase: number,
  bottomDepth: number,
  afterCut = false,
): Batch11UpperPicture {
  const height = topDepth + equalSide;
  const A: Point = [0, 0];
  const B: Point = [width, 0];
  const C: Point = [width, height];
  const D: Point = [0, height];
  const P: Point = [0, topDepth];
  const Q: Point = [width - equalSide, 0];
  const R: Point = [width - foldedBase, height];
  const S: Point = [width, height - bottomDepth];
  const F = reflect(A, P, Q);
  const G = reflect(C, R, S);
  const description = afterCut
    ? 'The remaining paper has boundary DPFQBSGR. Dashed edges show the original corners A and C.'
    : 'Rectangle ABCD with A at the upper left. A folds onto F along PQ and C folds onto G along RS. Triangles PFQ and RGS are shaded. PD and QB have matching length marks.';
  const diagram = drawing(width, height, description);
  if (afterCut) {
    diagram.polygon([D, P, F, Q, B, S, G, R], '#ffffff');
  } else {
    diagram.polygon([D, P, Q, B, S, R], '#ffffff');
    diagram.polygon([P, F, Q], shaded);
    diagram.polygon([R, G, S], shaded);
    diagram.rightAngle(F, P, Q);
    diagram.rightAngle(G, R, S);
  }
  diagram.line(A, P, true);
  diagram.line(A, Q, true);
  diagram.line(C, R, true);
  diagram.line(C, S, true);
  diagram.tick([0, (topDepth + height) / 2], false);
  diagram.tick([(Q[0] + width) / 2, 0], true);
  diagram.label('A', A, -18, -7);
  diagram.label('B', B, 5, -7);
  diagram.label('C', C, 5, 18);
  diagram.label('D', D, -18, 18);
  diagram.label('P', P, -21, 5);
  diagram.label('Q', Q, -7, -9);
  diagram.label('R', R, -7, 21);
  diagram.label('S', S, 8, 5);
  diagram.label('F', F, -5, 20);
  diagram.label('G', G, -15, -9);
  return diagram.model;
}

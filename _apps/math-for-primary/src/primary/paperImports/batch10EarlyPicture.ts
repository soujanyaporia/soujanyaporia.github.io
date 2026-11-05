/** Essential grouped solid figures. Labels and geometry are givens; face counts are not supplied. */
export type Batch10EarlySolid='cube'|'cuboid'|'cone'|'cylinder'|'sphere'|'square pyramid';
export type Batch10EarlyPicture={type:'batch10-early';layout:'solid-order';objects:{label:string;shape:Batch10EarlySolid}[]};

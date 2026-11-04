#!/usr/bin/env python3
"""Prepare bounded historic receipt refresh inputs without mutating the ledger.

Exclude prior partial units that are now included in a whole-paper inventory;
those source identities are already reverified by whole-paper receipts. Keep
previously reviewed units and exact pattern mappings only. The final passing
report and frozen implementation versions are required by the separate registrar.
"""
import argparse, json, sqlite3
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
LIB=ROOT.parent/'Singapore Maths Paper Library'
parser=argparse.ArgumentParser();parser.add_argument('--extra-spec',type=Path,action='append',default=[]);args=parser.parse_args()
OUT=ROOT/'.generated/corpus-template-reuse/batch6-refresh'
OUT.mkdir(parents=True,exist_ok=True)
c=sqlite3.connect(f'file:{(LIB/"coverage/ledger.sqlite").resolve()}?mode=ro',uri=True)
files=['partial-batch2-manifest.json','partial-batch3-upper-manifest.json','partial-batch3-early-manifest.json','partial-batch4-early-manifest.json','partial-batch4-middle-manifest.json','partial-batch4-upper-money-fix-manifest.json','partial-batch4-upper-reuse-manifest.json']
shared='src/primary/paperImports/batch6MiddleResponse.ts'
for name in files:
 original=ROOT/'.generated/corpus-template-reuse'/name
 data=json.loads(original.read_text());kept=[];skipped=[]
 for unit in data['units']:
  paper=unit['paperId'];key=f"partial:{paper}:{unit['sourceQuestion']}"
  row=c.execute('select inventory_reviewed from papers where paper_id=?',(paper,)).fetchone()
  assert row is not None and c.execute('select 1 from candidates where candidate_key=?',(key,)).fetchone(),key
  if row[0]:skipped.append(key);continue
  assert c.execute('select 1 from mappings where candidate_key=? and pattern_id=? and relation=?',(key,unit['patternId'],'same-structure')).fetchone(),key
  kept.append(unit)
 data['units']=kept
 for pattern in data['patterns']:
  pattern['trackedFiles']=list(dict.fromkeys(str((ROOT/entry).resolve()) for entry in [*pattern['trackedFiles'],shared,'src/engine/random.ts']))
 data['refreshNote']={'originManifest':str(original.resolve()),'excludedNowFullyInventoried':skipped,'scope':'Existing same-structure reviewed mappings only; no new source credit or inventory.'}
 (OUT/name).write_text(json.dumps(data,indent=2,ensure_ascii=False)+'\n')
 print(f'{name}: {len(kept)} units; {len(skipped)} already in whole-paper inventories')
# All historic whole-paper implementations plus the P6 batch6 paper. Additional
# batch6 whole-paper specs may be added once each owner's final source is ready.
spec=[]
for name in ['p5-p6-implementation-specs.json','batch5-whole-implementation-specs.json','batch5-middle-ledger-spec.json','batch6-upper-implementation-spec.json']:
 value=json.loads((ROOT/'.generated/paper-imports'/name).read_text());spec.extend(value if isinstance(value,list) else [value])
for path in args.extra_spec:
 value=json.loads(path.read_text());spec.extend(value if isinstance(value,list) else [value])
assert len({x['namespace'] for x in spec})==len(spec)
(OUT/'whole-implementation-specs.json').write_text(json.dumps(spec,indent=2)+'\n')
print(f'Prepared {len(spec)} additional whole-paper implementation sets; built-in P1–P4 are added by registrar.')

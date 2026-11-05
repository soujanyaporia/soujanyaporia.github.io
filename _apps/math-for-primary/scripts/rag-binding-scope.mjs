// Unrelated, registry-owned additions must not invent new versions of every existing generator.
// Any uncertainty about dispatch or cross-imports falls back to the full code snapshot.
import {readFileSync} from 'node:fs';
import {resolve,basename} from 'node:path';
import {renderRegistry,sha} from './rag-promote.mjs';

const {app,registry,bindings}=JSON.parse(readFileSync(0,'utf8'));
let scope={...bindings};
try {
  const aggregate=renderRegistry(registry);
  for(const [name,body] of Object.entries(aggregate))
    if(readFileSync(resolve(app,name),'utf8')!==body)throw Error('noncanonical dispatch');
  const owned=new Set(registry.entries.flatMap(e=>e.files.map(f=>f.path)));
  for(const e of registry.entries)for(const f of e.files)
    if(bindings[f.path]!==f.sha256)throw Error('changed registered file');
  const agg=new Set(Object.keys(aggregate));
  const stems=new Set([...owned].filter(p=>!p.includes('.test.')).map(p=>basename(p,'.ts')));
  for(const name of Object.keys(bindings)){
    if(agg.has(name)||name.includes('.test.'))continue;
    const code=readFileSync(resolve(app,name),'utf8');
    if(/import\.meta\.glob|\bimport\s*\(\s*[^'"]/.test(code))throw Error('unknown dynamic dependency');
    for(const match of code.matchAll(/["']([^"'\n]+)["']/g)){
      const stem=basename(match[1]).replace(/\.tsx?$/,'');
      if(stems.has(stem)||stem==='ragRegistry.json')throw Error('cross-factory dependency');
    }
  }
  const base=renderRegistry({schema:1,entries:[]});
  for(const name of Object.keys(scope)){
    if(agg.has(name))scope[name]=sha(base[name]);
    else if(owned.has(name)||/\.test\.tsx?$/.test(name))delete scope[name];
  }
} catch {scope=bindings;}
process.stdout.write(JSON.stringify(scope));

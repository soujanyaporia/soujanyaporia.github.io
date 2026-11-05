import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {renderRegistry,sha} from '../rag-promote.mjs';
test('an isolated registered addition preserves existing dependency versions; a changed dispatch invalidates them',()=>{
 const root=mkdtempSync(join(tmpdir(),'pattern-bind-'));try{
 const registry={schema:1,entries:[]},bindings={};function put(path,bytes){mkdirSync(join(root,path,'..'),{recursive:true});writeFileSync(join(root,path),bytes);if(path.endsWith('.ts'))bindings[path]=sha(bytes)}
 const aggregate=()=>Object.entries(renderRegistry(registry)).forEach(([p,b])=>put(p,b));
 const scope=()=>JSON.parse(spawnSync('node',[fileURLToPath(new URL('../rag-binding-scope.mjs',import.meta.url))],{input:JSON.stringify({app:root,registry,bindings}),encoding:'utf8'}).stdout);
 put('src/primary/generate.ts','export const one=1;');aggregate();const empty=scope();
 const p='src/primary/paperImports/ragBox.ts';put(p,'export const makeRagQuestion=()=>1;');registry.entries.push({parameter:'rag-box',level:2,title:'Boxes',objective:'Count boxes',skillIds:[],canonicalPatternId:'box',sourceRefs:[{paperId:'p',sourceQuestion:'2',sourcePages:[1]}],entryFile:p,files:[{path:p,sha256:bindings[p]}]});aggregate();assert.deepEqual(scope(),empty);
 put('src/primary/paperImports/ragQuestions.ts','changed dispatcher');assert.deepEqual(scope(),bindings);
 aggregate();put('src/primary/generate.ts',"import {makeRagQuestion} from './paperImports/ragBox';");assert.deepEqual(scope(),bindings);
 }finally{rmSync(root,{recursive:true,force:true})}
});

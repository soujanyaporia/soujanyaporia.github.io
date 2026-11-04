import {readFile,readdir} from 'node:fs/promises';
import {join} from 'node:path';
let count=0;
const expected=new Set();
async function collect(dir,relative=''){for(const f of await readdir(dir,{withFileTypes:true})){if(f.isDirectory())await collect(join(dir,f.name),join(relative,f.name));else if(f.name==='index.html')expected.add(relative);}}
async function walk(dir,relative=''){for(const f of await readdir(dir,{withFileTypes:true})){if(f.isDirectory())await walk(join(dir,f.name),join(relative,f.name));else if(f.name==='index.html'){const body=await readFile(join(dir,f.name),'utf8'),target='/singapore-primary-maths/'+(relative?relative.replaceAll('\\','/')+'/':'');if(!body.includes(`location.replace(${JSON.stringify(target)}+location.search+location.hash)`))throw Error('Redirect loses a saved route: '+relative);if(!body.includes(`rel="canonical" href="https://soujanyaporia.github.io${target}"`))throw Error('Wrong redirect canonical');count++;}}}
await collect('dist');
await walk('dist-legacy');
for(const relative of expected){try{await readFile(join('dist-legacy',relative,'index.html'));}catch{throw Error('Missing redirect for: '+relative);}}
if(count!==expected.size)throw Error(`Expected ${expected.size} redirects, got ${count}`);
console.log(`URL migration audit: ${count} redirect pages preserve paths, searches and hash routes.`);

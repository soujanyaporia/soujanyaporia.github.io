import {readFile,readdir} from 'node:fs/promises';
import {join} from 'node:path';
let count=0;
async function walk(dir,relative=''){for(const f of await readdir(dir,{withFileTypes:true})){if(f.isDirectory())await walk(join(dir,f.name),join(relative,f.name));else if(f.name==='index.html'){const body=await readFile(join(dir,f.name),'utf8'),target='/singapore-primary-maths/'+(relative?relative.replaceAll('\\','/')+'/':'');if(!body.includes(`location.replace(${JSON.stringify(target)}+location.search+location.hash)`))throw Error('Redirect loses a saved route: '+relative);if(!body.includes(`rel="canonical" href="https://soujanyaporia.github.io${target}"`))throw Error('Wrong redirect canonical');count++;}}}
await walk('dist-legacy');if(count!==284)throw Error(`Expected 284 redirects, got ${count}`);console.log(`URL migration audit: ${count} redirect pages preserve paths, searches and hash routes.`);

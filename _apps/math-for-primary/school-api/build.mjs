import { build } from 'esbuild';
import { mkdir, cp, rm } from 'node:fs/promises';
await rm('dist',{recursive:true,force:true});
await mkdir('dist/.openai',{recursive:true});
await build({entryPoints:['worker.ts'],bundle:true,outfile:'dist/server/index.js',format:'esm',platform:'browser',target:'es2022',minify:true});
await cp('.openai/hosting.json','dist/.openai/hosting.json');
await cp('drizzle','dist/.openai/drizzle',{recursive:true});

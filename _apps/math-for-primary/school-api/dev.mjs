import { createServer } from 'node:http';
import worker from './dist/server/index.js';
import { localDb } from './local-db.mjs';
const env={DB:localDb('dev.sqlite'),BOOTSTRAP_SECRET:process.env.BOOTSTRAP_SECRET};
createServer(async(req,res)=>{const chunks=[];for await(const c of req)chunks.push(c);const body=Buffer.concat(chunks);const r=await worker.fetch(new Request('http://localhost:8788'+req.url,{method:req.method,headers:req.headers,...(body.length?{body,duplex:'half'}:{})}),env);res.writeHead(r.status,Object.fromEntries(r.headers));res.end(Buffer.from(await r.arrayBuffer()));}).listen(8788,'127.0.0.1',()=>console.log('School API on http://localhost:8788'));

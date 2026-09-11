import { DatabaseSync } from 'node:sqlite';
import { readFileSync,readdirSync } from 'node:fs';
export function localDb(file=':memory:'){
 const db=new DatabaseSync(file);db.exec('PRAGMA foreign_keys = ON');
 db.exec('CREATE TABLE IF NOT EXISTS _migrations(name TEXT PRIMARY KEY)');
 for(const name of readdirSync(new URL('./drizzle/',import.meta.url)).filter(n=>n.endsWith('.sql')).sort())if(!db.prepare('SELECT name FROM _migrations WHERE name=?').get(name)){db.exec(readFileSync(new URL('./drizzle/'+name,import.meta.url),'utf8'));db.prepare('INSERT INTO _migrations VALUES(?)').run(name);}
 const statement=(sql,args=[])=>({bind:(...xs)=>statement(sql,xs),first:async()=>db.prepare(sql).get(...args)||null,all:async()=>({results:db.prepare(sql).all(...args)}),run:async()=>({meta:{changes:Number(db.prepare(sql).run(...args).changes)}})});
 return {prepare:statement,batch:async ss=>{db.exec('BEGIN IMMEDIATE');try{const out=[];for(const s of ss)out.push(await s.run());db.exec('COMMIT');return out;}catch(e){db.exec('ROLLBACK');throw e;}},close:()=>db.close()};
}

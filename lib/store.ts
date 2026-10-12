import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { seed } from './seed';
import type { Store } from './model';
const file = process.env.HR_DATA_FILE || path.join(process.cwd(),'data','workforce.json');
const globalStore=globalThis as typeof globalThis & {hrQueue?:Promise<unknown>};
async function load():Promise<Store> {
 try { return JSON.parse(await readFile(file,'utf8')); }
 catch(error) { if((error as NodeJS.ErrnoException).code==='ENOENT') return seed(); throw error; }
}
// Serialize all reads/writes within the single local Node process. Atomic rename
// prevents partial files; this deliberately is not a distributed database.
function exclusive<T>(fn:()=>Promise<T>):Promise<T> {
 const next=(globalStore.hrQueue||Promise.resolve()).then(fn,fn);
 globalStore.hrQueue=next.catch(()=>undefined);
 return next;
}
export const readStore=()=>exclusive(load);
export function mutateStore<T>(fn:(store:Store)=>T):Promise<{store:Store;result:T}> {
 return exclusive(async()=> {
  const store=await load();
  const result=fn(store);
  store.revision++;
  await mkdir(path.dirname(file),{recursive:true});
  const tmp=`${file}.${process.pid}.tmp`;
  await writeFile(tmp,JSON.stringify(store,null,2),'utf8');
  await rename(tmp,file);
  return {store,result};
 });
}

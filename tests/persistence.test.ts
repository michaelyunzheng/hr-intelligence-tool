import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { applyAction } from '../lib/actions';
test('atomic persistence survives reads and serialises competing revisions',async()=>{
 const dir=await mkdtemp(path.join(tmpdir(),'forma-test-'));
 process.env.HR_DATA_FILE=path.join(dir,'workforce.json');
 try{
  const {readStore,mutateStore}=await import('../lib/store');
  const s=await readStore();
  const command={action:'validate' as const,revision:s.revision,employeeId:'emp-1',skillId:'sql',status:'verified' as const,level:5,actor:'Manager' as const};
  const results=await Promise.allSettled([mutateStore(s=>applyAction(s,command)),mutateStore(s=>applyAction(s,command))]);
  assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
  const saved=await readStore();assert.equal(saved.revision,1);assert.equal(saved.employees[0].skills[0].level,5);
  const disk=JSON.parse(await readFile(process.env.HR_DATA_FILE,'utf8'));assert.equal(disk.validations.length,1);
 }finally{await rm(dir,{recursive:true,force:true})}
});

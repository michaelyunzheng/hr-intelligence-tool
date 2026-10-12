import { test } from 'node:test';
import assert from 'node:assert/strict';
import { seed } from '../lib/seed';
import { runInference, matchRole, planning, rulesEngine } from '../lib/intelligence';
import { applyAction } from '../lib/actions';
import { importCSV } from '../lib/import';

test('inference, validation, matching and planning form one workflow',()=>{
 const s=seed(), e=s.employees[0], role=s.roles.find(r=>r.id==='ai')!;
 const initial=matchRole(e,role).score;
 runInference(s,e.id);
 const ml=e.skills.find(k=>k.skillId==='ml')!;
 assert.equal(ml.status,'inferred');assert.deepEqual(ml.evidenceIds,['alex-ai']);
 assert.ok(matchRole(e,role).score>initial);
 const before=planning(s,'Data & AI',35,true).find(k=>k.id==='ml')!.supply;
 applyAction(s,{action:'validate',revision:0,employeeId:e.id,skillId:'ml',status:'verified',level:4,actor:'Manager'});
 assert.equal(planning(s,'Data & AI',35,true).find(k=>k.id==='ml')!.supply,before+1);
 runInference(s,e.id);assert.equal(ml.level,4);assert.equal(ml.status,'verified');
 applyAction(s,{action:'validate',revision:0,employeeId:e.id,skillId:'ml',status:'rejected',level:4,actor:'Employee'});
 runInference(s,e.id);assert.equal(ml.status,'rejected');assert.equal(matchRole(e,role).gaps.find(g=>g.skillId==='ml')!.current,0);
 assert.equal(s.validations.length,2);
});
test('inference is deterministic, evidence decays and absent evidence gives no skills',()=>{
 const s=seed(),e=s.employees[0],now=new Date('2026-10-12');
 assert.deepEqual(rulesEngine.infer(e,s,now),rulesEngine.infer(e,s,now));
 const older=structuredClone(e);older.evidence.forEach(v=>v.date='2020-01-01');
 assert.ok(rulesEngine.infer(older,s,now)[0].confidence<rulesEngine.infer(e,s,now)[0].confidence);
 assert.deepEqual(rulesEngine.infer({...e,evidence:[]},s,now),[]);
});
test('imports reject invalid references, duplicates and malformed rows atomically',()=>{
 const s=seed(),original=structuredClone(s);
 const bad=importCSV(s,'employees','id,name,department,roleId,location\nx,Test Person,Data,missing,Sydney');
 assert.match(bad.errors.join(),/unknown role/);assert.deepEqual(s,original);
 const good=importCSV(s,'employees','id,name,department,roleId,location\nx,"Test, Person",Data,analyst,Sydney');
 assert.equal(good.errors.length,0);assert.equal(good.candidate.employees.at(-1)!.name,'Test, Person');
 assert.ok(importCSV(good.candidate,'employees','id,name,department,roleId,location\nx,Test,Data,analyst,Sydney').errors.length);
 assert.ok(importCSV(s,'employees','id,name\nx,Test').errors.length);
});
test('stale writes fail, scenarios persist assumptions and demand responds to growth',()=>{
 const s=seed();assert.throws(()=>applyAction(s,{action:'infer',revision:2,employeeId:'emp-1'}),/another session/);
 applyAction(s,{action:'scenario',revision:0,name:'AI growth',category:'Data & AI',growth:50,verifiedOnly:true});
 assert.equal(s.scenarios[0].growth,50);
 const base=planning(s,'Data & AI',0),future=planning(s,'Data & AI',50);
 assert.ok(future.find(k=>k.id==='ml')!.demand>base.find(k=>k.id==='ml')!.demand);
 assert.equal(future.find(k=>k.id==='security')!.demand,base.find(k=>k.id==='security')!.demand);
});

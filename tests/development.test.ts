import {test} from 'node:test';
import assert from 'node:assert/strict';
import {seed} from '../lib/seed';
import {actionSchema,applyAction} from '../lib/actions';
import {planning,runInference,matchRole} from '../lib/intelligence';
import {projectedEmployee} from '../lib/development';
const future='2099-01-01';

test('development is conditional, persistent, deduplicated and reversible',()=>{
 const s=seed(),e=s.employees[0];runInference(s,e.id);
 const original=structuredClone(e);
 const action={action:'plan' as const,revision:0,employeeId:e.id,skillId:'ml',targetLevel:4,owner:'Demo manager',dueDate:future};
 const before=planning(s,'Data & AI',35,true).find(s=>s.id==='ml')!;
 applyAction(s,action);
 assert.deepEqual(e,original,'planning never edits employee skills');
 assert.throws(()=>applyAction(s,action),/already exists/);
 const projected=planning(s,'Data & AI',35,true,s.employees.map(e=>projectedEmployee(s,e))).find(s=>s.id==='ml')!;
 assert.equal(projected.supply,before.supply+1);assert.equal(projected.gap,before.gap-1);
 const role=s.roles.find(r=>r.id==='ai')!;
 assert.ok(matchRole(projectedEmployee(s,e),role,true).score>matchRole(e,role,true).score);
 applyAction(s,{action:'cancel-plan',revision:0,planId:s.developmentPlans![0].id});
 assert.deepEqual(projectedEmployee(s,e),e);
});
test('achieved plans do not double count verified supply or downgrade verified capability',()=>{
 const s=seed(),e=s.employees[0];runInference(s,e.id);
 applyAction(s,{action:'plan',revision:0,employeeId:e.id,skillId:'ml',targetLevel:3,owner:'Manager',dueDate:future});
 applyAction(s,{action:'validate',revision:0,employeeId:e.id,skillId:'ml',level:5,status:'verified',actor:'Manager'});
 assert.equal(projectedEmployee(s,e).skills.find(s=>s.skillId==='ml')!.level,5);
 const actual=planning(s,'Data & AI',35,true);
 const projected=planning(s,'Data & AI',35,true,s.employees.map(e=>projectedEmployee(s,e)));
 assert.equal(actual.find(s=>s.id==='ml')!.supply,projected.find(s=>s.id==='ml')!.supply);
});
test('evidence enables inference for an imported employee and validates input',()=>{
 const s=seed();s.employees.push({id:'new',name:'Demo Person',department:'Data',roleId:'analyst',location:'Sydney',skills:[],evidence:[]});
 const action={action:'evidence' as const,revision:0,employeeId:'new',type:'training' as const,title:'AI evaluation lab',text:'Completed LLM model evaluation exercises with governance review.',date:'2026-10-01'};
 applyAction(s,action);runInference(s,'new');
 assert.ok(s.employees.at(-1)!.skills.some(s=>s.skillId==='ml'));
 assert.throws(()=>applyAction(s,action),/already exists/);
 assert.throws(()=>applyAction(s,{...action,date:future}),/future/);
 assert.equal(actionSchema.safeParse({...action,date:'2026-02-30'}).success,false);
 assert.throws(()=>applyAction(s,{action:'plan',revision:0,employeeId:'new',skillId:'ml',targetLevel:1,owner:'Manager',dueDate:future}),/above the current/);
});

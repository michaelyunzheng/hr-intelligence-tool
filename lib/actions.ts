import { z } from 'zod';
import type { Store } from './model';
import { runInference } from './intelligence';
import { importCSV } from './import';
const base={revision:z.number().int().nonnegative()};
export const actionSchema=z.discriminatedUnion('action',[
 z.object({...base,action:z.literal('infer'),employeeId:z.string()}),
 z.object({...base,action:z.literal('validate'),employeeId:z.string(),skillId:z.string(),status:z.enum(['verified','rejected']),level:z.number().int().min(1).max(5),actor:z.enum(['Employee','Manager'])}),
 z.object({...base,action:z.literal('scenario'),name:z.string().trim().min(1).max(80),category:z.enum(['Data & AI','Engineering','Business','People']),growth:z.number().int().min(0).max(100),verifiedOnly:z.boolean()}),
 z.object({...base,action:z.literal('import'),kind:z.enum(['employees','roles','skills']),csv:z.string().max(200000),preview:z.boolean()}),
]);
export class ActionError extends Error { constructor(message:string,public status=400){super(message);} }
export function applyAction(store:Store,action:z.infer<typeof actionSchema>) {
 if(action.revision!==store.revision) throw new ActionError('The workforce changed in another session. Refresh data and try again.',409);
 if(action.action==='infer') {const count=runInference(store,action.employeeId);return `${count} evidence-backed skills evaluated. Human decisions preserved.`;}
 if(action.action==='validate') {
  const e=store.employees.find(e=>e.id===action.employeeId);
  const s=e?.skills.find(s=>s.skillId===action.skillId);
  if(!e||!s) throw new ActionError('Employee skill not found.',404);
  s.status=action.status; s.level=action.level; s.updatedAt=new Date().toISOString();
  store.validations.push({id:crypto.randomUUID(),employeeId:e.id,skillId:s.skillId,action:action.status,level:action.level,actor:action.actor,date:s.updatedAt});
  return `Skill ${action.status}. Matching and workforce planning recalculated.`;
 }
 if(action.action==='scenario') {
  store.scenarios.unshift({id:crypto.randomUUID(),name:action.name,category:action.category,growth:action.growth,verifiedOnly:action.verifiedOnly,createdAt:new Date().toISOString()});
  return 'Scenario saved. Reopen it to apply its assumptions to the current workforce.';
 }
 const report=importCSV(store,action.kind,action.csv);
 if(report.errors.length) throw new ActionError(report.errors.slice(0,12).join('\n'));
 if(!action.preview) Object.assign(store,report.candidate);
 return `${report.count} ${action.kind} ${action.preview?'validated and ready to import':'imported'}.`;
}

import { z } from 'zod';
import type { Store } from './model';
import { runInference } from './intelligence';
import { importCSV } from './import';
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(value => { const parsed = new Date(value); return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0,10) === value; }, 'Use a valid calendar date.');
const base={revision:z.number().int().nonnegative()};
export const actionSchema=z.discriminatedUnion('action',[
 z.object({...base,action:z.literal('infer'),employeeId:z.string()}),
 z.object({...base,action:z.literal('accept-proposal'),reportId:z.string(),skillId:z.string()}),
 z.object({...base,action:z.literal('evidence'),employeeId:z.string(),title:z.string().trim().min(3).max(120),text:z.string().trim().min(20).max(3000),type:z.enum(['project','training','history']),date}),
 z.object({...base,action:z.literal('plan'),employeeId:z.string(),skillId:z.string(),targetLevel:z.number().int().min(1).max(5),owner:z.string().trim().min(2).max(100),dueDate:date}),
 z.object({...base,action:z.literal('cancel-plan'),planId:z.string()}),
 z.object({...base,action:z.literal('validate'),employeeId:z.string(),skillId:z.string(),status:z.enum(['verified','rejected']),level:z.number().int().min(1).max(5),actor:z.enum(['Employee','Manager'])}),
 z.object({...base,action:z.literal('scenario'),name:z.string().trim().min(1).max(80),category:z.enum(['Data & AI','Engineering','Business','People']),growth:z.number().int().min(0).max(100),verifiedOnly:z.boolean()}),
 z.object({...base,action:z.literal('import'),kind:z.enum(['employees','roles','skills']),csv:z.string().max(200000),preview:z.boolean()}),
]);
export class ActionError extends Error { constructor(message:string,public status=400){super(message);} }
export function applyAction(store:Store,action:z.infer<typeof actionSchema>) {
 if(action.revision!==store.revision) throw new ActionError('The workforce changed in another session. Refresh data and try again.',409);
 if(action.action==='accept-proposal') {
  const report=store.intelligenceReports?.find(r=>r.id===action.reportId);
  if(!report||report.mode!=='skills') throw new ActionError('Skill report not found.',404);
  if(store.revision!==report.sourceRevision+1) throw new ActionError('This report is stale. Generate a fresh review before accepting a proposal.',409);
  const employee=store.employees.find(e=>e.id===report.employeeId);
  const proposal=report.proposals.find(p=>p.skillId===action.skillId);
  if(!employee||!proposal) throw new ActionError('Proposal not found.',404);
  const existing=employee.skills.find(s=>s.skillId===proposal.skillId);
  if(existing&&existing.status!=='inferred') throw new ActionError('A human decision already exists. Review it directly in the capability profile.');
  const skill={skillId:proposal.skillId,level:proposal.level,confidence:proposal.confidence,evidenceIds:proposal.evidenceIds,rationale:proposal.rationale,source:report.provider,model:report.model,status:'inferred' as const,updatedAt:new Date().toISOString()};
  if(existing)Object.assign(existing,skill);else employee.skills.push(skill);
  return 'Proposal added as inferred. Review and verify it in the capability profile.';
 }
 if(action.action==='infer') {if(!store.employees.some(e=>e.id===action.employeeId)) throw new ActionError('Employee not found.',404); const count=runInference(store,action.employeeId);return `${count} evidence-backed skills evaluated. Human decisions preserved.`;}
 if(action.action==='evidence') {
  const employee=store.employees.find(e=>e.id===action.employeeId);
  if(!employee) throw new ActionError('Employee not found.',404);
  if(action.date>new Date().toISOString().slice(0,10)) throw new ActionError('Evidence cannot be dated in the future.');
  if(employee.evidence.some(e=>e.title===action.title&&e.text===action.text&&e.date===action.date)) throw new ActionError('This evidence record already exists.');
  employee.evidence.push({id:crypto.randomUUID(),title:action.title,text:action.text,type:action.type,date:action.date});
  return 'Evidence saved. Preview and run inference to update the skill profile.';
 }
 if(action.action==='plan') {
  const employee=store.employees.find(e=>e.id===action.employeeId);
  if(!employee||!store.skills.some(s=>s.id===action.skillId)) throw new ActionError('Employee or skill not found.',404);
  const current=employee.skills.find(s=>s.skillId===action.skillId&&s.status!=='rejected')?.level||0;
  if(action.targetLevel<=current) throw new ActionError('Choose a target above the current skill level.');
  if(action.dueDate<new Date().toISOString().slice(0,10)) throw new ActionError('The development deadline cannot be in the past.');
  const plans=store.developmentPlans??=[];
  if(plans.some(p=>p.employeeId===action.employeeId&&p.skillId===action.skillId&&p.status==='planned')) throw new ActionError('An active development plan already exists for this person and skill. Cancel it before replacing it.');
  plans.push({id:crypto.randomUUID(),employeeId:action.employeeId,skillId:action.skillId,targetLevel:action.targetLevel,owner:action.owner,dueDate:action.dueDate,status:'planned',createdAt:new Date().toISOString()});
  return 'Development commitment saved. Projected supply updated; current skills are unchanged.';
 }
 if(action.action==='cancel-plan') {
  const plan=store.developmentPlans?.find(p=>p.id===action.planId);
  if(!plan) throw new ActionError('Development plan not found.',404);
  plan.status='cancelled';return 'Commitment cancelled. Projected supply recalculated.';
 }
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

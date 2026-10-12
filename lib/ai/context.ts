import type { Store } from '../model';
import { matchRole, planning, rulesEngine } from '../intelligence';
import { projectedEmployee } from '../development';
import type { IntelligenceRequest, IntelligenceOutput } from './contracts';

export function buildContext(store:Store, request:IntelligenceRequest) {
 const employee=store.employees.find(e=>e.id===request.employeeId);
 const role=store.roles.find(r=>r.id===request.roleId);
 if((request.mode==='skills'||request.mode==='career')&&!employee) throw Error('Select an employee.');
 if((request.mode==='career'||request.mode==='work')&&!role) throw Error('Select a role.');
 const people=store.employees.filter(e=>(request.department==='All departments'||e.department===request.department)&&(request.roleFilter==='All roles'||e.roleId===request.roleFilter));
 const supply=planning(store,request.category,request.growth,request.verifiedOnly,people).filter(s=>request.skillCategory==='All categories'||s.category===request.skillCategory);
 const projected=planning(store,request.category,request.growth,true,people.map(e=>projectedEmployee(store,e)));
 const sources:{id:string;label:string}[]=[];
 let data:unknown;
 if(request.mode==='skills') {
  sources.push(...employee!.evidence.map(e=>({id:e.id,label:e.title})));
  data={employeeId:employee!.id,evidence:employee!.evidence,existingSkills:employee!.skills,ontology:store.skills};
 } else if(request.mode==='career') {
  sources.push({id:'match',label:`Calculated alignment with ${role!.name}`},...employee!.evidence.map(e=>({id:e.id,label:e.title})));
  data={employeeId:employee!.id,role,match:matchRole(employee!,role!,request.verifiedOnly),evidence:employee!.evidence,skills:employee!.skills,ontology:store.skills,commitments:store.developmentPlans?.filter(p=>p.employeeId===employee!.id)};
 } else if(request.mode==='work') {
  sources.push(...role!.tasks.map((t,i)=>({id:`task-${i}`,label:t.name})));
  data={role,count:people.filter(e=>e.roleId===role!.id).length,taskSources:sources};
 } else {
  sources.push(...supply.map(s=>({id:s.id,label:`${s.name}: supply ${s.supply}, demand ${s.demand}, gap ${s.gap}`})));
  data={filters:request,peopleCount:people.length,supply,projectedVerifiedSupply:projected,units:'skill-person units, not headcount',projectionAssumption:'all active commitments succeed, no capacity reservation'};
 }
 return {employee,role,sources,data,supply,contextLabel:request.mode==='planning'?`${request.department} · ${request.roleFilter} · ${request.category} +${request.growth}% · ${request.verifiedOnly?'verified':'all evidenced'} supply`:request.mode==='work'?role!.name:request.mode==='career'?`${employee!.name} → ${role!.name}`:employee!.name};
}
export function fallbackReport(store:Store,request:IntelligenceRequest):IntelligenceOutput {
 const c=buildContext(store,request);
 if(request.mode==='skills') return {
  summary:'Rule-based evidence review. These proposals use transparent keyword scoring, not a language model.',
  findings:[],actions:[],proposals:rulesEngine.infer(c.employee!,store).filter(p=>!c.employee!.skills.some(s=>s.skillId===p.skillId&&s.status!=='inferred')).slice(0,20).map(p=>({...p,rationale:'Ontology keywords appear in the cited evidence. Review demonstrated proficiency before accepting.'})),limitations:['Keyword presence does not establish mastery. Confidence is an uncalibrated heuristic.'],
 };
 if(request.mode==='career') {
  const match=matchRole(c.employee!,c.role!,request.verifiedOnly);
  return {summary:`${match.score}% weighted alignment with ${c.role!.name}. Focus on demonstrated skill gaps before considering a move.`,findings:[{title:'Current role alignment',detail:`${match.gaps.filter(g=>g.gap===0).length} of ${match.gaps.length} requirements met.`,sourceIds:['match']}],actions:match.gaps.filter(g=>g.gap>0).slice(0,6).map(g=>({title:`Develop ${store.skills.find(s=>s.id===g.skillId)!.name}`,detail:store.skills.find(s=>s.id===g.skillId)!.learning,successMeasure:`Demonstrate level ${g.level}/5 through workplace evidence and manager review.`})),proposals:[],limitations:['Alignment is a development signal, not an employment decision.']};
 }
 if(request.mode==='work') return {summary:`Pilot supervised AI within ${c.role!.name}; retain accountability for quality and judgement.`,findings:c.role!.tasks.slice(0,8).map((t,i)=>({title:t.name,detail:`${t.share}% synthetic task share; illustrative ${t.impact.toLowerCase()} hypothesis.`,sourceIds:[`task-${i}`]})),actions:[{title:'Run a bounded pilot',detail:'Compare a baseline week with a supervised trial. Track review effort and error rates, not only generation speed.',successMeasure:'Net time saved after review overhead with no decline in agreed quality measures.'}],proposals:[],limitations:['Task shares and impact are illustrative, not validated productivity forecasts.']};
 return {summary:'Prioritise the largest capability shortfalls and validate internal development capacity before funding external hiring.',findings:c.supply.filter(s=>s.gap>0).sort((a,b)=>b.gap-a.gap).slice(0,8).map(s=>({title:s.name,detail:`Supply ${s.supply}; scenario demand ${s.demand}; gap ${s.gap}. ${s.developing} people have early capability.`,sourceIds:[s.id]})),actions:[{title:'Fund a measurable development cohort',detail:'Use Find people to develop to assign accountable owners and dates. Review conditional supply separately from verified skills.',successMeasure:'New workplace evidence and verified proficiency at level 3+ for each funded capability.'}],proposals:[],limitations:['Gaps are skill-person units and cannot be summed into hiring headcount. Plans do not reserve capacity.']};
}
export function validateGrounding(output:IntelligenceOutput,store:Store,request:IntelligenceRequest) {
 const c=buildContext(store,request),allowed=new Set(c.sources.map(s=>s.id));
 if(output.findings.some(f=>f.sourceIds.some(id=>!allowed.has(id))))throw Error('The model cited an unknown source. Please retry.');
 if(request.mode!=='skills'&&output.proposals.length)throw Error('Unexpected skill proposals in this report.');
 const seen=new Set<string>();
 for(const p of output.proposals){
  if(seen.has(p.skillId)||!store.skills.some(s=>s.id===p.skillId)||p.evidenceIds.some(id=>!c.employee?.evidence.some(e=>e.id===id)))throw Error('The model returned invalid or duplicate skill references. Please retry.');
  seen.add(p.skillId);
 }
 return output;
}

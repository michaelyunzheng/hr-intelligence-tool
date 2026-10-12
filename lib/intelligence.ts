import { type Employee, type EmployeeSkill, type Role, type Store, type Category } from './model';
export interface InferenceEngine { infer(employee:Employee, store:Store, now?:Date):EmployeeSkill[] }
// Replace this adapter with a model-backed implementation without changing consumers.
export const rulesEngine: InferenceEngine = {
 infer(employee,store,now=new Date()) {
  return store.skills.flatMap(skill=> {
   const evidence=employee.evidence.filter(e=>skill.keywords.some(k=>new RegExp(`\\b${k.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}\\b`,'i').test(e.text)));
   if(!evidence.length) return [];
   const score=evidence.reduce((total,e)=>{
    const age=Math.max(0,(now.getTime()-new Date(e.date).getTime())/86400000);
    return total+({project:.5,training:.3,history:.35}[e.type])*(age>365?.65:1);
   },0);
   return [{skillId:skill.id,level:Math.min(5,Math.max(1,Math.ceil(score*4))),confidence:Math.min(.95,Number((.35+score*.45).toFixed(2))),status:'inferred' as const,evidenceIds:evidence.map(e=>e.id),updatedAt:now.toISOString()}];
  });
 }
};
export function runInference(store:Store,employeeId:string) {
 const e=store.employees.find(e=>e.id===employeeId);
 if(!e) throw new Error('Employee not found.');
 const inferred=rulesEngine.infer(e,store);
 for(const skill of inferred) {
  const existing=e.skills.find(s=>s.skillId===skill.skillId);
  // Human decisions survive every inference run, including explicit rejection.
  if(existing && existing.status!=='inferred') continue;
  if(existing) Object.assign(existing,skill); else e.skills.push(skill);
 }
 return inferred.length;
}
export function matchRole(employee:Employee,role:Role,verifiedOnly=false) {
 const gaps=role.requirements.map(req=>{
  const skill=employee.skills.find(s=>s.skillId===req.skillId&&s.status!=='rejected'&&(!verifiedOnly||s.status==='verified'));
  const current=skill?.level||0;
  return {...req,current,gap:Math.max(0,req.level-current),status:skill?.status||'missing'};
 });
 const total=gaps.reduce((n,g)=>n+g.weight,0);
 const score=total?Math.round(100*gaps.reduce((n,g)=>n+Math.min(1,g.current/g.level)*g.weight,0)/total):0;
 return {score,gaps};
}
export function skillSupply(store:Store,skillId:string,verifiedOnly=false,employees=store.employees) {
 return employees.filter(e=>e.skills.some(s=>s.skillId===skillId&&s.level>=3&&s.status!=='rejected'&&(!verifiedOnly||s.status==='verified'))).length;
}
export function planning(store:Store,category:Category,growth:number,verifiedOnly=false,employees=store.employees) {
 return store.skills.map(skill=> {
  const baseline=employees.filter(e=>store.roles.find(r=>r.id===e.roleId)?.requirements.some(q=>q.skillId===skill.id&&q.level>=3)).length;
  const demand=Math.ceil(baseline*(skill.category===category?1+growth/100:1));
  const supply=skillSupply(store,skill.id,verifiedOnly,employees);
  const gap=Math.max(0,demand-supply);
  const developing=employees.filter(e=>e.skills.some(s=>s.skillId===skill.id&&s.level>0&&s.level<3&&s.status!=='rejected'&&(!verifiedOnly||s.status==='verified'))).length;
  const redeploy=employees.filter(e=>e.skills.some(s=>s.skillId===skill.id&&s.level>=3&&s.status!=='rejected'&&(!verifiedOnly||s.status==='verified'))&&!store.roles.find(r=>r.id===e.roleId)?.requirements.some(q=>q.skillId===skill.id&&q.level>=3)).length;
  return {id:skill.id,name:skill.name,category:skill.category,baseline,demand,supply,gap,developing,redeploy,action:gap?(developing?'Upskill':'Hire'):redeploy?'Redeploy':'Maintain'};
 });
}
export function overview(store:Store,employees=store.employees,category='All categories') {
 const rows=employees.map(e=>{const role=store.roles.find(r=>r.id===e.roleId)!;return matchRole(e,{...role,requirements:role.requirements.filter(q=>category==='All categories'||store.skills.find(s=>s.id===q.skillId)?.category===category)});}).filter(m=>m.gaps.length);
 const relevant=employees.flatMap(e=>e.skills).filter(s=>s.status!=='rejected'&&(category==='All categories'||store.skills.find(k=>k.id===s.skillId)?.category===category));
 return {coverage:rows.length?Math.round(rows.reduce((n,m)=>n+m.score,0)/rows.length):0,gaps:rows.reduce((n,m)=>n+m.gaps.filter(g=>g.gap>0).length,0),verified:relevant.length?Math.round(relevant.filter(s=>s.status==='verified').length/relevant.length*100):0,pending:relevant.filter(s=>s.status==='inferred').length};
}

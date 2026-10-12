'use client';
import { useState } from 'react';
import type { Employee, Store } from '@/lib/model';
import { levels } from '@/lib/model';
import { matchRole } from '@/lib/intelligence';
import { projectedEmployee } from '@/lib/development';
import type { RunAction } from './evidence-workbench';

export function PlanButton({store,employee,skillId,targetLevel,busy,act}:{store:Store;employee:Employee;skillId:string;targetLevel:number;busy:boolean;act:RunAction}) {
 const [open,setOpen]=useState(false),[owner,setOwner]=useState('Demo manager'),[dueDate,setDueDate]=useState(()=>new Date(Date.now()+90*86400000).toISOString().slice(0,10));
 const plan=store.developmentPlans?.find(p=>p.employeeId===employee.id&&p.skillId===skillId&&p.status==='planned');
 if(plan) return <span className="badge green">Planned · level {plan.targetLevel} by {plan.dueDate}</span>;
 return <div className="plan-editor"><button onClick={()=>setOpen(!open)}>{open?'Close':'Plan development'}</button>{open&&<form onSubmit={async e=>{e.preventDefault();if(await act({action:'plan',employeeId:employee.id,skillId,targetLevel,owner,dueDate}))setOpen(false)}}><p>{employee.name} → {levels[targetLevel]} ({targetLevel}/5). This creates a projection; it does not change current skills.</p><label>Accountable owner<input required minLength={2} maxLength={100} value={owner} onChange={e=>setOwner(e.target.value)}/></label><label>Target date<input required type="date" min={new Date().toISOString().slice(0,10)} value={dueDate} onChange={e=>setDueDate(e.target.value)}/></label><button className="primary" disabled={busy}>Save commitment</button></form>}</div>
}
export default function DevelopmentPanel({store,employee,roleId,busy,act}:{store:Store;employee?:Employee;roleId?:string;busy:boolean;act:RunAction}) {
 const plans=(store.developmentPlans??[]).filter(p=>p.status==='planned'&&(!employee||p.employeeId===employee.id));
 const role=store.roles.find(r=>r.id===roleId);
 const current=employee&&role?matchRole(employee,role,true).score:null;
 const projected=employee&&role?matchRole(projectedEmployee(store,employee),role,true).score:null;
 return <section className="panel"><div className="panel-title"><div><h2>Development commitments</h2><p>Named owners, target dates and explicit assumptions.</p></div>{current!==null&&<div className="projection-score">{current}% <span>→</span> {projected}%<small>Verified alignment → if plans succeed</small></div>}</div>{plans.length===0?<p className="empty">No commitments yet. Choose “Plan development” on a skill gap to turn an insight into an action.</p>:plans.map(p=>{const person=store.employees.find(e=>e.id===p.employeeId)!;const skill=store.skills.find(s=>s.id===p.skillId)!;const actual=person.skills.find(s=>s.skillId===p.skillId&&s.status==='verified')?.level??0;return <article className="commitment" key={p.id}><div><strong>{person.name} · {skill.name}</strong><p>{skill.learning}</p><small>Owner: {p.owner} · Target: {p.dueDate} · Goal: {levels[p.targetLevel]} ({p.targetLevel}/5)</small><span className={`badge ${actual>=p.targetLevel?'green':''}`}>{actual>=p.targetLevel?'Target now verified':p.dueDate<new Date().toISOString().slice(0,10)?'Overdue · review commitment':'Planned · awaiting evidence and validation'}</span></div><button disabled={busy} onClick={()=>act({action:'cancel-plan',planId:p.id})}>Cancel commitment</button></article>})}<p className="method">Completion is established through new workplace evidence and human validation in Skills intelligence. Saving a plan never marks a capability as acquired.</p></section>
}

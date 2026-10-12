'use client';
import { useState } from 'react';
import type { Role } from '@/lib/model';
export default function WorkSimulator({role,count}:{role:Role;count:number}) {
 const [adoption,setAdoption]=useState(50);
 const automatable=role.tasks.filter(t=>t.impact==='Automate').reduce((n,t)=>n+t.share,0);
 const hours=40*automatable/100*adoption/100;
 return <section className="panel work-simulator"><div className="panel-title"><div><h2>Test a role redesign hypothesis</h2><p>What if supervised AI handled part of the routine work?</p></div><span className="badge">Illustrative · no productivity guarantee</span></div><label>Adoption within tasks labelled “Automate”: <strong>{adoption}%</strong><input aria-label="AI task adoption" type="range" min={0} max={100} step={10} value={adoption} onChange={e=>setAdoption(Number(e.target.value))}/></label><div className="impact-strip"><div><small>Routine task share</small><strong>{automatable}%</strong></div><div><small>Potential hours / person / week</small><strong>{hours.toFixed(1)}</strong></div><div><small>Across {count} people in this role</small><strong>{(hours*count).toFixed(1)} h</strong></div></div><p>Reinvest potential capacity in supervised practice, reviewing AI outputs and higher-judgement work. Start with a small pilot and measure quality and time saved.</p><p className="method">Assumes 40 hours per week × synthetic routine task share × adoption. Excludes implementation effort, review overhead and overlap. This does not change skill supply, staffing levels or workforce demand.</p></section>
}

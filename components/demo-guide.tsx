import type { Store } from '@/lib/model';
import { ArrowRight, CheckCircle2 } from 'lucide-react';

type Props = {store: Store; onNavigate: (page: string) => void};
export default function DemoGuide({store,onNavigate}: Props) {
 const alex=store.employees.find(e=>e.id==='emp-1');
 if(!alex) return null;
 const ai=alex.skills.find(s=>s.skillId==='ml');
 const hasPlan=store.developmentPlans?.some(p=>p.employeeId===alex.id&&p.status==='planned');
 const steps=[
  {title:'Discover hidden skills',text:'Alex is a Data Analyst. A service intelligence pilot contains evidence of Applied AI.',page:'Skills intelligence',done:!!ai},
  {title:'Review the evidence',text:'Validate Applied AI at its evidenced level. Human judgement becomes a durable record.',page:'Skills intelligence',done:ai?.status==='verified'},
  {title:'Build a development path',text:'Compare Alex with AI Solutions Lead and assign a concrete learning commitment.',page:'Talent mobility',done:!!hasPlan},
  {title:'Measure the investment',text:'See current vs projected capability supply under increased AI demand.',page:'Workforce planning',done:false},
 ];
 return <section className="demo-guide"><div className="panel-title"><div><span className="eyebrow">5-MINUTE DECISION STORY</span><h2>Could our next AI lead already work here?</h2><p>Follow Alex from workplace evidence to a workforce investment decision.</p></div><span className="badge green">Live demo · saved progress</span></div><div className="demo-steps">{steps.map((s,i)=><button key={s.title} onClick={()=>onNavigate(s.page)}><span className="step-number">{s.done?<CheckCircle2 size={18}/>:String(i+1).padStart(2,'0')}</span><strong>{s.title}</strong><p>{s.text}</p><span className="step-link">{s.done?'Review':'Explore'} <ArrowRight size={13}/></span></button>)}</div></section>
}

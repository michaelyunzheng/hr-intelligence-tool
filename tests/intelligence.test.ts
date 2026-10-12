import { test } from 'node:test';
import assert from 'node:assert/strict';
import { seed } from '../lib/seed';
import { intelligenceRequest, intelligenceOutput, type IntelligenceReport } from '../lib/ai/contracts';
import { buildContext, fallbackReport, validateGrounding } from '../lib/ai/context';
import { generateOpenAI } from '../lib/ai/provider';
import { applyAction } from '../lib/actions';
const request=intelligenceRequest.parse({mode:'skills',employeeId:'emp-1',revision:0,provider:'rules'});

test('all four intelligence modes produce valid grounded fallback reports',()=>{
 const s=seed();
 for(const mode of ['skills','career','work','planning'] as const){
  const input={...request,mode,roleId:'ai'};
  const result=intelligenceOutput.parse(fallbackReport(s,input));
  assert.equal(validateGrounding(result,s,input),result);
 }
 const result=fallbackReport(s,request);
 assert.ok(result.proposals.some(p=>p.skillId==='ml'));
 assert.ok(!result.proposals.some(p=>p.skillId==='python'),'human verified skill excluded');
});
test('unknown citations, fabricated skills and repeated proposals are rejected',()=>{
 const s=seed(),result=fallbackReport(s,request);
 assert.throws(()=>validateGrounding({...result,findings:[{title:'Invented',detail:'Unknown',sourceIds:['invented']}]},s,request),/unknown source/);
 assert.throws(()=>validateGrounding({...result,proposals:[{...result.proposals[0],skillId:'invented'}]},s,request),/invalid/);
 assert.throws(()=>validateGrounding({...result,proposals:[result.proposals[0],result.proposals[0]]},s,request),/duplicate/);
});
test('accepting a report adds inferred provenance, preserves decisions and rejects stale reports',()=>{
 const s=seed();const c=buildContext(s,request);
 const report:IntelligenceReport={...fallbackReport(s,request),id:'report',mode:'skills',provider:'openai',model:'test',employeeId:'emp-1',sourceRevision:0,createdAt:new Date().toISOString(),sources:c.sources,contextLabel:c.contextLabel};
 s.intelligenceReports=[report];s.revision=1;
 applyAction(s,{action:'accept-proposal',revision:1,reportId:'report',skillId:'ml'});
 const skill=s.employees[0].skills.find(s=>s.skillId==='ml')!;
 assert.equal(skill.status,'inferred');assert.equal(skill.source,'openai');assert.equal(skill.model,'test');
 skill.status='verified';assert.throws(()=>applyAction(s,{action:'accept-proposal',revision:1,reportId:'report',skillId:'ml'}),/human decision/);
 s.revision=2;assert.throws(()=>applyAction(s,{action:'accept-proposal',revision:2,reportId:'report',skillId:'ml'}),/stale/);
});
test('planning context respects department, role, skill and verified filters',()=>{
 const s=seed(),input={...request,mode:'planning' as const,department:'Technology',roleFilter:'ai',skillCategory:'Data & AI',verifiedOnly:true};
 const c=buildContext(s,input);assert.ok(c.supply.every(x=>x.category==='Data & AI'));assert.equal(c.supply.find(x=>x.id==='ml')!.baseline,6);
 assert.equal(JSON.stringify(c.data).includes('Alex Morgan'),false);
});
test('Responses adapter handles structured success, errors, refusals and missing keys without leaking keys',async()=>{
 const previous=process.env.OPENAI_API_KEY;process.env.OPENAI_API_KEY='test-key-not-real';
 try{
  const output=fallbackReport(seed(),request);
  const mock:typeof fetch=async (_url,init)=>{
   const body=JSON.parse(String(init?.body));assert.equal(body.store,false);assert.equal(body.text.format.type,'json_schema');assert.equal(body.text.format.strict,true);assert.ok(init?.signal);
   return Response.json({status:'completed',output:[{type:'message',content:[{type:'output_text',text:JSON.stringify(output)}]}]});
  };
  assert.deepEqual((await generateOpenAI('skills',{},[],mock)).output,intelligenceOutput.parse(output));
  await assert.rejects(()=>generateOpenAI('skills',{},[],async()=>new Response('secret internal upstream error',{status:401})),/rejected the API key/);
  await assert.rejects(()=>generateOpenAI('skills',{},[],async()=>Response.json({status:'incomplete'})),/did not complete/);
  await assert.rejects(()=>generateOpenAI('skills',{},[],async()=>Response.json({status:'completed',output:[{content:[{type:'refusal'}]}]})),/declined/);
  await assert.rejects(()=>generateOpenAI('skills',{},[],async()=>Response.json({status:'completed',output:[{content:[{type:'output_text',text:'{}'}]}]})),/invalid report/);
  delete process.env.OPENAI_API_KEY;
  await assert.rejects(()=>generateOpenAI('skills',{},[],mock),/not configured/);
 }finally{if(previous===undefined)delete process.env.OPENAI_API_KEY;else process.env.OPENAI_API_KEY=previous;}
});

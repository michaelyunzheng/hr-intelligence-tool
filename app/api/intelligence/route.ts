import { connection } from 'next/server';
import { readStore,mutateStore } from '@/lib/store';
import { intelligenceRequest, intelligenceContextKey, type IntelligenceReport } from '@/lib/ai/contracts';
import { buildContext,fallbackReport,validateGrounding } from '@/lib/ai/context';
import { generateOpenAI,ProviderError } from '@/lib/ai/provider';
import { ActionError } from '@/lib/actions';
const runtimeState=globalThis as typeof globalThis & {intelligenceBusy?:boolean;intelligenceCalls?:number[]};
export async function GET(){await connection();return Response.json({configured:Boolean(process.env.OPENAI_API_KEY),model:process.env.OPENAI_MODEL||'gpt-4.1-mini'},{headers:{'Cache-Control':'no-store'}})}
export async function POST(request:Request){
 const origin=request.headers.get('origin');
 if(!origin)return Response.json({error:'A same-origin browser request is required.'},{status:403});
 try{const source=new URL(origin),url=new URL(request.url);if(source.host!==(request.headers.get('host')||url.host)||source.protocol!==url.protocol)throw Error();}catch{return Response.json({error:'Cross-origin requests are not allowed.'},{status:403})}
 if(runtimeState.intelligenceBusy)return Response.json({error:'An intelligence request is already running. Please wait.'},{status:429});
 runtimeState.intelligenceBusy=true;
 try{
  const text=await request.text();if(text.length>10000)throw new ActionError('Request too large.',413);
  const parsed=intelligenceRequest.safeParse(JSON.parse(text));if(!parsed.success)throw new ActionError('Invalid intelligence request.');
  const input=parsed.data,store=await readStore();
  if(input.revision!==store.revision)throw new ActionError('Workforce data changed. Refresh before generating a report.',409);
  const context=buildContext(store,input);
  if(JSON.stringify(context.data).length>60000)throw new ActionError('This evidence set is too large. Use a smaller synthetic profile.');
  let output,model='deterministic-rules';
  if(input.provider==='openai'){
   runtimeState.intelligenceCalls=(runtimeState.intelligenceCalls??[]).filter(t=>Date.now()-t<60000);
   if(runtimeState.intelligenceCalls.length>=6)throw new ActionError('Demo limit: six OpenAI requests per minute. Try again shortly.',429);
   runtimeState.intelligenceCalls.push(Date.now());
   const generated=await generateOpenAI(input.mode,context.data,context.sources);output=generated.output;model=generated.model;
  }else output=fallbackReport(store,input);
  validateGrounding(output,store,input);
  const report:IntelligenceReport={...output,id:crypto.randomUUID(),mode:input.mode,provider:input.provider,model,employeeId:input.employeeId,roleId:input.roleId,sourceRevision:store.revision,createdAt:new Date().toISOString(),sources:context.sources,contextLabel:context.contextLabel,contextKey:intelligenceContextKey(input)};
  const saved=await mutateStore(current=>{
   if(current.revision!==input.revision)throw new ActionError('Data changed while generating. The report was discarded; refresh and retry.',409);
   current.intelligenceReports=[report,...(current.intelligenceReports??[])].slice(0,40);return report;
  });
  return Response.json({store:saved.store,report});
 }catch(error){
  const status=error instanceof ActionError?error.status:error instanceof ProviderError?502:400;
  return Response.json({error:error instanceof Error?error.message:'Unable to generate intelligence.'},{status});
 }finally{runtimeState.intelligenceBusy=false;}
}

import { readStore, mutateStore } from '@/lib/store';
import { actionSchema, applyAction, ActionError } from '@/lib/actions';
import { connection } from 'next/server';
export async function GET() {
 await connection();
 try {return Response.json(await readStore(),{headers:{'Cache-Control':'no-store'}});}
 catch {return Response.json({error:'Unable to read workforce data. Check the local data file and server logs.'},{status:500});}
}
export async function POST(request:Request) {
 const origin=request.headers.get('origin');
 // Next's internal request URL can use localhost even when the browser uses
 // 127.0.0.1. Compare against the actual HTTP Host, not that internal URL.
 if(origin) {
  let allowed=false;
  try {
   const source=new URL(origin);
   allowed=source.host===(request.headers.get('host')||new URL(request.url).host)
    &&source.protocol===new URL(request.url).protocol;
  } catch { /* Malformed origins are rejected. */ }
  if(!allowed) return Response.json({error:'Cross-origin writes are not allowed.'},{status:403});
 }
 try {
  const body=await request.text();
  if(body.length>250000) return Response.json({error:'Request exceeds the 250 KB limit.'},{status:413});
  const parsed=actionSchema.safeParse(JSON.parse(body));
  if(!parsed.success) return Response.json({error:parsed.error.issues.map(e=>`${e.path.join('.')}: ${e.message}`).join('; ')},{status:400});
  if(parsed.data.action==='import'&&parsed.data.preview) {
   const store=await readStore();
   return Response.json({store,result:applyAction(store,parsed.data)});
  }
  return Response.json(await mutateStore(store=>applyAction(store,parsed.data)));
 } catch(error) {
  if(error instanceof ActionError) return Response.json({error:error.message},{status:error.status});
  if(error instanceof SyntaxError) return Response.json({error:'Invalid JSON request.'},{status:400});
  console.error('Workforce operation failed',error);
  return Response.json({error:'Could not save this change. Check server logs and retry.'},{status:500});
 }
}

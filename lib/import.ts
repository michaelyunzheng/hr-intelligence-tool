import Papa from 'papaparse';
import { z } from 'zod';
import type { Store } from './model';
const id=z.string().regex(/^[a-z0-9-]{1,60}$/,'Use lowercase letters, numbers and hyphens for IDs.');
const text=z.string().trim().min(1).max(120);
const schemas = {
 employees:z.object({id,name:text,department:text,roleId:id,location:text}),
 skills:z.object({id,name:text,category:z.enum(['Data & AI','Engineering','Business','People']),keywords:text}),
 roles:z.object({id,name:text,family:text,level:text,skillId:id,proficiency:z.coerce.number().int().min(1).max(5)}),
};
export type ImportKind=keyof typeof schemas;
export function importCSV(store:Store,kind:ImportKind,csv:string) {
 const result=Papa.parse<Record<string,string>>(csv.trim(),{header:true,skipEmptyLines:'greedy',transformHeader:h=>h.trim(),transform:v=>v.trim()});
 const errors:string[]=result.errors.map(e=>`Row ${(e.row??0)+2}: ${e.message}`);
 if(!result.data.length) errors.push('The CSV has no data rows.');
 if(result.data.length>500) errors.push('Import a maximum of 500 rows at a time.');
 const candidate=structuredClone(store);
 const seen=new Set<string>();
 result.data.slice(0,501).forEach((row,index)=>{
  const parsed=schemas[kind].safeParse(row);
  if(!parsed.success) {errors.push(`Row ${index+2}: ${parsed.error.issues.map(e=>`${e.path.join('.')}: ${e.message}`).join('; ')}`); return;}
  const key=parsed.data.id;
  if(seen.has(key)||candidate[kind].some(record=>record.id===key)) {errors.push(`Row ${index+2}: ID "${key}" already exists. Imports add records; they never overwrite them.`);return;}
  seen.add(key);
  if(kind==='employees') {
   const p=schemas.employees.parse(row);
   if(!store.roles.some(r=>r.id===p.roleId)) {errors.push(`Row ${index+2}: unknown role "${p.roleId}". Import roles first.`);return;}
   candidate.employees.push({...p,skills:[],evidence:[]});
  } else if(kind==='skills') {
   const p=schemas.skills.parse(row);
   candidate.skills.push({...p,keywords:p.keywords.split('|').map(k=>k.trim()).filter(Boolean),related:[],learning:'Agree a practical learning assignment with a manager.'});
  } else {
   const p=schemas.roles.parse(row);
   if(!store.skills.some(s=>s.id===p.skillId)) {errors.push(`Row ${index+2}: unknown skill "${p.skillId}". Import skills first.`);return;}
   candidate.roles.push({id:p.id,name:p.name,family:p.family,level:p.level,requirements:[{skillId:p.skillId,level:p.proficiency,weight:1}],tasks:[]});
  }
 });
 return {errors,count:result.data.length,candidate};
}

import { z } from 'zod';
export const intelligenceRequest = z.object({
 mode: z.enum(['skills', 'career', 'work', 'planning']),
 revision: z.number().int().nonnegative(),
 employeeId: z.string().optional(), roleId: z.string().optional(),
 category: z.enum(['Data & AI','Engineering','Business','People']).default('Data & AI'),
 growth: z.number().int().min(0).max(100).default(35),
 department: z.string().default('All departments'),
 roleFilter: z.string().default('All roles'),
 skillCategory: z.string().default('All categories'),
 verifiedOnly: z.boolean().default(false),
 provider: z.enum(['openai','rules']).default('openai'),
});
export type IntelligenceRequest = z.infer<typeof intelligenceRequest>;
export const intelligenceOutput = z.object({
 summary: z.string().min(1).max(2000),
 findings: z.array(z.object({title:z.string().min(1).max(160),detail:z.string().min(1).max(2000),sourceIds:z.array(z.string()).min(1).max(20)})).max(8),
 actions: z.array(z.object({title:z.string().min(1).max(160),detail:z.string().min(1).max(2000),successMeasure:z.string().min(1).max(1000)})).max(6),
 proposals: z.array(z.object({skillId:z.string(),level:z.number().int().min(1).max(5),confidence:z.number().min(0).max(.95),evidenceIds:z.array(z.string()).min(1).max(20),rationale:z.string().min(1).max(1500)})).max(20),
 limitations: z.array(z.string().max(1000)).max(8),
});
export type IntelligenceOutput = z.infer<typeof intelligenceOutput>;
export type IntelligenceReport = IntelligenceOutput & {
 id:string; mode:IntelligenceRequest['mode']; provider:'openai'|'rules'; model:string;
 employeeId?:string; roleId?:string; sourceRevision:number; createdAt:string;
 sources:{id:string;label:string}[]; contextLabel:string; contextKey?:string;
};

export function intelligenceContextKey(request:Omit<IntelligenceRequest,'revision'|'provider'>) {
 return JSON.stringify([request.mode,request.employeeId,request.roleId,request.category,request.growth,request.department,request.roleFilter,request.skillCategory,request.verifiedOnly]);
}

import type { IntelligenceReport } from './ai/contracts';
export type Category = 'Data & AI' | 'Engineering' | 'Business' | 'People';
export type Skill = { id: string; name: string; category: Category; keywords: string[]; related: string[]; learning: string };
export type Requirement = { skillId: string; level: number; weight: number };
export type Task = { name: string; share: number; impact: 'Augment' | 'Automate' | 'Human-led'; skillId: string };
export type Role = { id: string; name: string; family: string; level: string; requirements: Requirement[]; tasks: Task[] };
export type Evidence = { id: string; type: 'project' | 'training' | 'history'; title: string; text: string; date: string };
export type EmployeeSkill = { skillId: string; level: number; confidence: number; status: 'inferred' | 'verified' | 'rejected'; evidenceIds: string[]; rationale?: string; source?: 'openai' | 'rules'; model?: string; updatedAt: string };
export type Employee = { id: string; name: string; department: string; roleId: string; location: string; skills: EmployeeSkill[]; evidence: Evidence[] };
export type Validation = { id: string; employeeId: string; skillId: string; action: 'verified' | 'rejected'; level: number; actor: 'Employee' | 'Manager'; date: string };
export type Scenario = { id: string; name: string; category: Category; growth: number; verifiedOnly: boolean; createdAt: string };
export type Store = { version: 1; revision: number; employees: Employee[]; roles: Role[]; skills: Skill[]; validations: Validation[]; scenarios: Scenario[]; intelligenceReports?: IntelligenceReport[]; developmentPlans?: DevelopmentPlan[] };
export const levels = ['Not evidenced', 'Foundation', 'Working', 'Practitioner', 'Advanced', 'Expert'];

export type DevelopmentPlan = {
 id: string;
 employeeId: string;
 skillId: string;
 targetLevel: number;
 owner: string;
 dueDate: string;
 status: 'planned' | 'cancelled';
 createdAt: string;
};

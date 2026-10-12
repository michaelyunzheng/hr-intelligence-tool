import type { Employee, Store } from './model';

/** A planning assumption, never an edit to observed or validated capabilities. */
export function projectedEmployee(store: Store, employee: Employee): Employee {
 const projected = structuredClone(employee);
 for (const plan of store.developmentPlans ?? []) {
  if (plan.employeeId !== employee.id || plan.status !== 'planned') continue;
  const existing = projected.skills.find(s => s.skillId === plan.skillId);
  const level = Math.max(existing?.status === 'verified' ? existing.level : 0, plan.targetLevel);
  const assumed = {skillId: plan.skillId, level, status: 'verified' as const, confidence: 0, evidenceIds: [], updatedAt: plan.createdAt};
  // "verified" is only used inside this projection to reuse matching calculations.
  // This clone is never persisted or displayed as an employee's actual profile.
  if (existing) Object.assign(existing, assumed); else projected.skills.push(assumed);
 }
 return projected;
}

export function developmentCandidates(store: Store, skillId: string, employees = store.employees) {
 return employees.flatMap(employee => {
  const skill = employee.skills.find(s => s.skillId === skillId && s.status !== 'rejected');
  if (!skill || skill.level >= 3) return [];
  const plan = store.developmentPlans?.find(p => p.employeeId === employee.id && p.skillId === skillId && p.status === 'planned');
  return [{employee, skill, plan}];
 }).sort((a,b) => b.skill.level-a.skill.level || b.skill.confidence-a.skill.confidence || a.employee.name.localeCompare(b.employee.name));
}

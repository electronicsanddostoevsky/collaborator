export type PlanTask = {
  key: string;
  module: string;
  title: string;
  brief: string;
  inputs: string;
  outputs: string;
  doneWhen: string;
  dependsOn: string[];
  tools: string[];
};
export type WorkPlan = { summary: string; tasks: PlanTask[] };
const short = (v: unknown, min: number, max: number): v is string =>
  typeof v === 'string' && v.trim().length >= min && v.length <= max;
const key = (v: unknown): v is string =>
  typeof v === 'string' && /^[a-z][a-z0-9-]{1,39}$/.test(v);
export function validPlan(value: unknown): value is WorkPlan {
  if (!value || typeof value !== 'object') return false;
  const p = value as WorkPlan;
  if (
    !short(p.summary, 10, 1200) ||
    !Array.isArray(p.tasks) ||
    p.tasks.length < 1 ||
    p.tasks.length > 12
  )
    return false;
  const keys = new Set(p.tasks.map((t) => t?.key));
  if (keys.size !== p.tasks.length) return false;
  for (const t of p.tasks) {
    if (
      !t ||
      !key(t.key) ||
      !short(t.module, 2, 80) ||
      t.module !== t.module.trim() ||
      /[\x00-\x1f\x7f]/.test(t.module) ||
      !short(t.title, 5, 120) ||
      !short(t.brief, 10, 1200) ||
      !short(t.inputs, 3, 500) ||
      !short(t.outputs, 3, 500) ||
      !short(t.doneWhen, 10, 1000)
    )
      return false;
    if (
      !Array.isArray(t.tools) ||
      t.tools.length > 6 ||
      !t.tools.every(key) ||
      new Set(t.tools).size !== t.tools.length
    )
      return false;
    if (
      !Array.isArray(t.dependsOn) ||
      t.dependsOn.length > 11 ||
      new Set(t.dependsOn).size !== t.dependsOn.length ||
      t.dependsOn.some((k) => !keys.has(k) || k === t.key)
    )
      return false;
  }
  const done = new Set<string>(),
    visiting = new Set<string>();
  function visit(k: string): boolean {
    if (visiting.has(k)) return false;
    if (done.has(k)) return true;
    visiting.add(k);
    if (!p.tasks.find((t) => t.key === k)!.dependsOn.every(visit)) return false;
    visiting.delete(k);
    done.add(k);
    return true;
  }
  return p.tasks.every((t) => visit(t.key));
}

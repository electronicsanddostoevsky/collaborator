export type FileChange = {
  path: string;
  before: string | null;
  proposed: string | null;
  current: string | null;
  conflict: boolean;
};
export function compareFiles(
  base: Record<string, string>,
  source: Record<string, string>,
  target: Record<string, string>,
) {
  const files = { ...target },
    changes: FileChange[] = [];
  for (const path of new Set([...Object.keys(base), ...Object.keys(source)])) {
    if (path === 'mission.json') continue;
    const before = base[path] ?? null,
      proposed = source[path] ?? null,
      current = target[path] ?? null;
    if (before === proposed || current === proposed) continue;
    const conflict = current !== before;
    changes.push({ path, before, proposed, current, conflict });
    if (!conflict) {
      if (proposed === null) delete files[path];
      else files[path] = proposed;
    }
  }
  return {
    files,
    changes: changes.sort((a, b) => a.path.localeCompare(b.path)),
    conflicts: changes.filter((c) => c.conflict).length,
  };
}

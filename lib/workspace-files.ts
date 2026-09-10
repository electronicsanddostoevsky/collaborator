export function validWorkspacePath(path: unknown): path is string {
  return (
    typeof path === 'string' &&
    /^[a-z0-9][a-z0-9._-]{0,79}\.(md|txt|json|js|ts|tsx|css|html|py|scad|c|h|cpp|rs|toml|yaml|yml)$/i.test(
      path,
    ) &&
    !['mission.json', 'mission-tools.json', 'mission-plan.json'].includes(path.toLowerCase()) &&
    !/^(con|prn|aux|nul|com[1-9]|lpt[1-9])\./i.test(path)
  );
}
export function workspaceSize(files: Record<string, string>) {
  return Object.values(files).reduce(
    (n, text) => n + new TextEncoder().encode(text).length,
    0,
  );
}

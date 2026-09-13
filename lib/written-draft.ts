export type WrittenDraft = { title: string; body: string; checks: string[] };
export function validWrittenDraft(value: unknown): value is WrittenDraft {
  if (!value || typeof value !== 'object') return false;
  const d = value as WrittenDraft;
  return (
    typeof d.title === 'string' &&
    d.title.trim().length >= 3 &&
    d.title.length <= 120 &&
    typeof d.body === 'string' &&
    d.body.trim().length >= 40 &&
    d.body.length <= 20000 &&
    Array.isArray(d.checks) &&
    d.checks.length <= 6 &&
    d.checks.every(
      (c) => typeof c === 'string' && c.trim().length > 0 && c.length <= 300,
    ) &&
    new TextEncoder().encode(JSON.stringify(value)).length <= 32000 &&
    Object.keys(value).every((k) => ['title', 'body', 'checks'].includes(k))
  );
}
export function draftText(d: WrittenDraft) {
  return (
    '# ' +
    d.title +
    '\n\n' +
    d.body +
    (d.checks.length
      ? '\n\n## Checks for the reviewer\n\n' +
        d.checks.map((c) => '- ' + c).join('\n')
      : '') +
    '\n'
  );
}

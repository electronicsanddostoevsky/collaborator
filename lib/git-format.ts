// Small, deliberately write-only Git object/bundle encoder for a flat text workspace.
// No Git protocol server, shell execution, or pack parsing. Filenames are validated at write boundaries.
const encoder = new TextEncoder();
export const bytes = (s: string) => encoder.encode(s);
export function concat(parts: Uint8Array[]) {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let at = 0;
  for (const part of parts) {
    out.set(part, at);
    at += part.length;
  }
  return out;
}
export const hex = (data: Uint8Array) =>
  Array.from(data, (b) => b.toString(16).padStart(2, '0')).join('');
export const unhex = (s: string) =>
  Uint8Array.from(s.match(/../g) || [], (c) => parseInt(c, 16));
export async function hash(data: Uint8Array) {
  return new Uint8Array(
    await crypto.subtle.digest('SHA-1', new Uint8Array(data)),
  );
}
export async function objectId(type: string, data: Uint8Array) {
  return hex(
    await hash(concat([bytes(type + ' ' + data.length + '\0'), data])),
  );
}
export function treeBytes(blobId: string) {
  return concat([bytes('100644 mission.json\0'), unhex(blobId)]);
}
async function fileTree(files: Record<string, string>) {
  const entries: Uint8Array[] = [];
  for (const path of Object.keys(files).sort()) {
    entries.push(
      bytes('100644 ' + path + '\0'),
      unhex(await objectId('blob', bytes(files[path]))),
    );
  }
  return concat(entries);
}
export async function createObjects(
  snapshot: unknown,
  parent: string | null,
  author: string,
  message: string,
  stamp: string,
  files: Record<string, string> = {},
  mergeParent: string | null = null,
) {
  const blob = JSON.stringify(snapshot, null, 2) + '\n',
    allFiles = { ...files, 'mission.json': blob },
    tree = await fileTree(allFiles),
    treeId = await objectId('tree', tree);
  const identity =
    (author.replace(/[\x00-\x1f<>]/g, ' ').trim() || 'Contributor') +
    ' <contributor@collaborator.invalid> ' +
    Math.floor(new Date(stamp).getTime() / 1000) +
    ' +0000';
  const commit =
    'tree ' +
    treeId +
    '\n' +
    (parent ? 'parent ' + parent + '\n' : '') +
    (mergeParent ? 'parent ' + mergeParent + '\n' : '') +
    'author ' +
    identity +
    '\ncommitter ' +
    identity +
    '\n\n' +
    message.replace(/[\x00\r]/g, '') +
    '\n';
  return {
    oid: await objectId('commit', bytes(commit)),
    blob,
    commit,
    files: allFiles,
  };
}
async function deflate(data: Uint8Array) {
  const stream = new Blob([new Uint8Array(data)])
    .stream()
    .pipeThrough(new CompressionStream('deflate'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}
export async function gitBundle(
  head: string,
  records: {
    oid: string;
    blob: string;
    commit: string;
    files?: Record<string, string>;
  }[],
) {
  const objects = new Map<string, { type: number; data: Uint8Array }>();
  for (const record of records) {
    const files = { ...record.files, 'mission.json': record.blob },
      tree = await fileTree(files),
      treeId = await objectId('tree', tree),
      commit = bytes(record.commit);
    if (
      (await objectId('commit', commit)) !== record.oid ||
      !record.commit.startsWith('tree ' + treeId + '\n')
    )
      throw Error('Git object integrity check failed');
    for (const content of Object.values(files)) {
      const blob = bytes(content);
      objects.set(await objectId('blob', blob), { type: 3, data: blob });
    }
    objects.set(treeId, { type: 2, data: tree });
    objects.set(record.oid, { type: 1, data: commit });
  }
  if (!objects.has(head)) throw Error('Missing repository head');
  const header = new Uint8Array(12);
  header.set(bytes('PACK'));
  const view = new DataView(header.buffer);
  view.setUint32(4, 2);
  view.setUint32(8, objects.size);
  const parts = [header];
  for (const { type, data } of objects.values()) {
    let size = data.length;
    const h = [(type << 4) | (size & 15)];
    size = Math.floor(size / 16);
    if (size) h[0] |= 128;
    while (size) {
      const b = size & 127;
      size = Math.floor(size / 128);
      h.push(b | (size ? 128 : 0));
    }
    parts.push(Uint8Array.from(h), await deflate(data));
  }
  const pack = concat(parts);
  return concat([
    bytes(
      '# v2 git bundle\n' + head + ' HEAD\n' + head + ' refs/heads/main\n\n',
    ),
    pack,
    await hash(pack),
  ]);
}

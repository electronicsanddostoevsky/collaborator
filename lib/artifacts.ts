export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
export const USER_STORAGE_BYTES = 100 * 1024 * 1024;
export function safeFilename(value: string) {
  return (
    value
      .split(/[\\/]/)
      .pop()!
      .replace(/[^a-zA-Z0-9._ -]/g, '_')
      .slice(0, 120) || 'artifact'
  );
}
export function supportedFile(name: string) {
  return /\.(txt|md|json|png|jpg|jpeg|pdf|zip|glb|stl|step|stp)$/i.test(name);
}
export async function boundedBody(req: Request, max: number) {
  const reader = req.body?.getReader();
  if (!reader) throw new Error('empty');
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > max) {
      await reader.cancel();
      throw new Error('too_large');
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  return bytes;
}

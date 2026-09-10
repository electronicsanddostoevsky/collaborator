// Match SQLite lower(trim(...)): ASCII case-folding keeps permission keys stable.
export const moduleKey = (name: string) =>
  name.trim().replace(/[A-Z]/g, (c) => c.toLowerCase());
export const validModule = (name: unknown): name is string =>
  typeof name === 'string' &&
  name === name.trim() &&
  name.length >= 2 &&
  name.length <= 80 &&
  !/[\x00-\x1f\x7f]/.test(name);

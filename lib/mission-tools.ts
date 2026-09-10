export type ToolRequirement = { id: string; name: string; purpose: string };
export const defaultMissionTools = (mission: string): ToolRequirement[] =>
  mission === 'mahabharata'
    ? [
        {
          id: 'blender',
          name: 'Blender',
          purpose: 'Create and refine 3D assets.',
        },
        {
          id: 'unreal',
          name: 'Unreal Engine',
          purpose: 'Assemble and test the playable world.',
        },
      ]
    : [];
export function validRequirements(value: unknown): value is ToolRequirement[] {
  return (
    Array.isArray(value) &&
    value.length <= 12 &&
    value.every(
      (t) =>
        t &&
        typeof t.id === 'string' &&
        /^[a-z][a-z0-9-]{1,39}$/.test(t.id) &&
        typeof t.name === 'string' &&
        t.name.trim().length >= 2 &&
        t.name.length <= 80 &&
        typeof t.purpose === 'string' &&
        t.purpose.trim().length >= 5 &&
        t.purpose.length <= 240,
    ) &&
    new Set(value.map((t) => t.id)).size === value.length
  );
}

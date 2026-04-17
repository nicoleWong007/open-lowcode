/**
 * Deep clone a value using structuredClone.
 */
export function cloneDeep<T>(value: T): T {
  return structuredClone(value);
}

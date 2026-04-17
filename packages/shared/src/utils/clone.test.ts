import { describe, it, expect } from 'vitest';
import { cloneDeep } from './clone';

describe('cloneDeep', () => {
  it('should clone a plain object', () => {
    const original = { a: 1, b: 'hello', c: [1, 2, 3] };
    const cloned = cloneDeep(original);
    expect(cloned).toEqual(original);
    expect(cloned).not.toBe(original);
    expect(cloned.c).not.toBe(original.c);
  });

  it('should not modify the original when mutating the clone', () => {
    const original = { nested: { value: 42 } };
    const cloned = cloneDeep(original);
    cloned.nested.value = 99;
    expect(original.nested.value).toBe(42);
  });

  it('should clone arrays of objects', () => {
    const original = [{ id: 1 }, { id: 2 }];
    const cloned = cloneDeep(original);
    expect(cloned).toEqual(original);
    expect(cloned[0]).not.toBe(original[0]);
  });

  it('should return primitives as-is', () => {
    expect(cloneDeep(42)).toBe(42);
    expect(cloneDeep('hello')).toBe('hello');
    expect(cloneDeep(null)).toBe(null);
  });
});

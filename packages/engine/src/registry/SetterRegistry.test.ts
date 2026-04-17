import { describe, it, expect } from 'vitest';
import { SetterRegistry } from './SetterRegistry';

describe('SetterRegistry', () => {
  it('should register and retrieve a setter', () => {
    const registry = new SetterRegistry();
    const FakeSetter = () => null;
    registry.register('Input', FakeSetter);
    expect(registry.get('Input')).toBe(FakeSetter);
  });

  it('should return undefined for unregistered setter', () => {
    const registry = new SetterRegistry();
    expect(registry.get('NonExistent')).toBeUndefined();
  });

  it('should resolve setter from PropSchema type when no explicit setter', () => {
    const registry = new SetterRegistry();
    const FakeInput = () => null;
    const FakeSelect = () => null;
    registry.register('Input', FakeInput);
    registry.register('Select', FakeSelect);

    expect(registry.resolve({ name: 'x', title: 'x', type: 'string' })).toBe(FakeInput);
    expect(registry.resolve({ name: 'x', title: 'x', type: 'select' })).toBe(FakeSelect);
  });

  it('should prefer explicit setter over type inference', () => {
    const registry = new SetterRegistry();
    const DefaultInput = () => null;
    const TextArea = () => null;
    registry.register('Input', DefaultInput);
    registry.register('TextArea', TextArea);

    const result = registry.resolve({
      name: 'x',
      title: 'x',
      type: 'string',
      setter: 'TextArea',
    });
    expect(result).toBe(TextArea);
  });
});

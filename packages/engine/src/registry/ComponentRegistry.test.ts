import { describe, it, expect } from 'vitest';
import type { ComponentMeta } from '../schema/types';
import { ComponentRegistry } from './ComponentRegistry';

const buttonMeta: ComponentMeta = {
  type: 'Button',
  title: '按钮',
  icon: 'ButtonIcon',
  group: '基础',
  isContainer: false,
  propsSchema: [
    { name: 'text', title: '文本', type: 'string', defaultValue: '按钮' },
  ],
  defaultProps: { text: '按钮' },
  defaultStyle: {},
};

const boxMeta: ComponentMeta = {
  type: 'Box',
  title: '容器',
  icon: 'BoxIcon',
  group: '容器',
  isContainer: true,
  propsSchema: [],
  defaultProps: {},
  defaultStyle: { padding: 8 },
};

describe('ComponentRegistry', () => {
  it('should register and retrieve a component', () => {
    const registry = new ComponentRegistry();
    registry.registerMeta(buttonMeta);
    const result = registry.getMeta('Button');
    expect(result).not.toBeUndefined();
    expect(result!.type).toBe('Button');
  });

  it('should return undefined for unregistered component', () => {
    const registry = new ComponentRegistry();
    expect(registry.getMeta('NonExistent')).toBeUndefined();
  });

  it('should return all registered components', () => {
    const registry = new ComponentRegistry();
    registry.registerMeta(buttonMeta);
    registry.registerMeta(boxMeta);
    const all = registry.getAllMetas();
    expect(all).toHaveLength(2);
  });

  it('should group components by group name', () => {
    const registry = new ComponentRegistry();
    registry.registerMeta(buttonMeta);
    registry.registerMeta(boxMeta);
    const groups = registry.getGroupedMetas();
    expect(Object.keys(groups)).toContain('基础');
    expect(Object.keys(groups)).toContain('容器');
    expect(groups['基础']).toHaveLength(1);
    expect(groups['容器']).toHaveLength(1);
  });

  it('should throw when registering duplicate type', () => {
    const registry = new ComponentRegistry();
    registry.registerMeta(buttonMeta);
    expect(() => registry.registerMeta(buttonMeta)).toThrow(/already registered/);
  });

  it('should store and retrieve component reference', () => {
    const registry = new ComponentRegistry();
    const FakeComponent = () => null;
    registry.registerMeta(buttonMeta);
    registry.registerComponent('Button', FakeComponent);
    expect(registry.getComponent('Button')).toBe(FakeComponent);
  });
});

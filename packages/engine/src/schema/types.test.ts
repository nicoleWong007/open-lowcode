import { describe, it, expect } from 'vitest';
import type {
  PropSchema,
  EventMeta,
  Action,
  Binding,
  Variable,
  DataSource,
  EventBusConfig,
  ComponentMeta,
  ComponentInstance,
  DocumentSchema,
} from './types';

describe('Schema Types', () => {
  it('should create a valid PropSchema', () => {
    const schema: PropSchema = {
      name: 'text',
      title: '文本',
      type: 'string',
      defaultValue: '按钮',
    };
    expect(schema.name).toBe('text');
    expect(schema.type).toBe('string');
  });

  it('should create a valid EventMeta', () => {
    const event: EventMeta = {
      name: 'onClick',
      title: '点击',
    };
    expect(event.name).toBe('onClick');
  });

  it('should create a valid Action', () => {
    const action: Action = {
      type: 'setState',
      config: { variable: 'count', value: 0 },
    };
    expect(action.type).toBe('setState');
  });

  it('should create a valid ComponentInstance', () => {
    const instance: ComponentInstance = {
      id: 'test-id',
      type: 'Button',
      props: { text: '按钮' },
      style: {},
    };
    expect(instance.id).toBe('test-id');
    expect(instance.type).toBe('Button');
  });

  it('should create a valid ComponentInstance with children', () => {
    const container: ComponentInstance = {
      id: 'container-1',
      type: 'Box',
      props: {},
      style: { padding: 8 },
      children: [
        {
          id: 'child-1',
          type: 'Text',
          props: { text: 'Hello' },
          style: {},
        },
      ],
    };
    expect(container.children).toHaveLength(1);
    expect(container.children![0].type).toBe('Text');
  });

  it('should create a valid ComponentMeta', () => {
    const meta: ComponentMeta = {
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
      events: [{ name: 'onClick', title: '点击' }],
    };
    expect(meta.type).toBe('Button');
    expect(meta.isContainer).toBe(false);
    expect(meta.propsSchema).toHaveLength(1);
  });

  it('should create a valid DocumentSchema', () => {
    const doc: DocumentSchema = {
      version: '1.0.0',
      id: 'doc-1',
      canvas: { width: 800, backgroundColor: '#ffffff' },
      root: { id: 'root', type: 'Box', props: {}, style: {} },
      variables: [],
      dataSources: [],
      eventBus: { listeners: [] },
      meta: {
        name: 'Test Document',
        createdAt: '2026-04-17T00:00:00Z',
        updatedAt: '2026-04-17T00:00:00Z',
      },
    };
    expect(doc.version).toBe('1.0.0');
    expect(doc.root.type).toBe('Box');
    expect(doc.variables).toEqual([]);
    expect(doc.eventBus.listeners).toEqual([]);
  });
});

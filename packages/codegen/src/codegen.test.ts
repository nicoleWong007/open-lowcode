import { describe, it, expect } from 'vitest';
import { SchemaAnalyzer, ReactGenerator } from './index';
import type { DocumentSchema } from '@open-lowcode/engine';

function createTestSchema(): DocumentSchema {
  return {
    version: '1.0.0',
    id: 'test-doc-001',
    canvas: { width: 800 },
    root: {
      id: 'root-1',
      type: 'Box',
      props: { direction: 'column', gap: 12 },
      style: { padding: 16, minHeight: 400 },
      children: [
        {
          id: 'text-1',
          type: 'Text',
          props: { text: 'Hello World' },
          style: { fontSize: 24, fontWeight: 'bold' },
        },
        {
          id: 'btn-1',
          type: 'Button',
          props: { text: 'Click me', type: 'primary' },
          style: {},
          eventHandlers: {
            click: [
              { type: 'setState', config: { variable: 'count', value: 'ctx.count + 1' } },
            ],
          },
        },
        {
          id: 'input-1',
          type: 'Input',
          props: { placeholder: 'Enter text...' },
          style: {},
          bindings: {
            value: { type: 'variable', value: 'inputText' },
          },
        },
      ],
    },
    variables: [
      { id: 'var-1', name: 'count', type: 'number', defaultValue: 0, scope: 'document' },
      { id: 'var-2', name: 'inputText', type: 'string', defaultValue: '', scope: 'document' },
    ],
    dataSources: [],
    eventBus: { listeners: [] },
    meta: { name: 'Test Page', createdAt: '2026-01-01', updatedAt: '2026-01-01' },
  };
}

describe('Codegen Pipeline', () => {
  it('analyzes schema correctly', () => {
    const analyzer = new SchemaAnalyzer();
    const result = analyzer.analyze(createTestSchema());

    expect(result.meta.componentName).toBe('TestPage');
    expect(result.components.length).toBe(4); // root + 3 children
    expect(result.variables.length).toBe(2);
    expect(result.eventHandlers.length).toBe(1);
    expect(result.antdImports.has('Flex')).toBe(true);
    expect(result.antdImports.has('Button')).toBe(true);
    expect(result.antdImports.has('Input')).toBe(true);
    expect(result.antdImports.has('Typography')).toBe(true);
  });

  it('generates multiple output files', () => {
    const analyzer = new SchemaAnalyzer();
    const analyzed = analyzer.analyze(createTestSchema());
    const generator = new ReactGenerator();
    const files = generator.generate(analyzed);

    const paths = files.map((f) => f.path);
    expect(paths).toContain('index.tsx');
    expect(paths).toContain('styles.module.css');
    expect(paths).toContain('types.ts');
    expect(paths).toContain('hooks/useStateVars.ts');
    expect(paths).toContain('handlers/eventHandlers.ts');
  });

  it('index.tsx contains React imports and antd imports', () => {
    const analyzer = new SchemaAnalyzer();
    const analyzed = analyzer.analyze(createTestSchema());
    const generator = new ReactGenerator();
    const files = generator.generate(analyzed);

    const indexFile = files.find((f) => f.path === 'index.tsx');
    expect(indexFile).toBeDefined();
    expect(indexFile!.content).toContain('from "react"');
    expect(indexFile!.content).toContain('from "antd"');
    expect(indexFile!.content).toContain('Flex');
    expect(indexFile!.content).toContain('Button');
    expect(indexFile!.content).toContain('Typography');
  });

  it('generates CSS with kebab-case properties', () => {
    const analyzer = new SchemaAnalyzer();
    const analyzed = analyzer.analyze(createTestSchema());
    const generator = new ReactGenerator();
    const files = generator.generate(analyzed);

    const cssFile = files.find((f) => f.path === 'styles.module.css');
    expect(cssFile).toBeDefined();
    expect(cssFile!.content).toContain('font-weight:');
    expect(cssFile!.content).toContain('font-size:');
  });

  it('generates useState hooks file', () => {
    const analyzer = new SchemaAnalyzer();
    const analyzed = analyzer.analyze(createTestSchema());
    const generator = new ReactGenerator();
    const files = generator.generate(analyzed);

    const hooksFile = files.find((f) => f.path === 'hooks/useStateVars.ts');
    expect(hooksFile).toBeDefined();
    expect(hooksFile!.content).toContain('useState');
    expect(hooksFile!.content).toContain('count');
    expect(hooksFile!.content).toContain('setCount');
    expect(hooksFile!.content).toContain('inputText');
    expect(hooksFile!.content).toContain('setInputText');
  });

  it('generates handler functions', () => {
    const analyzer = new SchemaAnalyzer();
    const analyzed = analyzer.analyze(createTestSchema());
    const generator = new ReactGenerator();
    const files = generator.generate(analyzed);

    const handlersFile = files.find((f) => f.path === 'handlers/eventHandlers.ts');
    expect(handlersFile).toBeDefined();
    expect(handlersFile!.content).toContain('createHandlers');
  });

  it('handles Grid component with Row + Col wrapping', () => {
    const schema: DocumentSchema = {
      version: '1.0.0',
      id: 'test-grid',
      canvas: { width: 800 },
      root: {
        id: 'grid-1',
        type: 'Grid',
        props: { columns: 2, gap: 12 },
        style: {},
        children: [
          { id: 'text-a', type: 'Text', props: { text: 'Left' }, style: {} },
          { id: 'text-b', type: 'Text', props: { text: 'Right' }, style: {} },
        ],
      },
      variables: [],
      dataSources: [],
      eventBus: { listeners: [] },
      meta: { name: 'Grid Test', createdAt: '2026-01-01', updatedAt: '2026-01-01' },
    };

    const analyzer = new SchemaAnalyzer();
    const analyzed = analyzer.analyze(schema);
    const generator = new ReactGenerator();
    const files = generator.generate(analyzed);

    const indexFile = files.find((f) => f.path === 'index.tsx');
    expect(indexFile!.content).toContain('Row');
    expect(indexFile!.content).toContain('Col');
  });

  it('handles empty document (no variables, no events)', () => {
    const schema: DocumentSchema = {
      version: '1.0.0',
      id: 'empty-doc',
      canvas: { width: 800 },
      root: {
        id: 'root-1',
        type: 'Box',
        props: {},
        style: {},
        children: [],
      },
      variables: [],
      dataSources: [],
      eventBus: { listeners: [] },
      meta: { name: 'Empty', createdAt: '2026-01-01', updatedAt: '2026-01-01' },
    };

    const analyzer = new SchemaAnalyzer();
    const analyzed = analyzer.analyze(schema);
    const generator = new ReactGenerator();
    const files = generator.generate(analyzed);

    const paths = files.map((f) => f.path);
    expect(paths).toContain('index.tsx');
    expect(paths).toContain('types.ts');
    expect(paths).not.toContain('hooks/useStateVars.ts');
    expect(paths).not.toContain('handlers/eventHandlers.ts');
  });
});

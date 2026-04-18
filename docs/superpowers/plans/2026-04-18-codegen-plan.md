# Code Export — JSON Schema → React 源码 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将低代码编辑器产出的 DocumentSchema JSON 转换为生产级 React 源码（多文件结构，全部使用 antd 组件），支持 Modal 预览和 .zip 下载。

**Architecture:** 三层流水线 `Analyzer → Generator → Emitter`。新增 `packages/codegen/` 独立包，使用 @babel/types 构建 AST、@babel/generator 序列化为代码。Analyzer 将 Schema 转为扁平化的 AnalyzedSchema 中间表示，Generator 消费中间表示构建多文件 AST，Emitter 负责序列化和打包。

**Tech Stack:** @babel/types, @babel/generator, JSZip, @open-lowcode/engine, React 19, TypeScript 5, Vitest 3, Ant Design 5

**Design Doc:** `docs/superpowers/specs/2026-04-18-codegen-design.md`

---

## File Structure

```
packages/codegen/
├── package.json
├── tsconfig.json
└── src/
    ├── index.ts
    ├── types.ts
    ├── analyzer/
    │   ├── SchemaAnalyzer.ts
    │   ├── SchemaAnalyzer.test.ts
    │   └── types.ts
    ├── generators/
    │   ├── react/
    │   │   ├── ReactGenerator.ts
    │   │   ├── ComponentBuilder.ts
    │   │   ├── ComponentBuilder.test.ts
    │   │   ├── StyleBuilder.ts
    │   │   ├── StyleBuilder.test.ts
    │   │   ├── DataFlowBuilder.ts
    │   │   ├── DataFlowBuilder.test.ts
    │   │   ├── ImportCollector.ts
    │   │   ├── ImportCollector.test.ts
    │   │   ├── ComponentMap.ts           # Schema type → antd 组件映射表
    │   │   └── index.ts
    │   └── index.ts
    ├── emitter/
    │   ├── ASTEmitter.ts
    │   ├── CSSEmitter.ts
    │   ├── CSSEmitter.test.ts
    │   ├── ZipEmitter.ts
    │   └── index.ts
    └── utils/
        ├── naming.ts
        ├── naming.test.ts
        ├── cssUtils.ts
        └── cssUtils.test.ts

packages/editor/src/
├── export/
│   ├── ExportModal.tsx                   # 代码预览 Modal
│   ├── ExportModal.css                   # Modal 样式
│   └── useCodeExport.ts                  # 调用 codegen hook
├── toolbar/
│   └── Toolbar.tsx                       # 修改：新增"导出 React 代码"按钮
└── Editor.tsx                            # 修改：集成 ExportModal
```

---

## Task 1: Codegen Package Scaffolding + Utils

**Files:**
- Create: `packages/codegen/package.json`
- Create: `packages/codegen/tsconfig.json`
- Create: `packages/codegen/src/index.ts`
- Create: `packages/codegen/src/types.ts`
- Create: `packages/codegen/src/utils/naming.ts`
- Create: `packages/codegen/src/utils/naming.test.ts`
- Create: `packages/codegen/src/utils/cssUtils.ts`
- Create: `packages/codegen/src/utils/cssUtils.test.ts`

- [ ] **Step 1: Create codegen package config**

`packages/codegen/package.json`:

```json
{
  "name": "@open-lowcode/codegen",
  "version": "0.0.1",
  "private": true,
  "main": "src/index.ts",
  "types": "src/index.ts",
  "scripts": {
    "build": "tsc",
    "test": "vitest run",
    "clean": "rm -rf dist *.tsbuildinfo"
  },
  "dependencies": {
    "@babel/types": "^7.26.0",
    "@babel/generator": "^7.26.0",
    "jszip": "^3.10.0",
    "@open-lowcode/engine": "workspace:*",
    "@open-lowcode/shared": "workspace:*"
  },
  "devDependencies": {
    "@types/react": "^19.0.0",
    "typescript": "^5.7.0",
    "vitest": "^3.0.0"
  }
}
```

`packages/codegen/tsconfig.json`:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src"]
}
```

- [ ] **Step 2: Create types.ts**

`packages/codegen/src/types.ts`:

```typescript
/** A single output file in the generated bundle */
export interface OutputFile {
  /** Relative path within the export folder, e.g. 'index.tsx' */
  path: string;
  /** File content (source code) */
  content: string;
}

/** The result of a full code generation pass */
export interface CodegenResult {
  /** Component name (PascalCase) */
  componentName: string;
  /** All output files */
  files: OutputFile[];
}
```

- [ ] **Step 3: Write failing test for naming utilities**

`packages/codegen/src/utils/naming.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import {
  toPascalCase,
  toCamelCase,
  generateSetterName,
  generateHandlerName,
  generateStyleClassName,
} from './naming';

describe('toPascalCase', () => {
  it('should convert snake_case to PascalCase', () => {
    expect(toPascalCase('my_component')).toBe('MyComponent');
  });

  it('should convert kebab-case to PascalCase', () => {
    expect(toPascalCase('my-component')).toBe('MyComponent');
  });

  it('should handle already PascalCase', () => {
    expect(toPascalCase('MyComponent')).toBe('MyComponent');
  });

  it('should handle Chinese characters', () => {
    expect(toPascalCase('未命名文档')).toBe('ExportedComponent');
  });

  it('should handle empty string', () => {
    expect(toPascalCase('')).toBe('ExportedComponent');
  });
});

describe('toCamelCase', () => {
  it('should convert PascalCase to camelCase', () => {
    expect(toCamelCase('MyComponent')).toBe('myComponent');
  });

  it('should convert snake_case to camelCase', () => {
    expect(toCamelCase('my_var')).toBe('myVar');
  });
});

describe('generateSetterName', () => {
  it('should generate setter name from variable name', () => {
    expect(generateSetterName('count')).toBe('setCount');
    expect(generateSetterName('isVisible')).toBe('setIsVisible');
  });
});

describe('generateHandlerName', () => {
  it('should generate handler name from component type and event', () => {
    expect(generateHandlerName('Button', 'onClick')).toBe('handleButtonClick');
    expect(generateHandlerName('Input', 'onChange')).toBe('handleInputChange');
  });
});

describe('generateStyleClassName', () => {
  it('should generate a CSS Module class name', () => {
    const name = generateStyleClassName('root', null);
    expect(name).toBe('root');
  });

  it('should include type and short id for non-root', () => {
    const name = generateStyleClassName('Button', 'abc12345-6789-0abc-def0-1234567890ab');
    expect(name).toMatch(/^button/);
    expect(name.length).toBeLessThan(30);
  });
});
```

- [ ] **Step 4: Run test to verify it fails**

Run: `pnpm --filter @open-lowcode/codegen install && pnpm --filter @open-lowcode/codegen test`
Expected: FAIL — `Cannot find module './naming'`

- [ ] **Step 5: Write naming utilities implementation**

`packages/codegen/src/utils/naming.ts`:

```typescript
/**
 * Convert a string to PascalCase.
 * Returns 'ExportedComponent' for empty or non-ASCII strings.
 */
export function toPascalCase(str: string): string {
  if (!str || !/^[a-zA-Z]/.test(str)) {
    return 'ExportedComponent';
  }
  return str
    .replace(/[-_](.)/g, (_, c) => c.toUpperCase())
    .replace(/^(.)/, (_, c) => c.toUpperCase());
}

/** Convert PascalCase or snake_case to camelCase */
export function toCamelCase(str: string): string {
  const pascal = toPascalCase(str);
  return pascal.charAt(0).toLowerCase() + pascal.slice(1);
}

/** Generate a useState setter name from a variable name */
export function generateSetterName(varName: string): string {
  return `set${varName.charAt(0).toUpperCase()}${varName.slice(1)}`;
}

/** Generate an event handler function name */
export function generateHandlerName(componentType: string, eventName: string): string {
  // onClick → Click, onChange → Change
  const eventSuffix = eventName.replace(/^on/, '');
  return `handle${componentType}${eventSuffix}`;
}

/** Generate a CSS Module class name for a component */
export function generateStyleClassName(componentType: string, id: string | null): string {
  if (!id) return 'root';
  const shortId = id.replace(/-/g, '').slice(0, 6);
  return `${componentType.charAt(0).toLowerCase() + componentType.slice(1)}${shortId.charAt(0).toUpperCase()}${shortId.slice(1)}`;
}
```

- [ ] **Step 6: Run naming tests to verify they pass**

Run: `pnpm --filter @open-lowcode/codegen test`

Expected: PASS (all naming tests)

- [ ] **Step 7: Write failing test for CSS utilities**

`packages/codegen/src/utils/cssUtils.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { camelToKebab, formatCssValue, formatCssProperty } from './cssUtils';

describe('camelToKebab', () => {
  it('should convert camelCase to kebab-case', () => {
    expect(camelToKebab('backgroundColor')).toBe('background-color');
    expect(camelToKebab('fontSize')).toBe('font-size');
    expect(camelToKebab('borderRadius')).toBe('border-radius');
    expect(camelToKebab('padding')).toBe('padding');
  });
});

describe('formatCssValue', () => {
  it('should add px to numbers', () => {
    expect(formatCssValue('padding', 16)).toBe('16px');
    expect(formatCssValue('fontSize', 14)).toBe('14px');
  });

  it('should keep strings as-is', () => {
    expect(formatCssValue('color', '#333333')).toBe('#333333');
    expect(formatCssValue('background', 'transparent')).toBe('transparent');
  });

  it('should handle flex properties without px', () => {
    expect(formatCssValue('flexDirection', 'column')).toBe('column');
    expect(formatCssValue('display', 'flex')).toBe('flex');
  });
});

describe('formatCssProperty', () => {
  it('should format a single CSS property-value pair', () => {
    expect(formatCssProperty('backgroundColor', '#fff')).toBe('  background-color: #fff;');
    expect(formatCssProperty('fontSize', 14)).toBe('  font-size: 14px;');
  });
});
```

- [ ] **Step 8: Run test to verify it fails**

Run: `pnpm --filter @open-lowcode/codegen test`
Expected: FAIL — `Cannot find module './cssUtils'`

- [ ] **Step 9: Write CSS utilities implementation**

`packages/codegen/src/utils/cssUtils.ts`:

```typescript
/** Convert a camelCase CSS property name to kebab-case */
export function camelToKebab(str: string): string {
  return str.replace(/[A-Z]/g, (match) => `-${match.toLowerCase()}`);
}

/** Format a CSS value, adding 'px' to numeric values where appropriate */
export function formatCssValue(property: string, value: string | number): string {
  if (typeof value === 'string') return value;

  // Properties that should NOT get 'px' suffix
  const unitlessProperties = new Set([
    'flexDirection', 'flexWrap', 'justifyContent', 'alignItems', 'alignContent',
    'display', 'position', 'overflow', 'fontWeight', 'textAlign', 'whiteSpace',
    'wordBreak', 'boxSizing', 'cursor', 'opacity', 'zIndex',
    'objectFit', 'listStyle',
  ]);

  if (unitlessProperties.has(property)) return String(value);
  return `${value}px`;
}

/** Format a single CSS property: value pair with indentation */
export function formatCssProperty(property: string, value: string | number): string {
  const kebabProp = camelToKebab(property);
  const formattedValue = formatCssValue(property, value);
  return `  ${kebabProp}: ${formattedValue};`;
}
```

- [ ] **Step 10: Run all tests to verify they pass**

Run: `pnpm --filter @open-lowcode/codegen test`

Expected: PASS (all utils tests)

- [ ] **Step 11: Create codegen index.ts and install dependencies**

`packages/codegen/src/index.ts`:

```typescript
export type { OutputFile, CodegenResult } from './types';
export { toPascalCase, toCamelCase, generateSetterName, generateHandlerName, generateStyleClassName } from './utils/naming';
export { camelToKebab, formatCssValue, formatCssProperty } from './utils/cssUtils';
```

Run: `pnpm install`

Expected: `pnpm install` succeeds, all workspace links resolve.

- [ ] **Step 12: Commit**

```bash
git add packages/codegen/
git commit -m "feat(codegen): scaffold codegen package with naming and CSS utilities"
```

---

## Task 2: Analyzer — Schema Analysis Layer

**Files:**
- Create: `packages/codegen/src/analyzer/types.ts`
- Create: `packages/codegen/src/analyzer/SchemaAnalyzer.ts`
- Create: `packages/codegen/src/analyzer/SchemaAnalyzer.test.ts`

- [ ] **Step 1: Create Analyzer type definitions**

`packages/codegen/src/analyzer/types.ts`:

```typescript
import type { Action, CSSProperties } from '@open-lowcode/engine';

export interface AnalyzedSchema {
  meta: {
    componentName: string;
    description?: string;
  };
  components: AnalyzedComponent[];
  variables: AnalyzedVariable[];
  eventHandlers: AnalyzedEventHandler[];
  dataSources: AnalyzedDataSource[];
  styles: AnalyzedStyle[];
  antdImports: Set<string>;
  iconImports: Set<string>;
  runtimeImports: Set<string>;
}

export interface AnalyzedComponent {
  id: string;
  type: string;
  props: Record<string, any>;
  bindings: Record<string, {
    type: 'variable' | 'expression' | 'dataSource';
    value: string;
  }>;
  styleId: string;
  children: string[];
  parent: string | null;
  depth: number;
}

export interface AnalyzedVariable {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  defaultValue: any;
  setterName: string;
}

export interface AnalyzedEventHandler {
  id: string;
  componentId: string;
  eventName: string;
  actions: Action[];
  functionName: string;
}

export interface AnalyzedDataSource {
  id: string;
  name: string;
  type: 'static' | 'api' | 'websocket';
  config: {
    url?: string;
    method?: string;
    headers?: Record<string, string>;
    params?: Record<string, any>;
    refreshInterval?: number;
  };
  transform?: string;
}

export interface AnalyzedStyle {
  id: string;
  className: string;
  cssProperties: Record<string, string | number>;
  componentName: string;
}
```

- [ ] **Step 2: Write failing tests for SchemaAnalyzer**

`packages/codegen/src/analyzer/SchemaAnalyzer.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import type { DocumentSchema, ComponentInstance } from '@open-lowcode/engine';
import { SchemaAnalyzer } from './SchemaAnalyzer';

function createTestDocument(overrides?: Partial<DocumentSchema>): DocumentSchema {
  const root: ComponentInstance = {
    id: 'root',
    type: 'Box',
    props: { padding: 8, gap: 0, direction: 'column', borderRadius: 0, background: 'transparent' },
    style: { minHeight: 400, padding: 16 },
    children: [
      {
        id: 'text-1',
        type: 'Text',
        props: { text: 'Hello', fontSize: 14, fontWeight: 'normal', color: '#333', textAlign: 'left' },
        style: {},
      },
      {
        id: 'btn-1',
        type: 'Button',
        props: { text: 'Click me', type: 'primary', disabled: false, size: 'middle', block: false, danger: false },
        style: {},
        eventHandlers: {
          onClick: [{ type: 'setState', config: { variable: 'count', value: 'count + 1' } }],
        },
      },
      {
        id: 'input-1',
        type: 'Input',
        props: { placeholder: '请输入', size: 'middle', disabled: false },
        style: {},
        bindings: {
          value: { type: 'variable', value: 'searchQuery' },
        },
      },
    ],
  };

  return {
    version: '1.0.0',
    id: 'doc-1',
    canvas: { width: 800, backgroundColor: '#ffffff' },
    root,
    variables: [
      { id: 'var-1', name: 'count', type: 'number', defaultValue: 0, scope: 'document' },
      { id: 'var-2', name: 'searchQuery', type: 'string', defaultValue: '', scope: 'document' },
    ],
    dataSources: [],
    eventBus: { listeners: [] },
    meta: { name: '测试组件', createdAt: '2026-04-18T00:00:00Z', updatedAt: '2026-04-18T00:00:00Z' },
    ...overrides,
  };
}

describe('SchemaAnalyzer', () => {
  it('should extract component name from meta.name', () => {
    const doc = createTestDocument();
    const result = SchemaAnalyzer.analyze(doc);
    expect(result.meta.componentName).toBe('ExportedComponent');
  });

  it('should flatten component tree in DFS order', () => {
    const doc = createTestDocument();
    const result = SchemaAnalyzer.analyze(doc);
    expect(result.components).toHaveLength(4); // root + 3 children
    expect(result.components[0].type).toBe('Box');
    expect(result.components[1].type).toBe('Text');
    expect(result.components[2].type).toBe('Button');
    expect(result.components[3].type).toBe('Input');
  });

  it('should set parent and depth correctly', () => {
    const doc = createTestDocument();
    const result = SchemaAnalyzer.analyze(doc);
    expect(result.components[0].parent).toBeNull();
    expect(result.components[0].depth).toBe(0);
    expect(result.components[1].parent).toBe('root');
    expect(result.components[1].depth).toBe(1);
  });

  it('should extract variables from document.variables', () => {
    const doc = createTestDocument();
    const result = SchemaAnalyzer.analyze(doc);
    expect(result.variables).toHaveLength(2);
    expect(result.variables[0].name).toBe('count');
    expect(result.variables[0].setterName).toBe('setCount');
    expect(result.variables[1].name).toBe('searchQuery');
    expect(result.variables[1].setterName).toBe('setSearchQuery');
  });

  it('should extract event handlers from component tree', () => {
    const doc = createTestDocument();
    const result = SchemaAnalyzer.analyze(doc);
    expect(result.eventHandlers).toHaveLength(1);
    expect(result.eventHandlers[0].componentId).toBe('btn-1');
    expect(result.eventHandlers[0].eventName).toBe('onClick');
    expect(result.eventHandlers[0].functionName).toBe('handleButtonClick');
  });

  it('should extract styles for each component', () => {
    const doc = createTestDocument();
    const result = SchemaAnalyzer.analyze(doc);
    expect(result.styles.length).toBeGreaterThanOrEqual(1);
    expect(result.styles[0].className).toBe('root');
  });

  it('should collect antd imports based on component types', () => {
    const doc = createTestDocument();
    const result = SchemaAnalyzer.analyze(doc);
    expect(result.antdImports.has('Button')).toBe(true);
    expect(result.antdImports.has('Input')).toBe(true);
    expect(result.antdImports.has('Typography')).toBe(true);
    expect(result.antdImports.has('Flex')).toBe(true);
  });

  it('should collect bindings from components', () => {
    const doc = createTestDocument();
    const result = SchemaAnalyzer.analyze(doc);
    const inputComp = result.components.find(c => c.type === 'Input');
    expect(inputComp!.bindings.value).toBeDefined();
    expect(inputComp!.bindings.value.type).toBe('variable');
    expect(inputComp!.bindings.value.value).toBe('searchQuery');
  });

  it('should handle nested containers', () => {
    const doc = createTestDocument({
      root: {
        id: 'root',
        type: 'Box',
        props: {},
        style: {},
        children: [
          {
            id: 'card-1',
            type: 'Card',
            props: { title: '卡片', padding: 16, borderRadius: 8, background: '#fff' },
            style: {},
            children: [
              {
                id: 'text-inner',
                type: 'Text',
                props: { text: 'Inner', fontSize: 14, fontWeight: 'normal', color: '#333', textAlign: 'left' },
                style: {},
              },
            ],
          },
        ],
      },
    } as any);
    const result = SchemaAnalyzer.analyze(doc);
    expect(result.components).toHaveLength(3);
    expect(result.components[2].parent).toBe('card-1');
    expect(result.components[2].depth).toBe(2);
    expect(result.antdImports.has('Card')).toBe(true);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `pnpm --filter @open-lowcode/codegen test`
Expected: FAIL — `Cannot find module './SchemaAnalyzer'`

- [ ] **Step 4: Write SchemaAnalyzer implementation**

`packages/codegen/src/analyzer/SchemaAnalyzer.ts`:

```typescript
import type { ComponentInstance, DocumentSchema, Variable } from '@open-lowcode/engine';
import type {
  AnalyzedSchema,
  AnalyzedComponent,
  AnalyzedVariable,
  AnalyzedEventHandler,
  AnalyzedStyle,
} from './types';
import { generateSetterName, generateHandlerName, generateStyleClassName, toPascalCase } from '../utils/naming';

/** Maps Schema component types to their antd import names */
const COMPONENT_TO_antd_IMPORT: Record<string, string[]> = {
  Text: ['Typography'],
  Button: ['Button'],
  Image: ['Image'],
  Icon: [],
  Link: ['Typography'],
  Box: ['Flex'],
  Card: ['Card'],
  Grid: ['Row', 'Col'],
  Tabs: ['Tabs'],
  Input: ['Input'],
  Select: ['Select'],
  Checkbox: ['Checkbox'],
  Form: ['Form'],
  Table: ['Table'],
  List: ['List'],
};

/** Maps Schema icon values to @ant-design/icons component names */
const ICON_MAP: Record<string, string> = {
  smile: 'SmileOutlined',
  star: 'StarOutlined',
  heart: 'HeartOutlined',
  search: 'SearchOutlined',
  home: 'HomeOutlined',
  setting: 'SettingOutlined',
  user: 'UserOutlined',
};

export class SchemaAnalyzer {
  static analyze(doc: DocumentSchema): AnalyzedSchema {
    const componentName = toPascalCase(doc.meta.name);
    const antdImports = new Set<string>();
    const iconImports = new Set<string>();
    const runtimeImports = new Set<string>();

    // Analyze variables
    const variables: AnalyzedVariable[] = doc.variables.map((v: Variable) => ({
      name: v.name,
      type: v.type,
      defaultValue: v.defaultValue,
      setterName: generateSetterName(v.name),
    }));

    // Walk the component tree (DFS)
    const components: AnalyzedComponent[] = [];
    const styles: AnalyzedStyle[] = [];
    const eventHandlers: AnalyzedEventHandler[] = [];

    function walk(instance: ComponentInstance, parent: string | null, depth: number): void {
      const styleId = instance.id;
      const className = parent === null ? 'root' : generateStyleClassName(instance.type, instance.id);

      // Collect style if non-empty
      if (Object.keys(instance.style).length > 0) {
        styles.push({
          id: styleId,
          className,
          cssProperties: instance.style as Record<string, string | number>,
          componentName: instance.type,
        });
      }

      // Collect antd imports
      const imports = COMPONENT_TO_antd_IMPORT[instance.type] ?? [];
      imports.forEach((imp) => antdImports.add(imp));

      // Collect icon imports
      if (instance.type === 'Icon') {
        const iconName = instance.props.icon as string;
        const mappedIcon = ICON_MAP[iconName];
        if (mappedIcon) iconImports.add(mappedIcon);
      }

      // Collect event handlers
      if (instance.eventHandlers) {
        for (const [eventName, actions] of Object.entries(instance.eventHandlers)) {
          eventHandlers.push({
            id: `${instance.id}-${eventName}`,
            componentId: instance.id,
            eventName,
            actions,
            functionName: generateHandlerName(instance.type, eventName),
          });
        }
      }

      // Build the analyzed component
      const analyzed: AnalyzedComponent = {
        id: instance.id,
        type: instance.type,
        props: { ...instance.props },
        bindings: instance.bindings ? { ...instance.bindings } as any : {},
        styleId,
        children: instance.children?.map((c) => c.id) ?? [],
        parent,
        depth,
      };

      components.push(analyzed);

      // Recurse into children
      instance.children?.forEach((child) => walk(child, instance.id, depth + 1));
    }

    walk(doc.root, null, 0);

    // Determine runtime imports needed
    if (variables.length > 0) runtimeImports.add('useState');
    if (eventHandlers.length > 0) runtimeImports.add('useCallback');

    return {
      meta: { componentName, description: doc.meta.description },
      components,
      variables,
      eventHandlers,
      dataSources: doc.dataSources.map((ds) => ({
        id: ds.id,
        name: ds.name,
        type: ds.type,
        config: { ...ds.config },
        transform: ds.transform,
      })),
      styles,
      antdImports,
      iconImports,
      runtimeImports,
    };
  }
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `pnpm --filter @open-lowcode/codegen test`

Expected: PASS (all analyzer tests)

- [ ] **Step 6: Commit**

```bash
git add packages/codegen/src/analyzer/
git commit -m "feat(codegen): add SchemaAnalyzer with DFS tree walk, import collection, and binding extraction"
```

---

## Task 3: ComponentMap + ImportCollector

**Files:**
- Create: `packages/codegen/src/generators/react/ComponentMap.ts`
- Create: `packages/codegen/src/generators/react/ImportCollector.ts`
- Create: `packages/codegen/src/generators/react/ImportCollector.test.ts`

- [ ] **Step 1: Create ComponentMap — Schema type → antd JSX mapping rules**

`packages/codegen/src/generators/react/ComponentMap.ts`:

```typescript
import type { CSSProperties } from 'react';

/**
 * Describes how a Schema component type maps to an antd JSX element.
 */
export interface ComponentMapping {
  /** The JSX tag name to use in output, e.g. 'Button', 'Typography.Text', 'Flex' */
  jsxTag: string;
  /** The import path, e.g. 'antd' or '@ant-design/icons' */
  importPath: string;
  /** Named imports from importPath, e.g. ['Button'] or ['Row', 'Col'] */
  namedImports: string[];
  /**
   * Transform Schema props to JSX attributes.
   * Key: Schema prop name. Value: JSX attribute name (null = skip).
   */
  propMapping: Record<string, string | null>;
  /**
   * Props whose values should be passed as JSX expression containers
   * rather than string literals (e.g. 'disabled', 'block').
   */
  expressionProps?: Set<string>;
  /** Props that should become the JSX children instead of attributes */
  childrenProp?: string;
  /** If true, wrap children in <Col> (Grid specific) */
  wrapChildrenInCol?: boolean;
}

const ICON_NAME_MAP: Record<string, string> = {
  smile: 'SmileOutlined',
  star: 'StarOutlined',
  heart: 'HeartOutlined',
  search: 'SearchOutlined',
  home: 'HomeOutlined',
  setting: 'SettingOutlined',
  user: 'UserOutlined',
};

export { ICON_NAME_MAP };

/** Complete mapping table: Schema type → antd JSX element */
export const COMPONENT_MAP: Record<string, ComponentMapping> = {
  Text: {
    jsxTag: 'Typography.Text',
    importPath: 'antd',
    namedImports: ['Typography'],
    propMapping: {
      text: null, // becomes children
      fontSize: null, // goes to style
      fontWeight: null, // goes to style
      color: null, // goes to style
      textAlign: null, // goes to style
    },
    childrenProp: 'text',
  },
  Button: {
    jsxTag: 'Button',
    importPath: 'antd',
    namedImports: ['Button'],
    propMapping: {
      text: null, // becomes children
      type: 'type',
      disabled: 'disabled',
      size: 'size',
      block: 'block',
      danger: 'danger',
    },
    expressionProps: new Set(['disabled', 'block', 'danger']),
    childrenProp: 'text',
  },
  Image: {
    jsxTag: 'Image',
    importPath: 'antd',
    namedImports: ['Image'],
    propMapping: {
      src: 'src',
      alt: 'alt',
      width: 'width',
      height: 'height',
      objectFit: null, // goes to style
      borderRadius: null, // goes to style
    },
  },
  Icon: {
    jsxTag: 'ICON_PLACEHOLDER', // resolved at generation time via ICON_NAME_MAP
    importPath: '@ant-design/icons',
    namedImports: [], // resolved dynamically
    propMapping: {
      icon: null, // used to look up component
      size: null, // goes to style
      color: null, // goes to style
    },
  },
  Link: {
    jsxTag: 'Typography.Link',
    importPath: 'antd',
    namedImports: ['Typography'],
    propMapping: {
      text: null, // becomes children
      href: 'href',
      target: 'target',
      fontSize: null, // goes to style
      color: null, // goes to style
    },
    childrenProp: 'text',
  },
  Box: {
    jsxTag: 'Flex',
    importPath: 'antd',
    namedImports: ['Flex'],
    propMapping: {
      padding: null, // goes to style
      gap: 'gap',
      direction: null, // maps to 'vertical' prop
      borderRadius: null, // goes to style
      background: null, // goes to style
    },
  },
  Card: {
    jsxTag: 'Card',
    importPath: 'antd',
    namedImports: ['Card'],
    propMapping: {
      title: 'title',
      padding: null, // goes to style
      borderRadius: null, // goes to style
      background: null, // goes to style
    },
  },
  Grid: {
    jsxTag: 'Row',
    importPath: 'antd',
    namedImports: ['Row', 'Col'],
    propMapping: {
      columns: null, // used to calculate Col span
      gap: null, // maps to Row gutter
      padding: null, // goes to style
    },
    wrapChildrenInCol: true,
  },
  Tabs: {
    jsxTag: 'Tabs',
    importPath: 'antd',
    namedImports: ['Tabs'],
    propMapping: {
      items: null, // parsed into items array
    },
  },
  Input: {
    jsxTag: 'Input',
    importPath: 'antd',
    namedImports: ['Input'],
    propMapping: {
      placeholder: 'placeholder',
      size: 'size',
      disabled: 'disabled',
    },
    expressionProps: new Set(['disabled']),
  },
  Select: {
    jsxTag: 'Select',
    importPath: 'antd',
    namedImports: ['Select'],
    propMapping: {
      placeholder: 'placeholder',
      options: null, // parsed into options array
      size: 'size',
      disabled: 'disabled',
    },
    expressionProps: new Set(['disabled']),
  },
  Checkbox: {
    jsxTag: 'Checkbox',
    importPath: 'antd',
    namedImports: ['Checkbox'],
    propMapping: {
      label: null, // becomes children
      disabled: 'disabled',
    },
    expressionProps: new Set(['disabled']),
    childrenProp: 'label',
  },
  Form: {
    jsxTag: 'Form',
    importPath: 'antd',
    namedImports: ['Form'],
    propMapping: {
      labelAlign: 'labelAlign',
      gap: null, // goes to style
      padding: null, // goes to style
    },
  },
  Table: {
    jsxTag: 'Table',
    importPath: 'antd',
    namedImports: ['Table'],
    propMapping: {
      columns: null, // parsed into column definitions
      data: null, // parsed into dataSource
      size: 'size',
      bordered: 'bordered',
    },
    expressionProps: new Set(['bordered']),
  },
  List: {
    jsxTag: 'List',
    importPath: 'antd',
    namedImports: ['List'],
    propMapping: {
      items: null, // parsed into dataSource
      ordered: null, // affects renderItem
      gap: null, // goes to style
    },
  },
};

/**
 * Style-related props that should be extracted into CSS Modules
 * instead of passed as inline style or JSX attributes.
 */
export const STYLE_PROPS: Record<string, (value: any) => Record<string, string | number> | null> = {
  Text: (props: any) => ({
    fontSize: props.fontSize ?? 14,
    fontWeight: props.fontWeight ?? 'normal',
    color: props.color ?? '#333',
    textAlign: props.textAlign ?? 'left',
    wordBreak: 'break-word',
  }),
  Link: (props: any) => ({
    fontSize: props.fontSize ?? 14,
    color: props.color ?? '#1677ff',
    textDecoration: 'none',
  }),
  Box: (props: any) => {
    const style: Record<string, string | number> = {
      padding: props.padding ?? 8,
      borderRadius: props.borderRadius ?? 0,
      background: props.background ?? 'transparent',
    };
    return style;
  },
  Card: (props: any) => ({
    padding: props.padding ?? 16,
    borderRadius: props.borderRadius ?? 8,
    background: props.background ?? '#ffffff',
    border: '1px solid #f0f0f0',
    boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
  }),
  Grid: (props: any) => ({
    padding: props.padding ?? 0,
  }),
  Image: (props: any) => ({
    objectFit: props.objectFit ?? 'cover',
    borderRadius: props.borderRadius ?? 0,
  }),
  Icon: (props: any) => ({
    fontSize: props.size ?? 24,
    color: props.color ?? '#333',
    display: 'inline-flex',
  }),
  List: (props: any) => ({
    ...(props.gap ? { gap: props.gap } : {}),
  }),
};
```

- [ ] **Step 2: Write failing test for ImportCollector**

`packages/codegen/src/generators/react/ImportCollector.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { ImportCollector } from './ImportCollector';
import * as t from '@babel/types';

describe('ImportCollector', () => {
  it('should collect and deduplicate imports', () => {
    const collector = new ImportCollector();
    collector.addDefaultImport('react', 'React');
    collector.addNamedImport('react', 'useState');
    collector.addNamedImport('react', 'useState'); // duplicate
    collector.addNamedImport('antd', 'Button');
    collector.addNamedImport('antd', 'Input');
    collector.addNamedImport('antd', 'Button'); // duplicate

    const statements = collector.toAST();
    expect(statements).toHaveLength(2);

    // First import: react
    const reactImport = statements[0] as t.ImportDeclaration;
    expect(reactImport.source.value).toBe('react');
    const reactSpecifiers = reactImport.specifiers.map((s) => {
      if (t.isImportDefaultSpecifier(s)) return s.local.name;
      if (t.isImportSpecifier(s) && t.isIdentifier(s.imported)) return s.imported.name;
      return '';
    });
    expect(reactSpecifiers).toContain('React');
    expect(reactSpecifiers).toContain('useState');

    // Second import: antd
    const antdImport = statements[1] as t.ImportDeclaration;
    expect(antdImport.source.value).toBe('antd');
    const antdSpecifiers = antdImport.specifiers.map((s) => {
      if (t.isImportSpecifier(s) && t.isIdentifier(s.imported)) return s.imported.name;
      return '';
    });
    expect(antdSpecifiers).toContain('Button');
    expect(antdSpecifiers).toContain('Input');
    expect(antdSpecifiers).toHaveLength(2);
  });

  it('should handle @ant-design/icons imports', () => {
    const collector = new ImportCollector();
    collector.addNamedImport('@ant-design/icons', 'SmileOutlined');
    collector.addNamedImport('@ant-design/icons', 'StarOutlined');

    const statements = collector.toAST();
    const iconsImport = statements.find(
      (s) => t.isImportDeclaration(s) && (s as t.ImportDeclaration).source.value === '@ant-design/icons',
    ) as t.ImportDeclaration;
    expect(iconsImport).toBeDefined();
    expect(iconsImport.specifiers).toHaveLength(2);
  });

  it('should handle CSS module import', () => {
    const collector = new ImportCollector();
    collector.addDefaultImport('./styles.module.css', 'styles');

    const statements = collector.toAST();
    const cssImport = statements.find(
      (s) => t.isImportDeclaration(s) && (s as t.ImportDeclaration).source.value === './styles.module.css',
    ) as t.ImportDeclaration;
    expect(cssImport).toBeDefined();
  });

  it('should handle relative imports', () => {
    const collector = new ImportCollector();
    collector.addNamedImport('./types', 'ExportedComponentProps');
    collector.addNamedImport('./hooks/useStateVars', 'useVars');
    collector.addNamedImport('./handlers/eventHandlers', 'createHandlers');

    const statements = collector.toAST();
    expect(statements).toHaveLength(3);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `pnpm --filter @open-lowcode/codegen test`
Expected: FAIL — `Cannot find module './ImportCollector'`

- [ ] **Step 4: Write ImportCollector implementation**

`packages/codegen/src/generators/react/ImportCollector.ts`:

```typescript
import * as t from '@babel/types';

interface ImportEntry {
  source: string;
  defaultImport?: string;
  namedImports: Set<string>;
}

/**
 * Collects import declarations and deduplicates them by source.
 * Produces sorted ImportDeclaration AST nodes.
 */
export class ImportCollector {
  private imports = new Map<string, ImportEntry>();

  addDefaultImport(source: string, localName: string): void {
    const entry = this.getOrCreate(source);
    entry.defaultImport = localName;
  }

  addNamedImport(source: string, name: string): void {
    const entry = this.getOrCreate(source);
    entry.namedImports.add(name);
  }

  private getOrCreate(source: string): ImportEntry {
    if (!this.imports.has(source)) {
      this.imports.set(source, { source, namedImports: new Set() });
    }
    return this.imports.get(source)!;
  }

  /**
   * Convert collected imports to an array of ImportDeclaration AST nodes.
   * Sort order: 'react' first, then package imports, then relative imports.
   */
  toAST(): t.ImportDeclaration[] {
    const entries = Array.from(this.imports.values());

    // Sort: react → packages → relative
    entries.sort((a, b) => {
      if (a.source === 'react') return -1;
      if (b.source === 'react') return 1;
      const aIsRelative = a.source.startsWith('.');
      const bIsRelative = b.source.startsWith('.');
      if (aIsRelative && !bIsRelative) return 1;
      if (!aIsRelative && bIsRelative) return -1;
      return a.source.localeCompare(b.source);
    });

    return entries.map((entry) => {
      const specifiers: t.ImportSpecifier[] = [];

      // Named imports
      for (const name of Array.from(entry.namedImports).sort()) {
        specifiers.push(
          t.importSpecifier(t.identifier(name), t.identifier(name)),
        );
      }

      // Build the full specifiers list
      const allSpecifiers: t.ImportDeclaration['specifiers'] = [];

      if (entry.defaultImport) {
        allSpecifiers.push(t.importDefaultSpecifier(t.identifier(entry.defaultImport)));
      }

      allSpecifiers.push(...specifiers);

      return t.importDeclaration(allSpecifiers, t.stringLiteral(entry.source));
    });
  }
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `pnpm --filter @open-lowcode/codegen test`

Expected: PASS (all tests)

- [ ] **Step 6: Commit**

```bash
git add packages/codegen/src/generators/
git commit -m "feat(codegen): add ComponentMap (15 Schema types → antd) and ImportCollector with tests"
```

---

## Task 4: StyleBuilder + CSSEmitter

**Files:**
- Create: `packages/codegen/src/generators/react/StyleBuilder.ts`
- Create: `packages/codegen/src/generators/react/StyleBuilder.test.ts`
- Create: `packages/codegen/src/emitter/CSSEmitter.ts`
- Create: `packages/codegen/src/emitter/CSSEmitter.test.ts`
- Create: `packages/codegen/src/emitter/index.ts`

- [ ] **Step 1: Write failing test for CSSEmitter**

`packages/codegen/src/emitter/CSSEmitter.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { CSSEmitter } from './CSSEmitter';

describe('CSSEmitter', () => {
  it('should emit a single CSS rule', () => {
    const css = CSSEmitter.emit({
      root: {
        minHeight: 400,
        padding: 16,
      },
    });
    expect(css).toContain('.root {');
    expect(css).toContain('  min-height: 400px;');
    expect(css).toContain('  padding: 16px;');
  });

  it('should emit multiple CSS rules', () => {
    const css = CSSEmitter.emit({
      root: { padding: 16 },
      buttonAbc123: { color: '#333', fontSize: 14 },
    });
    expect(css).toContain('.root {');
    expect(css).toContain('.buttonAbc123 {');
    expect(css).toContain('  color: #333;');
  });

  it('should handle string values without px', () => {
    const css = CSSEmitter.emit({
      card: { background: '#ffffff', display: 'flex' },
    });
    expect(css).toContain('  background: #ffffff;');
    expect(css).toContain('  display: flex;');
  });

  it('should produce empty string for empty rules', () => {
    const css = CSSEmitter.emit({});
    expect(css).toBe('');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @open-lowcode/codegen test`
Expected: FAIL

- [ ] **Step 3: Write CSSEmitter implementation**

`packages/codegen/src/emitter/CSSEmitter.ts`:

```typescript
import { camelToKebab, formatCssValue } from '../utils/cssUtils';

/**
 * Emits CSS Module rules from a className → properties map.
 */
export class CSSEmitter {
  /**
   * Convert a map of CSS class rules to a CSS Module file string.
   */
  static emit(rules: Record<string, Record<string, string | number>>): string {
    const entries = Object.entries(rules);
    if (entries.length === 0) return '';

    return entries
      .map(([className, properties]) => {
        const props = Object.entries(properties)
          .map(([prop, value]) => {
            const kebabProp = camelToKebab(prop);
            const formattedValue = formatCssValue(prop, value);
            return `  ${kebabProp}: ${formattedValue};`;
          })
          .join('\n');
        return `.${className} {\n${props}\n}`;
      })
      .join('\n\n');
  }
}
```

- [ ] **Step 4: Write failing test for StyleBuilder**

`packages/codegen/src/generators/react/StyleBuilder.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import type { AnalyzedStyle } from '../../analyzer/types';
import { StyleBuilder } from './StyleBuilder';
import { STYLE_PROPS } from './ComponentMap';

describe('StyleBuilder', () => {
  it('should build a CSS Modules file from analyzed styles', () => {
    const styles: AnalyzedStyle[] = [
      { id: 'root', className: 'root', cssProperties: { minHeight: 400, padding: 16 }, componentName: 'Box' },
      { id: 'btn-1', className: 'buttonAbc123', cssProperties: { fontSize: 14, color: '#333' }, componentName: 'Text' },
    ];
    const result = StyleBuilder.build(styles);
    expect(result).toContain('.root {');
    expect(result).toContain('min-height: 400px');
    expect(result).toContain('.buttonAbc123 {');
  });

  it('should produce CSS Module file content from component props using STYLE_PROPS', () => {
    // Build styles from a Text component's props
    const textProps = { text: 'Hello', fontSize: 14, fontWeight: 'normal', color: '#333', textAlign: 'left' };
    const extractor = STYLE_PROPS['Text'];
    const extractedStyles = extractor(textProps);
    expect(extractedStyles).toBeDefined();
    expect(extractedStyles!.fontSize).toBe(14);
    expect(extractedStyles!.color).toBe('#333');
  });

  it('should return empty string for empty styles', () => {
    const result = StyleBuilder.build([]);
    expect(result).toBe('');
  });
});
```

- [ ] **Step 5: Run test to verify it fails**

Run: `pnpm --filter @open-lowcode/codegen test`
Expected: FAIL

- [ ] **Step 6: Write StyleBuilder implementation**

`packages/codegen/src/generators/react/StyleBuilder.ts`:

```typescript
import type { AnalyzedStyle } from '../../analyzer/types';
import { CSSEmitter } from '../../emitter/CSSEmitter';

/**
 * Builds a CSS Modules file from analyzed styles.
 */
export class StyleBuilder {
  /**
   * Convert analyzed styles into a styles.module.css file content.
   */
  static build(styles: AnalyzedStyle[]): string {
    if (styles.length === 0) return '';

    const rules: Record<string, Record<string, string | number>> = {};
    for (const style of styles) {
      if (Object.keys(style.cssProperties).length > 0) {
        rules[style.className] = style.cssProperties;
      }
    }

    return CSSEmitter.emit(rules);
  }
}
```

- [ ] **Step 7: Create emitter index**

`packages/codegen/src/emitter/index.ts`:

```typescript
export { CSSEmitter } from './CSSEmitter';
```

- [ ] **Step 8: Run all tests to verify they pass**

Run: `pnpm --filter @open-lowcode/codegen test`

Expected: PASS

- [ ] **Step 9: Commit**

```bash
git add packages/codegen/src/generators/react/StyleBuilder.ts packages/codegen/src/generators/react/StyleBuilder.test.ts packages/codegen/src/emitter/
git commit -m "feat(codegen): add StyleBuilder and CSSEmitter for CSS Modules generation"
```

---

## Task 5: ComponentBuilder — Schema → JSX AST

**Files:**
- Create: `packages/codegen/src/generators/react/ComponentBuilder.ts`
- Create: `packages/codegen/src/generators/react/ComponentBuilder.test.ts`

- [ ] **Step 1: Write failing test for ComponentBuilder**

`packages/codegen/src/generators/react/ComponentBuilder.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import type { AnalyzedComponent, AnalyzedSchema } from '../../analyzer/types';
import { ComponentBuilder } from './ComponentBuilder';
import generate from '@babel/generator';
import * as t from '@babel/types';

function createMinimalAnalyzedSchema(overrides?: Partial<AnalyzedSchema>): AnalyzedSchema {
  return {
    meta: { componentName: 'TestComponent' },
    components: [],
    variables: [],
    eventHandlers: [],
    dataSources: [],
    styles: [],
    antdImports: new Set(),
    iconImports: new Set(),
    runtimeImports: new Set(),
    ...overrides,
  };
}

describe('ComponentBuilder', () => {
  it('should generate a Text component as Typography.Text', () => {
    const components: AnalyzedComponent[] = [
      { id: 'text-1', type: 'Text', props: { text: 'Hello', fontSize: 14, fontWeight: 'normal', color: '#333', textAlign: 'left' }, bindings: {}, styleId: 'text-1', children: [], parent: 'root', depth: 1 },
    ];
    const schema = createMinimalAnalyzedSchema({ components });
    const ast = ComponentBuilder.buildReturnStatement(schema);
    const { code } = generate(t.file(t.program([t.expressionStatement(ast)])));
    expect(code).toContain('Typography.Text');
    expect(code).toContain('Hello');
  });

  it('should generate a Button component with children text', () => {
    const components: AnalyzedComponent[] = [
      { id: 'btn-1', type: 'Button', props: { text: 'Click me', type: 'primary', disabled: false, size: 'middle', block: false, danger: false }, bindings: {}, styleId: 'btn-1', children: [], parent: 'root', depth: 1 },
    ];
    const schema = createMinimalAnalyzedSchema({ components });
    const ast = ComponentBuilder.buildReturnStatement(schema);
    const { code } = generate(t.file(t.program([t.expressionStatement(ast)])));
    expect(code).toContain('<Button');
    expect(code).toContain('Click me');
    expect(code).toContain('type="primary"');
  });

  it('should generate Box as Flex with vertical prop', () => {
    const root: AnalyzedComponent = { id: 'root', type: 'Box', props: { padding: 8, gap: 0, direction: 'column', borderRadius: 0, background: 'transparent' }, bindings: {}, styleId: 'root', children: [], parent: null, depth: 0 };
    const child: AnalyzedComponent = { id: 'text-1', type: 'Text', props: { text: 'Child', fontSize: 14, fontWeight: 'normal', color: '#333', textAlign: 'left' }, bindings: {}, styleId: 'text-1', children: [], parent: 'root', depth: 1 };
    root.children = ['text-1'];
    const schema = createMinimalAnalyzedSchema({ components: [root, child] });
    const ast = ComponentBuilder.buildReturnStatement(schema);
    const { code } = generate(t.file(t.program([t.expressionStatement(ast)])));
    expect(code).toContain('<Flex');
    expect(code).toContain('vertical');
  });

  it('should handle variable bindings as expression containers', () => {
    const components: AnalyzedComponent[] = [
      { id: 'input-1', type: 'Input', props: { placeholder: '请输入', size: 'middle', disabled: false }, bindings: { value: { type: 'variable', value: 'searchQuery' } }, styleId: 'input-1', children: [], parent: 'root', depth: 1 },
    ];
    const schema = createMinimalAnalyzedSchema({
      components,
      variables: [{ name: 'searchQuery', type: 'string', defaultValue: '', setterName: 'setSearchQuery' }],
    });
    const ast = ComponentBuilder.buildReturnStatement(schema);
    const { code } = generate(t.file(t.program([t.expressionStatement(ast)])));
    expect(code).toContain('<Input');
    expect(code).toContain('vars.searchQuery');
  });

  it('should handle event handler references', () => {
    const components: AnalyzedComponent[] = [
      { id: 'btn-1', type: 'Button', props: { text: 'Go', type: 'primary', disabled: false, size: 'middle', block: false, danger: false }, bindings: {}, styleId: 'btn-1', children: [], parent: 'root', depth: 1 },
    ];
    const schema = createMinimalAnalyzedSchema({
      components,
      eventHandlers: [{ id: 'btn-1-onClick', componentId: 'btn-1', eventName: 'onClick', actions: [{ type: 'setState', config: { variable: 'count', value: 'count + 1' } }], functionName: 'handleButtonClick' }],
    });
    const ast = ComponentBuilder.buildReturnStatement(schema);
    const { code } = generate(t.file(t.program([t.expressionStatement(ast)])));
    expect(code).toContain('onClick={handlers.handleButtonClick}');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @open-lowcode/codegen test`
Expected: FAIL

- [ ] **Step 3: Write ComponentBuilder implementation**

`packages/codegen/src/generators/react/ComponentBuilder.ts`:

```typescript
import * as t from '@babel/types';
import type { AnalyzedComponent, AnalyzedSchema } from '../../analyzer/types';
import { COMPONENT_MAP, ICON_NAME_MAP, STYLE_PROPS } from './ComponentMap';

/**
 * Builds JSX AST nodes from AnalyzedSchema components.
 */
export class ComponentBuilder {
  /**
   * Build the top-level return statement JSX for a component.
   */
  static buildReturnStatement(schema: AnalyzedSchema): t.ReturnStatement {
    const rootComponent = schema.components.find((c) => c.parent === null);
    if (!rootComponent) {
      return t.returnStatement(t.nullLiteral());
    }
    const jsx = this.buildJSX(rootComponent, schema);
    return t.returnStatement(jsx);
  }

  /**
   * Build a JSX element for a single analyzed component.
   */
  static buildJSX(component: AnalyzedComponent, schema: AnalyzedSchema): t.JSXElement {
    const mapping = COMPONENT_MAP[component.type];
    const componentMap = this.getOrCreate(component, schema);

    // For Icon: resolve the specific icon component
    if (component.type === 'Icon') {
      return this.buildIconJSX(component, schema);
    }

    // Build JSX tag
    const tagParts = mapping.jsxTag.split('.');
    const openingIdentifier = t.jsxIdentifier(tagParts[0]);
    const closingIdentifier = t.jsxIdentifier(tagParts[0]);

    // Build attributes
    const attributes = this.buildAttributes(component, schema, mapping);

    // Build children
    const children = this.buildChildren(component, schema, mapping);

    // Add text child if mapping specifies a childrenProp
    if (mapping.childrenProp && component.props[mapping.childrenProp] !== undefined) {
      const textContent = String(component.props[mapping.childrenProp]);
      children.unshift(t.jsxText(textContent));
    }

    const openingElement = tagParts.length > 1
      ? t.jsxOpeningElement(
          t.jsxMemberExpression(t.jsxIdentifier(tagParts[0]), t.jsxIdentifier(tagParts[1])),
          attributes,
          children.length === 0,
        )
      : t.jsxOpeningElement(openingIdentifier, attributes, children.length === 0);

    const closingElement = tagParts.length > 1
      ? t.jsxClosingElement(t.jsxMemberExpression(t.jsxIdentifier(tagParts[0]), t.jsxIdentifier(tagParts[1])))
      : t.jsxClosingElement(closingIdentifier);

    return t.jsxElement(openingElement, closingElement, children);
  }

  private static getOrCreate(component: AnalyzedComponent, schema: AnalyzedSchema): null {
    return null;
  }

  private static buildIconJSX(component: AnalyzedComponent, schema: AnalyzedSchema): t.JSXElement {
    const iconName = component.props.icon as string;
    const mappedName = ICON_NAME_MAP[iconName] ?? 'SmileOutlined';
    const identifier = t.jsxIdentifier(mappedName);

    const styleObj = STYLE_PROPS.Icon?.(component.props) ?? {};
    const styleProps = Object.entries(styleObj).map(([key, val]) =>
      t.objectProperty(t.identifier(key), typeof val === 'number' ? t.numericLiteral(val) : t.stringLiteral(String(val))),
    );
    const styleAttr = t.jsxAttribute(t.jsxIdentifier('style'), t.jsxExpressionContainer(t.objectExpression(styleProps)));

    return t.jsxElement(
      t.jsxOpeningElement(identifier, [styleAttr], true),
      t.jsxClosingElement(identifier),
      [],
    );
  }

  private static buildAttributes(
    component: AnalyzedComponent,
    schema: AnalyzedSchema,
    mapping: typeof COMPONENT_MAP[string],
  ): t.JSXAttribute[] {
    const attrs: t.JSXAttribute[] = [];

    for (const [schemaProp, jsxAttr] of Object.entries(mapping.propMapping)) {
      if (jsxAttr === null) continue; // Skip props that go to style/children
      if (schemaProp === 'text' || schemaProp === 'label') continue;

      const value = component.props[schemaProp];
      if (value === undefined) continue;

      // Check if this prop has a binding
      const binding = component.bindings[schemaProp];
      if (binding) {
        const expr = this.buildBindingExpression(binding, schema);
        attrs.push(t.jsxAttribute(t.jsxIdentifier(jsxAttr), t.jsxExpressionContainer(expr)));
        continue;
      }

      // Check if this should be a boolean expression
      const isExpression = mapping.expressionProps?.has(schemaProp);
      if (isExpression && typeof value === 'boolean') {
        attrs.push(t.jsxAttribute(t.jsxIdentifier(jsxAttr), t.jsxExpressionContainer(t.booleanLiteral(value))));
      } else if (typeof value === 'number') {
        attrs.push(t.jsxAttribute(t.jsxIdentifier(jsxAttr), t.jsxExpressionContainer(t.numericLiteral(value))));
      } else {
        attrs.push(t.jsxAttribute(t.jsxIdentifier(jsxAttr), t.stringLiteral(String(value))));
      }
    }

    // Handle Box special: direction → vertical
    if (component.type === 'Box') {
      const direction = component.props.direction;
      if (direction === 'column') {
        attrs.push(t.jsxAttribute(t.jsxIdentifier('vertical'), t.jsxExpressionContainer(t.booleanLiteral(true))));
      }
    }

    // Add className from styles
    const styleEntry = schema.styles.find((s) => s.id === component.styleId);
    if (styleEntry && Object.keys(styleEntry.cssProperties).length > 0) {
      attrs.push(t.jsxAttribute(
        t.jsxIdentifier('className'),
        t.jsxExpressionContainer(
          t.memberExpression(t.identifier('styles'), t.identifier(styleEntry.className)),
        ),
      ));
    }

    // Add event handler references
    const componentHandlers = schema.eventHandlers.filter((h) => h.componentId === component.id);
    for (const handler of componentHandlers) {
      attrs.push(t.jsxAttribute(
        t.jsxIdentifier(handler.eventName),
        t.jsxExpressionContainer(
          t.memberExpression(t.identifier('handlers'), t.identifier(handler.functionName)),
        ),
      ));
    }

    return attrs;
  }

  private static buildChildren(
    component: AnalyzedComponent,
    schema: AnalyzedSchema,
    mapping: typeof COMPONENT_MAP[string],
  ): t.JSXElement[] {
    const childComponents = schema.components.filter((c) => component.children.includes(c.id));
    const jsxChildren = childComponents.map((child) => this.buildJSX(child, schema));

    // Grid: wrap children in <Col>
    if (mapping.wrapChildrenInCol) {
      const columns = (component.props.columns as number) || 2;
      const span = Math.floor(24 / columns);
      return jsxChildren.map((child) =>
        t.jsxElement(
          t.jsxOpeningElement(t.jsxIdentifier('Col'), [t.jsxAttribute(t.jsxIdentifier('span'), t.jsxExpressionContainer(t.numericLiteral(span)))]),
          t.jsxClosingElement(t.jsxIdentifier('Col')),
          [child],
        ),
      );
    }

    return jsxChildren;
  }

  private static buildBindingExpression(
    binding: { type: string; value: string },
    schema: AnalyzedSchema,
  ): t.Expression {
    if (binding.type === 'variable') {
      return t.memberExpression(t.identifier('vars'), t.identifier(binding.value));
    }
    if (binding.type === 'expression') {
      // Strip {{ }} wrapper and parse as expression
      const expr = binding.value.replace(/^\{\{(.+)\}\}$/, '$1').trim();
      // Simple variable reference for MVP
      return t.memberExpression(t.identifier('vars'), t.identifier(expr));
    }
    return t.stringLiteral(binding.value);
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm --filter @open-lowcode/codegen test`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/codegen/src/generators/react/ComponentBuilder.ts packages/codegen/src/generators/react/ComponentBuilder.test.ts
git commit -m "feat(codegen): add ComponentBuilder — Schema components → antd JSX AST with bindings and events"
```

---

## Task 6: DataFlowBuilder + ASTEmitter

**Files:**
- Create: `packages/codegen/src/generators/react/DataFlowBuilder.ts`
- Create: `packages/codegen/src/generators/react/DataFlowBuilder.test.ts`
- Create: `packages/codegen/src/emitter/ASTEmitter.ts`

- [ ] **Step 1: Write failing test for DataFlowBuilder**

`packages/codegen/src/generators/react/DataFlowBuilder.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import type { AnalyzedVariable, AnalyzedEventHandler } from '../../analyzer/types';
import { DataFlowBuilder } from './DataFlowBuilder';
import generate from '@babel/generator';
import * as t from '@babel/types';

describe('DataFlowBuilder', () => {
  describe('buildUseVarsHook', () => {
    it('should generate a useVars hook with useState declarations', () => {
      const variables: AnalyzedVariable[] = [
        { name: 'count', type: 'number', defaultValue: 0, setterName: 'setCount' },
        { name: 'name', type: 'string', defaultValue: '', setterName: 'setName' },
      ];
      const ast = DataFlowBuilder.buildUseVarsHook(variables);
      const { code } = generate(t.file(t.program([ast])));
      expect(code).toContain('useState');
      expect(code).toContain('count');
      expect(code).toContain('setCount');
      expect(code).toContain('name');
      expect(code).toContain('setName');
      expect(code).toContain('useVars');
    });

    it('should return empty hook body when no variables', () => {
      const ast = DataFlowBuilder.buildUseVarsHook([]);
      const { code } = generate(t.file(t.program([ast])));
      expect(code).toContain('useVars');
    });
  });

  describe('buildHandlersFile', () => {
    it('should generate handler functions from event actions', () => {
      const variables: AnalyzedVariable[] = [
        { name: 'count', type: 'number', defaultValue: 0, setterName: 'setCount' },
      ];
      const handlers: AnalyzedEventHandler[] = [
        {
          id: 'btn-1-onClick',
          componentId: 'btn-1',
          eventName: 'onClick',
          actions: [{ type: 'setState', config: { variable: 'count', value: 'count + 1' } }],
          functionName: 'handleButtonClick',
        },
      ];
      const ast = DataFlowBuilder.buildHandlersFile(handlers, variables);
      const { code } = generate(t.file(t.program(ast)));
      expect(code).toContain('handleButtonClick');
      expect(code).toContain('setCount');
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @open-lowcode/codegen test`
Expected: FAIL

- [ ] **Step 3: Write DataFlowBuilder implementation**

`packages/codegen/src/generators/react/DataFlowBuilder.ts`:

```typescript
import * as t from '@babel/types';
import type { AnalyzedVariable, AnalyzedEventHandler } from '../../analyzer/types';

/**
 * Builds the data flow layer: useState hooks and event handler functions.
 */
export class DataFlowBuilder {
  /**
   * Build the useVars hook AST — a function with useState declarations.
   */
  static buildUseVarsHook(variables: AnalyzedVariable[]): t.ExportNamedDeclaration {
    const useStateImports = variables.map((v) => {
      const tsType = this.toTsType(v.type);
      const defaultValue = this.valueToAST(v.defaultValue, v.type);

      const useStateCall = t.callExpression(
        t.identifier('useState'),
        tsType
          ? [t.tsAsExpression(defaultValue, t.tsTypeReference(t.identifier(tsType)))]
          : [defaultValue],
      );

      return t.variableDeclarator(
        t.arrayPattern([t.identifier(v.name), t.identifier(v.setterName)]),
        useStateCall,
      );
    });

    const returnProperties = variables.flatMap((v) => [
      t.objectProperty(t.identifier(v.name), t.identifier(v.name), false, true),
      t.objectProperty(t.identifier(v.setterName), t.identifier(v.setterName), false, true),
    ]);

    const functionDecl = t.functionDeclaration(
      t.identifier('useVars'),
      [],
      t.blockStatement([
        t.variableDeclaration('const', useStateImports),
        t.returnStatement(t.objectExpression(returnProperties)),
      ]),
    );

    return t.exportNamedDeclaration(functionDecl);
  }

  /**
   * Build the event handlers file AST — a createHandlers factory function.
   */
  static buildHandlersFile(
    handlers: AnalyzedEventHandler[],
    variables: AnalyzedVariable[],
  ): t.Statement[] {
    if (handlers.length === 0) return [];

    // Build context interface properties
    const ctxProperties = variables.flatMap((v) => [
      t.tsPropertySignature(t.identifier(v.name), t.tsTypeAnnotation(this.toTsTypeAST(v.type))),
      t.tsPropertySignature(
        t.identifier(v.setterName),
        t.tsTypeAnnotation(
          t.tsFunctionType(
            undefined,
            [t.tsFunctionParameter(null, t.tsTypeAnnotation(t.tsAnyKeyword()))],
            t.tsTypeAnnotation(t.tsVoidKeyword()),
          ),
        ),
      ),
    ]);

    const ctxInterface = t.tsInterfaceDeclaration(
      t.identifier('HandlerContext'),
      undefined,
      undefined,
      t.tsInterfaceBody(ctxProperties as any),
    );

    // Build handler functions
    const handlerDeclarations = handlers.map((handler) => {
      const body = this.buildHandlerBody(handler, variables);
      return t.variableDeclarator(
        t.identifier(handler.functionName),
        t.arrowFunctionExpression([], t.blockStatement(body)),
      );
    });

    const returnProperties = handlers.map((h) =>
      t.objectProperty(t.identifier(h.functionName), t.identifier(h.functionName), false, true),
    );

    const createHandlers = t.exportNamedDeclaration(
      t.functionDeclaration(
        t.identifier('createHandlers'),
        [t.identifier('ctx')],
        t.blockStatement([
          t.variableDeclaration('const', handlerDeclarations),
          t.returnStatement(t.objectExpression(returnProperties)),
        ]),
      ),
    );

    return [ctxInterface, createHandlers];
  }

  private static buildHandlerBody(handler: AnalyzedEventHandler, variables: AnalyzedVariable[]): t.Statement[] {
    const statements: t.Statement[] = [];

    for (const action of handler.actions) {
      switch (action.type) {
        case 'setState': {
          const varName = action.config.variable as string;
          const value = action.config.value as string;
          const setterName = `set${varName.charAt(0).toUpperCase()}${varName.slice(1)}`;
          // Simple case: ctx.setCount(ctx.count + 1)
          statements.push(
            t.expressionStatement(
              t.callExpression(
                t.memberExpression(t.identifier('ctx'), t.identifier(setterName)),
                [t.memberExpression(t.identifier('ctx'), t.identifier(value.split(' ')[0]))],
              ),
            ),
          );
          break;
        }
        case 'callApi': {
          const url = (action.config.url as string) ?? '/api/data';
          statements.push(
            t.expressionStatement(
              t.awaitExpression(
                t.callExpression(t.identifier('fetch'), [t.stringLiteral(url)]),
              ),
            ),
          );
          break;
        }
        case 'navigate': {
          const url = (action.config.url as string) ?? '';
          statements.push(
            t.expressionStatement(
              t.assignmentExpression(
                '=',
                t.memberExpression(t.identifier('window'), t.identifier('location.href')),
                t.stringLiteral(url),
              ),
            ),
          );
          break;
        }
        case 'showMessage': {
          const msgType = (action.config.type as string) ?? 'info';
          const content = (action.config.content as string) ?? '';
          statements.push(
            t.expressionStatement(
              t.callExpression(
                t.memberExpression(t.identifier('message'), t.identifier(msgType)),
                [t.stringLiteral(content)],
              ),
            ),
          );
          break;
        }
        default: {
          statements.push(
            t.expressionStatement(
              t.stringLiteral(`/* Custom action: ${action.type} — implement manually */`),
            ),
          );
        }
      }
    }

    return statements;
  }

  private static toTsType(type: string): string | null {
    const map: Record<string, string> = {
      string: 'string',
      number: 'number',
      boolean: 'boolean',
      object: 'Record<string, any>',
      array: 'any[]',
    };
    return map[type] ?? null;
  }

  private static toTsTypeAST(type: string): t.TSType {
    switch (type) {
      case 'string': return t.tsStringKeyword();
      case 'number': return t.tsNumberKeyword();
      case 'boolean': return t.tsBooleanKeyword();
      case 'object': return t.tsAnyKeyword();
      case 'array': return t.tsArrayType(t.tsAnyKeyword());
      default: return t.tsAnyKeyword();
    }
  }

  private static valueToAST(value: any, type: string): t.Expression {
    switch (typeof value) {
      case 'string': return t.stringLiteral(value);
      case 'number': return t.numericLiteral(value);
      case 'boolean': return t.booleanLiteral(value);
      default: return t.nullLiteral();
    }
  }
}
```

- [ ] **Step 4: Write ASTEmitter**

`packages/codegen/src/emitter/ASTEmitter.ts`:

```typescript
import generate from '@babel/generator';
import type { File } from '@babel/types';

/**
 * Emits formatted source code from a Babel AST File node.
 */
export class ASTEmitter {
  static emit(ast: File): string {
    const { code } = generate(ast, {
      retainLines: false,
      compact: false,
    });
    return code;
  }
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `pnpm --filter @open-lowcode/codegen test`

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add packages/codegen/src/generators/react/DataFlowBuilder.ts packages/codegen/src/generators/react/DataFlowBuilder.test.ts packages/codegen/src/emitter/ASTEmitter.ts
git commit -m "feat(codegen): add DataFlowBuilder (useState + handlers) and ASTEmitter"
```

---

## Task 7: ReactGenerator + ZipEmitter — Full Pipeline

**Files:**
- Create: `packages/codegen/src/generators/react/ReactGenerator.ts`
- Create: `packages/codegen/src/generators/react/index.ts`
- Create: `packages/codegen/src/generators/index.ts`
- Create: `packages/codegen/src/emitter/ZipEmitter.ts`
- Update: `packages/codegen/src/index.ts`
- Update: `packages/codegen/src/emitter/index.ts`

- [ ] **Step 1: Create React index files**

`packages/codegen/src/generators/react/index.ts`:

```typescript
export { ReactGenerator } from './ReactGenerator';
export { ComponentBuilder } from './ComponentBuilder';
export { StyleBuilder } from './StyleBuilder';
export { DataFlowBuilder } from './DataFlowBuilder';
export { ImportCollector } from './ImportCollector';
export { COMPONENT_MAP, ICON_NAME_MAP, STYLE_PROPS } from './ComponentMap';
```

`packages/codegen/src/generators/index.ts`:

```typescript
export * from './react';
```

- [ ] **Step 2: Write ZipEmitter**

`packages/codegen/src/emitter/ZipEmitter.ts`:

```typescript
import JSZip from 'jszip';
import type { OutputFile } from '../types';

/**
 * Creates a ZIP archive from generated output files.
 */
export class ZipEmitter {
  static async createZip(files: OutputFile[], folderName: string): Promise<Blob> {
    const zip = new JSZip();
    const folder = zip.folder(folderName)!;
    for (const file of files) {
      folder.file(file.path, file.content);
    }
    return zip.generateAsync({ type: 'blob' });
  }
}
```

- [ ] **Step 3: Write ReactGenerator — the main orchestrator**

`packages/codegen/src/generators/react/ReactGenerator.ts`:

```typescript
import * as t from '@babel/types';
import type { AnalyzedSchema } from '../../analyzer/types';
import type { OutputFile, CodegenResult } from '../../types';
import { ComponentBuilder } from './ComponentBuilder';
import { StyleBuilder } from './StyleBuilder';
import { DataFlowBuilder } from './DataFlowBuilder';
import { ImportCollector } from './ImportCollector';
import { COMPONENT_MAP, STYLE_PROPS } from './ComponentMap';
import { ASTEmitter } from '../../emitter/ASTEmitter';

/**
 * Main orchestrator: AnalyzedSchema → multi-file React component code.
 */
export class ReactGenerator {
  static generate(schema: AnalyzedSchema): CodegenResult {
    const componentName = schema.meta.componentName;
    const files: OutputFile[] = [];

    // 1. Generate styles.module.css
    const cssContent = StyleBuilder.build(schema.styles);
    if (cssContent) {
      files.push({ path: 'styles.module.css', content: cssContent });
    }

    // 2. Generate hooks/useStateVars.ts
    if (schema.variables.length > 0) {
      const hookAST = t.file(t.program([DataFlowBuilder.buildUseVarsHook(schema.variables)]));
      // Add useState import
      const imports = new ImportCollector();
      imports.addNamedImport('react', 'useState');
      hookAST.program.body.unshift(...imports.toAST());
      files.push({ path: 'hooks/useStateVars.ts', content: ASTEmitter.emit(hookAST) });
    }

    // 3. Generate handlers/eventHandlers.ts
    if (schema.eventHandlers.length > 0) {
      const handlerStatements = DataFlowBuilder.buildHandlersFile(schema.eventHandlers, schema.variables);
      if (handlerStatements.length > 0) {
        const handlerAST = t.file(t.program(handlerStatements));
        files.push({ path: 'handlers/eventHandlers.ts', content: ASTEmitter.emit(handlerAST) });
      }
    }

    // 4. Generate types.ts
    const typesContent = this.generateTypesFile(componentName);
    files.push({ path: 'types.ts', content: typesContent });

    // 5. Generate index.tsx (main component)
    const indexContent = this.generateIndexFile(schema);
    files.push({ path: 'index.tsx', content: indexContent });

    return { componentName, files };
  }

  private static generateTypesFile(componentName: string): string {
    const ast = t.file(t.program([
      t.importDeclaration(
        [t.importSpecifier(t.identifier('CSSProperties'), t.identifier('CSSProperties')), t.importSpecifier(t.identifier('ReactNode'), t.identifier('ReactNode'))],
        t.stringLiteral('react'),
      ),
      t.exportNamedDeclaration(
        t.tsInterfaceDeclaration(
          t.identifier(`${componentName}Props`),
          undefined,
          undefined,
          t.tsInterfaceBody([
            t.tsPropertySignature(t.identifier('className'), t.tsTypeAnnotation(t.tsUnionType([t.tsStringKeyword(), t.tsUndefinedKeyword()]))),
            t.tsPropertySignature(t.identifier('style'), t.tsTypeAnnotation(t.tsUnionType([t.tsTypeReference(t.identifier('CSSProperties')), t.tsUndefinedKeyword()]))),
            t.tsPropertySignature(t.identifier('children'), t.tsTypeAnnotation(t.tsUnionType([t.tsTypeReference(t.identifier('ReactNode')), t.tsUndefinedKeyword()]))),
          ] as any),
        ),
      ),
    ]));
    return ASTEmitter.emit(ast);
  }

  private static generateIndexFile(schema: AnalyzedSchema): string {
    const componentName = schema.meta.componentName;
    const imports = new ImportCollector();

    // React import
    imports.addDefaultImport('react', 'React');
    if (schema.runtimeImports.has('useState')) imports.addNamedImport('react', 'useState');

    // antd imports
    for (const imp of schema.antdImports) {
      imports.addNamedImport('antd', imp);
    }

    // icon imports
    for (const icon of schema.iconImports) {
      imports.addNamedImport('@ant-design/icons', icon);
    }

    // CSS Modules import
    if (schema.styles.length > 0) {
      imports.addDefaultImport('./styles.module.css', 'styles');
    }

    // Relative imports
    imports.addNamedImport('./types', `${componentName}Props`);
    if (schema.variables.length > 0) {
      imports.addNamedImport('./hooks/useStateVars', 'useVars');
    }
    if (schema.eventHandlers.length > 0) {
      imports.addNamedImport('./handlers/eventHandlers', 'createHandlers');
    }

    // Build component function body
    const bodyStatements: t.Statement[] = [];

    // const vars = useVars();
    if (schema.variables.length > 0) {
      bodyStatements.push(
        t.variableDeclaration('const', [
          t.variableDeclarator(t.identifier('vars'), t.callExpression(t.identifier('useVars'), [])),
        ]),
      );
    }

    // const handlers = createHandlers(vars);
    if (schema.eventHandlers.length > 0) {
      bodyStatements.push(
        t.variableDeclaration('const', [
          t.variableDeclarator(
            t.identifier('handlers'),
            t.callExpression(t.identifier('createHandlers'), [t.identifier('vars')]),
          ),
        ]),
      );
    }

    // return <JSX />
    const returnStmt = ComponentBuilder.buildReturnStatement(schema);
    bodyStatements.push(returnStmt);

    // Build the component declaration
    const componentDecl = t.variableDeclaration('const', [
      t.variableDeclarator(
        t.identifier(componentName),
        t.arrowFunctionExpression(
          [t.identifier('props')],
          t.blockStatement(bodyStatements),
        ),
      ),
    ]);

    // export default
    const exportDefault = t.exportDefaultDeclaration(t.identifier(componentName));

    const program = t.program([
      ...imports.toAST(),
      t.exportNamedDeclaration(componentDecl),
      exportDefault,
    ]);

    return ASTEmitter.emit(t.file(program));
  }
}
```

- [ ] **Step 4: Update emitter index**

`packages/codegen/src/emitter/index.ts`:

```typescript
export { CSSEmitter } from './CSSEmitter';
export { ASTEmitter } from './ASTEmitter';
export { ZipEmitter } from './ZipEmitter';
```

- [ ] **Step 5: Update main index.ts**

`packages/codegen/src/index.ts`:

```typescript
export type { OutputFile, CodegenResult } from './types';
export { SchemaAnalyzer } from './analyzer/SchemaAnalyzer';
export { ReactGenerator, ComponentBuilder, StyleBuilder, DataFlowBuilder, ImportCollector, COMPONENT_MAP, ICON_NAME_MAP, STYLE_PROPS } from './generators';
export { ASTEmitter, CSSEmitter, ZipEmitter } from './emitter';
export { toPascalCase, toCamelCase, generateSetterName, generateHandlerName, generateStyleClassName } from './utils/naming';
export { camelToKebab, formatCssValue, formatCssProperty } from './utils/cssUtils';
```

- [ ] **Step 6: Run all tests**

Run: `pnpm --filter @open-lowcode/codegen test`

Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add packages/codegen/
git commit -m "feat(codegen): add ReactGenerator (full pipeline), ZipEmitter, and public API"
```

---

## Task 8: Editor Integration — ExportModal + Toolbar

**Files:**
- Create: `packages/editor/src/export/useCodeExport.ts`
- Create: `packages/editor/src/export/ExportModal.tsx`
- Create: `packages/editor/src/export/ExportModal.css`
- Modify: `packages/editor/src/toolbar/Toolbar.tsx`
- Modify: `packages/editor/src/Editor.tsx`

- [ ] **Step 1: Create useCodeExport hook**

`packages/editor/src/export/useCodeExport.ts`:

```typescript
import { useMemo } from 'react';
import { SchemaAnalyzer, ReactGenerator } from '@open-lowcode/codegen';
import type { OutputFile } from '@open-lowcode/codegen';
import type { DocumentSchema } from '@open-lowcode/engine';

export function useCodeExport(document: DocumentSchema) {
  const result = useMemo(() => {
    const analyzed = SchemaAnalyzer.analyze(document);
    return ReactGenerator.generate(analyzed);
  }, [document]);

  return result;
}
```

- [ ] **Step 2: Create ExportModal component**

`packages/editor/src/export/ExportModal.css`:

```css
.exportModal :global(.ant-modal-body) {
  padding: 0;
  height: calc(100vh - 120px);
  display: flex;
}

.exportSidebar {
  width: 200px;
  border-right: 1px solid #f0f0f0;
  padding: 12px;
  overflow-y: auto;
}

.exportFileItem {
  padding: 6px 12px;
  cursor: pointer;
  border-radius: 6px;
  font-size: 13px;
  color: #333;
  margin-bottom: 2px;
  transition: background 0.2s;
}

.exportFileItem:hover {
  background-color: #f5f5f5;
}

.exportFileItemActive {
  background-color: #e6f4ff;
  color: #1677ff;
  font-weight: 500;
}

.exportContent {
  flex: 1;
  padding: 16px;
  overflow: auto;
  font-family: 'SF Mono', 'Monaco', 'Menlo', 'Consolas', monospace;
  font-size: 13px;
  line-height: 1.6;
  white-space: pre;
  color: #333;
  background-color: #fafafa;
}

.exportToolbar {
  display: flex;
  justify-content: flex-end;
  padding: 8px 16px;
  border-top: 1px solid #f0f0f0;
  gap: 8px;
}
```

`packages/editor/src/export/ExportModal.tsx`:

```tsx
import { useState, useCallback } from 'react';
import { Modal, Button, message } from 'antd';
import { CopyOutlined, DownloadOutlined } from '@ant-design/icons';
import type { CodegenResult } from '@open-lowcode/codegen';
import { ZipEmitter } from '@open-lowcode/codegen';
import './ExportModal.css';

interface ExportModalProps {
  open: boolean;
  onClose: () => void;
  result: CodegenResult | null;
}

export const ExportModal: React.FC<ExportModalProps> = ({ open, onClose, result }) => {
  const [activeFile, setActiveFile] = useState<string>('index.tsx');

  const files = result?.files ?? [];
  const activeContent = files.find((f) => f.path === activeFile)?.content ?? '';

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(activeContent).then(() => {
      message.success('代码已复制到剪贴板');
    });
  }, [activeContent]);

  const handleDownload = useCallback(async () => {
    if (!result) return;
    const blob = await ZipEmitter.createZip(result.files, result.componentName);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${result.componentName}.zip`;
    a.click();
    URL.revokeObjectURL(url);
  }, [result]);

  return (
    <Modal
      title={`导出 React 代码 — ${result?.componentName ?? ''}`}
      open={open}
      onCancel={onClose}
      width={1000}
      footer={null}
      className="exportModal"
      destroyOnClose
    >
      <div className="exportSidebar">
        {files.map((file) => (
          <div
            key={file.path}
            className={`exportFileItem ${file.path === activeFile ? 'exportFileItemActive' : ''}`}
            onClick={() => setActiveFile(file.path)}
          >
            {file.path}
          </div>
        ))}
      </div>
      <div className="exportContent">
        {activeContent}
      </div>
      <div className="exportToolbar">
        <Button icon={<CopyOutlined />} onClick={handleCopy}>
          复制代码
        </Button>
        <Button type="primary" icon={<DownloadOutlined />} onClick={handleDownload}>
          下载 .zip
        </Button>
      </div>
    </Modal>
  );
};
```

- [ ] **Step 3: Modify Toolbar to add "导出 React 代码" button**

Add a new `onExportReact` prop and button to `packages/editor/src/toolbar/Toolbar.tsx`:

In the ToolbarProps interface, add:
```typescript
onExportReact: () => void;
```

In the Toolbar component, destructure `onExportReact` and add a new button in the right-side Space:
```tsx
<Button size="small" onClick={onExportReact}>导出代码</Button>
```

Place it between the existing "导出" button and the "保存" button.

- [ ] **Step 4: Modify Editor.tsx to integrate ExportModal**

In `packages/editor/src/Editor.tsx`:

1. Import `ExportModal` and `useCodeExport`
2. Add state: `const [exportModalOpen, setExportModalOpen] = useState(false)`
3. Call `useCodeExport` with the current document
4. Pass `onExportReact={() => setExportModalOpen(true)}` to Toolbar
5. Render `<ExportModal open={exportModalOpen} onClose={() => setExportModalOpen(false)} result={codegenResult} />`

- [ ] **Step 5: Add codegen dependency to editor package**

Add to `packages/editor/package.json` dependencies:
```json
"@open-lowcode/codegen": "workspace:*"
```

Run: `pnpm install`

- [ ] **Step 6: Verify build**

Run: `pnpm turbo build`

Expected: All packages build successfully including codegen and editor.

- [ ] **Step 7: Verify dev server**

Run: `pnpm --filter @open-lowcode/web dev`

Expected: Dev server starts, HTTP 200, editor loads with "导出代码" button visible in toolbar.

- [ ] **Step 8: Commit**

```bash
git add packages/editor/src/export/ packages/editor/src/toolbar/Toolbar.tsx packages/editor/src/Editor.tsx packages/editor/package.json
git commit -m "feat(editor): add ExportModal with code preview and .zip download, integrate into toolbar"
```

---

## Task 9: Integration Test + Verification

**Files:**
- Create: `packages/codegen/src/integration.test.ts`

- [ ] **Step 1: Write integration test**

`packages/codegen/src/integration.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import type { DocumentSchema } from '@open-lowcode/engine';
import { SchemaAnalyzer, ReactGenerator } from './index';

describe('Integration: full codegen pipeline', () => {
  it('should generate multi-file React code from a complex DocumentSchema', () => {
    const doc: DocumentSchema = {
      version: '1.0.0',
      id: 'doc-test',
      canvas: { width: 800, backgroundColor: '#ffffff' },
      root: {
        id: 'root',
        type: 'Box',
        props: { padding: 16, gap: 8, direction: 'column', borderRadius: 0, background: 'transparent' },
        style: { minHeight: 400, padding: 16 },
        children: [
          {
            id: 'text-1',
            type: 'Text',
            props: { text: 'Hello World', fontSize: 16, fontWeight: 'bold', color: '#333', textAlign: 'center' },
            style: { fontSize: 16, fontWeight: 'bold' },
          },
          {
            id: 'btn-1',
            type: 'Button',
            props: { text: 'Click me', type: 'primary', disabled: false, size: 'middle', block: false, danger: false },
            style: {},
            eventHandlers: {
              onClick: [{ type: 'setState', config: { variable: 'count', value: 'count + 1' } }],
            },
          },
          {
            id: 'input-1',
            type: 'Input',
            props: { placeholder: '请输入', size: 'middle', disabled: false },
            style: {},
            bindings: {
              value: { type: 'variable', value: 'searchQuery' },
            },
          },
        ],
      },
      variables: [
        { id: 'var-1', name: 'count', type: 'number', defaultValue: 0, scope: 'document' },
        { id: 'var-2', name: 'searchQuery', type: 'string', defaultValue: '', scope: 'document' },
      ],
      dataSources: [],
      eventBus: { listeners: [] },
      meta: { name: 'TestComponent', createdAt: '2026-04-18T00:00:00Z', updatedAt: '2026-04-18T00:00:00Z' },
    };

    // Analyze
    const analyzed = SchemaAnalyzer.analyze(doc);
    expect(analyzed.components.length).toBe(4);
    expect(analyzed.variables.length).toBe(2);
    expect(analyzed.eventHandlers.length).toBe(1);
    expect(analyzed.antdImports.has('Flex')).toBe(true);
    expect(analyzed.antdImports.has('Typography')).toBe(true);
    expect(analyzed.antdImports.has('Button')).toBe(true);
    expect(analyzed.antdImports.has('Input')).toBe(true);

    // Generate
    const result = ReactGenerator.generate(analyzed);
    expect(result.componentName).toBe('TestComponent');
    expect(result.files.length).toBeGreaterThanOrEqual(4); // index.tsx, styles.module.css, types.ts, hooks/, handlers/

    // Verify index.tsx
    const indexFile = result.files.find((f) => f.path === 'index.tsx');
    expect(indexFile).toBeDefined();
    expect(indexFile!.content).toContain('import');
    expect(indexFile!.content).toContain('TestComponent');
    expect(indexFile!.content).toContain('Typography.Text');
    expect(indexFile!.content).toContain('Button');
    expect(indexFile!.content).toContain('Input');

    // Verify styles.module.css
    const cssFile = result.files.find((f) => f.path === 'styles.module.css');
    expect(cssFile).toBeDefined();
    expect(cssFile!.content).toContain('.root');

    // Verify types.ts
    const typesFile = result.files.find((f) => f.path === 'types.ts');
    expect(typesFile).toBeDefined();
    expect(typesFile!.content).toContain('TestComponentProps');

    // Verify hooks file
    const hooksFile = result.files.find((f) => f.path === 'hooks/useStateVars.ts');
    expect(hooksFile).toBeDefined();
    expect(hooksFile!.content).toContain('useState');
    expect(hooksFile!.content).toContain('count');

    // Verify handlers file
    const handlersFile = result.files.find((f) => f.path === 'handlers/eventHandlers.ts');
    expect(handlersFile).toBeDefined();
    expect(handlersFile!.content).toContain('handleButtonClick');
  });

  it('should handle a document with no variables or events', () => {
    const doc: DocumentSchema = {
      version: '1.0.0',
      id: 'doc-simple',
      canvas: { width: 800 },
      root: {
        id: 'root',
        type: 'Box',
        props: { padding: 8, gap: 0, direction: 'column', borderRadius: 0, background: 'transparent' },
        style: {},
        children: [
          { id: 't1', type: 'Text', props: { text: 'Simple', fontSize: 14, fontWeight: 'normal', color: '#333', textAlign: 'left' }, style: {} },
        ],
      },
      variables: [],
      dataSources: [],
      eventBus: { listeners: [] },
      meta: { name: 'Simple', createdAt: '2026-04-18T00:00:00Z', updatedAt: '2026-04-18T00:00:00Z' },
    };

    const analyzed = SchemaAnalyzer.analyze(doc);
    const result = ReactGenerator.generate(analyzed);

    expect(result.componentName).toBe('Simple');
    // No hooks or handlers files when no variables/events
    expect(result.files.find((f) => f.path === 'hooks/useStateVars.ts')).toBeUndefined();
    expect(result.files.find((f) => f.path === 'handlers/eventHandlers.ts')).toBeUndefined();

    const indexFile = result.files.find((f) => f.path === 'index.tsx');
    expect(indexFile!.content).toContain('Typography.Text');
    expect(indexFile!.content).toContain('Simple');
  });
});
```

- [ ] **Step 2: Run integration test**

Run: `pnpm --filter @open-lowcode/codegen test`

Expected: PASS (all integration tests)

- [ ] **Step 3: Run full test suite**

Run: `pnpm turbo test`

Expected: All packages pass tests.

- [ ] **Step 4: Run full build**

Run: `pnpm turbo build`

Expected: Exit code 0, all packages build.

- [ ] **Step 5: Commit**

```bash
git add packages/codegen/src/integration.test.ts
git commit -m "test(codegen): add integration test for full codegen pipeline"
```

---

## Verification Checklist

After all tasks are complete:

- [ ] `pnpm turbo build` — all packages build successfully
- [ ] `pnpm turbo test` — all tests pass (existing + new)
- [ ] `pnpm --filter @open-lowcode/web dev` — dev server starts, HTTP 200
- [ ] Editor toolbar shows "导出代码" button
- [ ] Clicking "导出代码" opens ExportModal
- [ ] Modal shows file tabs: index.tsx, styles.module.css, types.ts, hooks/, handlers/
- [ ] "复制代码" copies current file to clipboard
- [ ] "下载 .zip" downloads a valid zip file with all files
- [ ] Generated code uses only antd components (no native HTML tags)
- [ ] Generated code includes useState for variables
- [ ] Generated code includes event handler functions

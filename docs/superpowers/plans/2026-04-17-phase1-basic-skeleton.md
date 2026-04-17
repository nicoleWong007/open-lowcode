# Phase 1 — 基础骨架 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 构建可视化低代码编辑器的基础骨架——能注册组件、从面板拖入画布、选中编辑属性和样式、撤销重做。

**Architecture:** Monorepo (pnpm workspace + Turborepo)，核心分为 6 个包：shared（工具函数）、engine（类型/注册中心/状态管理）、renderer（设计态渲染）、components（内置组件）、editor（编辑器 UI）、apps/web（应用入口）。状态使用 Zustand 单 Store + snapshot 撤销重做。

**Tech Stack:** React 19, TypeScript 5, Vite 6, pnpm workspace, Turborepo, Zustand 5, @dnd-kit, Ant Design 5, TailwindCSS 4, Vitest 3

---

## File Structure

```
open-lowcode/
├── package.json
├── pnpm-workspace.yaml
├── turbo.json
├── tsconfig.base.json
├── .gitignore
│
├── packages/
│   ├── shared/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   │       ├── index.ts
│   │       └── utils/
│   │           ├── id.ts
│   │           ├── id.test.ts
│   │           ├── clone.ts
│   │           └── clone.test.ts
│   │
│   ├── engine/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   │       ├── index.ts
│   │       ├── schema/
│   │       │   ├── types.ts
│   │       │   ├── types.test.ts
│   │       │   └── index.ts
│   │       ├── registry/
│   │       │   ├── ComponentRegistry.ts
│   │       │   ├── ComponentRegistry.test.ts
│   │       │   ├── SetterRegistry.ts
│   │       │   ├── SetterRegistry.test.ts
│   │       │   └── index.ts
│   │       ├── actions/
│   │       │   ├── treeOperations.ts
│   │       │   ├── treeOperations.test.ts
│   │       │   └── index.ts
│   │       └── store/
│   │           ├── createStore.ts
│   │           ├── createStore.test.ts
│   │           ├── defaults.ts
│   │           └── index.ts
│   │
│   ├── renderer/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   │       ├── index.ts
│   │       ├── ComponentRenderer.tsx
│   │       ├── SelectionBox.tsx
│   │       └── DesignRenderer.tsx
│   │
│   ├── components/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   │       ├── index.ts
│   │       ├── basic/
│   │       │   ├── Text.tsx
│   │       │   └── Button.tsx
│   │       ├── container/
│   │       │   └── Box.tsx
│   │       └── register.ts
│   │
│   └── editor/
│       ├── package.json
│       ├── tsconfig.json
│       └── src/
│           ├── index.ts
│           ├── Editor.tsx
│           ├── canvas/
│           │   └── Canvas.tsx
│           ├── panels/
│           │   ├── ComponentPalette.tsx
│           │   ├── PropsPanel.tsx
│           │   └── StylePanel.tsx
│           └── toolbar/
│               └── Toolbar.tsx
│
└── apps/
    └── web/
        ├── package.json
        ├── tsconfig.json
        ├── vite.config.ts
        ├── index.html
        └── src/
            ├── main.tsx
            ├── App.tsx
            ├── App.css
            └── pages/
                └── EditorPage.tsx
```

---

## Task 1: Root Monorepo Scaffolding

**Files:**
- Create: `package.json`
- Create: `pnpm-workspace.yaml`
- Create: `turbo.json`
- Create: `tsconfig.base.json`
- Create: `.gitignore`

- [ ] **Step 1: Create root package.json**

```json
{
  "name": "open-lowcode",
  "private": true,
  "scripts": {
    "dev": "turbo dev",
    "build": "turbo build",
    "test": "turbo test",
    "lint": "turbo lint",
    "clean": "turbo clean"
  },
  "devDependencies": {
    "turbo": "^2.4.0",
    "typescript": "^5.7.0"
  },
  "packageManager": "pnpm@9.15.0"
}
```

- [ ] **Step 2: Create pnpm-workspace.yaml**

```yaml
packages:
  - 'packages/*'
  - 'apps/*'
```

- [ ] **Step 3: Create turbo.json**

```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "test": {
      "dependsOn": ["^build"]
    },
    "clean": {
      "cache": false
    }
  }
}
```

- [ ] **Step 4: Create tsconfig.base.json**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "composite": true
  }
}
```

- [ ] **Step 5: Create .gitignore**

```
node_modules
dist
.turbo
*.tsbuildinfo
.DS_Store
```

- [ ] **Step 6: Install root dependencies and verify**

Run: `pnpm install`

Expected: `pnpm install` succeeds, `node_modules/.pnpm/turbo*` exists.

- [ ] **Step 7: Commit**

```bash
git add package.json pnpm-workspace.yaml turbo.json tsconfig.base.json .gitignore
git commit -m "chore: initialize monorepo scaffolding with pnpm workspace and turbo"
```

---

## Task 2: Shared Package — Utilities

**Files:**
- Create: `packages/shared/package.json`
- Create: `packages/shared/tsconfig.json`
- Create: `packages/shared/src/index.ts`
- Create: `packages/shared/src/utils/id.ts`
- Create: `packages/shared/src/utils/id.test.ts`
- Create: `packages/shared/src/utils/clone.ts`
- Create: `packages/shared/src/utils/clone.test.ts`

- [ ] **Step 1: Create shared package config**

`packages/shared/package.json`:

```json
{
  "name": "@open-lowcode/shared",
  "version": "0.0.1",
  "private": true,
  "main": "src/index.ts",
  "types": "src/index.ts",
  "scripts": {
    "build": "tsc",
    "test": "vitest run",
    "clean": "rm -rf dist *.tsbuildinfo"
  },
  "devDependencies": {
    "typescript": "^5.7.0",
    "vitest": "^3.0.0"
  }
}
```

`packages/shared/tsconfig.json`:

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

- [ ] **Step 2: Write failing test for generateId**

`packages/shared/src/utils/id.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { generateId } from './id';

describe('generateId', () => {
  it('should return a string', () => {
    const id = generateId();
    expect(typeof id).toBe('string');
  });

  it('should return unique values on each call', () => {
    const ids = new Set(Array.from({ length: 100 }, () => generateId()));
    expect(ids.size).toBe(100);
  });

  it('should return a UUID-like string with dashes', () => {
    const id = generateId();
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd packages/shared && pnpm test`

Expected: FAIL — `Cannot find module './id'`

- [ ] **Step 4: Write generateId implementation**

`packages/shared/src/utils/id.ts`:

```typescript
/**
 * Generate a unique ID (UUID v4).
 * Uses crypto.randomUUID() with a fallback for environments that don't support it.
 */
export function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd packages/shared && pnpm test`

Expected: PASS (3 tests)

- [ ] **Step 6: Write failing test for cloneDeep**

`packages/shared/src/utils/clone.test.ts`:

```typescript
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
```

- [ ] **Step 7: Run test to verify it fails**

Run: `cd packages/shared && pnpm test`

Expected: FAIL — `Cannot find module './clone'`

- [ ] **Step 8: Write cloneDeep implementation**

`packages/shared/src/utils/clone.ts`:

```typescript
/**
 * Deep clone a value using structuredClone.
 */
export function cloneDeep<T>(value: T): T {
  return structuredClone(value);
}
```

- [ ] **Step 9: Run test to verify it passes**

Run: `cd packages/shared && pnpm test`

Expected: PASS (7 tests total)

- [ ] **Step 10: Create shared index.ts**

`packages/shared/src/index.ts`:

```typescript
export { generateId } from './utils/id';
export { cloneDeep } from './utils/clone';
```

- [ ] **Step 11: Commit**

```bash
git add packages/shared/
git commit -m "feat(shared): add generateId and cloneDeep utilities with tests"
```

---

## Task 3: Engine Package — Schema Protocol Types

**Files:**
- Create: `packages/engine/package.json`
- Create: `packages/engine/tsconfig.json`
- Create: `packages/engine/src/index.ts`
- Create: `packages/engine/src/schema/types.ts`
- Create: `packages/engine/src/schema/types.test.ts`
- Create: `packages/engine/src/schema/index.ts`

- [ ] **Step 1: Create engine package config**

`packages/engine/package.json`:

```json
{
  "name": "@open-lowcode/engine",
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
    "@open-lowcode/shared": "workspace:*",
    "zustand": "^5.0.0"
  },
  "devDependencies": {
    "@types/react": "^19.0.0",
    "typescript": "^5.7.0",
    "vitest": "^3.0.0"
  }
}
```

`packages/engine/tsconfig.json`:

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

- [ ] **Step 2: Write all schema types**

`packages/engine/src/schema/types.ts`:

```typescript
import type { CSSProperties } from 'react';

// ─── 属性 Schema ───

export interface PropSchema {
  name: string;
  title: string;
  type: 'string' | 'number' | 'boolean' | 'select' | 'color' | 'json' | 'expression';
  defaultValue?: any;
  required?: boolean;
  setter?: 'Input' | 'TextArea' | 'NumberInput' | 'Switch' | 'Select'
         | 'ColorPicker' | 'JSONEditor' | 'ExpressionEditor' | 'IconPicker' | 'ColumnSetter';
  options?: { label: string; value: any }[];
  condition?: string;
  validator?: (value: any) => boolean | string;
}

// ─── 事件与动作 ───

export interface EventMeta {
  name: string;
  title: string;
  payload?: PropSchema[];
}

export type ActionType = 'setState' | 'callApi' | 'navigate' | 'showMessage' | 'custom';

export interface Action {
  type: ActionType;
  config: Record<string, any>;
}

// ─── 数据绑定 ───

export interface Binding {
  type: 'variable' | 'expression' | 'dataSource';
  value: string;
}

export type VariableType = 'string' | 'number' | 'boolean' | 'object' | 'array';
export type VariableScope = 'document' | 'component';

export interface Variable {
  id: string;
  name: string;
  type: VariableType;
  defaultValue: any;
  scope: VariableScope;
}

export type DataSourceType = 'static' | 'api' | 'websocket';

export interface DataSource {
  id: string;
  name: string;
  type: DataSourceType;
  config: {
    url?: string;
    method?: string;
    headers?: Record<string, string>;
    params?: Record<string, any>;
    refreshInterval?: number;
  };
  transform?: string;
}

export interface DataSourceMeta {
  type: DataSourceType;
  description?: string;
}

export interface EventBusConfig {
  listeners: {
    eventName: string;
    actions: Action[];
  }[];
}

// ─── 组件描述 ───

export interface ComponentMeta {
  type: string;
  title: string;
  icon: string;
  group: string;
  isContainer: boolean;
  allowedChildren?: string[];
  minSize?: { width: number; height: number };
  maxSize?: { width: number; height: number };
  propsSchema: PropSchema[];
  defaultProps: Record<string, any>;
  defaultStyle: CSSProperties;
  events?: EventMeta[];
  dataSource?: DataSourceMeta;
}

// ─── 组件实例 ───

export interface ComponentInstance {
  id: string;
  type: string;
  props: Record<string, any>;
  style: CSSProperties;
  children?: ComponentInstance[];
  bindings?: {
    [propName: string]: Binding;
  };
  eventHandlers?: {
    [eventName: string]: Action[];
  };
}

// ─── 文档模型 ───

export interface DocumentSchema {
  version: string;
  id: string;
  canvas: {
    width: number;
    height?: number;
    backgroundColor?: string;
  };
  root: ComponentInstance;
  variables: Variable[];
  dataSources: DataSource[];
  eventBus: EventBusConfig;
  meta: {
    name: string;
    description?: string;
    createdAt: string;
    updatedAt: string;
  };
}
```

- [ ] **Step 3: Write structural type test**

`packages/engine/src/schema/types.test.ts`:

```typescript
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd packages/engine && pnpm install && pnpm test`

Expected: PASS (7 tests)

- [ ] **Step 5: Create schema index and engine index**

`packages/engine/src/schema/index.ts`:

```typescript
export * from './types';
```

`packages/engine/src/index.ts`:

```typescript
export * from './schema';
```

- [ ] **Step 6: Commit**

```bash
git add packages/engine/
git commit -m "feat(engine): add schema protocol type definitions with structural tests"
```

---

## Task 4: Engine — Tree Operation Helpers

**Files:**
- Create: `packages/engine/src/actions/treeOperations.ts`
- Create: `packages/engine/src/actions/treeOperations.test.ts`
- Create: `packages/engine/src/actions/index.ts`

- [ ] **Step 1: Write failing tests for tree operations**

`packages/engine/src/actions/treeOperations.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import type { ComponentInstance } from '../schema/types';
import {
  findNode,
  findParent,
  insertNode,
  removeNode,
  updateNodeProps,
  updateNodeStyle,
} from './treeOperations';

function createTestTree(): ComponentInstance {
  return {
    id: 'root',
    type: 'Box',
    props: {},
    style: { padding: 8 },
    children: [
      {
        id: 'child-1',
        type: 'Text',
        props: { text: 'Hello' },
        style: { color: 'black' },
      },
      {
        id: 'child-2',
        type: 'Button',
        props: { text: 'Click me' },
        style: {},
      },
      {
        id: 'container-1',
        type: 'Box',
        props: {},
        style: {},
        children: [
          {
            id: 'nested-1',
            type: 'Text',
            props: { text: 'Nested' },
            style: {},
          },
        ],
      },
    ],
  };
}

describe('findNode', () => {
  it('should find the root node', () => {
    const tree = createTestTree();
    const found = findNode(tree, 'root');
    expect(found).not.toBeNull();
    expect(found!.id).toBe('root');
  });

  it('should find a direct child', () => {
    const tree = createTestTree();
    const found = findNode(tree, 'child-1');
    expect(found).not.toBeNull();
    expect(found!.type).toBe('Text');
  });

  it('should find a nested child', () => {
    const tree = createTestTree();
    const found = findNode(tree, 'nested-1');
    expect(found).not.toBeNull();
    expect(found!.props.text).toBe('Nested');
  });

  it('should return null for non-existent id', () => {
    const tree = createTestTree();
    const found = findNode(tree, 'non-existent');
    expect(found).toBeNull();
  });
});

describe('findParent', () => {
  it('should return null for the root node', () => {
    const tree = createTestTree();
    const result = findParent(tree, 'root');
    expect(result).toBeNull();
  });

  it('should find parent of a direct child', () => {
    const tree = createTestTree();
    const result = findParent(tree, 'child-1');
    expect(result).not.toBeNull();
    expect(result!.parent.id).toBe('root');
    expect(result!.index).toBe(0);
  });

  it('should find parent of a nested child', () => {
    const tree = createTestTree();
    const result = findParent(tree, 'nested-1');
    expect(result).not.toBeNull();
    expect(result!.parent.id).toBe('container-1');
    expect(result!.index).toBe(0);
  });
});

describe('insertNode', () => {
  it('should insert a node at the specified index', () => {
    const tree = createTestTree();
    const newNode: ComponentInstance = {
      id: 'new-1',
      type: 'Text',
      props: { text: 'New' },
      style: {},
    };
    const result = insertNode(tree, 'root', 1, newNode);
    expect(result.children![1].id).toBe('new-1');
    expect(result.children!).toHaveLength(4);
  });

  it('should not modify the original tree', () => {
    const tree = createTestTree();
    const newNode: ComponentInstance = {
      id: 'new-1',
      type: 'Text',
      props: { text: 'New' },
      style: {},
    };
    insertNode(tree, 'root', 0, newNode);
    expect(tree.children!).toHaveLength(3);
  });

  it('should insert into a nested container', () => {
    const tree = createTestTree();
    const newNode: ComponentInstance = {
      id: 'new-2',
      type: 'Button',
      props: { text: 'Nested Button' },
      style: {},
    };
    const result = insertNode(tree, 'container-1', 0, newNode);
    const container = result.children![2];
    expect(container.children!).toHaveLength(2);
    expect(container.children![0].id).toBe('new-2');
  });

  it('should initialize children array if container has none', () => {
    const tree: ComponentInstance = {
      id: 'root',
      type: 'Box',
      props: {},
      style: {},
    };
    const newNode: ComponentInstance = {
      id: 'new-1',
      type: 'Text',
      props: { text: 'Hello' },
      style: {},
    };
    const result = insertNode(tree, 'root', 0, newNode);
    expect(result.children).toBeDefined();
    expect(result.children!).toHaveLength(1);
    expect(result.children![0].id).toBe('new-1');
  });
});

describe('removeNode', () => {
  it('should remove a direct child', () => {
    const tree = createTestTree();
    const result = removeNode(tree, 'child-1');
    expect(result.children!).toHaveLength(2);
    expect(result.children![0].id).toBe('child-2');
  });

  it('should not modify the original tree', () => {
    const tree = createTestTree();
    removeNode(tree, 'child-1');
    expect(tree.children!).toHaveLength(3);
  });

  it('should remove a nested child', () => {
    const tree = createTestTree();
    const result = removeNode(tree, 'nested-1');
    const container = result.children![2];
    expect(container.children!).toHaveLength(0);
  });
});

describe('updateNodeProps', () => {
  it('should update props of a node', () => {
    const tree = createTestTree();
    const result = updateNodeProps(tree, 'child-1', { text: 'Updated' });
    expect(result.children![0].props.text).toBe('Updated');
  });

  it('should not modify the original tree', () => {
    const tree = createTestTree();
    updateNodeProps(tree, 'child-1', { text: 'Updated' });
    expect(tree.children![0].props.text).toBe('Hello');
  });

  it('should merge props, not replace', () => {
    const tree = createTestTree();
    const result = updateNodeProps(tree, 'child-2', { disabled: true });
    expect(result.children![1].props.text).toBe('Click me');
    expect(result.children![1].props.disabled).toBe(true);
  });
});

describe('updateNodeStyle', () => {
  it('should update style of a node', () => {
    const tree = createTestTree();
    const result = updateNodeStyle(tree, 'child-1', { fontSize: 16 });
    expect(result.children![0].style.fontSize).toBe(16);
  });

  it('should not modify the original tree', () => {
    const tree = createTestTree();
    updateNodeStyle(tree, 'child-1', { fontSize: 16 });
    expect(tree.children![0].style.fontSize).toBeUndefined();
  });

  it('should merge styles, not replace', () => {
    const tree = createTestTree();
    const result = updateNodeStyle(tree, 'child-1', { fontSize: 16 });
    expect(result.children![0].style.color).toBe('black');
    expect(result.children![0].style.fontSize).toBe(16);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/engine && pnpm test`

Expected: FAIL — `Cannot find module './treeOperations'`

- [ ] **Step 3: Write tree operations implementation**

`packages/engine/src/actions/treeOperations.ts`:

```typescript
import type { CSSProperties, ComponentInstance } from '../schema/types';

/**
 * Find a node by ID in the component tree.
 */
export function findNode(root: ComponentInstance, id: string): ComponentInstance | null {
  if (root.id === id) return root;
  if (root.children) {
    for (const child of root.children) {
      const found = findNode(child, id);
      if (found) return found;
    }
  }
  return null;
}

/**
 * Find the parent of a node and its index within parent's children.
 * Returns null if the node is the root or not found.
 */
export function findParent(
  root: ComponentInstance,
  id: string,
): { parent: ComponentInstance; index: number } | null {
  if (root.children) {
    for (let i = 0; i < root.children.length; i++) {
      if (root.children[i].id === id) {
        return { parent: root, index: i };
      }
      const found = findParent(root.children[i], id);
      if (found) return found;
    }
  }
  return null;
}

/**
 * Insert a new node as a child of parentId at the given index.
 * Returns a new tree; does not mutate the original.
 */
export function insertNode(
  root: ComponentInstance,
  parentId: string,
  index: number,
  newNode: ComponentInstance,
): ComponentInstance {
  const tree = structuredClone(root);
  const parent = findNode(tree, parentId);
  if (!parent) throw new Error(`Parent node "${parentId}" not found`);
  if (!parent.children) parent.children = [];
  parent.children.splice(index, 0, newNode);
  return tree;
}

/**
 * Remove a node from the tree by ID.
 * Returns a new tree; does not mutate the original.
 */
export function removeNode(root: ComponentInstance, id: string): ComponentInstance {
  const tree = structuredClone(root);
  const result = findParent(tree, id);
  if (!result) throw new Error(`Node "${id}" not found or is root`);
  result.parent.children!.splice(result.index, 1);
  return tree;
}

/**
 * Update a node's props (shallow merge).
 * Returns a new tree; does not mutate the original.
 */
export function updateNodeProps(
  root: ComponentInstance,
  id: string,
  partial: Record<string, any>,
): ComponentInstance {
  const tree = structuredClone(root);
  const node = findNode(tree, id);
  if (!node) throw new Error(`Node "${id}" not found`);
  node.props = { ...node.props, ...partial };
  return tree;
}

/**
 * Update a node's style (shallow merge).
 * Returns a new tree; does not mutate the original.
 */
export function updateNodeStyle(
  root: ComponentInstance,
  id: string,
  partial: CSSProperties,
): ComponentInstance {
  const tree = structuredClone(root);
  const node = findNode(tree, id);
  if (!node) throw new Error(`Node "${id}" not found`);
  node.style = { ...node.style, ...partial };
  return tree;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd packages/engine && pnpm test`

Expected: PASS (all tree operation tests)

- [ ] **Step 5: Create actions index**

`packages/engine/src/actions/index.ts`:

```typescript
export {
  findNode,
  findParent,
  insertNode,
  removeNode,
  updateNodeProps,
  updateNodeStyle,
} from './treeOperations';
```

- [ ] **Step 6: Update engine index to export actions**

`packages/engine/src/index.ts`:

```typescript
export * from './schema';
export * from './actions';
```

- [ ] **Step 7: Commit**

```bash
git add packages/engine/src/actions/ packages/engine/src/index.ts
git commit -m "feat(engine): add tree operation helpers (find, insert, remove, update) with tests"
```

---

## Task 5: Engine — Component Registry

**Files:**
- Create: `packages/engine/src/registry/ComponentRegistry.ts`
- Create: `packages/engine/src/registry/ComponentRegistry.test.ts`
- Create: `packages/engine/src/registry/SetterRegistry.ts`
- Create: `packages/engine/src/registry/SetterRegistry.test.ts`
- Create: `packages/engine/src/registry/index.ts`

- [ ] **Step 1: Write failing tests for ComponentRegistry**

`packages/engine/src/registry/ComponentRegistry.test.ts`:

```typescript
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/engine && pnpm test`

Expected: FAIL — `Cannot find module './ComponentRegistry'`

- [ ] **Step 3: Write ComponentRegistry implementation**

`packages/engine/src/registry/ComponentRegistry.ts`:

```typescript
import type { ComponentMeta } from '../schema/types';

type ReactComponent = React.ComponentType<any>;

export class ComponentRegistry {
  private metas = new Map<string, ComponentMeta>();
  private components = new Map<string, ReactComponent>();

  registerMeta(meta: ComponentMeta): void {
    if (this.metas.has(meta.type)) {
      throw new Error(`Component "${meta.type}" is already registered`);
    }
    this.metas.set(meta.type, meta);
  }

  registerComponent(type: string, component: ReactComponent): void {
    this.components.set(type, component);
  }

  getMeta(type: string): ComponentMeta | undefined {
    return this.metas.get(type);
  }

  getComponent(type: string): ReactComponent | undefined {
    return this.components.get(type);
  }

  getAllMetas(): ComponentMeta[] {
    return Array.from(this.metas.values());
  }

  getGroupedMetas(): Record<string, ComponentMeta[]> {
    const groups: Record<string, ComponentMeta[]> = {};
    for (const meta of this.metas.values()) {
      if (!groups[meta.group]) {
        groups[meta.group] = [];
      }
      groups[meta.group].push(meta);
    }
    return groups;
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd packages/engine && pnpm test`

Expected: PASS (ComponentRegistry tests)

- [ ] **Step 5: Write failing tests for SetterRegistry**

`packages/engine/src/registry/SetterRegistry.test.ts`:

```typescript
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
```

- [ ] **Step 6: Run test to verify it fails**

Run: `cd packages/engine && pnpm test`

Expected: FAIL — `Cannot find module './SetterRegistry'`

- [ ] **Step 7: Write SetterRegistry implementation**

`packages/engine/src/registry/SetterRegistry.ts`:

```typescript
import type { PropSchema } from '../schema/types';

type SetterComponent = React.ComponentType<{
  value: any;
  onChange: (value: any) => void;
  schema: PropSchema;
}>;

/** Map from PropSchema.type to default setter name */
const TYPE_TO_SETTER: Record<string, string> = {
  string: 'Input',
  number: 'NumberInput',
  boolean: 'Switch',
  select: 'Select',
  color: 'ColorPicker',
  json: 'JSONEditor',
  expression: 'ExpressionEditor',
};

export class SetterRegistry {
  private setters = new Map<string, SetterComponent>();

  register(name: string, component: SetterComponent): void {
    this.setters.set(name, component);
  }

  get(name: string): SetterComponent | undefined {
    return this.setters.get(name);
  }

  /**
   * Resolve the setter component for a PropSchema.
   * Uses explicit `setter` field if provided, otherwise infers from `type`.
   */
  resolve(schema: PropSchema): SetterComponent | undefined {
    const setterName = schema.setter ?? TYPE_TO_SETTER[schema.type];
    return setterName ? this.setters.get(setterName) : undefined;
  }
}
```

- [ ] **Step 8: Run tests to verify they pass**

Run: `cd packages/engine && pnpm test`

Expected: PASS (all registry tests)

- [ ] **Step 9: Create registry index and update engine index**

`packages/engine/src/registry/index.ts`:

```typescript
export { ComponentRegistry } from './ComponentRegistry';
export { SetterRegistry } from './SetterRegistry';
```

Update `packages/engine/src/index.ts`:

```typescript
export * from './schema';
export * from './actions';
export * from './registry';
```

- [ ] **Step 10: Commit**

```bash
git add packages/engine/src/registry/ packages/engine/src/index.ts
git commit -m "feat(engine): add ComponentRegistry and SetterRegistry with tests"
```

---

## Task 6: Engine — Zustand Store

**Files:**
- Create: `packages/engine/src/store/defaults.ts`
- Create: `packages/engine/src/store/createStore.ts`
- Create: `packages/engine/src/store/createStore.test.ts`
- Create: `packages/engine/src/store/index.ts`

- [ ] **Step 1: Write document defaults factory**

`packages/engine/src/store/defaults.ts`:

```typescript
import type { DocumentSchema } from '../schema/types';
import { generateId } from '@open-lowcode/shared';

export function createDefaultDocument(name = '未命名文档'): DocumentSchema {
  return {
    version: '1.0.0',
    id: generateId(),
    canvas: {
      width: 800,
      backgroundColor: '#ffffff',
    },
    root: {
      id: generateId(),
      type: 'Box',
      props: {},
      style: {
        minHeight: 400,
        padding: 16,
      },
      children: [],
    },
    variables: [],
    dataSources: [],
    eventBus: { listeners: [] },
    meta: {
      name,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  };
}
```

- [ ] **Step 2: Write failing tests for store**

`packages/engine/src/store/createStore.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { createEditorStore } from './createStore';
import type { EditorStore } from './createStore';

let store: EditorStore;

beforeEach(() => {
  store = createEditorStore();
});

describe('EditorStore — insertComponent', () => {
  it('should insert a component into the root', () => {
    const rootId = store.getState().document.root.id;
    store.getState().insertComponent('Text', rootId, 0);
    const root = store.getState().document.root;
    expect(root.children).toHaveLength(1);
    expect(root.children![0].type).toBe('Text');
  });

  it('should assign a unique id to the new component', () => {
    const rootId = store.getState().document.root.id;
    store.getState().insertComponent('Text', rootId, 0);
    store.getState().insertComponent('Text', rootId, 1);
    const root = store.getState().document.root;
    expect(root.children![0].id).not.toBe(root.children![1].id);
  });
});

describe('EditorStore — deleteComponent', () => {
  it('should delete a component', () => {
    const rootId = store.getState().document.root.id;
    store.getState().insertComponent('Text', rootId, 0);
    const childId = store.getState().document.root.children![0].id;
    store.getState().deleteComponent(childId);
    expect(store.getState().document.root.children).toHaveLength(0);
  });
});

describe('EditorStore — updateProps', () => {
  it('should update component props', () => {
    const rootId = store.getState().document.root.id;
    store.getState().insertComponent('Text', rootId, 0);
    const childId = store.getState().document.root.children![0].id;
    store.getState().updateProps(childId, { text: 'Hello World' });
    const child = store.getState().document.root.children![0];
    expect(child.props.text).toBe('Hello World');
  });
});

describe('EditorStore — updateStyle', () => {
  it('should update component style', () => {
    const rootId = store.getState().document.root.id;
    store.getState().insertComponent('Text', rootId, 0);
    const childId = store.getState().document.root.children![0].id;
    store.getState().updateStyle(childId, { fontSize: 24 });
    const child = store.getState().document.root.children![0];
    expect(child.style.fontSize).toBe(24);
  });
});

describe('EditorStore — select', () => {
  it('should set selected ids', () => {
    store.getState().select(['id-1', 'id-2']);
    expect(store.getState().selectedIds).toEqual(['id-1', 'id-2']);
  });

  it('should clear selection', () => {
    store.getState().select(['id-1']);
    store.getState().select([]);
    expect(store.getState().selectedIds).toEqual([]);
  });
});

describe('EditorStore — undo/redo', () => {
  it('should undo the last operation', () => {
    const rootId = store.getState().document.root.id;
    store.getState().insertComponent('Text', rootId, 0);
    expect(store.getState().document.root.children).toHaveLength(1);
    store.getState().undo();
    expect(store.getState().document.root.children).toHaveLength(0);
  });

  it('should redo an undone operation', () => {
    const rootId = store.getState().document.root.id;
    store.getState().insertComponent('Text', rootId, 0);
    store.getState().undo();
    expect(store.getState().document.root.children).toHaveLength(0);
    store.getState().redo();
    expect(store.getState().document.root.children).toHaveLength(1);
  });

  it('should clear future on new action after undo', () => {
    const rootId = store.getState().document.root.id;
    store.getState().insertComponent('Text', rootId, 0);
    store.getState().undo();
    store.getState().insertComponent('Button', rootId, 0);
    store.getState().redo();
    // redo should fail because future was cleared
    expect(store.getState().document.root.children).toHaveLength(1);
    expect(store.getState().document.root.children![0].type).toBe('Button');
  });

  it('should not undo when past is empty', () => {
    store.getState().undo();
    // Should not throw, state unchanged
    expect(store.getState().past).toHaveLength(0);
  });

  it('should not redo when future is empty', () => {
    store.getState().redo();
    expect(store.getState().future).toHaveLength(0);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd packages/engine && pnpm test`

Expected: FAIL — `Cannot find module './createStore'`

- [ ] **Step 4: Write the Zustand store**

`packages/engine/src/store/createStore.ts`:

```typescript
import { create } from 'zustand';
import type { CSSProperties, ComponentInstance, DocumentSchema } from '../schema/types';
import { createDefaultDocument } from './defaults';
import {
  findNode,
  insertNode,
  removeNode,
  updateNodeProps,
  updateNodeStyle,
} from '../actions/treeOperations';
import { generateId } from '@open-lowcode/shared';

export interface EditorStore {
  // ─── 文档模型 ───
  document: DocumentSchema;

  // ─── 选区 ───
  selectedIds: string[];
  hoveredId: string | null;

  // ─── 操作历史 (snapshot) ───
  past: DocumentSchema[];
  future: DocumentSchema[];

  // ─── 画布状态 ───
  canvasScale: number;
  canvasMode: 'design' | 'preview';
  viewport: 'pc' | 'mobile';

  // ─── 数据流运行时 (Phase 3) ───
  runtimeVariables: Record<string, any>;
  dataSourceCache: Record<string, any>;

  // ─── 操作方法 ───
  insertComponent(type: string, parentId: string, index: number): void;
  moveComponent(id: string, newParentId: string, newIndex: number): void;
  deleteComponent(id: string): void;
  updateProps(id: string, partial: Record<string, any>): void;
  updateStyle(id: string, partial: CSSProperties): void;
  select(ids: string[]): void;
  setHoveredId(id: string | null): void;
  undo(): void;
  redo(): void;
  setCanvasScale(scale: number): void;
  setCanvasMode(mode: 'design' | 'preview'): void;
  setViewport(viewport: 'pc' | 'mobile'): void;
  setVariable(name: string, value: any): void;
  loadDocument(doc: DocumentSchema): void;
}

function createComponentInstance(type: string, registry?: { getDefaultProps?: (type: string) => Record<string, any>; getDefaultStyle?: (type: string) => CSSProperties }): ComponentInstance {
  return {
    id: generateId(),
    type,
    props: registry?.getDefaultProps?.(type) ?? {},
    style: registry?.getDefaultStyle?.(type) ?? {},
    children: undefined,
  };
}

export function createEditorStore() {
  return create<EditorStore>((set, get) => ({
    // ─── 初始状态 ───
    document: createDefaultDocument(),
    selectedIds: [],
    hoveredId: null,
    past: [],
    future: [],
    canvasScale: 1,
    canvasMode: 'design',
    viewport: 'pc',
    runtimeVariables: {},
    dataSourceCache: {},

    // ─── 操作方法 ───

    insertComponent(type, parentId, index) {
      const state = get();
      const newNode = createComponentInstance(type);
      const newDoc = insertNode(state.document.root, parentId, index, newNode);
      set({
        past: [...state.past, state.document],
        future: [],
        document: { ...state.document, root: newDoc, meta: { ...state.document.meta, updatedAt: new Date().toISOString() } },
      });
    },

    moveComponent(id, newParentId, newIndex) {
      const state = get();
      const node = findNode(state.document.root, id);
      if (!node) return;
      const removed = removeNode(state.document.root, id);
      const inserted = insertNode(removed, newParentId, newIndex, node);
      set({
        past: [...state.past, state.document],
        future: [],
        document: { ...state.document, root: inserted, meta: { ...state.document.meta, updatedAt: new Date().toISOString() } },
      });
    },

    deleteComponent(id) {
      const state = get();
      const newDoc = removeNode(state.document.root, id);
      const newSelectedIds = state.selectedIds.filter(sid => sid !== id);
      set({
        past: [...state.past, state.document],
        future: [],
        document: { ...state.document, root: newDoc, meta: { ...state.document.meta, updatedAt: new Date().toISOString() } },
        selectedIds: newSelectedIds,
      });
    },

    updateProps(id, partial) {
      const state = get();
      const newDoc = updateNodeProps(state.document.root, id, partial);
      set({
        past: [...state.past, state.document],
        future: [],
        document: { ...state.document, root: newDoc, meta: { ...state.document.meta, updatedAt: new Date().toISOString() } },
      });
    },

    updateStyle(id, partial) {
      const state = get();
      const newDoc = updateNodeStyle(state.document.root, id, partial);
      set({
        past: [...state.past, state.document],
        future: [],
        document: { ...state.document, root: newDoc, meta: { ...state.document.meta, updatedAt: new Date().toISOString() } },
      });
    },

    select(ids) {
      set({ selectedIds: ids });
    },

    setHoveredId(id) {
      set({ hoveredId: id });
    },

    undo() {
      const state = get();
      if (state.past.length === 0) return;
      const previous = state.past[state.past.length - 1];
      set({
        past: state.past.slice(0, -1),
        future: [state.document, ...state.future],
        document: previous,
      });
    },

    redo() {
      const state = get();
      if (state.future.length === 0) return;
      const next = state.future[0];
      set({
        past: [...state.past, state.document],
        future: state.future.slice(1),
        document: next,
      });
    },

    setCanvasScale(scale) {
      set({ canvasScale: scale });
    },

    setCanvasMode(mode) {
      set({ canvasMode: mode });
    },

    setViewport(viewport) {
      set({ viewport });
    },

    setVariable(name, value) {
      const state = get();
      set({
        runtimeVariables: { ...state.runtimeVariables, [name]: value },
      });
    },

    loadDocument(doc) {
      set({
        document: doc,
        past: [],
        future: [],
        selectedIds: [],
        hoveredId: null,
      });
    },
  }));
}

/** Type alias for the store hook */
export type EditorStoreHook = ReturnType<typeof createEditorStore>;
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd packages/engine && pnpm test`

Expected: PASS (all store tests)

- [ ] **Step 6: Create store index and update engine index**

`packages/engine/src/store/index.ts`:

```typescript
export { createEditorStore } from './createStore';
export type { EditorStore, EditorStoreHook } from './createStore';
export { createDefaultDocument } from './defaults';
```

Update `packages/engine/src/index.ts`:

```typescript
export * from './schema';
export * from './actions';
export * from './registry';
export * from './store';
```

- [ ] **Step 7: Commit**

```bash
git add packages/engine/src/store/ packages/engine/src/index.ts
git commit -m "feat(engine): add Zustand store with document CRUD, selection, and undo/redo"
```

---

## Task 7: Components Package — Built-in Components (Text, Button, Box)

**Files:**
- Create: `packages/components/package.json`
- Create: `packages/components/tsconfig.json`
- Create: `packages/components/src/index.ts`
- Create: `packages/components/src/basic/Text.tsx`
- Create: `packages/components/src/basic/Button.tsx`
- Create: `packages/components/src/container/Box.tsx`
- Create: `packages/components/src/register.ts`

- [ ] **Step 1: Create components package config**

`packages/components/package.json`:

```json
{
  "name": "@open-lowcode/components",
  "version": "0.0.1",
  "private": true,
  "main": "src/index.ts",
  "types": "src/index.ts",
  "scripts": {
    "build": "tsc",
    "clean": "rm -rf dist *.tsbuildinfo"
  },
  "dependencies": {
    "@open-lowcode/engine": "workspace:*",
    "@open-lowcode/shared": "workspace:*",
    "antd": "^5.22.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  },
  "devDependencies": {
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "typescript": "^5.7.0"
  }
}
```

`packages/components/tsconfig.json`:

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

- [ ] **Step 2: Create Text component**

`packages/components/src/basic/Text.tsx`:

```typescript
import type { CSSProperties } from 'react';

export interface TextComponentProps {
  text?: string;
  fontSize?: number;
  fontWeight?: string;
  color?: string;
  textAlign?: 'left' | 'center' | 'right';
  style?: CSSProperties;
  children?: React.ReactNode;
}

export const TextComponent: React.FC<TextComponentProps> = ({
  text = '文本',
  fontSize = 14,
  fontWeight = 'normal',
  color = '#333333',
  textAlign = 'left',
  style: externalStyle,
  children,
}) => {
  const style: CSSProperties = {
    fontSize,
    fontWeight,
    color,
    textAlign,
    wordBreak: 'break-word',
    ...externalStyle,
  };
  return <span style={style}>{text}{children}</span>;
};
```

- [ ] **Step 3: Create Button component**

`packages/components/src/basic/Button.tsx`:

```typescript
import { Button as AntButton } from 'antd';
import type { CSSProperties } from 'react';

export interface ButtonComponentProps {
  text?: string;
  type?: 'primary' | 'default' | 'dashed' | 'link' | 'text';
  disabled?: boolean;
  size?: 'small' | 'middle' | 'large';
  block?: boolean;
  danger?: boolean;
  style?: CSSProperties;
  children?: React.ReactNode;
}

export const ButtonComponent: React.FC<ButtonComponentProps> = ({
  text = '按钮',
  type = 'primary',
  disabled = false,
  size = 'middle',
  block = false,
  danger = false,
  style,
}) => {
  return (
    <AntButton type={type} disabled={disabled} size={size} block={block} danger={danger} style={style}>
      {text}
    </AntButton>
  );
};
```

- [ ] **Step 4: Create Box container component**

`packages/components/src/container/Box.tsx`:

```typescript
import type { CSSProperties, ReactNode } from 'react';

export interface BoxComponentProps {
  padding?: number | string;
  gap?: number;
  direction?: 'row' | 'column';
  borderRadius?: number;
  background?: string;
  border?: string;
  style?: CSSProperties;
  children?: ReactNode;
}

export const BoxComponent: React.FC<BoxComponentProps> = ({
  children,
  padding = 8,
  gap = 0,
  direction = 'column',
  borderRadius = 0,
  background = 'transparent',
  border = 'none',
  style: externalStyle,
}) => {
  const style: CSSProperties = {
    display: 'flex',
    flexDirection: direction,
    padding,
    gap,
    borderRadius,
    background,
    border,
    minHeight: 40,
    boxSizing: 'border-box',
    ...externalStyle,
  };
  return <div style={style}>{children}</div>;
};
```

- [ ] **Step 5: Create component registration function**

`packages/components/src/register.ts`:

```typescript
import type { ComponentRegistry } from '@open-lowcode/engine';
import { TextComponent } from './basic/Text';
import { ButtonComponent } from './basic/Button';
import { BoxComponent } from './container/Box';

export function registerBuiltinComponents(registry: ComponentRegistry): void {
  // ─── Text ───
  registry.registerMeta({
    type: 'Text',
    title: '文本',
    icon: 'FontSizeOutlined',
    group: '基础',
    isContainer: false,
    propsSchema: [
      { name: 'text', title: '文本内容', type: 'string', defaultValue: '文本' },
      { name: 'fontSize', title: '字号', type: 'number', defaultValue: 14 },
      {
        name: 'fontWeight',
        title: '字重',
        type: 'select',
        defaultValue: 'normal',
        options: [
          { label: '正常', value: 'normal' },
          { label: '粗体', value: 'bold' },
          { label: '细体', value: 'lighter' },
        ],
      },
      { name: 'color', title: '颜色', type: 'color', defaultValue: '#333333' },
      {
        name: 'textAlign',
        title: '对齐',
        type: 'select',
        defaultValue: 'left',
        options: [
          { label: '左对齐', value: 'left' },
          { label: '居中', value: 'center' },
          { label: '右对齐', value: 'right' },
        ],
      },
    ],
    defaultProps: { text: '文本', fontSize: 14, fontWeight: 'normal', color: '#333333', textAlign: 'left' },
    defaultStyle: {},
    events: [],
  });
  registry.registerComponent('Text', TextComponent);

  // ─── Button ───
  registry.registerMeta({
    type: 'Button',
    title: '按钮',
    icon: 'AppstoreOutlined',
    group: '基础',
    isContainer: false,
    propsSchema: [
      { name: 'text', title: '文本', type: 'string', defaultValue: '按钮' },
      {
        name: 'type',
        title: '类型',
        type: 'select',
        defaultValue: 'primary',
        options: [
          { label: '主要', value: 'primary' },
          { label: '默认', value: 'default' },
          { label: '虚线', value: 'dashed' },
          { label: '链接', value: 'link' },
          { label: '文字', value: 'text' },
        ],
      },
      { name: 'disabled', title: '禁用', type: 'boolean', defaultValue: false },
      {
        name: 'size',
        title: '尺寸',
        type: 'select',
        defaultValue: 'middle',
        options: [
          { label: '小', value: 'small' },
          { label: '中', value: 'middle' },
          { label: '大', value: 'large' },
        ],
      },
      { name: 'block', title: '撑满宽度', type: 'boolean', defaultValue: false },
      { name: 'danger', title: '危险样式', type: 'boolean', defaultValue: false },
    ],
    defaultProps: { text: '按钮', type: 'primary', disabled: false, size: 'middle', block: false, danger: false },
    defaultStyle: {},
    events: [
      { name: 'onClick', title: '点击' },
    ],
  });
  registry.registerComponent('Button', ButtonComponent);

  // ─── Box ───
  registry.registerMeta({
    type: 'Box',
    title: '容器',
    icon: 'BorderOutlined',
    group: '容器',
    isContainer: true,
    propsSchema: [
      { name: 'padding', title: '内边距', type: 'number', defaultValue: 8 },
      { name: 'gap', title: '间距', type: 'number', defaultValue: 0 },
      {
        name: 'direction',
        title: '方向',
        type: 'select',
        defaultValue: 'column',
        options: [
          { label: '垂直', value: 'column' },
          { label: '水平', value: 'row' },
        ],
      },
      { name: 'borderRadius', title: '圆角', type: 'number', defaultValue: 0 },
      { name: 'background', title: '背景色', type: 'color', defaultValue: 'transparent' },
    ],
    defaultProps: { padding: 8, gap: 0, direction: 'column', borderRadius: 0, background: 'transparent' },
    defaultStyle: { minHeight: 40 },
    events: [],
  });
  registry.registerComponent('Box', BoxComponent);
}
```

- [ ] **Step 6: Create components index**

`packages/components/src/index.ts`:

```typescript
export { TextComponent } from './basic/Text';
export type { TextComponentProps } from './basic/Text';

export { ButtonComponent } from './basic/Button';
export type { ButtonComponentProps } from './basic/Button';

export { BoxComponent } from './container/Box';
export type { BoxComponentProps } from './container/Box';

export { registerBuiltinComponents } from './register';
```

- [ ] **Step 7: Commit**

```bash
git add packages/components/
git commit -m "feat(components): add Text, Button, Box components with registry metadata"
```

---

## Task 8: Renderer Package — Design Renderer

**Files:**
- Create: `packages/renderer/package.json`
- Create: `packages/renderer/tsconfig.json`
- Create: `packages/renderer/src/index.ts`
- Create: `packages/renderer/src/ComponentRenderer.tsx`
- Create: `packages/renderer/src/SelectionBox.tsx`
- Create: `packages/renderer/src/DesignRenderer.tsx`

- [ ] **Step 1: Create renderer package config**

`packages/renderer/package.json`:

```json
{
  "name": "@open-lowcode/renderer",
  "version": "0.0.1",
  "private": true,
  "main": "src/index.ts",
  "types": "src/index.ts",
  "scripts": {
    "build": "tsc",
    "clean": "rm -rf dist *.tsbuildinfo"
  },
  "dependencies": {
    "@open-lowcode/engine": "workspace:*",
    "@open-lowcode/shared": "workspace:*",
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  },
  "devDependencies": {
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "typescript": "^5.7.0"
  }
}
```

`packages/renderer/tsconfig.json`:

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

- [ ] **Step 2: Create ComponentRenderer**

`packages/renderer/src/ComponentRenderer.tsx`:

```typescript
import type { ComponentInstance, ComponentRegistry } from '@open-lowcode/engine';

interface ComponentRendererProps {
  instance: ComponentInstance;
  registry: ComponentRegistry;
}

/**
 * Renders a single component instance by looking up its React component
 * from the registry and passing instance props/style.
 */
export const ComponentRenderer: React.FC<ComponentRendererProps> = ({ instance, registry }) => {
  const Component = registry.getComponent(instance.type);

  if (!Component) {
    return (
      <div
        style={{
          padding: 8,
          border: '1px dashed #ff4d4f',
          color: '#ff4d4f',
          fontSize: 12,
          borderRadius: 4,
        }}
      >
        未注册组件: {instance.type}
      </div>
    );
  }

  return (
    <Component style={instance.style} {...instance.props}>
      {instance.children?.map((child) => (
        <ComponentRenderer key={child.id} instance={child} registry={registry} />
      ))}
    </Component>
  );
};
```

- [ ] **Step 3: Create SelectionBox**

`packages/renderer/src/SelectionBox.tsx`:

```typescript
import type { ReactNode } from 'react';

interface SelectionBoxProps {
  id: string;
  type: string;
  isSelected: boolean;
  isHovered: boolean;
  onSelect: (id: string, e: React.MouseEvent) => void;
  onHover: (id: string | null) => void;
  children: ReactNode;
}

export const SelectionBox: React.FC<SelectionBoxProps> = ({
  id,
  type,
  isSelected,
  isHovered,
  onSelect,
  onHover,
  children,
}) => {
  const outlineColor = isSelected ? '#1677ff' : isHovered ? '#69b1ff' : 'transparent';
  const showLabel = isSelected || isHovered;

  return (
    <div
      data-component-id={id}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(id, e);
      }}
      onMouseEnter={(e) => {
        e.stopPropagation();
        onHover(id);
      }}
      onMouseLeave={(e) => {
        e.stopPropagation();
        onHover(null);
      }}
      style={{
        position: 'relative',
        outline: `2px solid ${outlineColor}`,
        outlineOffset: -1,
        cursor: 'pointer',
        transition: 'outline-color 0.15s',
      }}
    >
      {showLabel && (
        <div
          style={{
            position: 'absolute',
            top: -20,
            left: 0,
            fontSize: 11,
            lineHeight: '18px',
            padding: '0 4px',
            backgroundColor: isSelected ? '#1677ff' : '#69b1ff',
            color: '#fff',
            borderRadius: 2,
            whiteSpace: 'nowrap',
            zIndex: 10,
            pointerEvents: 'none',
          }}
        >
          {type}
        </div>
      )}
      {children}
    </div>
  );
};
```

- [ ] **Step 4: Create DesignRenderer**

`packages/renderer/src/DesignRenderer.tsx`:

```typescript
import type { ComponentInstance, ComponentRegistry, EditorStoreHook } from '@open-lowcode/engine';
import { ComponentRenderer } from './ComponentRenderer';
import { SelectionBox } from './SelectionBox';

interface DesignRendererProps {
  instance: ComponentInstance;
  registry: ComponentRegistry;
  store: EditorStoreHook;
}

/**
 * Renders a component instance in design mode.
 * Wraps each component with SelectionBox for selection/hover UI.
 * Container components are also droppable zones.
 */
export const DesignRenderer: React.FC<DesignRendererProps> = ({ instance, registry, store }) => {
  const selectedIds = store((s) => s.selectedIds);
  const hoveredId = store((s) => s.hoveredId);
  const select = store((s) => s.select);
  const setHoveredId = store((s) => s.setHoveredId);

  const isSelected = selectedIds.includes(instance.id);
  const isHovered = hoveredId === instance.id;

  const meta = registry.getMeta(instance.type);
  const isContainer = meta?.isContainer ?? false;

  return (
    <SelectionBox
      id={instance.id}
      type={instance.type}
      isSelected={isSelected}
      isHovered={isHovered}
      onSelect={(id) => select([id])}
      onHover={setHoveredId}
    >
      <DesignComponentWrapper
        instance={instance}
        registry={registry}
        store={store}
        isContainer={isContainer}
      />
    </SelectionBox>
  );
};

/**
 * Internal component that renders the actual component with its children.
 * For container components, children are rendered inside with DnD drop zone support.
 */
const DesignComponentWrapper: React.FC<{
  instance: ComponentInstance;
  registry: ComponentRegistry;
  store: EditorStoreHook;
  isContainer: boolean;
}> = ({ instance, registry, store, isContainer }) => {
  const Component = registry.getComponent(instance.type);

  if (!Component) {
    return (
      <div style={{ padding: 8, border: '1px dashed #ff4d4f', color: '#ff4d4f', fontSize: 12, borderRadius: 4 }}>
        未注册组件: {instance.type}
      </div>
    );
  }

  const childContent = instance.children?.map((child) => (
    <DesignRenderer key={child.id} instance={child} registry={registry} store={store} />
  ));

  // For container components, render children inside
  if (isContainer) {
    return (
      <Component style={instance.style} {...instance.props}>
        {childContent}
        {(!instance.children || instance.children.length === 0) && (
          <div
            style={{
              padding: 16,
              border: '1px dashed #d9d9d9',
              borderRadius: 4,
              color: '#bfbfbf',
              fontSize: 12,
              textAlign: 'center',
              minHeight: 40,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            拖拽组件到此处
          </div>
        )}
      </Component>
    );
  }

  // Non-container components just render with props
  return <Component style={instance.style} {...instance.props} />;
};
```

- [ ] **Step 5: Create renderer index**

`packages/renderer/src/index.ts`:

```typescript
export { DesignRenderer } from './DesignRenderer';
export { ComponentRenderer } from './ComponentRenderer';
export { SelectionBox } from './SelectionBox';
```

- [ ] **Step 6: Commit**

```bash
git add packages/renderer/
git commit -m "feat(renderer): add DesignRenderer with SelectionBox and ComponentRenderer"
```

---

## Task 9: Editor — Canvas & DnD Integration

**Files:**
- Create: `packages/editor/package.json`
- Create: `packages/editor/tsconfig.json`
- Create: `packages/editor/src/index.ts`
- Create: `packages/editor/src/canvas/Canvas.tsx`
- Create: `packages/editor/src/panels/ComponentPalette.tsx`

- [ ] **Step 1: Create editor package config**

`packages/editor/package.json`:

```json
{
  "name": "@open-lowcode/editor",
  "version": "0.0.1",
  "private": true,
  "main": "src/index.ts",
  "types": "src/index.ts",
  "scripts": {
    "build": "tsc",
    "clean": "rm -rf dist *.tsbuildinfo"
  },
  "dependencies": {
    "@open-lowcode/engine": "workspace:*",
    "@open-lowcode/renderer": "workspace:*",
    "@open-lowcode/components": "workspace:*",
    "@open-lowcode/shared": "workspace:*",
    "@dnd-kit/core": "^6.3.0",
    "@dnd-kit/sortable": "^10.0.0",
    "antd": "^5.22.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  },
  "devDependencies": {
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "typescript": "^5.7.0"
  }
}
```

`packages/editor/tsconfig.json`:

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

- [ ] **Step 2: Create Canvas with DnD drop support**

`packages/editor/src/canvas/Canvas.tsx`:

```typescript
import { useDroppable } from '@dnd-kit/core';
import { DesignRenderer } from '@open-lowcode/renderer';
import type { ComponentRegistry, EditorStoreHook } from '@open-lowcode/engine';

interface CanvasProps {
  registry: ComponentRegistry;
  store: EditorStoreHook;
}

export const Canvas: React.FC<CanvasProps> = ({ registry, store }) => {
  const document = store((s) => s.document);
  const canvasScale = store((s) => s.canvasScale);
  const select = store((s) => s.select);

  const { setNodeRef, isOver } = useDroppable({ id: 'canvas-root' });

  return (
    <div
      style={{
        flex: 1,
        overflow: 'auto',
        backgroundColor: '#f0f0f0',
        padding: 24,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'flex-start',
      }}
      onClick={() => select([])}
    >
      <div
        ref={setNodeRef}
        style={{
          width: document.canvas.width,
          minHeight: 400,
          backgroundColor: document.canvas.backgroundColor || '#ffffff',
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          transform: `scale(${canvasScale})`,
          transformOrigin: 'top center',
          transition: 'transform 0.2s',
          outline: isOver ? '2px dashed #1677ff' : 'none',
          outlineOffset: 2,
        }}
      >
        <DesignRenderer
          instance={document.root}
          registry={registry}
          store={store}
        />
      </div>
    </div>
  );
};
```

- [ ] **Step 3: Create ComponentPalette**

`packages/editor/src/panels/ComponentPalette.tsx`:

```typescript
import { useDraggable } from '@dnd-kit/core';
import type { ComponentMeta, ComponentRegistry } from '@open-lowcode/engine';

interface ComponentPaletteProps {
  registry: ComponentRegistry;
}

const PaletteItem: React.FC<{ meta: ComponentMeta }> = ({ meta }) => {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `palette-${meta.type}`,
    data: { type: meta.type, fromPalette: true },
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={{
        padding: '8px 12px',
        margin: '4px 0',
        backgroundColor: isDragging ? '#e6f4ff' : '#fafafa',
        border: '1px solid #d9d9d9',
        borderRadius: 6,
        cursor: 'grab',
        fontSize: 13,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        userSelect: 'none',
        transition: 'background-color 0.15s, border-color 0.15s',
      }}
      onMouseEnter={(e) => {
        (e.currentTarget.style.borderColor = '#1677ff');
      }}
      onMouseLeave={(e) => {
        (e.currentTarget.style.borderColor = '#d9d9d9');
      }}
    >
      <span style={{ fontSize: 14 }}>{meta.icon === 'FontSizeOutlined' ? 'T' : meta.icon === 'AppstoreOutlined' ? '☐' : meta.icon === 'BorderOutlined' ? '□' : '▪' }</span>
      <span>{meta.title}</span>
    </div>
  );
};

export const ComponentPalette: React.FC<ComponentPaletteProps> = ({ registry }) => {
  const groups = registry.getGroupedMetas();

  return (
    <div
      style={{
        width: 240,
        height: '100%',
        borderRight: '1px solid #f0f0f0',
        backgroundColor: '#fff',
        overflowY: 'auto',
        padding: '12px',
      }}
    >
      {Object.entries(groups).map(([group, metas]) => (
        <div key={group} style={{ marginBottom: 16 }}>
          <div
            style={{
              fontSize: 12,
              color: '#8c8c8c',
              fontWeight: 600,
              marginBottom: 8,
              textTransform: 'uppercase',
              letterSpacing: 1,
            }}
          >
            {group}
          </div>
          {metas.map((meta) => (
            <PaletteItem key={meta.type} meta={meta} />
          ))}
        </div>
      ))}
    </div>
  );
};
```

- [ ] **Step 4: Commit**

```bash
git add packages/editor/
git commit -m "feat(editor): add Canvas with DnD drop zone and ComponentPalette with draggable items"
```

---

## Task 10: Editor — PropsPanel & StylePanel

**Files:**
- Create: `packages/editor/src/panels/PropsPanel.tsx`
- Create: `packages/editor/src/panels/StylePanel.tsx`

- [ ] **Step 1: Create PropsPanel**

`packages/editor/src/panels/PropsPanel.tsx`:

```typescript
import { Input, InputNumber, Switch, Select, ColorPicker } from 'antd';
import type { ComponentRegistry, EditorStoreHook, PropSchema } from '@open-lowcode/engine';
import { findNode } from '@open-lowcode/engine';

interface PropsPanelProps {
  registry: ComponentRegistry;
  store: EditorStoreHook;
}

function renderSetter(
  schema: PropSchema,
  value: any,
  onChange: (val: any) => void,
): React.ReactNode {
  const setter = schema.setter ?? schema.type;

  switch (setter) {
    case 'Input':
    case 'string':
      return <Input value={value ?? ''} onChange={(e) => onChange(e.target.value)} size="small" />;
    case 'NumberInput':
    case 'number':
      return <InputNumber value={value} onChange={(v) => onChange(v)} size="small" style={{ width: '100%' }} />;
    case 'Switch':
    case 'boolean':
      return <Switch checked={!!value} onChange={(v) => onChange(v)} size="small" />;
    case 'Select':
    case 'select':
      return (
        <Select
          value={value}
          onChange={(v) => onChange(v)}
          options={schema.options}
          size="small"
          style={{ width: '100%' }}
        />
      );
    case 'ColorPicker':
    case 'color':
      return (
        <ColorPicker
          value={value}
          onChange={(_, hex) => onChange(hex)}
          size="small"
        />
      );
    default:
      return <Input value={value ?? ''} onChange={(e) => onChange(e.target.value)} size="small" />;
  }
}

export const PropsPanel: React.FC<PropsPanelProps> = ({ registry, store }) => {
  const selectedIds = store((s) => s.selectedIds);
  const document = store((s) => s.document);
  const updateProps = store((s) => s.updateProps);

  const selectedId = selectedIds[0];
  if (!selectedId) {
    return (
      <div style={{ padding: 16, color: '#8c8c8c', fontSize: 13, textAlign: 'center' }}>
        请选择一个组件
      </div>
    );
  }

  const instance = findNode(document.root, selectedId);
  if (!instance) return null;

  const meta = registry.getMeta(instance.type);
  if (!meta) return null;

  return (
    <div style={{ padding: '12px 16px' }}>
      <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>
        {meta.title} 属性
      </div>
      {meta.propsSchema.map((schema) => (
        <div key={schema.name} style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>
            {schema.title}
          </div>
          {renderSetter(schema, instance.props[schema.name], (val) => {
            updateProps(selectedId, { [schema.name]: val });
          })}
        </div>
      ))}
    </div>
  );
};
```

- [ ] **Step 2: Create StylePanel**

`packages/editor/src/panels/StylePanel.tsx`:

```typescript
import { Input, InputNumber, Select, ColorPicker } from 'antd';
import type { EditorStoreHook } from '@open-lowcode/engine';
import { findNode } from '@open-lowcode/engine';

interface StylePanelProps {
  store: EditorStoreHook;
}

interface StyleField {
  key: string;
  label: string;
  type: 'number' | 'select' | 'color';
  options?: { label: string; value: string }[];
  suffix?: string;
}

const STYLE_FIELDS: StyleField[] = [
  // 尺寸
  { key: 'width', label: '宽度', type: 'number', suffix: 'px' },
  { key: 'height', label: '高度', type: 'number', suffix: 'px' },
  { key: 'minWidth', label: '最小宽度', type: 'number', suffix: 'px' },
  { key: 'minHeight', label: '最小高度', type: 'number', suffix: 'px' },
  { key: 'maxWidth', label: '最大宽度', type: 'number', suffix: 'px' },
  { key: 'maxHeight', label: '最大高度', type: 'number', suffix: 'px' },
  // 间距
  { key: 'margin', label: '外边距', type: 'number', suffix: 'px' },
  { key: 'padding', label: '内边距', type: 'number', suffix: 'px' },
  // 文字
  { key: 'fontSize', label: '字号', type: 'number', suffix: 'px' },
  {
    key: 'fontWeight',
    label: '字重',
    type: 'select',
    options: [
      { label: '细体', value: 'lighter' },
      { label: '正常', value: 'normal' },
      { label: '粗体', value: 'bold' },
    ],
  },
  { key: 'color', label: '文字颜色', type: 'color' },
  {
    key: 'textAlign',
    label: '对齐',
    type: 'select',
    options: [
      { label: '左', value: 'left' },
      { label: '中', value: 'center' },
      { label: '右', value: 'right' },
    ],
  },
  // 背景
  { key: 'backgroundColor', label: '背景色', type: 'color' },
  // 边框
  { key: 'borderRadius', label: '圆角', type: 'number', suffix: 'px' },
  { key: 'borderWidth', label: '边框宽度', type: 'number', suffix: 'px' },
  { key: 'borderColor', label: '边框颜色', type: 'color' },
  {
    key: 'borderStyle',
    label: '边框样式',
    type: 'select',
    options: [
      { label: '无', value: 'none' },
      { label: '实线', value: 'solid' },
      { label: '虚线', value: 'dashed' },
      { label: '点线', value: 'dotted' },
    ],
  },
  // 布局
  {
    key: 'display',
    label: '显示',
    type: 'select',
    options: [
      { label: '块', value: 'block' },
      { label: '弹性', value: 'flex' },
      { label: '行内', value: 'inline' },
      { label: '行内块', value: 'inline-block' },
      { label: '无', value: 'none' },
    ],
  },
  {
    key: 'flexDirection',
    label: '方向',
    type: 'select',
    options: [
      { label: '垂直', value: 'column' },
      { label: '水平', value: 'row' },
    ],
  },
  {
    key: 'justifyContent',
    label: '主轴对齐',
    type: 'select',
    options: [
      { label: '起始', value: 'flex-start' },
      { label: '居中', value: 'center' },
      { label: '结束', value: 'flex-end' },
      { label: '均匀', value: 'space-between' },
    ],
  },
  {
    key: 'alignItems',
    label: '交叉轴对齐',
    type: 'select',
    options: [
      { label: '起始', value: 'flex-start' },
      { label: '居中', value: 'center' },
      { label: '结束', value: 'flex-end' },
      { label: '拉伸', value: 'stretch' },
    ],
  },
  { key: 'gap', label: '间距', type: 'number', suffix: 'px' },
  // 其他
  { key: 'opacity', label: '透明度', type: 'number' },
  {
    key: 'overflow',
    label: '溢出',
    type: 'select',
    options: [
      { label: '可见', value: 'visible' },
      { label: '隐藏', value: 'hidden' },
      { label: '滚动', value: 'scroll' },
      { label: '自动', value: 'auto' },
    ],
  },
];

function renderStyleSetter(
  field: StyleField,
  value: any,
  onChange: (val: any) => void,
): React.ReactNode {
  switch (field.type) {
    case 'number':
      return (
        <InputNumber
          value={value}
          onChange={(v) => onChange(v)}
          size="small"
          suffix={field.suffix}
          style={{ width: '100%' }}
          min={0}
        />
      );
    case 'select':
      return (
        <Select
          value={value}
          onChange={(v) => onChange(v)}
          options={field.options}
          size="small"
          style={{ width: '100%' }}
          allowClear
        />
      );
    case 'color':
      return (
        <ColorPicker
          value={value}
          onChange={(_, hex) => onChange(hex)}
          size="small"
        />
      );
  }
}

const SECTION_LABELS: Record<string, string> = {
  width: '尺寸',
  margin: '间距',
  fontSize: '文字',
  backgroundColor: '背景',
  borderRadius: '边框',
  display: '布局',
  opacity: '其他',
};

function getSection(key: string): string {
  if (['width', 'height', 'minWidth', 'minHeight', 'maxWidth', 'maxHeight'].includes(key)) return 'width';
  if (['margin', 'padding'].includes(key)) return 'margin';
  if (['fontSize', 'fontWeight', 'color', 'textAlign'].includes(key)) return 'fontSize';
  if (['backgroundColor'].includes(key)) return 'backgroundColor';
  if (['borderRadius', 'borderWidth', 'borderColor', 'borderStyle'].includes(key)) return 'borderRadius';
  if (['display', 'flexDirection', 'justifyContent', 'alignItems', 'gap'].includes(key)) return 'display';
  return 'opacity';
}

export const StylePanel: React.FC<StylePanelProps> = ({ store }) => {
  const selectedIds = store((s) => s.selectedIds);
  const document = store((s) => s.document);
  const updateStyle = store((s) => s.updateStyle);

  const selectedId = selectedIds[0];
  if (!selectedId) {
    return (
      <div style={{ padding: 16, color: '#8c8c8c', fontSize: 13, textAlign: 'center' }}>
        请选择一个组件
      </div>
    );
  }

  const instance = findNode(document.root, selectedId);
  if (!instance) return null;

  // Group fields by section
  const sections: Record<string, StyleField[]> = {};
  for (const field of STYLE_FIELDS) {
    const section = getSection(field.key);
    if (!sections[section]) sections[section] = [];
    sections[section].push(field);
  }

  return (
    <div style={{ padding: '12px 16px' }}>
      {Object.entries(sections).map(([sectionKey, fields]) => (
        <div key={sectionKey} style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 12, color: '#8c8c8c', fontWeight: 600, marginBottom: 8 }}>
            {SECTION_LABELS[sectionKey] ?? sectionKey}
          </div>
          {fields.map((field) => (
            <div key={field.key} style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ fontSize: 12, color: '#666', width: 64, flexShrink: 0 }}>{field.label}</div>
              <div style={{ flex: 1 }}>
                {renderStyleSetter(field, (instance.style as any)?.[field.key], (val) => {
                  updateStyle(selectedId, { [field.key]: val });
                })}
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
};
```

- [ ] **Step 3: Commit**

```bash
git add packages/editor/src/panels/
git commit -m "feat(editor): add PropsPanel (auto-generated from PropSchema) and StylePanel"
```

---

## Task 11: Editor — Toolbar & Main Layout

**Files:**
- Create: `packages/editor/src/toolbar/Toolbar.tsx`
- Create: `packages/editor/src/Editor.tsx`
- Update: `packages/editor/src/index.ts`

- [ ] **Step 1: Create Toolbar**

`packages/editor/src/toolbar/Toolbar.tsx`:

```typescript
import { Button, Space, Tooltip, Segmented } from 'antd';
import {
  UndoOutlined,
  RedoOutlined,
  DesktopOutlined,
  MobileOutlined,
  EyeOutlined,
  EditOutlined,
} from '@ant-design/icons';
import type { EditorStoreHook } from '@open-lowcode/engine';

interface ToolbarProps {
  store: EditorStoreHook;
}

export const Toolbar: React.FC<ToolbarProps> = ({ store }) => {
  const canUndo = store((s) => s.past.length > 0);
  const canRedo = store((s) => s.future.length > 0);
  const canvasMode = store((s) => s.canvasMode);
  const viewport = store((s) => s.viewport);
  const undo = store((s) => s.undo);
  const redo = store((s) => s.redo);
  const setCanvasMode = store((s) => s.setCanvasMode);
  const setViewport = store((s) => s.setViewport);

  return (
    <div
      style={{
        height: 48,
        borderBottom: '1px solid #f0f0f0',
        backgroundColor: '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 16px',
      }}
    >
      <Space>
        <span style={{ fontWeight: 600, fontSize: 15, marginRight: 12 }}>Open LowCode</span>
        <Tooltip title="撤销 (Ctrl+Z)">
          <Button icon={<UndoOutlined />} size="small" disabled={!canUndo} onClick={undo} />
        </Tooltip>
        <Tooltip title="重做 (Ctrl+Y)">
          <Button icon={<RedoOutlined />} size="small" disabled={!canRedo} onClick={redo} />
        </Tooltip>
      </Space>

      <Space>
        <Segmented
          size="small"
          value={canvasMode}
          onChange={(val) => setCanvasMode(val as 'design' | 'preview')}
          options={[
            { label: <><EditOutlined /> 编辑</>, value: 'design' },
            { label: <><EyeOutlined /> 预览</>, value: 'preview' },
          ]}
        />
        <Segmented
          size="small"
          value={viewport}
          onChange={(val) => setViewport(val as 'pc' | 'mobile')}
          options={[
            { label: <><DesktopOutlined /> PC</>, value: 'pc' },
            { label: <><MobileOutlined /> 移动</>, value: 'mobile' },
          ]}
        />
      </Space>

      <Space>
        <Button size="small">导入</Button>
        <Button size="small">导出</Button>
        <Button size="small" type="primary">保存</Button>
      </Space>
    </div>
  );
};
```

- [ ] **Step 2: Create Editor main layout with DnD context**

`packages/editor/src/Editor.tsx`:

```typescript
import { useState } from 'react';
import { DndContext, DragEndEvent, DragStartEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { ComponentRegistry, findNode } from '@open-lowcode/engine';
import type { EditorStoreHook } from '@open-lowcode/engine';
import { Canvas } from './canvas/Canvas';
import { ComponentPalette } from './panels/ComponentPalette';
import { PropsPanel } from './panels/PropsPanel';
import { StylePanel } from './panels/StylePanel';
import { Toolbar } from './toolbar/Toolbar';

interface EditorProps {
  registry: ComponentRegistry;
  store: EditorStoreHook;
}

export const Editor: React.FC<EditorProps> = ({ registry, store }) => {
  const [activeId, setActiveId] = useState<string | null>(null);
  const canvasMode = store((s) => s.canvasMode);
  const viewport = store((s) => s.viewport);
  const document = store((s) => s.document);
  const insertComponent = store((s) => s.insertComponent);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;

    const activeData = active.data.current;
    if (!activeData?.fromPalette) return;

    const componentType = activeData.type as string;
    const targetId = over.id as string;

    // Determine parent and index
    let parentId: string;
    let index: number;

    if (targetId === 'canvas-root') {
      parentId = document.root.id;
      index = document.root.children?.length ?? 0;
    } else {
      const targetInstance = findNode(document.root, targetId);
      const meta = targetInstance ? registry.getMeta(targetInstance.type) : undefined;
      if (meta?.isContainer) {
        parentId = targetId;
        index = targetInstance?.children?.length ?? 0;
      } else {
        parentId = document.root.id;
        index = document.root.children?.length ?? 0;
      }
    }

    insertComponent(componentType, parentId, index);
  };

  const canvasWidth = viewport === 'mobile' ? 375 : 800;

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
        <Toolbar store={store} />
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          {canvasMode === 'design' && <ComponentPalette registry={registry} />}
          <Canvas registry={registry} store={store} />
          {canvasMode === 'design' && (
            <div style={{ width: 320, borderLeft: '1px solid #f0f0f0', backgroundColor: '#fff', overflowY: 'auto' }}>
              <SettingsPanel registry={registry} store={store} />
            </div>
          )}
        </div>
      </div>
    </DndContext>
  );
};

/** Tabbed settings panel with Props and Style tabs */
const SettingsPanel: React.FC<{ registry: ComponentRegistry; store: EditorStoreHook }> = ({ registry, store }) => {
  const [activeTab, setActiveTab] = useState<'props' | 'style'>('props');

  return (
    <div>
      <div style={{ display: 'flex', borderBottom: '1px solid #f0f0f0' }}>
        <div
          onClick={() => setActiveTab('props')}
          style={{
            flex: 1,
            textAlign: 'center',
            padding: '10px 0',
            cursor: 'pointer',
            fontSize: 13,
            fontWeight: activeTab === 'props' ? 600 : 400,
            color: activeTab === 'props' ? '#1677ff' : '#666',
            borderBottom: activeTab === 'props' ? '2px solid #1677ff' : '2px solid transparent',
          }}
        >
          属性
        </div>
        <div
          onClick={() => setActiveTab('style')}
          style={{
            flex: 1,
            textAlign: 'center',
            padding: '10px 0',
            cursor: 'pointer',
            fontSize: 13,
            fontWeight: activeTab === 'style' ? 600 : 400,
            color: activeTab === 'style' ? '#1677ff' : '#666',
            borderBottom: activeTab === 'style' ? '2px solid #1677ff' : '2px solid transparent',
          }}
        >
          样式
        </div>
      </div>
      {activeTab === 'props' ? (
        <PropsPanel registry={registry} store={store} />
      ) : (
        <StylePanel store={store} />
      )}
    </div>
  );
};
```

- [ ] **Step 3: Create editor index**

`packages/editor/src/index.ts`:

```typescript
export { Editor } from './Editor';
export { Canvas } from './canvas/Canvas';
export { ComponentPalette } from './panels/ComponentPalette';
export { PropsPanel } from './panels/PropsPanel';
export { StylePanel } from './panels/StylePanel';
export { Toolbar } from './toolbar/Toolbar';
```

- [ ] **Step 4: Commit**

```bash
git add packages/editor/src/
git commit -m "feat(editor): add Toolbar, Editor layout with DnD context and settings tabs"
```

---

## Task 12: App Web — Entry Point

**Files:**
- Create: `apps/web/package.json`
- Create: `apps/web/tsconfig.json`
- Create: `apps/web/vite.config.ts`
- Create: `apps/web/index.html`
- Create: `apps/web/src/main.tsx`
- Create: `apps/web/src/App.tsx`
- Create: `apps/web/src/App.css`
- Create: `apps/web/src/pages/EditorPage.tsx`

- [ ] **Step 1: Create web app package config**

`apps/web/package.json`:

```json
{
  "name": "@open-lowcode/web",
  "version": "0.0.1",
  "private": true,
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "clean": "rm -rf dist"
  },
  "dependencies": {
    "@open-lowcode/editor": "workspace:*",
    "@open-lowcode/engine": "workspace:*",
    "@open-lowcode/components": "workspace:*",
    "@open-lowcode/renderer": "workspace:*",
    "@open-lowcode/shared": "workspace:*",
    "antd": "^5.22.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  },
  "devDependencies": {
    "@tailwindcss/vite": "^4.0.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "@vitejs/plugin-react": "^4.3.0",
    "tailwindcss": "^4.0.0",
    "typescript": "^5.7.0",
    "vite": "^6.0.0"
  }
}
```

`apps/web/tsconfig.json`:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src"],
  "references": [
    { "path": "../../packages/shared" },
    { "path": "../../packages/engine" },
    { "path": "../../packages/renderer" },
    { "path": "../../packages/components" },
    { "path": "../../packages/editor" }
  ]
}
```

- [ ] **Step 2: Create Vite config**

`apps/web/vite.config.ts`:

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    port: 3000,
  },
});
```

- [ ] **Step 3: Create HTML entry**

`apps/web/index.html`:

```html
<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Open LowCode</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 4: Create main.tsx**

`apps/web/src/main.tsx`:

```typescript
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './App.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
```

- [ ] **Step 5: Create App.css (TailwindCSS + Ant Design reset)**

`apps/web/src/App.css`:

```css
@import "tailwindcss";

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial,
    'Noto Sans', sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

#root {
  width: 100%;
  height: 100vh;
}
```

- [ ] **Step 6: Create App.tsx**

`apps/web/src/App.tsx`:

```typescript
import { EditorPage } from './pages/EditorPage';

export function App() {
  return <EditorPage />;
}
```

- [ ] **Step 7: Create EditorPage — wire everything together**

`apps/web/src/pages/EditorPage.tsx`:

```typescript
import { useMemo } from 'react';
import { ComponentRegistry } from '@open-lowcode/engine';
import { createEditorStore } from '@open-lowcode/engine';
import { registerBuiltinComponents } from '@open-lowcode/components';
import { Editor } from '@open-lowcode/editor';

export function EditorPage() {
  const registry = useMemo(() => {
    const reg = new ComponentRegistry();
    registerBuiltinComponents(reg);
    return reg;
  }, []);

  const store = useMemo(() => createEditorStore(), []);

  return <Editor registry={registry} store={store} />;
}
```

- [ ] **Step 8: Install all dependencies and run dev server**

Run: `pnpm install && pnpm dev`

Expected: Vite dev server starts on `http://localhost:3000`. The editor UI renders with component palette on the left, empty canvas in the center, and settings panel on the right.

- [ ] **Step 9: Commit**

```bash
git add apps/web/
git commit -m "feat(web): add app entry point with Vite, TailwindCSS, and editor wiring"
```

---

## Task 13: Integration Smoke Test — Verify Full Flow

**Files:** None new (manual verification)

- [ ] **Step 1: Run full build**

Run: `pnpm build`

Expected: Exit code 0, all packages compile successfully.

- [ ] **Step 2: Run all tests**

Run: `pnpm test`

Expected: All tests pass (shared: 7 tests, engine: ~25+ tests).

- [ ] **Step 3: Start dev server and verify manually**

Run: `pnpm dev`

Verify in browser:
1. Editor renders with three-panel layout (palette | canvas | settings)
2. Component palette shows groups: "基础" (Text, Button) and "容器" (Box)
3. Drag Text from palette → drop on canvas → Text component appears
4. Drag Button → drop on canvas → Button component appears
5. Drag Box → drop on canvas → Box container appears
6. Click a component → selected (blue outline + type label)
7. Properties panel shows the component's editable props
8. Style panel shows CSS property editors
9. Changing a prop (e.g., text content) updates the component on canvas
10. Click undo → component disappears; click redo → component reappears
11. Click empty canvas → selection clears
12. Drag a component into a Box container → it appears inside

- [ ] **Step 4: Final commit (if any fixes were needed)**

```bash
git add -A
git commit -m "fix: address integration issues from smoke test"
```

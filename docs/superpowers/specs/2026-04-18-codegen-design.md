# 代码导出设计文档 — JSON Schema → React 源码

> 日期: 2026-04-18
> 状态: Draft
> 方案: AST 构建器 + @babel/generator（方案 B）

---

## 1. 项目定位

### 1.1 核心定义

将低代码编辑器产出的 `DocumentSchema`（JSON）转换为**生产级 React 源码**，开发者可以直接复制到自己的项目中使用，不再依赖低代码运行时引擎。

### 1.2 目标用户

前端开发者（有 React + antd 经验，能理解导出代码并二次开发）。

### 1.3 核心需求

- 输入：`DocumentSchema` JSON
- 输出：多文件 React 组件代码（.tsx + .module.css + types.ts + hooks + handlers）
- 组件库：所有组件映射到 antd，不使用原生 HTML 标签
- 数据流：变量 → useState，表达式 → 内联 JS，事件 → 回调函数
- 交互：Modal 预览代码 + 一键下载 .zip

### 1.4 非目标（后续迭代）

- Vue / 其他框架导出
- 可插拔 UI 库映射策略
- 导出代码的实时热更新
- 组件市场代码导出
- CSS-in-JS / TailwindCSS 等其他样式方案

---

## 2. 技术选型

| 领域 | 技术 | 理由 |
|------|------|------|
| AST 构建 | @babel/types | 业界标准，完整的 JSX AST 节点支持 |
| 代码生成 | @babel/generator | 自动格式化（缩进、换行），AST → 格式化字符串 |
| CSS 生成 | 自行拼接 | CSS 文本结构简单，无需 AST |
| ZIP 打包 | JSZip | 成熟轻量，浏览器端生成 .zip |
| 代码高亮 | Prism.js / Monaco Editor | Modal 中展示代码语法高亮 |
| 包位置 | packages/codegen/ | 独立包，职责单一 |

### 2.1 依赖清单

```json
{
  "dependencies": {
    "@babel/types": "^7.26.0",
    "@babel/generator": "^7.26.0",
    "jszip": "^3.10.0",
    "@open-lowcode/engine": "workspace:*"
  },
  "devDependencies": {
    "typescript": "^5.7.0",
    "vitest": "^3.0.0"
  }
}
```

---

## 3. 架构设计

### 3.1 三层流水线

```
DocumentSchema
    │
    ▼
┌───────────────────┐
│   SchemaAnalyzer  │  分析 Schema，提取元信息
│   (纯函数)         │  输入: DocumentSchema
│                   │  输出: AnalyzedSchema
└───────┬───────────┘
        │
        ▼
┌───────────────────┐
│ ReactGenerator    │  构建 AST，生成多文件
│   ├─ ComponentBuilder   组件树 → JSX AST
│   ├─ StyleBuilder       style → CSS Modules
│   ├─ DataFlowBuilder    变量/绑定/事件 → useState + handlers
│   └─ ImportCollector    收集/去重 import
└───────┬───────────┘
        │
        ▼
┌───────────────────┐
│     Emitter       │  序列化输出
│   ├─ ASTEmitter        AST → 代码字符串
│   ├─ CSSEmitter        样式对象 → CSS 文本
│   └─ ZipEmitter        多文件 → .zip
└───────────────────┘
        │
        ▼
  OutputFile[] → Modal 预览 / .zip 下载
```

### 3.2 包结构

```
packages/codegen/
├── package.json
├── tsconfig.json
└── src/
    ├── index.ts                          # 公共出口
    ├── types.ts                          # OutputFile, CodegenResult 等类型
    ├── analyzer/
    │   ├── SchemaAnalyzer.ts             # 分析 DocumentSchema
    │   └── types.ts                      # AnalyzedSchema 中间表示
    ├── generators/
    │   ├── CodeGenerator.ts              # 抽象基类
    │   ├── react/
    │   │   ├── ReactGenerator.ts         # 主入口：编排多文件生成
    │   │   ├── ComponentBuilder.ts       # ComponentInstance → JSX AST
    │   │   ├── StyleBuilder.ts           # CSSProperties → CSS Modules
    │   │   ├── DataFlowBuilder.ts        # 变量/绑定/表达式 → useState + handlers
    │   │   ├── ImportCollector.ts        # 收集/去重 import
    │   │   └── templates/                # 文件级模板
    │   └── index.ts
    ├── emitter/
    │   ├── ASTEmitter.ts                 # AST → 代码字符串
    │   ├── CSSEmitter.ts                 # CSS 对象 → CSS 文本
    │   └── ZipEmitter.ts                # 多文件 → .zip
    └── utils/
        ├── naming.ts                     # 组件名/变量名/类名生成规则
        └── cssUtils.ts                   # camelCase → kebab-case 等工具
```

---

## 4. Analyzer — Schema 分析层

### 4.1 中间表示类型

```typescript
interface AnalyzedSchema {
  meta: {
    componentName: string;      // 从 meta.name 派生，PascalCase
    description?: string;
  };

  /** 扁平化组件列表（DFS 顺序） */
  components: AnalyzedComponent[];

  /** 收集到的所有变量 */
  variables: AnalyzedVariable[];

  /** 收集到的所有事件处理器 */
  eventHandlers: AnalyzedEventHandler[];

  /** 收集到的所有数据源 */
  dataSources: AnalyzedDataSource[];

  /** 收集到的所有样式 */
  styles: AnalyzedStyle[];

  /** 需要的 antd 组件导入 */
  antdImports: Set<string>;

  /** 需要的 @ant-design/icons 导入 */
  iconImports: Set<string>;

  /** 需要的其他运行时导入 */
  runtimeImports: Set<string>;
}

interface AnalyzedComponent {
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

interface AnalyzedVariable {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  defaultValue: any;
  setterName: string;          // e.g. 'count' + 'setCount'
}

interface AnalyzedEventHandler {
  id: string;
  componentId: string;
  eventName: string;
  actions: Action[];
  functionName: string;        // e.g. 'handleButtonClick'
}

interface AnalyzedDataSource {
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

interface AnalyzedStyle {
  id: string;
  className: string;           // CSS Module 类名
  cssProperties: Record<string, string | number>;
  componentName: string;
}
```

### 4.2 分析流程

1. DFS 遍历 `document.root`，每个 `ComponentInstance` → `AnalyzedComponent`
2. 收集所有 `bindings`，提取变量名 → 汇总到 `variables`
3. 收集所有 `eventHandlers`，生成函数名 → 汇总到 `eventHandlers`
4. 每个组件的 `style` 提取为 `AnalyzedStyle`，生成 CSS Module 类名
5. 根据组件 `type` 查表收集 antd 导入（见第 6 节映射表）
6. 追加运行时导入（React, useState, useCallback 等）

---

## 5. Generator — AST 构建层

### 5.1 多文件产物结构

```
ExportedComponent/
├── index.tsx              # 主组件入口
├── styles.module.css      # 所有样式（CSS Modules）
├── types.ts               # Props 类型定义
├── hooks/
│   └── useStateVars.ts    # 变量 → useState hooks
└── handlers/
    └── eventHandlers.ts   # 事件处理函数
```

### 5.2 index.tsx 生成结构

```
1. import 声明
   - React, { useState, useCallback } from 'react'
   - { Button, Input, Select, Typography, Flex, Card, ... } from 'antd'
   - { XxxOutlined } from '@ant-design/icons'
   - styles from './styles.module.css'
   - { ExportedComponentProps } from './types'
   - { useVars } from './hooks/useStateVars'
   - { createHandlers } from './handlers/eventHandlers'

2. 类型导出
   export interface ExportedComponentProps { ... }

3. 组件函数
   export const ExportedComponent: React.FC<ExportedComponentProps> = (props) => {
     const vars = useVars();
     const handlers = createHandlers(vars);
     return ( <JSX 树> );
   };

4. export default ExportedComponent;
```

### 5.3 ComponentBuilder — 组件树 → JSX AST

遍历 `AnalyzedComponent[]`，每个组件根据映射表生成对应的 antd JSX 元素。属性映射规则：

- Schema 中的静态 `props` → JSX attributes（需要属性名转换，见第 6 节）
- `bindings` 中的 variable/expression → JSX expression container `{vars.xxx}`
- `style` 引用 → `className={styles.xxx}`
- 事件绑定 → `onClick={handlers.handleXxx}`
- 容器组件的 `children` → 递归构建子 JSX 元素
- **Grid 子组件自动包裹 `<Col>`**：Grid 的每个直接子组件自动包裹在 `<Col span={24/columns}>` 中
- **Box → Flex direction 映射**：`direction: 'column'` → `vertical={true}`，`direction: 'row'` → `vertical={false}`（或不传，默认水平）

### 5.4 StyleBuilder — CSS Modules 生成

```typescript
// 输入：AnalyzedStyle[]
// 输出：styles.module.css 文本
```

CSS 类名命名规则：`组件类型 + 短 ID 后缀`（避免冲突），camelCase。

示例输出：
```css
.root {
  min-height: 400px;
  padding: 16px;
}

.buttonAbc123 {
  color: #333333;
  font-size: 14px;
}

.cardDef456 {
  border-radius: 8px;
  background-color: #ffffff;
}
```

### 5.5 DataFlowBuilder — 数据流转换

#### 变量 → useState

```typescript
// hooks/useStateVars.ts
import { useState } from 'react';

export function useVars() {
  const [count, setCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [data, setData] = useState<any[]>([]);

  return {
    count, setCount,
    loading, setLoading,
    data, setData,
  } as const;
}
```

#### 表达式 → 内联 JS

Schema 的 `{{}}` 语法在导出时被剥离，表达式内容直接嵌入 JSX：

```typescript
// Schema: bindings: { text: { type: 'expression', value: '"计数: " + count' } }
// 生成：
<Typography.Text>{`计数: ${vars.count}`}</Typography.Text>

// Schema: bindings: { visible: { type: 'expression', value: 'isLoggedIn' } }
// 生成：
{vars.isLoggedIn && <Flex>...</Flex>}
```

#### 事件 → 回调函数

```typescript
// handlers/eventHandlers.ts
interface HandlerContext {
  count: number;
  setCount: (v: number | ((prev: number) => number)) => void;
  // ...其他变量
}

export function createHandlers(ctx: HandlerContext) {
  const handleButtonClick = () => {
    ctx.setCount(ctx.count + 1);
  };

  const handleFetchData = async () => {
    ctx.setLoading(true);
    try {
      const response = await fetch('/api/data');
      const result = await response.json();
      ctx.setData(result);
    } finally {
      ctx.setLoading(false);
    }
  };

  return { handleButtonClick, handleFetchData };
}
```

#### 动作类型映射

| Schema ActionType | 导出的代码 |
|---|---|
| `setState` | `ctx.setXxx(newValue)` |
| `callApi` | `await fetch(url, config).then(...)` |
| `navigate` | `window.location.href = url` |
| `showMessage` | `import { message } from 'antd'` + `message.success/error/warning(content)` |
| `custom` | `/* 自定义动作: ${handler} — 请手动实现 */` |

---

## 6. 组件映射表（全部 antd，无原生 HTML）

### 6.1 完整映射

| Schema Type | 导出 JSX 标签 | antd import | 属性映射说明 |
|---|---|---|---|
| **Text** | `<Typography.Text>` | `import { Typography } from 'antd'` | `text` → children, `fontSize`/`fontWeight`/`color`/`textAlign` → style |
| **Button** | `<Button>` | `import { Button } from 'antd'` | `text` → children, `type`/`disabled`/`size`/`block`/`danger` → props 1:1 |
| **Image** | `<Image>` | `import { Image } from 'antd'` | `src`/`alt`/`width`/`height` → props, `objectFit`/`borderRadius` → style |
| **Icon** | `<XxxOutlined>` | `import { XxxOutlined } from '@ant-design/icons'` | `icon` → 查表映射为具体图标组件, `size` → style.fontSize, `color` → style.color |
| **Link** | `<Typography.Link>` | `import { Typography } from 'antd'` | `text` → children, `href`/`target` → props, `fontSize`/`color` → style |
| **Box** | `<Flex>` | `import { Flex } from 'antd'` | `direction: 'column'` → `vertical`, `gap` → prop, `padding`/`borderRadius`/`background` → style |
| **Card** | `<Card>` | `import { Card } from 'antd'` | `title` → title prop, `padding` → style.padding, `borderRadius`/`background` → style |
| **Grid** | `<Row>` + `<Col>` | `import { Row, Col } from 'antd'` | `columns` → Col span (24/columns), `gap` → Row gutter, `padding` → style |
| **Tabs** | `<Tabs>` | `import { Tabs } from 'antd'` | `items` 字符串 → 解析为 `items` 数组 |
| **Input** | `<Input>` | `import { Input } from 'antd'` | `placeholder`/`size`/`disabled` → props 1:1 |
| **Select** | `<Select>` | `import { Select } from 'antd'` | `placeholder`/`size`/`disabled` → props, `options` 字符串 → 解析为 `[{label, value}]` |
| **Checkbox** | `<Checkbox>` | `import { Checkbox } from 'antd'` | `label` → children, `disabled` → prop |
| **Form** | `<Form>` | `import { Form } from 'antd'` | `labelAlign` → prop, `gap`/`padding` → style |
| **Table** | `<Table>` | `import { Table } from 'antd'` | `columns`/`data` 字符串 → 解析为结构化数据, `size`/`bordered` → props |
| **List** | `<List>` + `<List.Item>` | `import { List } from 'antd'` | `items` 字符串 → 解析为数据数组, `ordered` → renderItem 样式, `gap` → style |

### 6.2 特殊映射示例

**Box → Flex**：
```tsx
<Flex vertical gap={8} style={{ padding: 16, borderRadius: 4, background: 'transparent' }}>
  {children}
</Flex>
```

**Grid → Row + Col**：
```tsx
<Row gutter={[12, 12]} style={{ padding: 0 }}>
  <Col span={12}>{child1}</Col>
  <Col span={12}>{child2}</Col>
</Row>
```

**Tabs → antd Tabs**：
```tsx
<Tabs
  items={[
    { key: '1', label: 'Tab 1', children: <Flex>内容区</Flex> },
    { key: '2', label: 'Tab 2', children: <Flex>内容区</Flex> },
  ]}
/>
```

**Text → Typography.Text**：
```tsx
<Typography.Text style={{ fontSize: 14, fontWeight: 'normal', color: '#333', textAlign: 'left' }}>
  文本内容
</Typography.Text>
```

**Link → Typography.Link**：
```tsx
<Typography.Link href="#" target="_blank" style={{ fontSize: 14, color: '#1677ff' }}>
  链接
</Typography.Link>
```

**List → antd List**：
```tsx
<List
  dataSource={['项目 1', '项目 2', '项目 3']}
  renderItem={(item) => <List.Item>{item}</List.Item>}
/>
```

### 6.3 Icon 映射表

| Schema icon 值 | 导出的图标组件 |
|---|---|
| smile | `SmileOutlined` |
| star | `StarOutlined` |
| heart | `HeartOutlined` |
| search | `SearchOutlined` |
| home | `HomeOutlined` |
| setting | `SettingOutlined` |
| user | `UserOutlined` |

---

## 7. Emitter — 输出层

### 7.1 ASTEmitter

封装 `@babel/generator`，AST → 格式化代码字符串：

```typescript
import generate from '@babel/generator';
import type { File } from '@babel/types';

export function emitCode(ast: File): string {
  const { code } = generate(ast, {
    retainLines: false,
    compact: false,
  });
  return code;
}
```

### 7.2 CSSEmitter

CSS 属性对象 → CSS 文本，处理 camelCase → kebab-case 转换、值拼接。

### 7.3 ZipEmitter

```typescript
import JSZip from 'jszip';

export interface OutputFile {
  path: string;       // 相对路径, e.g. 'index.tsx'
  content: string;    // 文件内容
}

export async function createZip(files: OutputFile[], folderName: string): Promise<Blob> {
  const zip = new JSZip();
  const folder = zip.folder(folderName)!;
  for (const file of files) {
    folder.file(file.path, file.content);
  }
  return zip.generateAsync({ type: 'blob' });
}
```

---

## 8. 编辑器集成

### 8.1 新增文件

```
packages/editor/src/
├── export/
│   ├── ExportModal.tsx        # 代码预览 Modal
│   └── useCodeExport.ts       # 调用 codegen，管理状态
```

### 8.2 ExportModal UI

- 全屏 Modal，左侧文件树 Tab，右侧代码预览（带语法高亮）
- 顶部工具栏：[复制代码] [下载 .zip]
- Tab 切换文件：index.tsx | styles.module.css | types.ts | hooks/ | handlers/

### 8.3 触发方式

Toolbar 的"导出"按钮扩展为下拉或增加新按钮：
- 导入 JSON（现有）
- 导出 JSON（现有）
- **导出 React 代码**（新增） → 打开 ExportModal

### 8.4 数据流

```
Toolbar "导出 React 代码" 点击
  → useCodeExport(document)
  → SchemaAnalyzer.analyze(document)   // 返回 AnalyzedSchema
  → ReactGenerator.generate(analyzed)  // 返回 OutputFile[]
  → ExportModal 展示代码 + 提供 .zip 下载
```

---

## 9. types.ts 生成

导出的类型定义（MVP 简单版）：

```typescript
// types.ts
import type { CSSProperties, ReactNode } from 'react';

export interface ExportedComponentProps {
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
}
```

后续可扩展：将 Schema 中的文档级变量暴露为 Props 接口参数。

---

## 10. 关键设计决策

| 决策 | 选择 | 理由 |
|------|------|------|
| 代码生成方式 | AST 构建 + @babel/generator | 自动格式化，可做 AST 级优化，可扩展 |
| 组件映射策略 | 全部映射到 antd | 与编辑器内置组件一致，导出后开发者体验统一 |
| 样式方案 | CSS Modules | 作用域隔离，与 React 最佳实践一致 |
| 文件结构 | 多文件 | 关注点分离，开发者可独立修改各文件 |
| 数据流转换 | useState + 回调函数 | 最直接的 React 模式，开发者容易理解和修改 |
| 分析层 | 独立 Analyzer 中间表示 | 解耦 Schema 结构与代码生成，Generator 不依赖 Schema 内部结构 |
| ZIP 打包 | JSZip | 成熟、轻量、浏览器端运行 |

---

## 11. 后续演进

- **Vue 导出**：新增 VueGenerator，复用 Analyzer，用 Vue 模板编译器生成 SFC
- **可插拔 UI 库**：抽象 ComponentMap 接口，支持 Material UI / Chakra UI 等映射
- **更智能的代码优化**：提取公共样式、合并重复 handler、死代码消除
- **实时预览**：导出代码在沙箱中实时渲染
- **增量导出**：只导出变更部分，支持与已有代码合并

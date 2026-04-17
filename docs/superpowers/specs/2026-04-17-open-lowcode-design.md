# Open LowCode — 可视化低代码平台设计文档

> 日期: 2026-04-17
> 状态: Draft
> 方案: 纯自研引擎（方案 A）

---

## 1. 项目定位

### 1.1 核心定义

**面向前端开发者的组件/区块生成器**——通过可视化编辑器搭建 UI 组件和区块，输出 JSON Schema，通过运行时渲染引擎动态渲染。

### 1.2 目标用户

前端开发者（有技术背景，理解 CSS/组件/数据流概念）。

### 1.3 核心使用场景

- 快速搭建可复用的 UI 区块（表单、卡片、数据面板等）
- 通过 JSON Schema 描述组件结构，运行时渲染
- 支持变量、表达式、事件、数据源等完整数据流编排
- 生成的区块可嵌入到任何 React 应用中

### 1.4 非目标（后续迭代）

- 完整页面搭建（多路由、多页面）
- 组件市场 / 插件生态
- 代码导出（React/Vue 源码）
- 多人实时协作
- 后端服务 / 用户系统
- 发布系统 / 版本历史

---

## 2. 技术栈

| 领域 | 技术 |
|------|------|
| 框架 | React 19 + TypeScript 5 |
| 构建 | Vite + pnpm workspace (Monorepo) |
| 状态管理 | Zustand |
| 拖拽 | @dnd-kit/core + @dnd-kit/sortable |
| 编辑器 UI | Ant Design 5 |
| 样式 | TailwindCSS |
| 图表 | ECharts（数据展示组件用） |
| 测试 | Vitest |
| 构建编排 | Turborepo |

---

## 3. 核心数据模型 — Schema 协议

### 3.1 组件描述（ComponentMeta）

描述一个组件的元信息，用于组件面板展示、属性面板生成和渲染器实例化。

```typescript
interface ComponentMeta {
  /** 唯一标识，e.g. 'Button', 'Container', 'DataTable' */
  type: string;

  /** 展示信息 */
  title: string;        // 组件中文名
  icon: string;         // 图标标识
  group: string;        // 组件分组: '基础' | '容器' | '表单' | '数据展示'

  /** 约束 */
  isContainer: boolean;           // 是否可包含子组件
  allowedChildren?: string[];     // 允许的子组件类型，undefined = 不限制
  minSize?: { width: number; height: number };
  maxSize?: { width: number; height: number };

  /** 属性定义 — 驱动属性面板自动渲染 */
  propsSchema: PropSchema[];

  /** 默认值 */
  defaultProps: Record<string, any>;
  defaultStyle: React.CSSProperties;

  /** 事件声明 */
  events?: EventMeta[];

  /** 数据源 */
  dataSource?: DataSourceMeta;
}
```

### 3.2 属性 Schema（PropSchema）

驱动属性面板的自动渲染——定义一个属性的类型、校验规则和编辑器类型。

```typescript
interface PropSchema {
  name: string;
  title: string;
  type: 'string' | 'number' | 'boolean' | 'select' | 'color' | 'json' | 'expression';
  defaultValue?: any;
  required?: boolean;

  /**
   * 编辑器类型（覆盖 type 推断的默认编辑器）
   */
  setter?: 'Input' | 'TextArea' | 'NumberInput' | 'Switch' | 'Select'
         | 'ColorPicker' | 'JSONEditor' | 'ExpressionEditor' | 'IconPicker' | 'ColumnSetter';

  /** Select 类型的选项 */
  options?: { label: string; value: any }[];

  /** 条件显示 — 表达式为真时才显示此属性 */
  condition?: string;

  /** 校验函数 */
  validator?: (value: any) => boolean | string;
}
```

### 3.3 组件实例（ComponentInstance）

画布上的一个组件实例，是 JSON 序列化/反序列化的核心数据结构。

```typescript
interface ComponentInstance {
  /** 唯一实例 ID (uuid) */
  id: string;

  /** 对应 ComponentMeta.type */
  type: string;

  /** 当前属性值（可以是字面量或表达式引用） */
  props: Record<string, any>;

  /** 行内样式 */
  style: React.CSSProperties;

  /** 子组件（容器组件才有） */
  children?: ComponentInstance[];

  /** 数据流绑定 */
  bindings?: {
    [propName: string]: Binding;
  };

  /** 事件处理 */
  eventHandlers?: {
    [eventName: string]: Action[];
  };
}
```

### 3.4 文档模型（DocumentSchema）

整个区块/组件的完整描述，是 JSON 序列化的顶层结构。

```typescript
interface DocumentSchema {
  /** Schema 版本号 */
  version: string;

  /** 文档唯一 ID */
  id: string;

  /** 画布信息 */
  canvas: {
    width: number;
    height?: number;
    backgroundColor?: string;
  };

  /** 组件树（根节点通常是容器） */
  root: ComponentInstance;

  /** 数据流定义 */
  variables: Variable[];
  dataSources: DataSource[];
  eventBus: EventBusConfig;

  /** 元信息 */
  meta: {
    name: string;
    description?: string;
    createdAt: string;
    updatedAt: string;
  };
}
```

### 3.5 数据绑定与表达式

```typescript
/** 绑定：属性值来源 */
interface Binding {
  type: 'variable' | 'expression' | 'dataSource';
  /** 变量名 / 表达式字符串 / 数据源路径 */
  value: string;
}

/** 变量 */
interface Variable {
  id: string;
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  defaultValue: any;
  /** 'document' = 全局, 'component' = 组件实例级 */
  scope: 'document' | 'component';
}

/** 数据源 */
interface DataSource {
  id: string;
  name: string;
  type: 'static' | 'api' | 'websocket';
  config: {
    url?: string;
    method?: string;
    headers?: Record<string, string>;
    params?: Record<string, any>;
    /** 自动刷新间隔 (ms) */
    refreshInterval?: number;
  };
  /** 数据转换表达式 */
  transform?: string;
}

/** 组件事件声明 */
interface EventMeta {
  name: string;       // e.g. 'onClick', 'onChange'
  title: string;      // e.g. '点击', '值变化'
  payload?: PropSchema[];
}

/** 动作 */
interface Action {
  type: 'setState' | 'callApi' | 'navigate' | 'showMessage' | 'custom';
  config: Record<string, any>;
}

/**
 * 事件总线配置
 *
 * 事件分两层:
 * - 组件级事件: 在 ComponentInstance.eventHandlers 中定义，绑定到特定组件实例
 * - 全局事件: 在此处定义，任何组件通过 emit() 触发，由全局监听器响应
 */
interface EventBusConfig {
  /** 全局事件监听 */
  listeners: {
    eventName: string;
    actions: Action[];
  }[];
}
```

---

## 4. 编辑器架构

### 4.1 整体布局

```
┌──────────────────────────────────────────────────────────┐
│  工具栏 (Toolbar)                                          │
│  [撤销] [重做] | [预览] [PC/Mobile] | [导入] [导出] [保存]  │
├──────────┬──────────────────────────┬─────────────────────┤
│          │                          │                     │
│ 组件面板  │       画布 (Canvas)       │    设置面板          │
│  240px   │    (自适应宽度)           │     320px           │
│          │                          │                     │
│ ┌──────┐ │  ┌──────────────────┐    │  ┌─────────────┐   │
│ │基础   │ │  │                  │    │  │ 属性 Tab     │   │
│ │ Button│ │  │    组件树渲染     │    │  │ (Props)     │   │
│ │ Text │ │  │    选中高亮       │    │  ├─────────────┤   │
│ │ Image│ │  │    拖拽占位       │    │  │ 样式 Tab     │   │
│ ├──────┤ │  │    对齐辅助线     │    │  │ (Style)     │   │
│ │容器   │ │  │                  │    │  ├─────────────┤   │
│ │ Box  │ │  └──────────────────┘    │  │ 事件 Tab     │   │
│ │ Card │ │                          │  │ (Events)    │   │
│ ├──────┤ │                          │  ├─────────────┤   │
│ │表单   │ │                          │  │ 数据绑定Tab  │   │
│ │ Input│ │                          │  │ (Bindings)  │   │
│ │Select│ │                          │  └─────────────┘   │
│ └──────┘ │                          │                     │
├──────────┼──────────────────────────┼─────────────────────┤
│          │   图层面板 (Layers) 240px  │                     │
└──────────┴──────────────────────────┴─────────────────────┘
```

### 4.2 模块结构

```
packages/
├── editor/                    # 编辑器 UI 层
│   ├── src/
│   │   ├── canvas/           # 画布引擎（渲染、选中、拖拽）
│   │   ├── panels/           # 面板组件（组件面板、属性、样式、事件、图层）
│   │   ├── toolbar/          # 工具栏
│   │   ├── preview/          # 预览模式
│   │   └── Editor.tsx        # 编辑器主入口
│   └── package.json
│
├── engine/                    # 引擎层（核心逻辑）
│   ├── src/
│   │   ├── store/            # Zustand 状态管理
│   │   ├── registry/         # 组件/属性编辑器注册中心
│   │   ├── dataflow/         # 数据流引擎（变量、表达式、数据源、事件总线）
│   │   ├── schema/           # Schema 协议（类型、校验、序列化）
│   │   └── actions/          # 操作命令（插入、移动、更新、删除、撤销重做）
│   └── package.json
│
├── renderer/                  # 渲染引擎
│   ├── src/
│   │   ├── RuntimeRenderer.tsx   # 运行时渲染器（预览/发布）
│   │   ├── DesignRenderer.tsx    # 设计态渲染器（画布内）
│   │   └── context/             # 数据流 + 事件上下文
│   └── package.json
│
├── components/                # 内置组件库
│   ├── src/
│   │   ├── basic/            # Text, Button, Image, Icon, Link
│   │   ├── container/        # Box, Card, Grid, Tabs
│   │   ├── form/             # Input, Select, Checkbox, Form
│   │   └── data/             # Table, List, Chart
│   └── package.json
│
├── shared/                    # 共享工具
│   ├── src/utils/            # id, clone, css 工具
│   └── package.json
│
└── apps/
    └── web/                   # Web 应用入口
        ├── src/pages/
        │   ├── EditorPage.tsx
        │   └── PreviewPage.tsx
        └── package.json
```

### 4.3 状态管理（Zustand）

编辑器使用单个 Zustand Store 管理所有状态，通过 slice 模式组织。

```typescript
interface EditorStore {
  // ─── 文档模型 ───
  document: DocumentSchema;

  // ─── 选区 ───
  selectedIds: string[];
  hoveredId: string | null;

  // ─── 操作历史 ───
  past: DocumentSchema[];
  future: DocumentSchema[];

  // ─── 画布状态 ───
  canvasScale: number;
  canvasMode: 'design' | 'preview';
  viewport: 'pc' | 'mobile';

  // ─── 数据流运行时 ───
  runtimeVariables: Record<string, any>;
  dataSourceCache: Record<string, any>;

  // ─── 操作方法 ───
  insertComponent(type: string, parentId: string, index: number): void;
  moveComponent(id: string, newParentId: string, newIndex: number): void;
  deleteComponent(id: string): void;
  updateProps(id: string, partial: Record<string, any>): void;
  updateStyle(id: string, partial: React.CSSProperties): void;
  select(ids: string[]): void;
  undo(): void;
  redo(): void;
  setVariable(name: string, value: any): void;
}
```

撤销/重做采用 **snapshot 策略**：每次修改前将当前 document 快照压入 past 栈。操作时替换整个 document 引用。对于组件树较大的场景，后续可优化为 **operation-based**（记录操作增量），但 MVP 阶段 snapshot 策略足够。

---

## 5. 数据流引擎

### 5.1 架构概览

数据流引擎由 4 个子系统组成：

1. **变量系统（VariableEngine）** — 管理文档级和组件级变量的定义与运行时值
2. **表达式引擎（ExpressionEngine）** — 解析并执行 `{{}}` 表达式语法
3. **数据源引擎（DataSourceEngine）** — 管理 API/WebSocket 数据获取、缓存和自动刷新
4. **事件总线（EventBus）** — 组件间事件分发与动作链执行

### 5.2 表达式引擎

表达式语法：在属性值中嵌入 `{{ expression }}`。

**示例：**

```
文本内容:  "当前计数: {{count}}"
样式值:    { color: "{{count > 0 ? 'green' : 'red'}}" }
可见性:    condition: "{{isLoggedIn && hasPermission}}"
列表渲染:  {{data.list.filter(item => item.active)}}
```

**求值上下文：**

```typescript
interface ExpressionContext {
  variables: Record<string, any>;    // 当前作用域变量
  props: Record<string, any>;        // 组件属性
  data: Record<string, any>;         // 数据源数据
  $event: any;                       // 当前事件 payload
  utils: {                           // 内置工具函数
    formatDate: Function;
    sum: Function;
    filter: Function;
    map: Function;
    find: Function;
    includes: Function;
  };
}
```

**安全性：** 表达式执行使用 `new Function()` 沙箱，限制可访问的全局对象。生产环境应考虑 AST 解析 + 白名单函数。

### 5.3 事件动作链

事件触发后按顺序执行一系列动作：

```
用户点击按钮 → onClick 事件
  ├─ Action 1: setVariable('loading', true)
  ├─ Action 2: callApi('fetchData', { param: '{{searchQuery}}' })
  │   └─ onSuccess: setVariable('data', response.data)
  │   └─ onError:   showMessage('error', response.message)
  └─ Action 3: emit('dataUpdated', { source: 'button' })
```

动作类型：

| 动作类型 | 说明 | 配置 |
|---------|------|------|
| setState | 设置变量值 | `{ variable: string, value: Expression }` |
| callApi | 调用数据源 API | `{ dataSource: string, params: Record<string, Expression> }` |
| navigate | 路由跳转 | `{ url: string, params?: Record<string, any> }` |
| showMessage | 显示提示消息 | `{ type: 'success' \| 'error' \| 'warning', content: string }` |
| custom | 自定义动作 | `{ handler: string, ... }` |

---

## 6. 渲染引擎

### 6.1 双模式渲染

| 维度 | DesignRenderer（设计态） | RuntimeRenderer（运行时） |
|------|-------------------------|--------------------------|
| 用途 | 编辑器画布内渲染 | 预览 / 发布后渲染 |
| 组件包裹 | 每个组件包裹 SelectionBox | 直接渲染，无包裹 |
| 事件 | 拦截点击 → 选中组件 | 绑定真实事件处理 |
| 数据流 | 变量可手动设测试值 | 完整数据流执行 |
| 拖拽 | 支持拖入/拖出/排序 | 不支持 |
| 样式 | 增加选中态/hover态提示 | 原始样式 |

### 6.2 渲染流程

```
DocumentSchema
    │
    ▼
Schema 校验 ──→ 组件注册表查找 ComponentMeta
    │
    ▼
解析数据绑定，表达式求值
    │
    ├──→ DesignRenderer（编辑态）
    │    - 包裹 SelectionBox
    │    - 拦截 DOM 事件
    │    - 渲染辅助 UI（对齐线、占位符）
    │
    └──→ RuntimeRenderer（运行时）
         - 绑定事件处理
         - 执行数据流
         - 纯净输出
```

### 6.3 组件动态加载

内置组件通过注册表静态注册。后续支持异步组件（React.lazy + Suspense）用于第三方组件加载。

```typescript
// 组件注册示例
const registry = new ComponentRegistry();

registry.register({
  type: 'Button',
  title: '按钮',
  icon: 'ButtonIcon',
  group: '基础',
  isContainer: false,
  propsSchema: [
    { name: 'text', title: '文本', type: 'string', defaultValue: '按钮' },
    { name: 'type', title: '类型', type: 'select', options: [
      { label: '主要', value: 'primary' },
      { label: '默认', value: 'default' },
      { label: '虚线', value: 'dashed' },
    ]},
    { name: 'disabled', title: '禁用', type: 'boolean', defaultValue: false },
  ],
  defaultProps: { text: '按钮', type: 'primary', disabled: false },
  defaultStyle: {},
  events: [
    { name: 'onClick', title: '点击' },
  ],
  // React 组件引用
  component: ButtonComponent,
});
```

---

## 7. MVP 分阶段计划

### Phase 1 — 基础骨架

1. 项目脚手架（Monorepo + TS + Vite + pnpm workspace + TailwindCSS + Ant Design）
2. Schema 协议类型定义（engine/src/schema/types.ts）
3. 组件注册系统（ComponentRegistry + SetterRegistry）
4. Zustand Store（文档模型 + 选区 + 历史记录）
5. 画布基础渲染（DesignRenderer — 渲染组件树）
6. 选中组件 + 选中框（SelectionBox + 控制点）
7. 组件面板（ComponentPalette — 展示已注册组件）
8. 从面板拖入画布（@dnd-kit 实现）
9. 属性面板（基于 PropSchema 自动生成表单）
10. 样式面板（基础 CSS 属性编辑：尺寸、边距、颜色、字体）
11. 撤销/重做（snapshot 策略）

**交付物：** 能注册组件、从面板拖入画布、选中编辑属性和样式、撤销重做。

### Phase 2 — 完善编辑体验

12. 拖拽排序（组件间排序 + 嵌套拖入容器）
13. 对齐辅助线（吸附到其他组件边缘/中心线）
14. 图层面板（树形展示组件层级 + 拖拽排序）
15. 键盘快捷键（Delete / Ctrl+Z / Ctrl+C/V / Ctrl+D）
16. 复制/粘贴组件（含子组件深拷贝，ID 重新生成）
17. 右键菜单（复制、粘贴、删除、上移、下移、锁定）
18. 画布缩放 + 平移（Ctrl+滚轮缩放、空格+拖拽平移）

**交付物：** 完整的拖拽编辑体验，接近生产级交互。

### Phase 3 — 数据流引擎

19. 变量系统（定义文档级/组件级变量，运行时求值）
20. 表达式引擎（`{{}}` 语法解析 + 执行 + 上下文注入）
21. 数据源管理（API 调用 + 响应缓存 + 自动刷新）
22. 事件面板（可视化配置事件 → 动作链）
23. 数据绑定面板（属性 ↔ 变量/表达式绑定配置 UI）

**交付物：** 完整的数据流编排能力。

### Phase 4 — 组件库 + 预览

24. 基础组件：Text, Button, Image, Icon, Link
25. 容器组件：Box, Card, Grid, Tabs
26. 表单组件：Input, Select, Checkbox, Form（表单容器 + 校验）
27. 数据展示：Table, List, Chart（ECharts 封装）
28. 预览模式（RuntimeRenderer 完整数据流执行）
29. 响应式切换（PC / Mobile 视口宽度切换）
30. JSON 导入/导出（DocumentSchema 完整序列化）
31. 本地存储（localStorage 自动保存 + 恢复）

**交付物：** 可演示的完整产品。

---

## 8. 关键设计决策

| 决策 | 选择 | 理由 |
|------|------|------|
| 撤销/重做策略 | Snapshot（MVP），后续迁移 Operation-based | 实现简单，先跑通再优化 |
| 表达式执行 | `new Function()` + 上下文注入 | 性能好，后续可替换为 AST 解析 |
| 数据源缓存 | 内存缓存 + 可配置 TTL | MVP 足够，后续可加 IndexedDB |
| 组件 ID | UUID v4 | 无需协调，保证唯一 |
| 样式系统 | 行内 style 对象 | 精确控制，避免 CSS 类名冲突 |
| 画布实现 | DOM 渲染（非 Canvas/WebGL） | 可访问性好，调试方便，性能对 MVP 足够 |

---

## 9. 后续演进方向

- **组件市场**：开放组件注册协议，支持第三方组件上传和分发
- **代码导出**：JSON Schema → React/Vue 源码（基于 AST 转换）
- **多人协作**：CRDT 实时同步（Yjs）
- **AI 辅助**：自然语言生成组件树 / 智能推荐属性值
- **插件系统**：编辑器插件 API（自定义面板、工具、组件）
- **后端服务**：页面 CRUD、版本历史、用户权限
- **Canvas 渲染**：大规模组件场景切换到 Canvas/WebGL 渲染引擎

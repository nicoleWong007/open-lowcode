# 左侧工具栏布局优化 + 画布自适应

## 背景

编辑器当前布局为固定三栏：左侧面板 240px、中间画布 `flex: 1`、右侧面板 320px。存在三个问题：
1. 左侧面板无法折叠，占用过多空间
2. 组件面板为单列纵向排列，空间利用率低，图标使用 emoji 替代而非真实图标
3. 画布宽度需在面板折叠/展开时自适应

## 方案

采用方案 A（最小改动）：保持内联样式风格不变，仅修改 2 个文件。

## 改动 1：左侧面板折叠/展开

### 交互
- 新增 `leftCollapsed` 状态（`boolean`），默认 `false`
- 展开宽度 240px，折叠宽度 48px，`transition: width 0.2s ease` 平滑过渡
- 折叠时面板内只显示图标列（组件、图层、变量各一个图标），无文字
- 面板底部有 toggle 按钮（`◀` / `▶`），点击切换折叠/展开

### 文件：`packages/editor/src/Editor.tsx`

**左侧外层 div：**
```tsx
<div style={{
  width: leftCollapsed ? 48 : 240,
  height: '100%',
  borderRight: '1px solid #f0f0f0',
  backgroundColor: '#fff',
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
  transition: 'width 0.2s ease',
}}>
```

**新增 toggle 按钮：**
```tsx
<div
  onClick={() => setLeftCollapsed(!leftCollapsed)}
  style={{
    padding: '8px 0',
    textAlign: 'center',
    cursor: 'pointer',
    borderTop: '1px solid #f0f0f0',
    fontSize: 12,
    color: '#8c8c8c',
  }}
>
  {leftCollapsed ? '▶' : '◀'}
</div>
```

**SidebarSection 适配折叠态：**
- 接收 `collapsed` prop
- 折叠时只渲染对应图标，隐藏文字和内容
- 点击图标展开该 section 或展开整个面板

### SidebarSection 图标映射
| section | 折叠图标 |
|---------|----------|
| 组件 | `AppstoreOutlined` |
| 图层 | `LayerGroupOutlined` 或 `UnorderedListOutlined` |
| 变量 | `CodeOutlined` |

## 改动 2：组件面板 Grid 布局 + 真实图标

### 交互
- 组件列表改为 `display: grid; grid-template-columns: 1fr 1fr; gap: 8px`
- 每个 `PaletteItem` 改为卡片式：图标在上，文字在下，居中对齐
- 使用 `@ant-design/icons` 渲染真实图标替代 emoji

### 文件：`packages/editor/src/panels/ComponentPalette.tsx`

**PaletteItem 样式改为卡片：**
```tsx
<div style={{
  padding: '10px 4px',
  backgroundColor: isDragging ? '#e6f4ff' : '#fafafa',
  border: '1px solid #d9d9d9',
  borderRadius: 6,
  cursor: 'grab',
  fontSize: 12,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 4,
  userSelect: 'none',
  transition: 'background-color 0.15s, border-color 0.15s',
}}>
  <IconComponent style={{ fontSize: 20, color: '#666' }} />
  <span>{meta.title}</span>
</div>
```

**外层容器改为 grid：**
```tsx
<div style={{
  padding: '12px',
  overflowY: 'auto',
}}>
  {Object.entries(groups).map(([group, metas]) => (
    <div key={group} style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 12, color: '#8c8c8c', fontWeight: 600, marginBottom: 8 }}>
        {group}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {metas.map((meta) => (
          <PaletteItem key={meta.type} meta={meta} />
        ))}
      </div>
    </div>
  ))}
</div>
```

**移除 PaletteItem 外层多余的 `width: 240` 和 `borderRight`**（由父级面板控制宽度）。

### 图标渲染

使用动态映射将 `meta.icon` 字符串映射到 Ant Design 图标组件：

```tsx
import * as Icons from '@ant-design/icons';

const iconMap: Record<string, React.ComponentType> = {
  FontSizeOutlined: Icons.FontSizeOutlined,
  AppstoreOutlined: Icons.AppstoreOutlined,
  PictureOutlined: Icons.PictureOutlined,
  StarOutlined: Icons.StarOutlined,
  LinkOutlined: Icons.LinkOutlined,
  BorderOutlined: Icons.BorderOutlined,
  CreditCardOutlined: Icons.CreditCardOutlined,
  // Note: Grid 组件也使用 AppstoreOutlined，与 Button 相同（注册时即如此）
  TabsOutlined: Icons.TagOutlined, // TabsOutlined 在 @ant-design/icons 中不存在，fallback 到 TagOutlined
  FormOutlined: Icons.FormOutlined,
  DownCircleOutlined: Icons.DownCircleOutlined,
  CheckSquareOutlined: Icons.CheckSquareOutlined,
  TableOutlined: Icons.TableOutlined,
  UnorderedListOutlined: Icons.UnorderedListOutlined,
};
```

对于 `TabsOutlined`：Ant Design 可能无此图标，需检查并 fallback 到 `TagOutlined`。

## 改动 3：画布自适应宽度

**无需改动。** 画布容器已经是 `flex: 1`，折叠左侧面板后会自动获得更多空间。画布内的白板区域通过 `transform: scale()` 在容器内居中显示，机制合理。

## 不改动的文件

- `Canvas.tsx` — 画布逻辑不变
- `Toolbar.tsx` — 顶栏不变
- 右侧面板相关文件不变
- `SidebarSection` 仅在 `Editor.tsx` 内联组件中修改

## 影响范围

| 文件 | 改动类型 |
|------|----------|
| `packages/editor/src/Editor.tsx` | 状态 + 样式 + SidebarSection 适配 |
| `packages/editor/src/panels/ComponentPalette.tsx` | Grid 布局 + 图标渲染 |

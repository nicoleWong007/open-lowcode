# Sidebar Layout Optimization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Optimize the editor left sidebar with collapsible panel, grid-based component palette with real icons, and adaptive canvas width.

**Architecture:** Modify two files (`Editor.tsx` and `ComponentPalette.tsx`) using inline styles (matching existing codebase patterns). Add a `leftCollapsed` state to `Editor.tsx` for panel collapse. Refactor `ComponentPalette.tsx` to use CSS Grid 2-column layout with Ant Design icon rendering.

**Tech Stack:** React 19, TypeScript, @ant-design/icons, @dnd-kit/core, Vite

---

### Task 1: Add Icon Utility to ComponentPalette

**Files:**
- Modify: `packages/editor/src/panels/ComponentPalette.tsx`

- [ ] **Step 1: Add icon mapping and helper function**

Open `packages/editor/src/panels/ComponentPalette.tsx`. At the top, add the import and icon map after the existing imports (line 2):

```tsx
import { useDraggable } from '@dnd-kit/core';
import type { ComponentMeta, ComponentRegistry } from '@open-lowcode/engine';
import {
  FontSizeOutlined,
  AppstoreOutlined,
  PictureOutlined,
  StarOutlined,
  LinkOutlined,
  BorderOutlined,
  CreditCardOutlined,
  TagOutlined,
  FormOutlined,
  DownCircleOutlined,
  CheckSquareOutlined,
  TableOutlined,
  UnorderedListOutlined,
} from '@ant-design/icons';

const ICON_MAP: Record<string, React.ComponentType> = {
  FontSizeOutlined,
  AppstoreOutlined,
  PictureOutlined,
  StarOutlined,
  LinkOutlined,
  BorderOutlined,
  CreditCardOutlined,
  TabsOutlined: TagOutlined,
  FormOutlined,
  DownCircleOutlined,
  CheckSquareOutlined,
  TableOutlined,
  UnorderedListOutlined,
};

function getIcon(iconName: string): React.ReactNode {
  const IconComponent = ICON_MAP[iconName];
  if (!IconComponent) return <span style={{ fontSize: 14 }}>▪</span>;
  return <IconComponent style={{ fontSize: 20, color: '#666' }} />;
}
```

- [ ] **Step 2: Verify build compiles**

Run: `pnpm --filter @open-lowcode/editor build`
Expected: Exit code 0 (no type errors)

- [ ] **Step 3: Commit**

```bash
git add packages/editor/src/panels/ComponentPalette.tsx
git commit -m "feat(editor): add icon mapping utility to ComponentPalette"
```

---

### Task 2: Refactor PaletteItem to Card Layout with Icons

**Files:**
- Modify: `packages/editor/src/panels/ComponentPalette.tsx`

- [ ] **Step 1: Rewrite PaletteItem component**

Replace the entire `PaletteItem` component (lines 8-44 in original) with:

```tsx
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
      }}
      onMouseEnter={(e) => {
        (e.currentTarget.style.borderColor = '#1677ff');
      }}
      onMouseLeave={(e) => {
        (e.currentTarget.style.borderColor = '#d9d9d9');
      }}
    >
      {getIcon(meta.icon)}
      <span>{meta.title}</span>
    </div>
  );
};
```

- [ ] **Step 2: Verify build compiles**

Run: `pnpm --filter @open-lowcode/editor build`
Expected: Exit code 0

- [ ] **Step 3: Commit**

```bash
git add packages/editor/src/panels/ComponentPalette.tsx
git commit -m "feat(editor): refactor PaletteItem to card layout with real icons"
```

---

### Task 3: Convert Component List to Grid Layout

**Files:**
- Modify: `packages/editor/src/panels/ComponentPalette.tsx`

- [ ] **Step 1: Rewrite ComponentPalette outer container and grid**

Replace the entire `ComponentPalette` component (the export, lines 46-81 in original) with:

```tsx
export const ComponentPalette: React.FC<ComponentPaletteProps> = ({ registry }) => {
  const groups = registry.getGroupedMetas();

  return (
    <div
      style={{
        padding: '12px',
        overflowY: 'auto',
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
            }}
          >
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
  );
};
```

Note: This removes the old `width: 240`, `borderRight`, and `backgroundColor` styles that were duplicating the parent panel's responsibility.

- [ ] **Step 2: Verify build compiles**

Run: `pnpm --filter @open-lowcode/editor build`
Expected: Exit code 0

- [ ] **Step 3: Commit**

```bash
git add packages/editor/src/panels/ComponentPalette.tsx
git commit -m "feat(editor): convert component palette to 2-column grid layout"
```

---

### Task 4: Add Collapsible Left Panel State to Editor

**Files:**
- Modify: `packages/editor/src/Editor.tsx`

- [ ] **Step 1: Add leftCollapsed state and import icons**

In `packages/editor/src/Editor.tsx`:

Add `useState` to the import from React (it's already there). Add icon imports after line 12 (the Toolbar import):

```tsx
import { Toolbar } from './toolbar/Toolbar';
import { AppstoreOutlined, UnorderedListOutlined, CodeOutlined, LeftOutlined, RightOutlined } from '@ant-design/icons';
```

Add the `leftCollapsed` state inside the `Editor` component, after the existing state declarations (around line 27):

```tsx
const [leftCollapsed, setLeftCollapsed] = useState(false);
```

- [ ] **Step 2: Replace the left panel div with collapsible version**

Replace the left panel block (lines 168-182 in original) with:

```tsx
{canvasMode === 'design' && (
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
    {leftCollapsed ? (
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        paddingTop: 8,
        gap: 4,
      }}>
        <SidebarIcon icon={<AppstoreOutlined />} title="组件" onClick={() => setLeftCollapsed(false)} />
        <SidebarIcon icon={<UnorderedListOutlined />} title="图层" onClick={() => setLeftCollapsed(false)} />
        <SidebarIcon icon={<CodeOutlined />} title="变量" onClick={() => setLeftCollapsed(false)} />
      </div>
    ) : (
      <div style={{ flex: 1, overflowY: 'auto' }}>
        <SidebarSection title="组件" defaultOpen>
          <ComponentPalette registry={registry} />
        </SidebarSection>
        <SidebarSection title="图层" defaultOpen>
          <LayersPanel store={store} registry={registry} />
        </SidebarSection>
        <SidebarSection title="变量" defaultOpen={false}>
          <VariablePanel store={store} />
        </SidebarSection>
      </div>
    )}
    <div
      onClick={() => setLeftCollapsed(!leftCollapsed)}
      style={{
        padding: '8px 0',
        textAlign: 'center',
        cursor: 'pointer',
        borderTop: '1px solid #f0f0f0',
        fontSize: 12,
        color: '#8c8c8c',
        userSelect: 'none',
      }}
      title={leftCollapsed ? '展开侧栏' : '收起侧栏'}
    >
      {leftCollapsed ? <RightOutlined /> : <LeftOutlined />}
    </div>
  </div>
)}
```

- [ ] **Step 3: Add SidebarIcon helper component**

Add this component before the `SettingsPanel` component (around line 208 in original):

```tsx
const SidebarIcon: React.FC<{ icon: React.ReactNode; title: string; onClick: () => void }> = ({ icon, title, onClick }) => (
  <div
    onClick={onClick}
    title={title}
    style={{
      width: 36,
      height: 36,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 6,
      cursor: 'pointer',
      fontSize: 16,
      color: '#666',
      transition: 'background-color 0.15s',
    }}
    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#f0f0f0'; }}
    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
  >
    {icon}
  </div>
);
```

- [ ] **Step 4: Verify build compiles**

Run: `pnpm --filter @open-lowcode/editor build`
Expected: Exit code 0

- [ ] **Step 5: Commit**

```bash
git add packages/editor/src/Editor.tsx
git commit -m "feat(editor): add collapsible left sidebar with icon-only collapsed state"
```

---

### Task 5: Visual Verification

**Files:** None (verification only)

- [ ] **Step 1: Start dev server and verify**

Run: `pnpm dev`

Verify in browser:
1. Left panel shows components in 2-column grid with real Ant Design icons
2. Click `◀` button at bottom of left panel — panel collapses to 48px icon strip
3. Click any icon or `▶` button — panel expands back to 240px
4. Canvas width adapts automatically when panel collapses/expands
5. Drag from palette still works in grid layout
6. Layers panel and Variable panel sections still work

- [ ] **Step 2: Verify TypeScript build**

Run: `pnpm build`
Expected: Exit code 0, no type errors

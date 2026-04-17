# Phase 2 — 完善编辑体验 Implementation Plan

> Date: 2026-04-17
> Status: Ready for execution
> Depends on: Phase 1 (complete)

## Overview

7 features to transform the basic skeleton into a production-quality editing experience.

---

## Task 1: Copy/Paste + Clone Component (engine + shared)

### Why first
Copy/paste is foundational — needed by context menu and keyboard shortcuts later.

### Files to create/modify

**`packages/engine/src/actions/treeOperations.ts`** — ADD:
```ts
import { generateId, cloneDeep } from '@open-lowcode/shared';

/**
 * Deep-clone a subtree, assigning new IDs to every node.
 */
export function cloneSubtree(node: ComponentInstance): ComponentInstance {
  const clone = cloneDeep(node);
  reassignIds(clone);
  return clone;
}

function reassignIds(node: ComponentInstance): void {
  node.id = generateId();
  node.children?.forEach(reassignIds);
}

/**
 * Paste (insert) a cloned subtree into parent at index.
 * Returns a new tree; does not mutate.
 */
export function pasteNode(
  root: ComponentInstance,
  parentId: string,
  index: number,
  nodeToPaste: ComponentInstance,
): ComponentInstance {
  const cloned = cloneSubtree(nodeToPaste);
  return insertNode(root, parentId, index, cloned);
}
```

**`packages/engine/src/store/createStore.ts`** — ADD to EditorStore interface:
```ts
clipboard: ComponentInstance | null;
copyComponent(id: string): void;
pasteComponent(targetParentId: string, index: number): void;
duplicateComponent(id: string): void;
```

Implement:
- `copyComponent(id)`: findNode → set clipboard = cloneDeep(node) (keep original IDs for paste)
- `pasteComponent(parentId, index)`: if clipboard → insertNode with cloned subtree
- `duplicateComponent(id)`: find node + parent info → cloneSubtree → insertNode right after original

**`packages/engine/src/actions/treeOperations.test.ts`** — ADD tests for:
- cloneSubtree: all IDs regenerated, children preserved
- pasteNode: inserts cloned subtree, original tree untouched
- reassignIds on nested trees (3 levels deep)

### MUST DO
- Every cloned node gets a fresh UUID via `generateId()`
- `pasteComponent` snapshots current doc to `past[]` before mutation
- `duplicateComponent` uses `findParent` to get index, inserts at index+1
- All new store actions follow existing undo/redo snapshot pattern

### MUST NOT DO
- Do not mutate the original tree or clipboard reference
- Do not skip the clipboard — duplicate should NOT bypass it (use cloneSubtree directly for dup)

---

## Task 2: Keyboard Shortcuts (editor)

### Files to create/modify

**`packages/editor/src/hooks/useKeyboardShortcuts.ts`** — CREATE:
```ts
import { useEffect } from 'react';
import type { EditorStoreHook } from '@open-lowcode/engine';
import { findNode, findParent } from '@open-lowcode/engine';

export function useKeyboardShortcuts(store: EditorStoreHook): void {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const storeApi = store.getState();
      const { selectedIds } = storeApi;

      // Ignore shortcuts when typing in inputs
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || (e.target as HTMLElement).isContentEditable) return;

      const ctrl = e.metaKey || e.ctrlKey;

      // Delete selected
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedIds.length > 0) {
        e.preventDefault();
        selectedIds.forEach(id => storeApi.deleteComponent(id));
        return;
      }

      // Undo: Ctrl+Z
      if (ctrl && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        storeApi.undo();
        return;
      }

      // Redo: Ctrl+Y or Ctrl+Shift+Z
      if ((ctrl && e.key === 'y') || (ctrl && e.shiftKey && e.key === 'z')) {
        e.preventDefault();
        storeApi.redo();
        return;
      }

      // Copy: Ctrl+C
      if (ctrl && e.key === 'c' && selectedIds.length === 1) {
        e.preventDefault();
        storeApi.copyComponent(selectedIds[0]);
        return;
      }

      // Paste: Ctrl+V
      if (ctrl && e.key === 'v' && storeApi.clipboard) {
        e.preventDefault();
        const id = selectedIds[0] ?? storeApi.document.root.id;
        const target = findNode(storeApi.document.root, id);
        const meta = target ? registry?.getMeta(target.type) : undefined;
        const parentId = meta?.isContainer ? id : storeApi.document.root.id;
        const parent = findNode(storeApi.document.root, parentId);
        const index = parent?.children?.length ?? 0;
        storeApi.pasteComponent(parentId, index);
        return;
      }

      // Duplicate: Ctrl+D
      if (ctrl && e.key === 'd' && selectedIds.length === 1) {
        e.preventDefault();
        storeApi.duplicateComponent(selectedIds[0]);
        return;
      }

      // Select all: Ctrl+A — select all direct children of root
      if (ctrl && e.key === 'a') {
        e.preventDefault();
        const allIds = storeApi.document.root.children?.map(c => c.id) ?? [];
        storeApi.select(allIds);
        return;
      }

      // Escape — deselect
      if (e.key === 'Escape') {
        storeApi.select([]);
        return;
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [store]);
}
```

**`packages/editor/src/Editor.tsx`** — ADD:
```ts
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
// Inside Editor component:
useKeyboardShortcuts(store);
```

### Note on registry access
The keyboard hook needs registry for container detection. Pass registry as a second param:
```ts
useKeyboardShortcuts(store, registry);
```

### MUST DO
- Guard against shortcuts firing when user is typing in input/textarea/contenteditable
- Support both Ctrl (Windows/Linux) and Cmd (Mac) via `e.metaKey || e.ctrlKey`
- Delete/Backspace only fires if there are selected components
- Paste checks clipboard is not null
- All operations go through store actions (which handle undo snapshots)

### MUST NOT DO
- Do not create a global event bus for keyboard events — simple window listener is sufficient
- Do not interfere with browser native shortcuts (Ctrl+C in input fields etc.)

---

## Task 3: Drag Sorting with dnd-kit/sortable (editor + renderer)

### Current state
Phase 1 only supports palette → canvas drag (new components). Existing components cannot be reordered or moved between containers.

### Files to create/modify

**`packages/renderer/src/SortableComponentRenderer.tsx`** — CREATE:
A wrapper around DesignRenderer that makes each component sortable using `@dnd-kit/sortable`:

```tsx
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { ComponentInstance, ComponentRegistry, EditorStoreHook } from '@open-lowcode/engine';

interface SortableComponentRendererProps {
  instance: ComponentInstance;
  registry: ComponentRegistry;
  store: EditorStoreHook;
}

export const SortableComponentRenderer: React.FC<SortableComponentRendererProps> = ({
  instance, registry, store
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: instance.id,
    data: { type: instance.type, fromCanvas: true },
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <DesignRenderer instance={instance} registry={registry} store={store} />
    </div>
  );
};
```

**`packages/renderer/src/DesignRenderer.tsx`** — MODIFY:
Replace the direct `DesignRenderer` recursion for children with `SortableComponentRenderer`:

In `DesignComponentWrapper`, change children rendering to:
```tsx
import { SortableComponentRenderer } from './SortableComponentRenderer';

// In DesignComponentWrapper:
const childContent = instance.children?.map((child) => (
  <SortableComponentRenderer key={child.id} instance={child} registry={registry} store={store} />
));
```

**`packages/editor/src/canvas/Canvas.tsx`** — MODIFY:
Replace `useDroppable` with `SortableContext` for the root container:

```tsx
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';

// Inside Canvas:
<SortableContext
  items={document.root.children?.map(c => c.id) ?? []}
  strategy={verticalListSortingStrategy}
>
  {/* render children via SortableComponentRenderer */}
</SortableContext>
```

**`packages/editor/src/Editor.tsx`** — MODIFY `handleDragEnd`:
Add handling for canvas → canvas drag (reorder + move between containers):

```ts
const handleDragEnd = (event: DragEndEvent) => {
  setActiveId(null);
  const { active, over } = event;
  if (!over) return;

  const activeData = active.data.current;

  // Case 1: Palette → Canvas (existing)
  if (activeData?.fromPalette) {
    // ... existing logic ...
    return;
  }

  // Case 2: Canvas → Canvas (reorder / move)
  if (activeData?.fromCanvas) {
    const movedId = active.id as string;
    const overId = over.id as string;

    if (movedId === overId) return;

    // Determine target parent and index
    const overInstance = findNode(document.root, overId);
    if (!overInstance) return;

    const overMeta = registry.getMeta(overInstance.type);
    if (overMeta?.isContainer) {
      // Drop INTO a container → append at end
      moveComponent(movedId, overId, overInstance.children?.length ?? 0);
    } else {
      // Drop NEAR a component → insert at same parent, relative position
      const parentInfo = findParent(document.root, overId);
      if (parentInfo) {
        moveComponent(movedId, parentInfo.parent.id, parentInfo.index);
      }
    }
    return;
  }
};
```

Also add `DragOverlay` for visual feedback during drag:
```tsx
import { DragOverlay } from '@dnd-kit/core';

// In Editor:
<DragOverlay>
  {activeId && activeDragData?.fromPalette && (
    <div style={{ padding: '8px 12px', background: '#e6f4ff', border: '1px solid #1677ff', borderRadius: 6, fontSize: 13 }}>
      {activeDragData.type}
    </div>
  )}
</DragOverlay>
```

### MUST DO
- Use `@dnd-kit/sortable`'s `SortableContext` with `verticalListSortingStrategy`
- Each child component in a container is wrapped in `useSortable`
- Containers must also be `useDroppable` targets (accept children dragged into them)
- Support both: reordering within same parent AND moving to different container
- Maintain the existing palette → canvas drag flow (don't break it)
- `moveComponent` in store already handles the remove+insert logic — reuse it

### MUST NOT DO
- Do not change the engine store API (moveComponent already exists)
- Do not break the existing palette drag flow
- Do not add animation libraries — use CSS transitions from dnd-kit

---

## Task 4: Context Menu (editor)

### Files to create/modify

**`packages/editor/src/canvas/ContextMenu.tsx`** — CREATE:
```tsx
import { Dropdown } from 'antd';
import type { MenuProps } from 'antd';
import { CopyOutlined, DeleteOutlined, ... } from '@ant-design/icons';

interface ContextMenuProps {
  store: EditorStoreHook;
  registry: ComponentRegistry;
  children: React.ReactNode;
}

export const ContextMenu: React.FC<ContextMenuProps> = ({ store, registry, children }) => {
  // Build menu items from store state
  // Items: 复制, 粘贴, 删除, 上移, 下移, 锁定(placeholder)
  // Each item calls the corresponding store action
  // If no component is selected, show limited menu (only 粘贴 if clipboard exists)

  return (
    <Dropdown menu={{ items }} trigger={['contextMenu']}>
      {children}
    </Dropdown>
  );
};
```

**`packages/editor/src/canvas/Canvas.tsx`** — MODIFY:
Wrap the canvas content with `ContextMenu`:
```tsx
<ContextMenu store={store} registry={registry}>
  {/* existing canvas content */}
</ContextMenu>
```

### Context menu items (in order):
1. **复制** Ctrl+C — copyComponent
2. **粘贴** Ctrl+V — pasteComponent (disabled if clipboard empty)
3. **--- divider ---**
4. **删除** Delete — deleteComponent
5. **--- divider ---**
6. **上移** — moveComponent(id, parentId, currentIndex - 1)
7. **下移** — moveComponent(id, parentId, currentIndex + 1)
8. **--- divider ---**
9. **复制组件** Ctrl+D — duplicateComponent

### Additional store actions needed

**`packages/engine/src/store/createStore.ts`** — ADD:
```ts
moveUp(id: string): void;
moveDown(id: string): void;
```
These use `findParent` to get current index, then call `moveComponent(id, parentId, index ± 1)`.

### MUST DO
- Menu items show keyboard shortcut hints (e.g. "Ctrl+C")
- Disabled state for unavailable actions (no clipboard = paste disabled, first item = move up disabled, etc.)
- Right-click on canvas background (no selection) shows paste-only menu
- Right-click on a component auto-selects it, then shows full menu
- Use Ant Design's `Dropdown` with `trigger={['contextMenu']}`

### MUST NOT DO
- Do not implement "锁定" (lock) — placeholder only for Phase 2
- Do not create a custom context menu component — use Ant Design's Dropdown

---

## Task 5: Layers Panel (editor)

### Files to create/modify

**`packages/editor/src/panels/LayersPanel.tsx`** — CREATE:

A tree view of the component hierarchy with:
- Indented tree showing component type + auto-generated label
- Click to select, hover highlight
- Selected state synced with canvas selection
- Drag to reorder (via `@dnd-kit/sortable`)

```tsx
interface LayersPanelProps {
  store: EditorStoreHook;
  registry: ComponentRegistry;
}

export const LayersPanel: React.FC<LayersPanelProps> = ({ store, registry }) => {
  const document = store((s) => s.document);
  const selectedIds = store((s) => s.selectedIds);
  const select = store((s) => s.select);

  // Render recursive tree of LayerItem components
  return (
    <div style={{ width: 240, height: '100%', borderRight: '1px solid #f0f0f0', backgroundColor: '#fff', overflowY: 'auto' }}>
      <div style={{ padding: '8px 12px', fontSize: 12, color: '#8c8c8c', fontWeight: 600 }}>图层</div>
      <SortableContext items={document.root.children?.map(c => c.id) ?? []} strategy={verticalListSortingStrategy}>
        {document.root.children?.map(child => (
          <LayerItem key={child.id} instance={child} store={store} registry={registry} depth={0} />
        ))}
      </SortableContext>
    </div>
  );
};
```

Each `LayerItem`:
```tsx
const LayerItem: React.FC<{ instance: ComponentInstance; store: EditorStoreHook; registry: ComponentRegistry; depth: number }> = ...
```
- Uses `useSortable` for drag reorder
- Shows expand/collapse arrow for containers with children
- Tree indent = depth * 16px
- Click → select
- Selected → blue background
- Shows component type icon + title

**`packages/editor/src/Editor.tsx`** — MODIFY:
Add LayersPanel below the canvas area (or as a toggle tab). Based on the design doc layout, layers goes below the canvas in the bottom area. For simplicity, add it as a collapsible panel at the bottom of the left sidebar (ComponentPalette area), using Ant Design's `Collapse`:

```tsx
import { Collapse } from 'antd';
// In Editor layout, left sidebar:
<div style={{ width: 240, display: 'flex', flexDirection: 'column' }}>
  <div style={{ flex: 1, overflow: 'auto' }}>
    <Collapse ghost items={[{ key: 'palette', label: '组件', children: <ComponentPalette registry={registry} /> }]} defaultActiveKey={['palette']} />
    <Collapse ghost items={[{ key: 'layers', label: '图层', children: <LayersPanel store={store} registry={registry} /> }]} defaultActiveKey={['layers']} />
  </div>
</div>
```

### MUST DO
- Layer selection syncs bidirectionally with canvas (clicking layer = clicking canvas)
- Container components show collapsible children
- Drag reorder in layers panel triggers the same `moveComponent` store action
- Depth-based indentation for visual hierarchy
- Show component type icon (reuse icon mapping from ComponentPalette)

### MUST NOT DO
- Do not create a separate layers state — derive everything from `document.root`
- Do not use a heavy tree library — simple recursive component is sufficient
- Do not implement inline rename — future feature

---

## Task 6: Canvas Zoom + Pan (editor)

### Files to create/modify

**`packages/editor/src/canvas/Canvas.tsx`** — MODIFY:

Add zoom via Ctrl+scroll and pan via Space+drag:

```tsx
export const Canvas: React.FC<CanvasProps> = ({ registry, store }) => {
  const canvasScale = store((s) => s.canvasScale);
  const setCanvasScale = store((s) => s.setCanvasScale);
  const [isPanning, setIsPanning] = useState(false);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isSpaceDown, setIsSpaceDown] = useState(false);
  const panStart = useRef({ x: 0, y: 0 });

  // Zoom: Ctrl+wheel
  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      setCanvasScale(Math.min(3, Math.max(0.25, canvasScale + delta)));
    }
  }, [canvasScale, setCanvasScale]);

  // Pan: Space+drag
  // Track space key down/up
  // On mouse down (while space held) → start pan
  // On mouse move → update panOffset
  // On mouse up → end pan
  // Change cursor to 'grab'/'grabbing' during pan

  return (
    <div
      onWheel={handleWheel}
      style={{
        flex: 1,
        overflow: 'hidden', // changed from 'auto' — we handle scroll ourselves
        backgroundColor: '#f0f0f0',
        cursor: isPanning ? 'grabbing' : isSpaceDown ? 'grab' : 'default',
        position: 'relative',
      }}
    >
      <div style={{
        transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${canvasScale})`,
        transformOrigin: '0 0',
        transition: isPanning ? 'none' : 'transform 0.2s',
      }}>
        {/* canvas content */}
      </div>
      {/* Zoom indicator */}
      <div style={{ position: 'absolute', bottom: 12, right: 12, fontSize: 12, color: '#666' }}>
        {Math.round(canvasScale * 100)}%
      </div>
    </div>
  );
};
```

### MUST DO
- Zoom range: 25% — 300%, step 10% per scroll tick
- Show current zoom percentage in bottom-right corner of canvas area
- Pan via Space+drag (cursor changes to grab/grabbing)
- Ctrl+wheel zooms (prevent default page scroll)
- Smooth zoom transition (CSS transform transition) but instant pan (no transition during drag)
- Reset zoom button in toolbar

### MUST NOT DO
- Do not zoom the toolbar or sidebars — only the canvas content area
- Do not use canvas 2D or WebGL — keep DOM-based
- Do not implement pinch-to-zoom (desktop only for now)

---

## Task 7: Alignment Guides (editor)

### Files to create/modify

**`packages/editor/src/canvas/AlignmentGuides.tsx`** — CREATE:

A component that renders horizontal/vertical guide lines when a dragged component aligns with other components.

```tsx
interface AlignmentGuidesProps {
  guides: GuideLine[];
}

interface GuideLine {
  orientation: 'horizontal' | 'vertical';
  position: number; // px offset from canvas origin
}

export const AlignmentGuides: React.FC<AlignmentGuidesProps> = ({ guides }) => {
  return (
    <>
      {guides.map((guide, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            backgroundColor: '#1677ff',
            pointerEvents: 'none',
            zIndex: 1000,
            ...(guide.orientation === 'horizontal'
              ? { left: 0, right: 0, top: guide.position, height: 1 }
              : { top: 0, bottom: 0, left: guide.position, width: 1 }),
          }}
        />
      ))}
    </>
  );
};
```

**`packages/editor/src/canvas/useAlignmentGuides.ts`** — CREATE:

A hook that computes alignment guide positions during drag:

```ts
interface UseAlignmentGuidesOptions {
  activeId: string | null;
  canvasRef: RefObject<HTMLDivElement>;
  store: EditorStoreHook;
  threshold?: number; // snap threshold in px, default 5
}

export function useAlignmentGuides({ activeId, canvasRef, store, threshold = 5 }: UseAlignmentGuidesOptions) {
  const [guides, setGuides] = useState<GuideLine[]>([]);

  // During drag (onDragMove):
  // 1. Get bounding rect of dragged element
  // 2. Get bounding rects of all sibling elements
  // 3. Compare edges (top, center, bottom for horizontal; left, center, right for vertical)
  // 4. If within threshold → add guide line
  // 5. Clear guides on drag end

  return { guides, setGuides, clearGuides: () => setGuides([]) };
}
```

**`packages/editor/src/canvas/Canvas.tsx`** — MODIFY:
Add `AlignmentGuides` overlay inside the canvas container:

```tsx
<AlignmentGuides guides={guides} />
```

### Guide computation algorithm
1. Collect all component bounding rects from the canvas DOM (`data-component-id` elements)
2. For the active (dragged) component, compute: top, centerY, bottom, left, centerX, right
3. For each other component, compute same 6 values
4. Compare each pair: if |activeVal - otherVal| < threshold → emit a guide at that position
5. Snap: optionally adjust transform to align exactly when within threshold

### Alignment points
- Top edge ↔ Top edge
- Bottom edge ↔ Bottom edge
- Center Y ↔ Center Y (horizontal center)
- Left edge ↔ Left edge
- Right edge ↔ Right edge
- Center X ↔ Center X (vertical center)

### MUST DO
- Show thin blue lines (#1677ff, 1px) for matched alignments
- Threshold of 5px for snapping
- Only show guides during active drag, clear on drag end
- Use absolute positioning relative to canvas content area
- zIndex 1000 to appear above all components

### MUST NOT DO
- Do not implement pixel-perfect snapping (just visual guides for MVP)
- Do not compute guides against off-screen components
- Do not use a physics or collision library

---

## Execution Order

```
Task 1: Copy/Paste + Clone        (engine layer — no UI)
Task 2: Keyboard Shortcuts         (editor — uses Task 1 store actions)
Task 3: Drag Sorting               (editor + renderer — dnd-kit/sortable)
Task 4: Context Menu               (editor — uses Task 1 + Task 2 actions)
Task 5: Layers Panel               (editor — uses Task 3 sortable)
Task 6: Canvas Zoom + Pan          (editor canvas)
Task 7: Alignment Guides           (editor canvas — uses Task 3 drag events)
```

Tasks 1+2 are sequential (2 depends on 1).
Tasks 3, 6 are independent and can run in parallel after Task 1.
Tasks 4, 5 can run in parallel after Tasks 2+3.
Task 7 is last (depends on Task 3 drag infrastructure).

### Suggested parallel execution

```
Batch 1: Task 1
Batch 2: Task 2 + Task 3 + Task 6 (parallel)
Batch 3: Task 4 + Task 5 (parallel)
Batch 4: Task 7
Batch 5: Integration test (build + test + dev server + manual verification)
```

---

## Verification Checklist

After all tasks are complete:

- [ ] `pnpm turbo build` — 6/6 packages build successfully
- [ ] `pnpm turbo test` — all tests pass (existing + new)
- [ ] `pnpm --filter @open-lowcode/web dev` — dev server starts, HTTP 200
- [ ] Can drag components from palette to canvas (existing still works)
- [ ] Can reorder components by dragging within canvas
- [ ] Can drag component into a container
- [ ] Ctrl+C copies selected, Ctrl+V pastes, Ctrl+D duplicates
- [ ] Delete/Backspace deletes selected component
- [ ] Ctrl+Z undoes, Ctrl+Y / Ctrl+Shift+Z redoes
- [ ] Right-click shows context menu with copy/paste/delete/move options
- [ ] Layers panel shows component tree with correct hierarchy
- [ ] Clicking layer item selects corresponding canvas component
- [ ] Ctrl+scroll zooms canvas, Space+drag pans
- [ ] Alignment guide lines appear during drag
- [ ] Zoom percentage shown in canvas corner

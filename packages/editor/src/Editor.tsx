import { useState, useCallback, useRef } from 'react';
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { AppstoreOutlined, UnorderedListOutlined, CodeOutlined, LeftOutlined, RightOutlined } from '@ant-design/icons';
import { ComponentRegistry, findNode, findParent } from '@open-lowcode/engine';
import type { EditorStoreHook, DocumentSchema } from '@open-lowcode/engine';
import { Canvas } from './canvas/Canvas';
import { ComponentPalette } from './panels/ComponentPalette';
import { LayersPanel } from './panels/LayersPanel';
import { PropsPanel } from './panels/PropsPanel';
import { StylePanel } from './panels/StylePanel';
import { EventPanel } from './panels/EventPanel';
import { BindingPanel } from './panels/BindingPanel';
import { VariablePanel } from './panels/VariablePanel';
import { Toolbar } from './toolbar/Toolbar';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useAutoSave, loadFromLocalStorage, saveToLocalStorage } from './hooks/useAutoSave';
import { useCodeExport } from './export/useCodeExport';
import { ExportModal } from './export/ExportModal';

interface EditorProps {
  registry: ComponentRegistry;
  store: EditorStoreHook;
}

export const Editor: React.FC<EditorProps> = ({ registry, store }) => {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeDragData, setActiveDragData] = useState<{ type: string; fromPalette?: boolean } | null>(null);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const canvasMode = store((s) => s.canvasMode);
  const viewport = store((s) => s.viewport);
  const document = store((s) => s.document);
  const insertComponent = store((s) => s.insertComponent);
  const moveComponent = store((s) => s.moveComponent);
  const loadDocument = store((s) => s.loadDocument);

  useKeyboardShortcuts(store, registry);
  useAutoSave(store);

  const { files: exportFiles, componentName: exportComponentName } = useCodeExport(document);

  const hasLoadedRef = useRef(false);
  if (!hasLoadedRef.current) {
    hasLoadedRef.current = true;
    const saved = loadFromLocalStorage();
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as DocumentSchema;
        loadDocument(parsed);
      } catch {
        // corrupted data — use default
      }
    }
  }

  const handleImport = useCallback(() => {
    const input = globalThis.document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e: Event) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const parsed = JSON.parse(reader.result as string) as DocumentSchema;
          loadDocument(parsed);
        } catch {
          // invalid JSON
        }
      };
      reader.readAsText(file);
    };
    input.click();
  }, [loadDocument]);

  const handleExport = useCallback(() => {
    const json = JSON.stringify(document, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = globalThis.document.createElement('a');
    a.href = url;
    a.download = `${document.meta.name || 'open-lowcode-export'}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [document]);

  const handleSave = useCallback(() => {
    saveToLocalStorage(JSON.stringify(document));
  }, [document]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
  );

  const handleDragStart = (event: DragStartEvent) => {
    const id = event.active.id as string;
    setActiveId(id);
    setActiveDragData(event.active.data.current as { type: string; fromPalette?: boolean } | null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null);
    setActiveDragData(null);
    const { active, over } = event;
    if (!over) return;

    const activeData = active.data.current;

    if (activeData?.fromPalette) {
      const componentType = activeData.type as string;
      const targetId = over.id as string;

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
      return;
    }

    if (activeData?.fromCanvas) {
      const movedId = active.id as string;
      const overId = over.id as string;

      if (movedId === overId) return;

      const overInstance = findNode(document.root, overId);
      if (!overInstance) return;

      const overMeta = registry.getMeta(overInstance.type);
      if (overMeta?.isContainer) {
        moveComponent(movedId, overId, overInstance.children?.length ?? 0);
      } else {
        const parentInfo = findParent(document.root, overId);
        if (parentInfo) {
          moveComponent(movedId, parentInfo.parent.id, parentInfo.index);
        }
      }
    }
  };

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
        <Toolbar store={store} onImport={handleImport} onExport={handleExport} onSave={handleSave} onExportReact={() => setExportModalOpen(true)} />
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
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
          <Canvas registry={registry} store={store} activeId={activeId} />
          {canvasMode === 'design' && (
            <div style={{ width: 320, borderLeft: '1px solid #f0f0f0', backgroundColor: '#fff', overflowY: 'auto' }}>
              <SettingsPanel registry={registry} store={store} />
            </div>
          )}
        </div>
      </div>
      <DragOverlay>
        {activeId && activeDragData?.fromPalette && (
          <div style={{ padding: '8px 12px', background: '#e6f4ff', border: '1px solid #1677ff', borderRadius: 6, fontSize: 13, opacity: 0.9 }}>
            {activeDragData.type}
          </div>
        )}
      </DragOverlay>
      <ExportModal
        open={exportModalOpen}
        onClose={() => setExportModalOpen(false)}
        files={exportFiles}
        componentName={exportComponentName}
      />
    </DndContext>
  );
};

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

const SettingsPanel: React.FC<{ registry: ComponentRegistry; store: EditorStoreHook }> = ({ registry, store }) => {
  const [activeTab, setActiveTab] = useState<'props' | 'style' | 'events' | 'bindings'>('props');

  const tabs: Array<{ key: typeof activeTab; label: string }> = [
    { key: 'props', label: '属性' },
    { key: 'style', label: '样式' },
    { key: 'events', label: '事件' },
    { key: 'bindings', label: '绑定' },
  ];

  return (
    <div>
      <div style={{ display: 'flex', borderBottom: '1px solid #f0f0f0' }}>
        {tabs.map((tab) => (
          <div
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              flex: 1,
              textAlign: 'center',
              padding: '8px 0',
              cursor: 'pointer',
              fontSize: 12,
              fontWeight: activeTab === tab.key ? 600 : 400,
              color: activeTab === tab.key ? '#1677ff' : '#666',
              borderBottom: activeTab === tab.key ? '2px solid #1677ff' : '2px solid transparent',
            }}
          >
            {tab.label}
          </div>
        ))}
      </div>
      {activeTab === 'props' && <PropsPanel registry={registry} store={store} />}
      {activeTab === 'style' && <StylePanel store={store} />}
      {activeTab === 'events' && <EventPanel registry={registry} store={store} />}
      {activeTab === 'bindings' && <BindingPanel registry={registry} store={store} />}
    </div>
  );
};

const SidebarSection: React.FC<{ title: string; defaultOpen: boolean; children: React.ReactNode }> = ({
  title,
  defaultOpen,
  children,
}) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div>
      <div
        onClick={() => setOpen(!open)}
        style={{
          padding: '8px 12px',
          fontSize: 12,
          color: '#8c8c8c',
          fontWeight: 600,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          borderBottom: open ? '1px solid #f0f0f0' : 'none',
          userSelect: 'none',
        }}
      >
        <span style={{ transform: open ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.15s', fontSize: 10 }}>
          ▶
        </span>
        {title}
      </div>
      {open && children}
    </div>
  );
};

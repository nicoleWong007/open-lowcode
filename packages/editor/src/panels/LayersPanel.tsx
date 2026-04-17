import { useState } from 'react';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { ComponentInstance, ComponentRegistry, EditorStoreHook } from '@open-lowcode/engine';

interface LayersPanelProps {
  store: EditorStoreHook;
  registry: ComponentRegistry;
}

const TYPE_ICONS: Record<string, string> = {
  Text: 'T',
  Button: ' BTN',
  Box: '☐',
};

export const LayersPanel: React.FC<LayersPanelProps> = ({ store, registry }) => {
  const document = store((s) => s.document);
  const childIds = document.root.children?.map((c) => c.id) ?? [];

  return (
    <div style={{ height: '100%', overflowY: 'auto' }}>
      <SortableContext items={childIds} strategy={verticalListSortingStrategy}>
        {document.root.children?.map((child) => (
          <LayerItem
            key={child.id}
            instance={child}
            store={store}
            registry={registry}
            depth={0}
          />
        ))}
      </SortableContext>
      {(!document.root.children || document.root.children.length === 0) && (
        <div style={{ padding: 16, color: '#bfbfbf', fontSize: 12, textAlign: 'center' }}>
          暂无组件
        </div>
      )}
    </div>
  );
};

interface LayerItemProps {
  instance: ComponentInstance;
  store: EditorStoreHook;
  registry: ComponentRegistry;
  depth: number;
}

const LayerItem: React.FC<LayerItemProps> = ({ instance, store, registry, depth }) => {
  const [expanded, setExpanded] = useState(true);
  const selectedIds = store((s) => s.selectedIds);
  const select = store((s) => s.select);

  const isSelected = selectedIds.includes(instance.id);
  const meta = registry.getMeta(instance.type);
  const isContainer = meta?.isContainer ?? false;
  const hasChildren = (instance.children?.length ?? 0) > 0;

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: instance.id,
    data: { type: instance.type, fromCanvas: true },
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const icon = TYPE_ICONS[instance.type] ?? instance.type[0];
  const label = meta?.title ?? instance.type;

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <div
        onClick={(e) => {
          e.stopPropagation();
          select([instance.id]);
        }}
        style={{
          paddingLeft: depth * 16 + 8,
          paddingRight: 8,
          paddingTop: 5,
          paddingBottom: 5,
          fontSize: 12,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          backgroundColor: isSelected ? '#e6f4ff' : 'transparent',
          borderLeft: isSelected ? '2px solid #1677ff' : '2px solid transparent',
          transition: 'background-color 0.1s',
          userSelect: 'none',
        }}
        onMouseEnter={(e) => {
          if (!isSelected) (e.currentTarget.style.backgroundColor = '#fafafa');
        }}
        onMouseLeave={(e) => {
          if (!isSelected) (e.currentTarget.style.backgroundColor = 'transparent');
        }}
      >
        {isContainer && hasChildren ? (
          <span
            onClick={(e) => {
              e.stopPropagation();
              setExpanded(!expanded);
            }}
            style={{
              width: 14,
              height: 14,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 10,
              color: '#999',
              flexShrink: 0,
              transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)',
              transition: 'transform 0.15s',
            }}
          >
            ▶
          </span>
        ) : (
          <span style={{ width: 14, flexShrink: 0 }} />
        )}
        <span style={{ fontSize: 11, color: '#999', flexShrink: 0 }}>{icon}</span>
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
      </div>
      {isContainer && expanded && instance.children?.map((child) => (
        <LayerItem
          key={child.id}
          instance={child}
          store={store}
          registry={registry}
          depth={depth + 1}
        />
      ))}
    </div>
  );
};

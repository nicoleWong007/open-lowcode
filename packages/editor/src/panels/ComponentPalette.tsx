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

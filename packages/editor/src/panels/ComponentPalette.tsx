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

const ICON_MAP: Record<string, React.ComponentType<{ style?: React.CSSProperties }>> = {
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
  if (!IconComponent) return <span style={{ fontSize: 12, color: '#999' }}>▪</span>;
  return <IconComponent style={{ fontSize: 14, color: '#8c8c8c' }} />;
}

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
        padding: '5px 10px',
        backgroundColor: isDragging ? '#e6f4ff' : 'transparent',
        border: isDragging ? '1px solid #91caff' : '1px solid #d9d9d9',
        borderRadius: 4,
        cursor: 'grab',
        fontSize: 12,
        color: '#595959',
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        userSelect: 'none',
        transition: 'background-color 0.15s',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = '#f5f5f5';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = isDragging ? '#e6f4ff' : 'transparent';
      }}
    >
      {getIcon(meta.icon)}
      <span>{meta.title}</span>
    </div>
  );
};

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
              fontWeight: 500,
              marginBottom: 4,
              padding: '0 2px',
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

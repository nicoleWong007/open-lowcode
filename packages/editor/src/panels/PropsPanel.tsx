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

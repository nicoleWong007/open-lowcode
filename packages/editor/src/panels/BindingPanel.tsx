import { Button, Select, Input, Tag, Space } from 'antd';
import { DeleteOutlined } from '@ant-design/icons';
import type { EditorStoreHook, ComponentRegistry } from '@open-lowcode/engine';
import { findNode } from '@open-lowcode/engine';

interface BindingPanelProps {
  store: EditorStoreHook;
  registry: ComponentRegistry;
}

export const BindingPanel: React.FC<BindingPanelProps> = ({ store, registry }) => {
  const selectedIds = store((s) => s.selectedIds);
  const document = store((s) => s.document);
  const updateBinding = store((s) => s.updateBinding);

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

  const bindings = instance.bindings ?? {};
  const variables = document.variables;

  const variableOptions = variables.map((v) => ({
    label: `${v.name} (${v.type})`,
    value: v.name,
  }));

  return (
    <div style={{ padding: '12px 16px' }}>
      <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>
        {meta.title} 数据绑定
      </div>
      {meta.propsSchema.map((propSchema) => {
        const binding = bindings[propSchema.name];
        const isBound = !!binding;

        return (
          <div
            key={propSchema.name}
            style={{
              marginBottom: 8,
              padding: 8,
              border: '1px solid #f0f0f0',
              borderRadius: 4,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <span style={{ fontSize: 12, color: '#666' }}>{propSchema.title}</span>
              {isBound && (
                <Tag color="blue" style={{ fontSize: 10, margin: 0 }}>
                  {binding.type === 'variable' ? '变量' : binding.type === 'expression' ? '表达式' : '数据源'}
                </Tag>
              )}
            </div>

            {isBound ? (
              <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                <Input
                  size="small"
                  value={binding.value}
                  style={{ flex: 1 }}
                  onChange={(e) =>
                    updateBinding(selectedId, propSchema.name, {
                      type: binding.type,
                      value: e.target.value,
                    })
                  }
                />
                <Select
                  size="small"
                  value={binding.type}
                  style={{ width: 70 }}
                  options={[
                    { label: '变量', value: 'variable' },
                    { label: '表达式', value: 'expression' },
                  ]}
                  onChange={(val) =>
                    updateBinding(selectedId, propSchema.name, {
                      type: val,
                      value: binding.value,
                    })
                  }
                />
                <Button
                  size="small"
                  danger
                  icon={<DeleteOutlined />}
                  onClick={() => updateBinding(selectedId, propSchema.name, null)}
                />
              </div>
            ) : (
              <Space size={4}>
                {variableOptions.length > 0 && (
                  <Select
                    size="small"
                    placeholder="绑定变量"
                    style={{ width: 120 }}
                    options={variableOptions}
                    onChange={(val) =>
                      updateBinding(selectedId, propSchema.name, {
                        type: 'variable',
                        value: val,
                      })
                    }
                  />
                )}
                <Button
                  size="small"
                  type="dashed"
                  onClick={() =>
                    updateBinding(selectedId, propSchema.name, {
                      type: 'expression',
                      value: '',
                    })
                  }
                >
                  表达式
                </Button>
              </Space>
            )}
          </div>
        );
      })}
    </div>
  );
};

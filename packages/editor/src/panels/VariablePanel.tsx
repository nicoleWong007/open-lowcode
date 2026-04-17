import { Button, Input, InputNumber, Select, Space, Popconfirm } from 'antd';
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import type { EditorStoreHook } from '@open-lowcode/engine';

interface VariablePanelProps {
  store: EditorStoreHook;
}

export const VariablePanel: React.FC<VariablePanelProps> = ({ store }) => {
  const document = store((s) => s.document);
  const addVariable = store((s) => s.addVariable);
  const removeVariable = store((s) => s.removeVariable);
  const updateVariable = store((s) => s.updateVariable);

  const variables = document.variables;

  return (
    <div style={{ padding: '12px 16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <span style={{ fontSize: 14, fontWeight: 600 }}>变量</span>
        <Button
          size="small"
          type="dashed"
          icon={<PlusOutlined />}
          onClick={() => addVariable({
            name: `var_${variables.length + 1}`,
            type: 'string',
            defaultValue: '',
            scope: 'document',
          })}
        >
          添加
        </Button>
      </div>

      {variables.length === 0 && (
        <div style={{ color: '#8c8c8c', fontSize: 12, textAlign: 'center', padding: 16 }}>
          暂无变量，点击"添加"创建
        </div>
      )}

      {variables.map((variable) => (
        <div
          key={variable.id}
          style={{
            marginBottom: 12,
            padding: 8,
            border: '1px solid #f0f0f0',
            borderRadius: 6,
            backgroundColor: '#fafafa',
          }}
        >
          <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            <Input
              size="small"
              value={variable.name}
              placeholder="变量名"
              style={{ flex: 1 }}
              onChange={(e) => updateVariable(variable.id, { name: e.target.value })}
            />
            <Select
              size="small"
              value={variable.type}
              style={{ width: 90 }}
              options={[
                { label: '字符串', value: 'string' },
                { label: '数字', value: 'number' },
                { label: '布尔', value: 'boolean' },
                { label: '对象', value: 'object' },
                { label: '数组', value: 'array' },
              ]}
              onChange={(val) => updateVariable(variable.id, { type: val })}
            />
            <Popconfirm
              title="确认删除此变量？"
              onConfirm={() => removeVariable(variable.id)}
              okText="删除"
              cancelText="取消"
            >
              <Button size="small" danger icon={<DeleteOutlined />} />
            </Popconfirm>
          </div>
          <div style={{ fontSize: 11, color: '#999' }}>
            默认值:
            {variable.type === 'number' ? (
              <InputNumber
                size="small"
                value={variable.defaultValue}
                style={{ width: '100%', marginTop: 4 }}
                onChange={(v) => updateVariable(variable.id, { defaultValue: v })}
              />
            ) : variable.type === 'boolean' ? (
              <Select
                size="small"
                value={variable.defaultValue ? 'true' : 'false'}
                style={{ width: '100%', marginTop: 4 }}
                options={[
                  { label: 'true', value: 'true' },
                  { label: 'false', value: 'false' },
                ]}
                onChange={(v) => updateVariable(variable.id, { defaultValue: v === 'true' })}
              />
            ) : (
              <Input
                size="small"
                value={typeof variable.defaultValue === 'string' ? variable.defaultValue : JSON.stringify(variable.defaultValue)}
                style={{ marginTop: 4 }}
                onChange={(e) => {
                  const val = variable.type === 'object' || variable.type === 'array'
                    ? (() => { try { return JSON.parse(e.target.value); } catch { return e.target.value; } })()
                    : e.target.value;
                  updateVariable(variable.id, { defaultValue: val });
                }}
              />
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

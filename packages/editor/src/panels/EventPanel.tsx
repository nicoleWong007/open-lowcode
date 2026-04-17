import { Button, Select, Input, Space, Popconfirm } from 'antd';
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import type { EditorStoreHook, ComponentRegistry, Action } from '@open-lowcode/engine';
import { findNode } from '@open-lowcode/engine';

interface EventPanelProps {
  store: EditorStoreHook;
  registry: ComponentRegistry;
}

const ACTION_TYPES = [
  { label: '设置变量', value: 'setState' },
  { label: '调用 API', value: 'callApi' },
  { label: '显示消息', value: 'showMessage' },
  { label: '导航', value: 'navigate' },
  { label: '自定义', value: 'custom' },
];

export const EventPanel: React.FC<EventPanelProps> = ({ store, registry }) => {
  const selectedIds = store((s) => s.selectedIds);
  const document = store((s) => s.document);
  const updateEventHandlers = store((s) => s.updateEventHandlers);

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
  if (!meta?.events?.length) {
    return (
      <div style={{ padding: 16, color: '#8c8c8c', fontSize: 13, textAlign: 'center' }}>
        此组件没有可用事件
      </div>
    );
  }

  const eventHandlers = instance.eventHandlers ?? {};

  return (
    <div style={{ padding: '12px 16px' }}>
      <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>
        {meta.title} 事件
      </div>
      {meta.events.map((eventMeta) => {
        const actions = eventHandlers[eventMeta.name] ?? [];

        return (
          <div key={eventMeta.name} style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, color: '#666', fontWeight: 600, marginBottom: 6 }}>
              {eventMeta.title} ({eventMeta.name})
            </div>
            {actions.map((action, actionIndex) => (
              <div
                key={actionIndex}
                style={{
                  marginBottom: 6,
                  padding: 6,
                  border: '1px solid #f0f0f0',
                  borderRadius: 4,
                  backgroundColor: '#fafafa',
                }}
              >
                <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                  <Select
                    size="small"
                    value={action.type}
                    style={{ flex: 1 }}
                    options={ACTION_TYPES}
                    onChange={(val) => {
                      const newActions = [...actions];
                      newActions[actionIndex] = { type: val, config: {} };
                      updateEventHandlers(selectedId, eventMeta.name, newActions);
                    }}
                  />
                  <Popconfirm
                    title="删除此动作？"
                    onConfirm={() => {
                      const newActions = actions.filter((_, i) => i !== actionIndex);
                      updateEventHandlers(selectedId, eventMeta.name, newActions);
                    }}
                    okText="删除"
                    cancelText="取消"
                  >
                    <Button size="small" danger icon={<DeleteOutlined />} />
                  </Popconfirm>
                </div>
                {renderActionConfig(action, (config) => {
                  const newActions = [...actions];
                  newActions[actionIndex] = { ...action, config: { ...action.config, ...config } };
                  updateEventHandlers(selectedId, eventMeta.name, newActions);
                })}
              </div>
            ))}
            <Button
              size="small"
              type="dashed"
              icon={<PlusOutlined />}
              onClick={() => {
                const newActions: Action[] = [...actions, { type: 'setState', config: {} }];
                updateEventHandlers(selectedId, eventMeta.name, newActions);
              }}
            >
              添加动作
            </Button>
          </div>
        );
      })}
    </div>
  );
};

function renderActionConfig(
  action: { type: string; config: Record<string, any> },
  onChange: (config: Record<string, any>) => void,
): React.ReactNode {
  switch (action.type) {
    case 'setState':
      return (
        <div style={{ marginTop: 4 }}>
          <Input
            size="small"
            placeholder="变量名"
            value={action.config.variable ?? ''}
            style={{ marginBottom: 4 }}
            onChange={(e) => onChange({ variable: e.target.value })}
          />
          <Input
            size="small"
            placeholder="值 (支持表达式 {{...}})"
            value={action.config.value ?? ''}
            onChange={(e) => onChange({ value: e.target.value })}
          />
        </div>
      );
    case 'showMessage':
      return (
        <div style={{ marginTop: 4 }}>
          <Space size={4}>
            <Select
              size="small"
              value={action.config.type ?? 'info'}
              style={{ width: 80 }}
              options={[
                { label: '成功', value: 'success' },
                { label: '错误', value: 'error' },
                { label: '警告', value: 'warning' },
              ]}
              onChange={(v) => onChange({ type: v })}
            />
            <Input
              size="small"
              placeholder="消息内容"
              value={action.config.content ?? ''}
              style={{ width: 160 }}
              onChange={(e) => onChange({ content: e.target.value })}
            />
          </Space>
        </div>
      );
    case 'callApi':
      return (
        <div style={{ marginTop: 4 }}>
          <Input
            size="small"
            placeholder="数据源名称"
            value={action.config.dataSource ?? ''}
            onChange={(e) => onChange({ dataSource: e.target.value })}
          />
        </div>
      );
    case 'navigate':
      return (
        <div style={{ marginTop: 4 }}>
          <Input
            size="small"
            placeholder="URL"
            value={action.config.url ?? ''}
            onChange={(e) => onChange({ url: e.target.value })}
          />
        </div>
      );
    default:
      return null;
  }
}

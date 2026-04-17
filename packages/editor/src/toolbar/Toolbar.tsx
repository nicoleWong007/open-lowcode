import { Button, Space, Tooltip, Segmented } from 'antd';
import {
  UndoOutlined,
  RedoOutlined,
  DesktopOutlined,
  MobileOutlined,
  EyeOutlined,
  EditOutlined,
} from '@ant-design/icons';
import type { EditorStoreHook } from '@open-lowcode/engine';

interface ToolbarProps {
  store: EditorStoreHook;
  onImport: () => void;
  onExport: () => void;
  onSave: () => void;
}

export const Toolbar: React.FC<ToolbarProps> = ({ store, onImport, onExport, onSave }) => {
  const canUndo = store((s) => s.past.length > 0);
  const canRedo = store((s) => s.future.length > 0);
  const canvasMode = store((s) => s.canvasMode);
  const viewport = store((s) => s.viewport);
  const undo = store((s) => s.undo);
  const redo = store((s) => s.redo);
  const setCanvasMode = store((s) => s.setCanvasMode);
  const setViewport = store((s) => s.setViewport);

  return (
    <div
      style={{
        height: 48,
        borderBottom: '1px solid #f0f0f0',
        backgroundColor: '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 16px',
      }}
    >
      <Space>
        <span style={{ fontWeight: 600, fontSize: 15, marginRight: 12 }}>Open LowCode</span>
        <Tooltip title="撤销 (Ctrl+Z)">
          <Button icon={<UndoOutlined />} size="small" disabled={!canUndo} onClick={undo} />
        </Tooltip>
        <Tooltip title="重做 (Ctrl+Y)">
          <Button icon={<RedoOutlined />} size="small" disabled={!canRedo} onClick={redo} />
        </Tooltip>
      </Space>

      <Space>
        <Segmented
          size="small"
          value={canvasMode}
          onChange={(val) => setCanvasMode(val as 'design' | 'preview')}
          options={[
            { label: <><EditOutlined /> 编辑</>, value: 'design' },
            { label: <><EyeOutlined /> 预览</>, value: 'preview' },
          ]}
        />
        <Segmented
          size="small"
          value={viewport}
          onChange={(val) => setViewport(val as 'pc' | 'mobile')}
          options={[
            { label: <><DesktopOutlined /> PC</>, value: 'pc' },
            { label: <><MobileOutlined /> 移动</>, value: 'mobile' },
          ]}
        />
      </Space>

      <Space>
        <Button size="small" onClick={onImport}>导入</Button>
        <Button size="small" onClick={onExport}>导出</Button>
        <Button size="small" type="primary" onClick={onSave}>保存</Button>
      </Space>
    </div>
  );
};

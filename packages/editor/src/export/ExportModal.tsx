import { useState } from 'react';
import { Modal, Tabs, Button, Space, message } from 'antd';
import { CopyOutlined, DownloadOutlined } from '@ant-design/icons';
import type { OutputFile } from '@open-lowcode/codegen';
import { createZip } from '@open-lowcode/codegen';

interface ExportModalProps {
  open: boolean;
  onClose: () => void;
  files: OutputFile[];
  componentName: string;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  open,
  onClose,
  files,
  componentName,
}) => {
  const [activeKey, setActiveKey] = useState(files[0]?.path || 'index.tsx');

  const handleCopy = async () => {
    const currentFile = files.find((f) => f.path === activeKey);
    if (currentFile) {
      await navigator.clipboard.writeText(currentFile.content);
      message.success('已复制到剪贴板');
    }
  };

  const handleDownload = async () => {
    const blob = await createZip(files, componentName);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${componentName}.zip`;
    a.click();
    URL.revokeObjectURL(url);
    message.success('下载已开始');
  };

  const tabItems = files.map((file) => ({
    key: file.path,
    label: file.path,
    children: (
      <pre
        style={{
          margin: 0,
          padding: 16,
          background: '#1e1e1e',
          color: '#d4d4d4',
          borderRadius: 8,
          overflow: 'auto',
          maxHeight: 'calc(80vh - 120px)',
          fontSize: 13,
          lineHeight: 1.6,
          fontFamily: "'Fira Code', 'Cascadia Code', Consolas, monospace",
        }}
      >
        {file.content}
      </pre>
    ),
  }));

  return (
    <Modal
      title={`导出 React 代码 — ${componentName}`}
      open={open}
      onCancel={onClose}
      width={900}
      footer={null}
      styles={{ body: { padding: '16px 24px' } }}
    >
      <Space style={{ marginBottom: 12 }}>
        <Button icon={<CopyOutlined />} onClick={handleCopy}>
          复制当前文件
        </Button>
        <Button icon={<DownloadOutlined />} type="primary" onClick={handleDownload}>
          下载 .zip
        </Button>
      </Space>
      <Tabs
        activeKey={activeKey}
        onChange={setActiveKey}
        items={tabItems}
        size="small"
      />
    </Modal>
  );
};

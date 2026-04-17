import { Input, InputNumber, Select, ColorPicker } from 'antd';
import type { EditorStoreHook } from '@open-lowcode/engine';
import { findNode } from '@open-lowcode/engine';

interface StylePanelProps {
  store: EditorStoreHook;
}

interface StyleField {
  key: string;
  label: string;
  type: 'number' | 'select' | 'color';
  options?: { label: string; value: string }[];
  suffix?: string;
}

const STYLE_FIELDS: StyleField[] = [
  { key: 'width', label: '宽度', type: 'number', suffix: 'px' },
  { key: 'height', label: '高度', type: 'number', suffix: 'px' },
  { key: 'minWidth', label: '最小宽度', type: 'number', suffix: 'px' },
  { key: 'minHeight', label: '最小高度', type: 'number', suffix: 'px' },
  { key: 'maxWidth', label: '最大宽度', type: 'number', suffix: 'px' },
  { key: 'maxHeight', label: '最大高度', type: 'number', suffix: 'px' },
  { key: 'margin', label: '外边距', type: 'number', suffix: 'px' },
  { key: 'padding', label: '内边距', type: 'number', suffix: 'px' },
  { key: 'fontSize', label: '字号', type: 'number', suffix: 'px' },
  {
    key: 'fontWeight',
    label: '字重',
    type: 'select',
    options: [
      { label: '细体', value: 'lighter' },
      { label: '正常', value: 'normal' },
      { label: '粗体', value: 'bold' },
    ],
  },
  { key: 'color', label: '文字颜色', type: 'color' },
  {
    key: 'textAlign',
    label: '对齐',
    type: 'select',
    options: [
      { label: '左', value: 'left' },
      { label: '中', value: 'center' },
      { label: '右', value: 'right' },
    ],
  },
  { key: 'backgroundColor', label: '背景色', type: 'color' },
  { key: 'borderRadius', label: '圆角', type: 'number', suffix: 'px' },
  { key: 'borderWidth', label: '边框宽度', type: 'number', suffix: 'px' },
  { key: 'borderColor', label: '边框颜色', type: 'color' },
  {
    key: 'borderStyle',
    label: '边框样式',
    type: 'select',
    options: [
      { label: '无', value: 'none' },
      { label: '实线', value: 'solid' },
      { label: '虚线', value: 'dashed' },
      { label: '点线', value: 'dotted' },
    ],
  },
  {
    key: 'display',
    label: '显示',
    type: 'select',
    options: [
      { label: '块', value: 'block' },
      { label: '弹性', value: 'flex' },
      { label: '行内', value: 'inline' },
      { label: '行内块', value: 'inline-block' },
      { label: '无', value: 'none' },
    ],
  },
  {
    key: 'flexDirection',
    label: '方向',
    type: 'select',
    options: [
      { label: '垂直', value: 'column' },
      { label: '水平', value: 'row' },
    ],
  },
  {
    key: 'justifyContent',
    label: '主轴对齐',
    type: 'select',
    options: [
      { label: '起始', value: 'flex-start' },
      { label: '居中', value: 'center' },
      { label: '结束', value: 'flex-end' },
      { label: '均匀', value: 'space-between' },
    ],
  },
  {
    key: 'alignItems',
    label: '交叉轴对齐',
    type: 'select',
    options: [
      { label: '起始', value: 'flex-start' },
      { label: '居中', value: 'center' },
      { label: '结束', value: 'flex-end' },
      { label: '拉伸', value: 'stretch' },
    ],
  },
  { key: 'gap', label: '间距', type: 'number', suffix: 'px' },
  { key: 'opacity', label: '透明度', type: 'number' },
  {
    key: 'overflow',
    label: '溢出',
    type: 'select',
    options: [
      { label: '可见', value: 'visible' },
      { label: '隐藏', value: 'hidden' },
      { label: '滚动', value: 'scroll' },
      { label: '自动', value: 'auto' },
    ],
  },
];

function renderStyleSetter(
  field: StyleField,
  value: any,
  onChange: (val: any) => void,
): React.ReactNode {
  switch (field.type) {
    case 'number':
      return (
        <InputNumber
          value={value}
          onChange={(v) => onChange(v)}
          size="small"
          suffix={field.suffix}
          style={{ width: '100%' }}
          min={0}
        />
      );
    case 'select':
      return (
        <Select
          value={value}
          onChange={(v) => onChange(v)}
          options={field.options}
          size="small"
          style={{ width: '100%' }}
          allowClear
        />
      );
    case 'color':
      return (
        <ColorPicker
          value={value}
          onChange={(_, hex) => onChange(hex)}
          size="small"
        />
      );
  }
}

const SECTION_LABELS: Record<string, string> = {
  width: '尺寸',
  margin: '间距',
  fontSize: '文字',
  backgroundColor: '背景',
  borderRadius: '边框',
  display: '布局',
  opacity: '其他',
};

function getSection(key: string): string {
  if (['width', 'height', 'minWidth', 'minHeight', 'maxWidth', 'maxHeight'].includes(key)) return 'width';
  if (['margin', 'padding'].includes(key)) return 'margin';
  if (['fontSize', 'fontWeight', 'color', 'textAlign'].includes(key)) return 'fontSize';
  if (['backgroundColor'].includes(key)) return 'backgroundColor';
  if (['borderRadius', 'borderWidth', 'borderColor', 'borderStyle'].includes(key)) return 'borderRadius';
  if (['display', 'flexDirection', 'justifyContent', 'alignItems', 'gap'].includes(key)) return 'display';
  return 'opacity';
}

export const StylePanel: React.FC<StylePanelProps> = ({ store }) => {
  const selectedIds = store((s) => s.selectedIds);
  const document = store((s) => s.document);
  const updateStyle = store((s) => s.updateStyle);

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

  const sections: Record<string, StyleField[]> = {};
  for (const field of STYLE_FIELDS) {
    const section = getSection(field.key);
    if (!sections[section]) sections[section] = [];
    sections[section].push(field);
  }

  return (
    <div style={{ padding: '12px 16px' }}>
      {Object.entries(sections).map(([sectionKey, fields]) => (
        <div key={sectionKey} style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 12, color: '#8c8c8c', fontWeight: 600, marginBottom: 8 }}>
            {SECTION_LABELS[sectionKey] ?? sectionKey}
          </div>
          {fields.map((field) => (
            <div key={field.key} style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ fontSize: 12, color: '#666', width: 64, flexShrink: 0 }}>{field.label}</div>
              <div style={{ flex: 1 }}>
                {renderStyleSetter(field, (instance.style as any)?.[field.key], (val) => {
                  updateStyle(selectedId, { [field.key]: val });
                })}
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
};

import type { ComponentRegistry } from '@open-lowcode/engine';
import { TextComponent } from './basic/Text';
import { ButtonComponent } from './basic/Button';
import { ImageComponent } from './basic/Image';
import { IconComponent, ICON_OPTIONS } from './basic/Icon';
import { LinkComponent } from './basic/Link';
import { BoxComponent } from './container/Box';
import { CardComponent } from './container/Card';
import { GridComponent } from './container/Grid';
import { TabsComponent } from './container/Tabs';
import { InputComponent } from './form/Input';
import { SelectComponent } from './form/Select';
import { CheckboxComponent } from './form/Checkbox';
import { FormComponent } from './form/Form';
import { TableComponent } from './data/Table';
import { ListComponent } from './data/List';

export function registerBuiltinComponents(registry: ComponentRegistry): void {
  // ─── 基础组件 ───

  registry.registerMeta({
    type: 'Text',
    title: '文本',
    icon: 'FontSizeOutlined',
    group: '基础',
    isContainer: false,
    propsSchema: [
      { name: 'text', title: '文本内容', type: 'string', defaultValue: '文本' },
      { name: 'fontSize', title: '字号', type: 'number', defaultValue: 14 },
      { name: 'fontWeight', title: '字重', type: 'select', defaultValue: 'normal', options: [
        { label: '正常', value: 'normal' }, { label: '粗体', value: 'bold' }, { label: '细体', value: 'lighter' },
      ]},
      { name: 'color', title: '颜色', type: 'color', defaultValue: '#333333' },
      { name: 'textAlign', title: '对齐', type: 'select', defaultValue: 'left', options: [
        { label: '左对齐', value: 'left' }, { label: '居中', value: 'center' }, { label: '右对齐', value: 'right' },
      ]},
    ],
    defaultProps: { text: '文本', fontSize: 14, fontWeight: 'normal', color: '#333333', textAlign: 'left' },
    defaultStyle: {},
    events: [],
  });
  registry.registerComponent('Text', TextComponent);

  registry.registerMeta({
    type: 'Button',
    title: '按钮',
    icon: 'AppstoreOutlined',
    group: '基础',
    isContainer: false,
    propsSchema: [
      { name: 'text', title: '文本', type: 'string', defaultValue: '按钮' },
      { name: 'type', title: '类型', type: 'select', defaultValue: 'primary', options: [
        { label: '主要', value: 'primary' }, { label: '默认', value: 'default' },
        { label: '虚线', value: 'dashed' }, { label: '链接', value: 'link' }, { label: '文字', value: 'text' },
      ]},
      { name: 'disabled', title: '禁用', type: 'boolean', defaultValue: false },
      { name: 'size', title: '尺寸', type: 'select', defaultValue: 'middle', options: [
        { label: '小', value: 'small' }, { label: '中', value: 'middle' }, { label: '大', value: 'large' },
      ]},
      { name: 'block', title: '撑满宽度', type: 'boolean', defaultValue: false },
      { name: 'danger', title: '危险样式', type: 'boolean', defaultValue: false },
    ],
    defaultProps: { text: '按钮', type: 'primary', disabled: false, size: 'middle', block: false, danger: false },
    defaultStyle: {},
    events: [{ name: 'onClick', title: '点击' }],
  });
  registry.registerComponent('Button', ButtonComponent);

  registry.registerMeta({
    type: 'Image',
    title: '图片',
    icon: 'PictureOutlined',
    group: '基础',
    isContainer: false,
    propsSchema: [
      { name: 'src', title: '图片地址', type: 'string', defaultValue: '' },
      { name: 'alt', title: '描述', type: 'string', defaultValue: '图片' },
      { name: 'width', title: '宽度', type: 'string', defaultValue: '100%' },
      { name: 'height', title: '高度', type: 'string', defaultValue: 'auto' },
      { name: 'objectFit', title: '填充', type: 'select', defaultValue: 'cover', options: [
        { label: '覆盖', value: 'cover' }, { label: '包含', value: 'contain' },
        { label: '填充', value: 'fill' }, { label: '无', value: 'none' },
      ]},
      { name: 'borderRadius', title: '圆角', type: 'number', defaultValue: 0 },
    ],
    defaultProps: { src: '', alt: '图片', width: '100%', height: 'auto', objectFit: 'cover', borderRadius: 0 },
    defaultStyle: {},
    events: [],
  });
  registry.registerComponent('Image', ImageComponent);

  registry.registerMeta({
    type: 'Icon',
    title: '图标',
    icon: 'StarOutlined',
    group: '基础',
    isContainer: false,
    propsSchema: [
      { name: 'icon', title: '图标', type: 'select', defaultValue: 'smile', options: ICON_OPTIONS },
      { name: 'size', title: '大小', type: 'number', defaultValue: 24 },
      { name: 'color', title: '颜色', type: 'color', defaultValue: '#333333' },
    ],
    defaultProps: { icon: 'smile', size: 24, color: '#333333' },
    defaultStyle: {},
    events: [],
  });
  registry.registerComponent('Icon', IconComponent);

  registry.registerMeta({
    type: 'Link',
    title: '链接',
    icon: 'LinkOutlined',
    group: '基础',
    isContainer: false,
    propsSchema: [
      { name: 'text', title: '文本', type: 'string', defaultValue: '链接' },
      { name: 'href', title: '地址', type: 'string', defaultValue: '#' },
      { name: 'target', title: '目标', type: 'select', defaultValue: '_blank', options: [
        { label: '新窗口', value: '_blank' }, { label: '当前窗口', value: '_self' },
      ]},
      { name: 'fontSize', title: '字号', type: 'number', defaultValue: 14 },
      { name: 'color', title: '颜色', type: 'color', defaultValue: '#1677ff' },
    ],
    defaultProps: { text: '链接', href: '#', target: '_blank', fontSize: 14, color: '#1677ff' },
    defaultStyle: {},
    events: [{ name: 'onClick', title: '点击' }],
  });
  registry.registerComponent('Link', LinkComponent);

  // ─── 容器组件 ───

  registry.registerMeta({
    type: 'Box',
    title: '容器',
    icon: 'BorderOutlined',
    group: '容器',
    isContainer: true,
    propsSchema: [
      { name: 'padding', title: '内边距', type: 'number', defaultValue: 8 },
      { name: 'gap', title: '间距', type: 'number', defaultValue: 0 },
      { name: 'direction', title: '方向', type: 'select', defaultValue: 'column', options: [
        { label: '垂直', value: 'column' }, { label: '水平', value: 'row' },
      ]},
      { name: 'borderRadius', title: '圆角', type: 'number', defaultValue: 0 },
      { name: 'background', title: '背景色', type: 'color', defaultValue: 'transparent' },
    ],
    defaultProps: { padding: 8, gap: 0, direction: 'column', borderRadius: 0, background: 'transparent' },
    defaultStyle: { minHeight: 40 },
    events: [],
  });
  registry.registerComponent('Box', BoxComponent);

  registry.registerMeta({
    type: 'Card',
    title: '卡片',
    icon: 'CreditCardOutlined',
    group: '容器',
    isContainer: true,
    propsSchema: [
      { name: 'title', title: '标题', type: 'string', defaultValue: '' },
      { name: 'padding', title: '内边距', type: 'number', defaultValue: 16 },
      { name: 'borderRadius', title: '圆角', type: 'number', defaultValue: 8 },
      { name: 'background', title: '背景色', type: 'color', defaultValue: '#ffffff' },
    ],
    defaultProps: { title: '', padding: 16, borderRadius: 8, background: '#ffffff' },
    defaultStyle: {},
    events: [],
  });
  registry.registerComponent('Card', CardComponent);

  registry.registerMeta({
    type: 'Grid',
    title: '栅格',
    icon: 'AppstoreOutlined',
    group: '容器',
    isContainer: true,
    propsSchema: [
      { name: 'columns', title: '列数', type: 'number', defaultValue: 2 },
      { name: 'gap', title: '间距', type: 'number', defaultValue: 12 },
      { name: 'padding', title: '内边距', type: 'number', defaultValue: 0 },
    ],
    defaultProps: { columns: 2, gap: 12, padding: 0 },
    defaultStyle: { minHeight: 40 },
    events: [],
  });
  registry.registerComponent('Grid', GridComponent);

  registry.registerMeta({
    type: 'Tabs',
    title: '标签页',
    icon: 'TabsOutlined',
    group: '容器',
    isContainer: false,
    propsSchema: [
      { name: 'items', title: '标签 (逗号分隔)', type: 'string', defaultValue: 'Tab 1,Tab 2,Tab 3' },
    ],
    defaultProps: { items: 'Tab 1,Tab 2,Tab 3' },
    defaultStyle: {},
    events: [],
  });
  registry.registerComponent('Tabs', TabsComponent);

  // ─── 表单组件 ───

  registry.registerMeta({
    type: 'Input',
    title: '输入框',
    icon: 'FormOutlined',
    group: '表单',
    isContainer: false,
    propsSchema: [
      { name: 'placeholder', title: '占位文本', type: 'string', defaultValue: '请输入' },
      { name: 'size', title: '尺寸', type: 'select', defaultValue: 'middle', options: [
        { label: '小', value: 'small' }, { label: '中', value: 'middle' }, { label: '大', value: 'large' },
      ]},
      { name: 'disabled', title: '禁用', type: 'boolean', defaultValue: false },
    ],
    defaultProps: { placeholder: '请输入', size: 'middle', disabled: false },
    defaultStyle: {},
    events: [{ name: 'onChange', title: '值变化' }],
  });
  registry.registerComponent('Input', InputComponent);

  registry.registerMeta({
    type: 'Select',
    title: '下拉选择',
    icon: 'DownCircleOutlined',
    group: '表单',
    isContainer: false,
    propsSchema: [
      { name: 'placeholder', title: '占位文本', type: 'string', defaultValue: '请选择' },
      { name: 'options', title: '选项 (逗号分隔)', type: 'string', defaultValue: '选项1,选项2,选项3' },
      { name: 'size', title: '尺寸', type: 'select', defaultValue: 'middle', options: [
        { label: '小', value: 'small' }, { label: '中', value: 'middle' }, { label: '大', value: 'large' },
      ]},
      { name: 'disabled', title: '禁用', type: 'boolean', defaultValue: false },
    ],
    defaultProps: { placeholder: '请选择', options: '选项1,选项2,选项3', size: 'middle', disabled: false },
    defaultStyle: {},
    events: [{ name: 'onChange', title: '值变化' }],
  });
  registry.registerComponent('Select', SelectComponent);

  registry.registerMeta({
    type: 'Checkbox',
    title: '复选框',
    icon: 'CheckSquareOutlined',
    group: '表单',
    isContainer: false,
    propsSchema: [
      { name: 'label', title: '标签', type: 'string', defaultValue: '复选框' },
      { name: 'disabled', title: '禁用', type: 'boolean', defaultValue: false },
    ],
    defaultProps: { label: '复选框', disabled: false },
    defaultStyle: {},
    events: [{ name: 'onChange', title: '值变化' }],
  });
  registry.registerComponent('Checkbox', CheckboxComponent);

  registry.registerMeta({
    type: 'Form',
    title: '表单',
    icon: 'FormOutlined',
    group: '表单',
    isContainer: true,
    propsSchema: [
      { name: 'labelAlign', title: '标签对齐', type: 'select', defaultValue: 'top', options: [
        { label: '顶部', value: 'top' }, { label: '左', value: 'left' }, { label: '右', value: 'right' },
      ]},
      { name: 'gap', title: '间距', type: 'number', defaultValue: 12 },
      { name: 'padding', title: '内边距', type: 'number', defaultValue: 16 },
    ],
    defaultProps: { labelAlign: 'top', gap: 12, padding: 16 },
    defaultStyle: { minHeight: 60 },
    events: [],
  });
  registry.registerComponent('Form', FormComponent);

  // ─── 数据展示组件 ───

  registry.registerMeta({
    type: 'Table',
    title: '表格',
    icon: 'TableOutlined',
    group: '数据展示',
    isContainer: false,
    propsSchema: [
      { name: 'columns', title: '列 (逗号分隔)', type: 'string', defaultValue: '名称,值,状态' },
      { name: 'data', title: '数据 (;分行,分列)', type: 'string', defaultValue: '项目1,100,正常;项目2,200,正常' },
      { name: 'size', title: '尺寸', type: 'select', defaultValue: 'small', options: [
        { label: '小', value: 'small' }, { label: '中', value: 'middle' }, { label: '大', value: 'large' },
      ]},
      { name: 'bordered', title: '边框', type: 'boolean', defaultValue: true },
    ],
    defaultProps: { columns: '名称,值,状态', data: '项目1,100,正常;项目2,200,正常', size: 'small', bordered: true },
    defaultStyle: {},
    events: [],
  });
  registry.registerComponent('Table', TableComponent);

  registry.registerMeta({
    type: 'List',
    title: '列表',
    icon: 'UnorderedListOutlined',
    group: '数据展示',
    isContainer: false,
    propsSchema: [
      { name: 'items', title: '项目 (逗号分隔)', type: 'string', defaultValue: '项目 1,项目 2,项目 3' },
      { name: 'ordered', title: '有序列表', type: 'boolean', defaultValue: false },
      { name: 'gap', title: '间距', type: 'number', defaultValue: 4 },
    ],
    defaultProps: { items: '项目 1,项目 2,项目 3', ordered: false, gap: 4 },
    defaultStyle: {},
    events: [],
  });
  registry.registerComponent('List', ListComponent);
}

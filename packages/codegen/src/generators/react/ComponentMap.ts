import type { ComponentMapping } from '../../types';

const ICON_MAP: Record<string, string> = {
  smile: 'SmileOutlined',
  star: 'StarOutlined',
  heart: 'HeartOutlined',
  search: 'SearchOutlined',
  home: 'HomeOutlined',
  setting: 'SettingOutlined',
  user: 'UserOutlined',
  plus: 'PlusOutlined',
  delete: 'DeleteOutlined',
  edit: 'EditOutlined',
  check: 'CheckOutlined',
  close: 'CloseOutlined',
  arrowUp: 'ArrowUpOutlined',
  arrowDown: 'ArrowDownOutlined',
  arrowLeft: 'ArrowLeftOutlined',
  arrowRight: 'ArrowRightOutlined',
  menu: 'MenuOutlined',
  loading: 'LoadingOutlined',
};

export function getIconComponentName(iconKey: string): string {
  return ICON_MAP[iconKey] || 'QuestionCircleOutlined';
}

export const COMPONENT_MAP: Record<string, ComponentMapping> = {
  Text: {
    tagName: 'Typography.Text',
    importSource: 'antd',
    importNames: ['Typography'],
    isContainer: false,
    transformProps: (props) => {
      const { text, ...rest } = props;
      return { children: text, ...rest };
    },
  },

  Button: {
    tagName: 'Button',
    importSource: 'antd',
    importNames: ['Button'],
    isContainer: true,
    transformProps: (props) => {
      const { text, ...rest } = props;
      return { children: text, ...rest };
    },
  },

  Image: {
    tagName: 'Image',
    importSource: 'antd',
    importNames: ['Image'],
    isContainer: false,
    transformProps: (props) => props,
  },

  Icon: {
    tagName: '', // dynamically resolved via getIconComponentName
    importSource: '@ant-design/icons',
    importNames: [], // dynamically resolved
    isContainer: false,
    transformProps: (props) => {
      const { icon, size, color, ...rest } = props;
      const style: Record<string, any> = {};
      if (size) style.fontSize = size;
      if (color) style.color = color;
      return { style, ...rest };
    },
  },

  Link: {
    tagName: 'Typography.Link',
    importSource: 'antd',
    importNames: ['Typography'],
    isContainer: false,
    transformProps: (props) => {
      const { text, ...rest } = props;
      return { children: text, ...rest };
    },
  },

  Box: {
    tagName: 'Flex',
    importSource: 'antd',
    importNames: ['Flex'],
    isContainer: true,
    transformProps: (props) => {
      const { direction, gap, ...rest } = props;
      const result: Record<string, any> = {};
      if (direction === 'column') result.vertical = true;
      if (gap !== undefined) result.gap = gap;
      return { ...result, ...rest };
    },
  },

  Card: {
    tagName: 'Card',
    importSource: 'antd',
    importNames: ['Card'],
    isContainer: true,
    transformProps: (props) => props,
  },

  Grid: {
    tagName: 'Row',
    importSource: 'antd',
    importNames: ['Row', 'Col'],
    isContainer: true,
    transformProps: (props) => {
      const { columns, gap, ...rest } = props;
      const result: Record<string, any> = {};
      if (gap !== undefined) result.gutter = [gap, gap];
      return { ...result, ...rest, _columns: columns };
    },
  },

  Tabs: {
    tagName: 'Tabs',
    importSource: 'antd',
    importNames: ['Tabs'],
    isContainer: true,
    transformProps: (props) => props,
  },

  Input: {
    tagName: 'Input',
    importSource: 'antd',
    importNames: ['Input'],
    isContainer: false,
    transformProps: (props) => props,
  },

  Select: {
    tagName: 'Select',
    importSource: 'antd',
    importNames: ['Select'],
    isContainer: false,
    transformProps: (props) => {
      const { options, ...rest } = props;
      if (typeof options === 'string') {
        return { ...rest, options: parseOptionsString(options) };
      }
      return props;
    },
  },

  Checkbox: {
    tagName: 'Checkbox',
    importSource: 'antd',
    importNames: ['Checkbox'],
    isContainer: false,
    transformProps: (props) => {
      const { label, ...rest } = props;
      return { children: label, ...rest };
    },
  },

  Form: {
    tagName: 'Form',
    importSource: 'antd',
    importNames: ['Form'],
    isContainer: true,
    transformProps: (props) => props,
  },

  Table: {
    tagName: 'Table',
    importSource: 'antd',
    importNames: ['Table'],
    isContainer: false,
    transformProps: (props) => {
      const { columns, data, ...rest } = props;
      return {
        ...rest,
        columns: typeof columns === 'string' ? tryParseJSON(columns) : columns,
        dataSource: typeof data === 'string' ? tryParseJSON(data) : data,
      };
    },
  },

  List: {
    tagName: 'List',
    importSource: 'antd',
    importNames: ['List'],
    isContainer: false,
    transformProps: (props) => {
      const { items, ...rest } = props;
      return {
        ...rest,
        dataSource: typeof items === 'string' ? tryParseJSON(items) : items,
      };
    },
  },
};

function parseOptionsString(str: string): { label: string; value: string }[] {
  try {
    const parsed = JSON.parse(str);
    if (Array.isArray(parsed)) return parsed;
  } catch {
    return str.split(',').map((s) => ({ label: s.trim(), value: s.trim() }));
  }
  return [];
}

function tryParseJSON(str: string): any {
  try {
    return JSON.parse(str);
  } catch {
    return str;
  }
}

export function getMapping(componentType: string): ComponentMapping | undefined {
  return COMPONENT_MAP[componentType];
}

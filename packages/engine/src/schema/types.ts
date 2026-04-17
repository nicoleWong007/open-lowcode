import type { CSSProperties } from 'react';

export type { CSSProperties };

// ─── 属性 Schema ───

export interface PropSchema {
  name: string;
  title: string;
  type: 'string' | 'number' | 'boolean' | 'select' | 'color' | 'json' | 'expression';
  defaultValue?: any;
  required?: boolean;
  setter?: 'Input' | 'TextArea' | 'NumberInput' | 'Switch' | 'Select'
         | 'ColorPicker' | 'JSONEditor' | 'ExpressionEditor' | 'IconPicker' | 'ColumnSetter';
  options?: { label: string; value: any }[];
  condition?: string;
  validator?: (value: any) => boolean | string;
}

// ─── 事件与动作 ───

export interface EventMeta {
  name: string;
  title: string;
  payload?: PropSchema[];
}

export type ActionType = 'setState' | 'callApi' | 'navigate' | 'showMessage' | 'custom';

export interface Action {
  type: ActionType;
  config: Record<string, any>;
}

// ─── 数据绑定 ───

export interface Binding {
  type: 'variable' | 'expression' | 'dataSource';
  value: string;
}

export type VariableType = 'string' | 'number' | 'boolean' | 'object' | 'array';
export type VariableScope = 'document' | 'component';

export interface Variable {
  id: string;
  name: string;
  type: VariableType;
  defaultValue: any;
  scope: VariableScope;
}

export type DataSourceType = 'static' | 'api' | 'websocket';

export interface DataSource {
  id: string;
  name: string;
  type: DataSourceType;
  config: {
    url?: string;
    method?: string;
    headers?: Record<string, string>;
    params?: Record<string, any>;
    refreshInterval?: number;
  };
  transform?: string;
}

export interface DataSourceMeta {
  type: DataSourceType;
  description?: string;
}

export interface EventBusConfig {
  listeners: {
    eventName: string;
    actions: Action[];
  }[];
}

// ─── 组件描述 ───

export interface ComponentMeta {
  type: string;
  title: string;
  icon: string;
  group: string;
  isContainer: boolean;
  allowedChildren?: string[];
  minSize?: { width: number; height: number };
  maxSize?: { width: number; height: number };
  propsSchema: PropSchema[];
  defaultProps: Record<string, any>;
  defaultStyle: CSSProperties;
  events?: EventMeta[];
  dataSource?: DataSourceMeta;
}

// ─── 组件实例 ───

export interface ComponentInstance {
  id: string;
  type: string;
  props: Record<string, any>;
  style: CSSProperties;
  children?: ComponentInstance[];
  bindings?: {
    [propName: string]: Binding;
  };
  eventHandlers?: {
    [eventName: string]: Action[];
  };
}

// ─── 文档模型 ───

export interface DocumentSchema {
  version: string;
  id: string;
  canvas: {
    width: number;
    height?: number;
    backgroundColor?: string;
  };
  root: ComponentInstance;
  variables: Variable[];
  dataSources: DataSource[];
  eventBus: EventBusConfig;
  meta: {
    name: string;
    description?: string;
    createdAt: string;
    updatedAt: string;
  };
}

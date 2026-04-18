import type { CSSProperties } from 'react';
import type { Action } from '@open-lowcode/engine';

export interface AnalyzedSchema {
  meta: {
    componentName: string;
    description?: string;
  };

  components: AnalyzedComponent[];
  variables: AnalyzedVariable[];
  eventHandlers: AnalyzedEventHandler[];
  dataSources: AnalyzedDataSource[];
  styles: AnalyzedStyle[];

  antdImports: Set<string>;
  iconImports: Set<string>;
  runtimeImports: Set<string>;
}

export interface AnalyzedComponent {
  id: string;
  type: string;
  props: Record<string, any>;
  bindings: Record<string, {
    type: 'variable' | 'expression' | 'dataSource';
    value: string;
  }>;
  styleId: string;
  children: string[];
  parent: string | null;
  depth: number;
}

export interface AnalyzedVariable {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  defaultValue: any;
  setterName: string;
}

export interface AnalyzedEventHandler {
  id: string;
  componentId: string;
  eventName: string;
  actions: Action[];
  functionName: string;
}

export interface AnalyzedDataSource {
  id: string;
  name: string;
  type: 'static' | 'api' | 'websocket';
  config: {
    url?: string;
    method?: string;
    headers?: Record<string, string>;
    params?: Record<string, any>;
    refreshInterval?: number;
  };
  transform?: string;
}

export interface AnalyzedStyle {
  id: string;
  className: string;
  cssProperties: Record<string, string | number>;
  componentName: string;
}

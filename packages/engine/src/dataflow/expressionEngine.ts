import type { Action } from '../schema/types';

export interface ExpressionContext {
  variables: Record<string, any>;
  props: Record<string, any>;
  data: Record<string, any>;
  $event?: any;
  utils: {
    formatDate: (date: Date | string, format?: string) => string;
    sum: (arr: number[]) => number;
    filter: <T>(arr: T[], predicate: (item: T) => boolean) => T[];
    map: <T, U>(arr: T[], mapper: (item: T) => U) => U[];
    find: <T>(arr: T[], predicate: (item: T) => boolean) => T | undefined;
    includes: (arr: any[], value: any) => boolean;
  };
}

function makeExprRegex(): RegExp {
  return /\{\{(.+?)\}\}/g;
}

export function evaluateExpression(
  expression: string,
  context: ExpressionContext,
): any {
  const fullMatch = expression.trim();

  if (fullMatch.startsWith('{{') && fullMatch.endsWith('}}')) {
    const inner = fullMatch.slice(2, -2);
    if (!inner.includes('{{') && !inner.includes('}}')) {
      return executeExpression(inner.trim(), context);
    }
  }

  let hasExpressions = false;
  const result = expression.replace(makeExprRegex(), (_match, expr: string) => {
    hasExpressions = true;
    const value = executeExpression(expr.trim(), context);
    return value == null ? '' : String(value);
  });

  return hasExpressions ? result : expression;
}

function executeExpression(expr: string, context: ExpressionContext): any {
  try {
    const flatContext: Record<string, any> = {
      ...context.variables,
      ...context.props,
      ...context.data,
      $event: context.$event,
      utils: context.utils,
    };
    const keys = Object.keys(flatContext);
    const values = Object.values(flatContext);
    const fn = new Function(...keys, `"use strict"; return (${expr});`);
    return fn(...values);
  } catch {
    return undefined;
  }
}

export function hasExpression(value: unknown): boolean {
  if (typeof value !== 'string') return false;
  return /\{\{.+?\}\}/.test(value);
}

export function resolveBindingValue(
  value: any,
  context: ExpressionContext,
): any {
  if (typeof value === 'string' && hasExpression(value)) {
    return evaluateExpression(value, context);
  }
  return value;
}

export function executeActionChain(
  actions: Action[],
  context: ExpressionContext,
  callbacks?: ActionCallbacks,
): void {
  for (const action of actions) {
    executeAction(action, context, callbacks);
  }
}

export interface ActionCallbacks {
  onSetState?: (variable: string, value: any) => void;
  onCallApi?: (dataSourceName: string, params: Record<string, any>) => Promise<any>;
  onNavigate?: (url: string, params?: Record<string, any>) => void;
  onShowMessage?: (type: string, content: string) => void;
  onCustom?: (handler: string, config: Record<string, any>) => void;
}

function executeAction(
  action: Action,
  context: ExpressionContext,
  callbacks?: ActionCallbacks,
): void {
  const { config } = action;

  switch (action.type) {
    case 'setState': {
      const variableName = config.variable as string;
      const rawValue = config.value;
      const resolvedValue = typeof rawValue === 'string' && hasExpression(rawValue)
        ? evaluateExpression(rawValue, context)
        : rawValue;
      callbacks?.onSetState?.(variableName, resolvedValue);
      break;
    }
    case 'callApi': {
      const dsName = config.dataSource as string;
      const rawParams = (config.params as Record<string, any>) ?? {};
      const resolvedParams: Record<string, any> = {};
      for (const [key, val] of Object.entries(rawParams)) {
        resolvedParams[key] = typeof val === 'string' && hasExpression(val)
          ? evaluateExpression(val, context)
          : val;
      }
      callbacks?.onCallApi?.(dsName, resolvedParams);
      break;
    }
    case 'navigate': {
      const url = config.url as string;
      const params = config.params as Record<string, any> | undefined;
      callbacks?.onNavigate?.(url, params);
      break;
    }
    case 'showMessage': {
      const type = (config.type as string) ?? 'info';
      const content = typeof config.content === 'string' && hasExpression(config.content)
        ? evaluateExpression(config.content, context)
        : (config.content as string);
      callbacks?.onShowMessage?.(type, content);
      break;
    }
    case 'custom': {
      const handler = config.handler as string;
      callbacks?.onCustom?.(handler, config);
      break;
    }
  }
}

const DEFAULT_UTILS: ExpressionContext['utils'] = {
  formatDate: (date, format = 'YYYY-MM-DD') => {
    const d = date instanceof Date ? date : new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const seconds = String(d.getSeconds()).padStart(2, '0');
    return format
      .replace('YYYY', String(year))
      .replace('MM', month)
      .replace('DD', day)
      .replace('HH', hours)
      .replace('mm', minutes)
      .replace('ss', seconds);
  },
  sum: (arr) => arr.reduce((a, b) => a + b, 0),
  filter: (arr, predicate) => arr.filter(predicate),
  map: (arr, mapper) => arr.map(mapper),
  find: (arr, predicate) => arr.find(predicate),
  includes: (arr, value) => arr.includes(value),
};

export function createExpressionContext(
  overrides: Partial<ExpressionContext> = {},
): ExpressionContext {
  return {
    variables: {},
    props: {},
    data: {},
    utils: DEFAULT_UTILS,
    ...overrides,
  };
}

export { DEFAULT_UTILS };

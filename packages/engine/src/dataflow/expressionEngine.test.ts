import { describe, it, expect } from 'vitest';
import {
  evaluateExpression,
  hasExpression,
  resolveBindingValue,
  createExpressionContext,
  executeActionChain,
  type ActionCallbacks,
} from './expressionEngine';
import type { Action } from '../schema/types';

describe('hasExpression', () => {
  it('should detect expression syntax', () => {
    expect(hasExpression('{{count}}')).toBe(true);
    expect(hasExpression('Hello {{name}}')).toBe(true);
    expect(hasExpression('{{a + b}}')).toBe(true);
  });

  it('should return false for plain strings', () => {
    expect(hasExpression('hello world')).toBe(false);
    expect(hasExpression('123')).toBe(false);
    expect(hasExpression('')).toBe(false);
  });

  it('should return false for non-strings', () => {
    expect(hasExpression(42)).toBe(false);
    expect(hasExpression(null)).toBe(false);
    expect(hasExpression(undefined)).toBe(false);
  });
});

describe('evaluateExpression', () => {
  const ctx = createExpressionContext({
    variables: { count: 5, name: 'World' },
  });

  it('should evaluate a full expression {{expr}}', () => {
    expect(evaluateExpression('{{count + 1}}', ctx)).toBe(6);
  });

  it('should evaluate string interpolation', () => {
    expect(evaluateExpression('Hello {{name}}!', ctx)).toBe('Hello World!');
  });

  it('should return plain string unchanged', () => {
    expect(evaluateExpression('plain text', ctx)).toBe('plain text');
  });

  it('should handle boolean expressions', () => {
    expect(evaluateExpression('{{count > 0}}', ctx)).toBe(true);
    expect(evaluateExpression('{{count > 10}}', ctx)).toBe(false);
  });

  it('should handle ternary expressions', () => {
    expect(evaluateExpression('{{count > 0 ? "yes" : "no"}}', ctx)).toBe('yes');
  });

  it('should handle nested property access', () => {
    const ctx2 = createExpressionContext({
      variables: { user: { name: 'Alice', age: 30 } },
    });
    expect(evaluateExpression('{{user.name}}', ctx2)).toBe('Alice');
  });

  it('should return undefined for failed expressions', () => {
    expect(evaluateExpression('{{nonExistent.method()}}', ctx)).toBeUndefined();
  });

  it('should use utils functions', () => {
    const ctx2 = createExpressionContext({
      variables: { items: [1, 2, 3, 4, 5] },
    });
    expect(evaluateExpression('{{utils.sum(items)}}', ctx2)).toBe(15);
    expect(evaluateExpression('{{utils.filter(items, x => x > 2)}}', ctx2)).toEqual([3, 4, 5]);
  });

  it('should handle multiple expressions in one string', () => {
    expect(evaluateExpression('{{count}} + {{count}} = {{count * 2}}', ctx)).toBe('5 + 5 = 10');
  });
});

describe('resolveBindingValue', () => {
  const ctx = createExpressionContext({
    variables: { greeting: 'Hello' },
  });

  it('should resolve expression strings', () => {
    expect(resolveBindingValue('{{greeting}}', ctx)).toBe('Hello');
  });

  it('should pass through non-expression values', () => {
    expect(resolveBindingValue('plain', ctx)).toBe('plain');
    expect(resolveBindingValue(42, ctx)).toBe(42);
    expect(resolveBindingValue(true, ctx)).toBe(true);
    expect(resolveBindingValue(null, ctx)).toBeNull();
  });
});

describe('executeActionChain', () => {
  it('should execute setState action', () => {
    const setStates: Array<{ variable: string; value: any }> = [];
    const actions: Action[] = [
      { type: 'setState', config: { variable: 'count', value: 42 } },
      { type: 'setState', config: { variable: 'name', value: 'Test' } },
    ];
    const ctx = createExpressionContext();
    executeActionChain(actions, ctx, {
      onSetState: (variable, value) => setStates.push({ variable, value }),
    });
    expect(setStates).toEqual([
      { variable: 'count', value: 42 },
      { variable: 'name', value: 'Test' },
    ]);
  });

  it('should execute setState with expression value', () => {
    const setStates: Array<{ variable: string; value: any }> = [];
    const actions: Action[] = [
      { type: 'setState', config: { variable: 'result', value: '{{2 + 3}}' } },
    ];
    const ctx = createExpressionContext();
    executeActionChain(actions, ctx, {
      onSetState: (variable, value) => setStates.push({ variable, value }),
    });
    expect(setStates).toEqual([{ variable: 'result', value: 5 }]);
  });

  it('should execute showMessage action', () => {
    const messages: Array<{ type: string; content: string }> = [];
    const actions: Action[] = [
      { type: 'showMessage', config: { type: 'success', content: 'Done!' } },
    ];
    const ctx = createExpressionContext();
    executeActionChain(actions, ctx, {
      onShowMessage: (type, content) => messages.push({ type, content }),
    });
    expect(messages).toEqual([{ type: 'success', content: 'Done!' }]);
  });

  it('should execute callApi action with resolved params', () => {
    const apiCalls: Array<{ dataSource: string; params: Record<string, any> }> = [];
    const actions: Action[] = [
      {
        type: 'callApi',
        config: {
          dataSource: 'users',
          params: { page: '{{currentPage}}' },
        },
      },
    ];
    const ctx = createExpressionContext({ variables: { currentPage: 2 } });
    executeActionChain(actions, ctx, {
      onCallApi: (dataSource, params) => {
        apiCalls.push({ dataSource, params });
        return Promise.resolve();
      },
    });
    expect(apiCalls).toEqual([{ dataSource: 'users', params: { page: 2 } }]);
  });

  it('should execute navigate action', () => {
    const navigations: Array<{ url: string; params: any }> = [];
    const actions: Action[] = [
      { type: 'navigate', config: { url: '/dashboard', params: { id: 1 } } },
    ];
    const ctx = createExpressionContext();
    executeActionChain(actions, ctx, {
      onNavigate: (url, params) => navigations.push({ url, params }),
    });
    expect(navigations).toEqual([{ url: '/dashboard', params: { id: 1 } }]);
  });

  it('should execute custom action', () => {
    const customs: string[] = [];
    const actions: Action[] = [
      { type: 'custom', config: { handler: 'myHandler', data: 'test' } },
    ];
    const ctx = createExpressionContext();
    executeActionChain(actions, ctx, {
      onCustom: (handler) => customs.push(handler),
    });
    expect(customs).toEqual(['myHandler']);
  });
});

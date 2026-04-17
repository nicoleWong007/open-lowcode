import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ComponentInstance, ComponentRegistry, EditorStoreHook, Action } from '@open-lowcode/engine';
import { EventBus } from '@open-lowcode/engine';
import {
  createExpressionContext,
  evaluateExpression,
  hasExpression,
  resolveBindingValue,
  type ActionCallbacks,
} from '@open-lowcode/engine';
import { message } from 'antd';

interface RuntimeRendererProps {
  instance: ComponentInstance;
  registry: ComponentRegistry;
  store: EditorStoreHook;
}

export const RuntimeRenderer: React.FC<RuntimeRendererProps> = ({ instance, registry, store }) => {
  const variables = store((s) => s.runtimeVariables);
  const setRuntimeVariable = store((s) => s.setRuntimeVariable);
  const dataSourceCache = store((s) => s.dataSourceCache);
  const dataSources = store((s) => s.document.dataSources);
  const eventBusRef = useRef<EventBus | null>(null);

  if (!eventBusRef.current) {
    eventBusRef.current = new EventBus();
  }

  const actionCallbacks: ActionCallbacks = useMemo(
    () => ({
      onSetState: (variable: string, value: any) => {
        setRuntimeVariable(variable, value);
      },
      onCallApi: async (dataSourceName: string, params: Record<string, any>) => {
        const ds = dataSources.find((d) => d.name === dataSourceName);
        if (ds) {
          store.getState().setDataSourceCache(ds.name, params);
        }
      },
      onNavigate: (url: string, params?: Record<string, any>) => {
        if (params) {
          const qs = new URLSearchParams(params).toString();
          window.open(`${url}?${qs}`, '_blank');
        } else {
          window.open(url, '_blank');
        }
      },
      onShowMessage: (type: string, content: string) => {
        switch (type) {
          case 'success':
            message.success(content);
            break;
          case 'error':
            message.error(content);
            break;
          case 'warning':
            message.warning(content);
            break;
          default:
            message.info(content);
        }
      },
      onCustom: (_handler: string, _config: Record<string, any>) => {
        // no-op in default runtime
      },
    }),
    [setRuntimeVariable, dataSources, store],
  );

  useEffect(() => {
    return () => {
      eventBusRef.current?.destroy();
    };
  }, []);

  const expressionContext = useMemo(
    () =>
      createExpressionContext({
        variables,
        data: dataSourceCache,
      }),
    [variables, dataSourceCache],
  );

  return (
    <RuntimeNode
      instance={instance}
      registry={registry}
      expressionContext={expressionContext}
      eventBus={eventBusRef.current}
      actionCallbacks={actionCallbacks}
    />
  );
};

interface RuntimeNodeProps {
  instance: ComponentInstance;
  registry: ComponentRegistry;
  expressionContext: ReturnType<typeof createExpressionContext>;
  eventBus: EventBus;
  actionCallbacks: ActionCallbacks;
}

const RuntimeNode: React.FC<RuntimeNodeProps> = ({
  instance,
  registry,
  expressionContext,
  eventBus,
  actionCallbacks,
}) => {
  const Component = registry.getComponent(instance.type);

  const resolvedProps = useMemo(() => {
    const merged: Record<string, any> = {};
    for (const [key, value] of Object.entries(instance.props)) {
      const binding = instance.bindings?.[key];
      if (binding) {
        if (binding.type === 'variable') {
          merged[key] = expressionContext.variables[binding.value] ?? value;
        } else if (binding.type === 'expression') {
          merged[key] = evaluateExpression(`{{${binding.value}}}`, expressionContext);
        } else if (binding.type === 'dataSource') {
          merged[key] = expressionContext.data[binding.value] ?? value;
        } else {
          merged[key] = resolveBindingValue(value, expressionContext);
        }
      } else {
        merged[key] = resolveBindingValue(value, expressionContext);
      }
    }
    merged.style = instance.style;
    return merged;
  }, [instance, expressionContext]);

  const eventHandlers = useMemo(() => {
    const handlers: Record<string, (...args: any[]) => void> = {};
    if (instance.eventHandlers) {
      for (const [eventName, actions] of Object.entries(instance.eventHandlers)) {
        handlers[eventName] = (...args: any[]) => {
          const payload = args[0];
          eventBus.executeComponentEvent(actions, payload, undefined, actionCallbacks);
        };
      }
    }
    return handlers;
  }, [instance.eventHandlers, eventBus, actionCallbacks]);

  if (!Component) {
    return (
      <div style={{ padding: 8, border: '1px dashed #ff4d4f', color: '#ff4d4f', fontSize: 12, borderRadius: 4 }}>
        未注册组件: {instance.type}
      </div>
    );
  }

  return (
    <Component {...resolvedProps} {...eventHandlers}>
      {instance.children?.map((child) => (
        <RuntimeNode
          key={child.id}
          instance={child}
          registry={registry}
          expressionContext={expressionContext}
          eventBus={eventBus}
          actionCallbacks={actionCallbacks}
        />
      ))}
    </Component>
  );
};

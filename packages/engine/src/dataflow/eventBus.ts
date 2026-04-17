import type { Action, EventBusConfig } from '../schema/types';
import {
  executeActionChain,
  createExpressionContext,
  type ExpressionContext,
  type ActionCallbacks,
} from './expressionEngine';

type EventCallback = (eventName: string, payload?: any) => void;

export class EventBus {
  private listeners = new Map<string, Set<EventCallback>>();
  private globalActions: EventBusConfig['listeners'] = [];

  setGlobalActions(listeners: EventBusConfig['listeners']): void {
    this.globalActions = listeners;
  }

  on(eventName: string, callback: EventCallback): () => void {
    if (!this.listeners.has(eventName)) {
      this.listeners.set(eventName, new Set());
    }
    this.listeners.get(eventName)!.add(callback);
    return () => this.listeners.get(eventName)?.delete(callback);
  }

  emit(eventName: string, payload?: any, actionCallbacks?: ActionCallbacks): void {
    const userListeners = this.listeners.get(eventName);
    if (userListeners) {
      for (const cb of userListeners) {
        cb(eventName, payload);
      }
    }

    const globalEntry = this.globalActions.find((l) => l.eventName === eventName);
    if (globalEntry?.actions.length) {
      const context = createExpressionContext({ $event: payload });
      executeActionChain(globalEntry.actions, context, actionCallbacks);
    }
  }

  executeComponentEvent(
    actions: Action[],
    payload?: any,
    contextOverrides?: Partial<ExpressionContext>,
    actionCallbacks?: ActionCallbacks,
  ): void {
    const context = createExpressionContext({
      $event: payload,
      ...contextOverrides,
    });
    executeActionChain(actions, context, actionCallbacks);
  }

  destroy(): void {
    this.listeners.clear();
    this.globalActions = [];
  }
}

export type { ActionCallbacks };

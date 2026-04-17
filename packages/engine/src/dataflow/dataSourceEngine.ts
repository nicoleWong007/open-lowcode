import type { DataSource } from '../schema/types';
import { evaluateExpression, hasExpression, createExpressionContext } from './expressionEngine';

interface DataSourceEngineOptions {
  onFetch?: (dataSource: DataSource, params: Record<string, any>) => Promise<any>;
}

interface CachedEntry {
  data: any;
  timestamp: number;
  ttl: number;
}

export class DataSourceEngine {
  private cache = new Map<string, CachedEntry>();
  private intervals = new Map<string, ReturnType<typeof setInterval>>();
  private onFetch: DataSourceEngineOptions['onFetch'];
  private subscribers = new Set<(name: string, data: any) => void>();

  constructor(options?: DataSourceEngineOptions) {
    this.onFetch = options?.onFetch;
  }

  subscribe(callback: (name: string, data: any) => void): () => void {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  private notify(name: string, data: any): void {
    this.subscribers.forEach((cb) => cb(name, data));
  }

  async fetchData(
    dataSource: DataSource,
    params?: Record<string, any>,
    expressionContext?: ReturnType<typeof createExpressionContext>,
  ): Promise<any> {
    const { config } = dataSource;

    if (dataSource.type === 'static') {
      return config.params?.data ?? null;
    }

    if (dataSource.type === 'api') {
      let url = config.url ?? '';
      if (expressionContext && hasExpression(url)) {
        url = evaluateExpression(url, expressionContext);
      }

      let resolvedParams = params ?? config.params ?? {};
      if (expressionContext) {
        const resolved: Record<string, any> = {};
        for (const [key, val] of Object.entries(resolvedParams)) {
          resolved[key] = typeof val === 'string' && hasExpression(val)
            ? evaluateExpression(val, expressionContext)
            : val;
        }
        resolvedParams = resolved;
      }

      if (this.onFetch) {
        const data = await this.onFetch(dataSource, resolvedParams);
        const transformed = dataSource.transform && expressionContext
          ? evaluateExpression(dataSource.transform, {
              ...expressionContext,
              data: { response: data },
            })
          : data;

        this.cache.set(dataSource.id, {
          data: transformed,
          timestamp: Date.now(),
          ttl: 60000,
        });
        this.notify(dataSource.name, transformed);
        return transformed;
      }

      try {
        const response = await fetch(url, {
          method: config.method ?? 'GET',
          headers: config.headers,
          body: config.method !== 'GET' ? JSON.stringify(resolvedParams) : undefined,
        });
        const data = await response.json();
        const transformed = dataSource.transform && expressionContext
          ? evaluateExpression(dataSource.transform, {
              ...expressionContext,
              data: { response: data },
            })
          : data;

        this.cache.set(dataSource.id, {
          data: transformed,
          timestamp: Date.now(),
          ttl: 60000,
        });
        this.notify(dataSource.name, transformed);
        return transformed;
      } catch {
        return this.getCached(dataSource.id) ?? null;
      }
    }

    return null;
  }

  getCached(dataSourceId: string): any {
    const entry = this.cache.get(dataSourceId);
    if (!entry) return null;
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(dataSourceId);
      return null;
    }
    return entry.data;
  }

  setCached(dataSourceId: string, data: any, ttl = 60000): void {
    this.cache.set(dataSourceId, { data, timestamp: Date.now(), ttl });
  }

  startAutoRefresh(dataSources: DataSource[], fetchFn: (ds: DataSource) => Promise<void>): void {
    this.stopAllAutoRefresh();
    for (const ds of dataSources) {
      const interval = ds.config.refreshInterval;
      if (interval && interval > 0) {
        const id = setInterval(() => fetchFn(ds), interval);
        this.intervals.set(ds.id, id);
      }
    }
  }

  stopAllAutoRefresh(): void {
    for (const [, id] of this.intervals) {
      clearInterval(id);
    }
    this.intervals.clear();
  }

  destroy(): void {
    this.stopAllAutoRefresh();
    this.cache.clear();
    this.subscribers.clear();
  }
}

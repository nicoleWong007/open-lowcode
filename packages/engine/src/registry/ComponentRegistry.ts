import type { ComponentMeta } from '../schema/types';

type ReactComponent = React.ComponentType<any>;

export class ComponentRegistry {
  private metas = new Map<string, ComponentMeta>();
  private components = new Map<string, ReactComponent>();

  registerMeta(meta: ComponentMeta): void {
    if (this.metas.has(meta.type)) {
      throw new Error(`Component "${meta.type}" is already registered`);
    }
    this.metas.set(meta.type, meta);
  }

  registerComponent(type: string, component: ReactComponent): void {
    this.components.set(type, component);
  }

  getMeta(type: string): ComponentMeta | undefined {
    return this.metas.get(type);
  }

  getComponent(type: string): ReactComponent | undefined {
    return this.components.get(type);
  }

  getAllMetas(): ComponentMeta[] {
    return Array.from(this.metas.values());
  }

  getGroupedMetas(): Record<string, ComponentMeta[]> {
    const groups: Record<string, ComponentMeta[]> = {};
    for (const meta of this.metas.values()) {
      if (!groups[meta.group]) {
        groups[meta.group] = [];
      }
      groups[meta.group].push(meta);
    }
    return groups;
  }
}

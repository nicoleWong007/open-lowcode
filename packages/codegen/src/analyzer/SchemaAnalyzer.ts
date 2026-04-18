import type { DocumentSchema, ComponentInstance, Action } from '@open-lowcode/engine';
import type {
  AnalyzedSchema,
  AnalyzedComponent,
  AnalyzedVariable,
  AnalyzedEventHandler,
  AnalyzedDataSource,
  AnalyzedStyle,
} from './types';
import { toComponentName, toSetterName, toClassName, toHandlerName, shortId } from '../utils/naming';

export class SchemaAnalyzer {
  analyze(schema: DocumentSchema): AnalyzedSchema {
    const componentName = toComponentName(schema.meta.name);

    const ctx: AnalyzeContext = {
      components: [],
      variables: [],
      eventHandlers: [],
      dataSources: [],
      styles: [],
      antdImports: new Set<string>(),
      iconImports: new Set<string>(),
      runtimeImports: new Set<string>(),
    };

    this.traverse(schema.root, null, 0, ctx);

    for (const v of schema.variables) {
      ctx.variables.push({
        name: v.name,
        type: v.type,
        defaultValue: v.defaultValue,
        setterName: toSetterName(v.name),
      });
    }

    for (const ds of schema.dataSources) {
      ctx.dataSources.push({
        id: ds.id,
        name: ds.name,
        type: ds.type,
        config: { ...ds.config },
        transform: ds.transform,
      });
    }

    ctx.runtimeImports.add('React');
    if (ctx.variables.length > 0) {
      ctx.runtimeImports.add('useState');
    }
    if (ctx.eventHandlers.length > 0) {
      ctx.runtimeImports.add('useCallback');
    }

    return {
      meta: {
        componentName,
        description: schema.meta.description,
      },
      components: ctx.components,
      variables: ctx.variables,
      eventHandlers: ctx.eventHandlers,
      dataSources: ctx.dataSources,
      styles: ctx.styles,
      antdImports: ctx.antdImports,
      iconImports: ctx.iconImports,
      runtimeImports: ctx.runtimeImports,
    };
  }

  private traverse(
    node: ComponentInstance,
    parentId: string | null,
    depth: number,
    ctx: AnalyzeContext,
  ): void {
    const styleId = `style-${node.type}-${shortId(node.id)}`;
    const className = toClassName(node.type, node.id);

    const analyzed: AnalyzedComponent = {
      id: node.id,
      type: node.type,
      props: { ...node.props },
      bindings: node.bindings ? { ...node.bindings } : {},
      styleId,
      children: [],
      parent: parentId,
      depth,
    };

    if (node.style && Object.keys(node.style).length > 0) {
      ctx.styles.push({
        id: styleId,
        className,
        cssProperties: { ...node.style },
        componentName: node.type,
      });
    }

    this.collectAntdImports(node.type, node.props, ctx);

    if (node.eventHandlers) {
      for (const [eventName, rawActions] of Object.entries(node.eventHandlers)) {
        const actions = rawActions as Action[];
        if (actions.length === 0) continue;
        const functionName = toHandlerName(node.type, eventName, node.id);
        ctx.eventHandlers.push({
          id: `handler-${shortId(node.id)}-${eventName}`,
          componentId: node.id,
          eventName,
          actions,
          functionName,
        });
      }
    }

    if (node.children) {
      for (const child of node.children) {
        analyzed.children.push(child.id);
        this.traverse(child, node.id, depth + 1, ctx);
      }
    }

    ctx.components.push(analyzed);
  }

  private collectAntdImports(type: string, props: Record<string, any>, ctx: AnalyzeContext): void {
    const antdMap: Record<string, string[]> = {
      Text: ['Typography'],
      Button: ['Button'],
      Image: ['Image'],
      Link: ['Typography'],
      Box: ['Flex'],
      Card: ['Card'],
      Grid: ['Row', 'Col'],
      Tabs: ['Tabs'],
      Input: ['Input'],
      Select: ['Select'],
      Checkbox: ['Checkbox'],
      Form: ['Form'],
      Table: ['Table'],
      List: ['List'],
    };

    if (type === 'Icon' && props?.icon) {
      ctx.iconImports.add(props.icon);
      return;
    }

    const imports = antdMap[type];
    if (imports) {
      for (const name of imports) {
        ctx.antdImports.add(name);
      }
    }
  }
}

interface AnalyzeContext {
  components: AnalyzedComponent[];
  variables: AnalyzedVariable[];
  eventHandlers: AnalyzedEventHandler[];
  dataSources: AnalyzedDataSource[];
  styles: AnalyzedStyle[];
  antdImports: Set<string>;
  iconImports: Set<string>;
  runtimeImports: Set<string>;
}

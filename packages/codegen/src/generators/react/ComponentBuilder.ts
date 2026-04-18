import * as t from '@babel/types';
import type { AnalyzedSchema, AnalyzedComponent } from '../../analyzer/types';
import { getMapping, getIconComponentName } from './ComponentMap';
import { ImportCollector } from './ImportCollector';

export class ComponentBuilder {
  private collector: ImportCollector;
  private componentMap: Map<string, AnalyzedComponent>;
  private styleMap: Map<string, string>;

  constructor(
    private schema: AnalyzedSchema,
    collector: ImportCollector,
  ) {
    this.collector = collector;
    this.componentMap = new Map(schema.components.map((c) => [c.id, c]));
    this.styleMap = new Map(schema.styles.map((s) => [s.id, s.className]));
  }

  buildRootJSX(): t.JSXElement {
    const root = this.schema.components[this.schema.components.length - 1];
    if (!root) {
      return t.jsxElement(
        t.jsxOpeningElement(t.jsxIdentifier('Flex'), []),
        t.jsxClosingElement(t.jsxIdentifier('Flex')),
        [],
      );
    }
    return this.buildJSXElement(root);
  }

  private buildJSXElement(comp: AnalyzedComponent): t.JSXElement {
    const mapping = getMapping(comp.type);

    if (comp.type === 'Icon') {
      return this.buildIconElement(comp);
    }

    if (comp.type === 'Grid') {
      return this.buildGridElement(comp);
    }

    if (!mapping) {
      return this.buildFallbackElement(comp);
    }

    const tagName = mapping.tagName;
    const attributes = this.buildAttributes(comp, mapping);
    const children = this.buildChildren(comp);

    const [objectName, propertyName] = tagName.split('.');
    let nameExpr: t.JSXMemberExpression | t.JSXIdentifier;
    if (propertyName) {
      nameExpr = t.jsxMemberExpression(
        t.jsxIdentifier(objectName),
        t.jsxIdentifier(propertyName),
      );
    } else {
      nameExpr = t.jsxIdentifier(tagName);
    }

    const selfClosing = children.length === 0;

    return t.jsxElement(
      t.jsxOpeningElement(nameExpr, attributes, selfClosing),
      selfClosing ? null : t.jsxClosingElement(nameExpr as t.JSXIdentifier),
      children,
    );
  }

  private buildAttributes(
    comp: AnalyzedComponent,
    mapping: { transformProps: (props: Record<string, any>) => Record<string, any> },
  ): t.JSXAttribute[] {
    const attrs: t.JSXAttribute[] = [];
    const transformed = mapping.transformProps(comp.props);

    const childrenKey = 'children';
    const { [childrenKey]: childrenValue, _columns, ...restProps } = transformed;

    for (const [key, value] of Object.entries(restProps)) {
      if (value === undefined || value === null) continue;

      if (key === 'style') {
        attrs.push(t.jsxAttribute(
          t.jsxIdentifier('style'),
          t.jsxExpressionContainer(this.valueToExpression(value)),
        ));
        continue;
      }

      if (typeof value === 'boolean') {
        if (value) {
          attrs.push(t.jsxAttribute(t.jsxIdentifier(key), null));
        }
        continue;
      }

      if (typeof value === 'number') {
        attrs.push(t.jsxAttribute(
          t.jsxIdentifier(key),
          t.jsxExpressionContainer(t.numericLiteral(value)),
        ));
        continue;
      }

      attrs.push(t.jsxAttribute(
        t.jsxIdentifier(key),
        t.stringLiteral(String(value)),
      ));
    }

    const className = this.styleMap.get(comp.styleId);
    if (className) {
      attrs.push(t.jsxAttribute(
        t.jsxIdentifier('className'),
        t.jsxExpressionContainer(
          t.memberExpression(t.identifier('styles'), t.identifier(className)),
        ),
      ));
    }

    for (const [propName, binding] of Object.entries(comp.bindings)) {
      const exprStr = this.resolveBindingExpression(binding.type, binding.value);
      if (propName === 'visible') {
        continue;
      }
      if (propName === 'children' || propName === 'text') {
        continue;
      }
      attrs.push(t.jsxAttribute(
        t.jsxIdentifier(propName),
        t.jsxExpressionContainer(t.identifier(exprStr)),
      ));
    }

    for (const handler of this.schema.eventHandlers) {
      if (handler.componentId === comp.id) {
        const eventProp = `on${handler.eventName.charAt(0).toUpperCase()}${handler.eventName.slice(1)}`;
        attrs.push(t.jsxAttribute(
          t.jsxIdentifier(eventProp),
          t.jsxExpressionContainer(
            t.memberExpression(t.identifier('handlers'), t.identifier(handler.functionName)),
          ),
        ));
      }
    }

    return attrs;
  }

  private buildChildren(comp: AnalyzedComponent): (t.JSXElement | t.JSXExpressionContainer | t.JSXText)[] {
    const children: (t.JSXElement | t.JSXExpressionContainer | t.JSXText)[] = [];

    const childrenBinding = comp.bindings?.children || comp.bindings?.text;
    if (childrenBinding) {
      const exprStr = this.resolveBindingExpression(childrenBinding.type, childrenBinding.value);
      children.push(t.jsxExpressionContainer(t.identifier(exprStr)));
    }

    const textProp = comp.props?.text || comp.props?.children;
    if (textProp && !childrenBinding && typeof textProp === 'string') {
      children.push(t.jsxText(textProp));
    }

    for (const childId of comp.children) {
      const childComp = this.componentMap.get(childId);
      if (childComp) {
        children.push(t.jsxText('\n'));
        children.push(this.buildJSXElement(childComp));
      }
    }

    if (children.length > 0 && children[children.length - 1]?.type === 'JSXText') {
      children.push(t.jsxText('\n'));
    }

    return children;
  }

  private buildIconElement(comp: AnalyzedComponent): t.JSXElement {
    const iconName = comp.props?.icon ? getIconComponentName(comp.props.icon) : 'QuestionCircleOutlined';
    this.collector.addNamed('@ant-design/icons', iconName);

    const attrs: t.JSXAttribute[] = [];
    if (comp.props?.size || comp.props?.color) {
      const styleObj: Record<string, any> = {};
      if (comp.props.size) styleObj.fontSize = comp.props.size;
      if (comp.props.color) styleObj.color = comp.props.color;
      attrs.push(t.jsxAttribute(
        t.jsxIdentifier('style'),
        t.jsxExpressionContainer(this.valueToExpression(styleObj)),
      ));
    }

    const className = this.styleMap.get(comp.styleId);
    if (className) {
      attrs.push(t.jsxAttribute(
        t.jsxIdentifier('className'),
        t.jsxExpressionContainer(
          t.memberExpression(t.identifier('styles'), t.identifier(className)),
        ),
      ));
    }

    return t.jsxElement(
      t.jsxOpeningElement(t.jsxIdentifier(iconName), attrs, true),
      null,
      [],
      true,
    );
  }

  private buildGridElement(comp: AnalyzedComponent): t.JSXElement {
    const rowAttrs: t.JSXAttribute[] = [];
    const gutter = comp.props?.gap;
    if (gutter !== undefined) {
      rowAttrs.push(t.jsxAttribute(
        t.jsxIdentifier('gutter'),
        t.jsxExpressionContainer(t.arrayExpression([t.numericLiteral(gutter), t.numericLiteral(gutter)])),
      ));
    }

    const className = this.styleMap.get(comp.styleId);
    if (className) {
      rowAttrs.push(t.jsxAttribute(
        t.jsxIdentifier('className'),
        t.jsxExpressionContainer(
          t.memberExpression(t.identifier('styles'), t.identifier(className)),
        ),
      ));
    }

    const columns = comp.props?.columns || 2;
    const span = Math.floor(24 / columns);

    const colChildren: t.JSXElement[] = [];
    for (const childId of comp.children) {
      const childComp = this.componentMap.get(childId);
      if (childComp) {
        const innerElement = this.buildJSXElement(childComp);
        const colElement = t.jsxElement(
          t.jsxOpeningElement(
            t.jsxIdentifier('Col'),
            [t.jsxAttribute(t.jsxIdentifier('span'), t.jsxExpressionContainer(t.numericLiteral(span)))],
            false,
          ),
          t.jsxClosingElement(t.jsxIdentifier('Col')),
          [t.jsxText('\n'), innerElement, t.jsxText('\n')],
        );
        colChildren.push(colElement);
      }
    }

    return t.jsxElement(
      t.jsxOpeningElement(t.jsxIdentifier('Row'), rowAttrs, false),
      t.jsxClosingElement(t.jsxIdentifier('Row')),
      [t.jsxText('\n'), ...colChildren, t.jsxText('\n')],
    );
  }

  private buildFallbackElement(comp: AnalyzedComponent): t.JSXElement {
    const className = this.styleMap.get(comp.styleId);
    const attrs: t.JSXAttribute[] = [];
    if (className) {
      attrs.push(t.jsxAttribute(
        t.jsxIdentifier('className'),
        t.jsxExpressionContainer(
          t.memberExpression(t.identifier('styles'), t.identifier(className)),
        ),
      ));
    }
    const children = this.buildChildren(comp);
    return t.jsxElement(
      t.jsxOpeningElement(t.jsxIdentifier('Flex'), attrs, children.length === 0),
      children.length === 0 ? null : t.jsxClosingElement(t.jsxIdentifier('Flex')),
      children,
    );
  }

  private resolveBindingExpression(type: string, value: string): string {
    if (type === 'variable') {
      return `vars.${value}`;
    }
    if (type === 'expression') {
      return value.replace(/\{\{(.+?)\}\}/g, (_, expr) => `vars.${expr.trim()}`);
    }
    return value;
  }

  private valueToExpression(value: any): t.Expression {
    if (value === null) return t.nullLiteral();
    if (value === undefined) return t.identifier('undefined');
    if (typeof value === 'boolean') return t.booleanLiteral(value);
    if (typeof value === 'number') return t.numericLiteral(value);
    if (typeof value === 'string') return t.stringLiteral(value);

    if (Array.isArray(value)) {
      return t.arrayExpression(value.map((v) => this.valueToExpression(v)));
    }

    if (typeof value === 'object') {
      const props = Object.entries(value).map(([key, val]) =>
        t.objectProperty(
          t.isValidIdentifier(key) ? t.identifier(key) : t.stringLiteral(key),
          this.valueToExpression(val),
        ),
      );
      return t.objectExpression(props);
    }

    return t.stringLiteral(String(value));
  }
}

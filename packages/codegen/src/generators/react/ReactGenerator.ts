import * as t from '@babel/types';
import type { AnalyzedSchema } from '../../analyzer/types';
import type { OutputFile } from '../../types';
import { ComponentBuilder } from './ComponentBuilder';
import { StyleBuilder } from './StyleBuilder';
import { DataFlowBuilder } from './DataFlowBuilder';
import { ImportCollector } from './ImportCollector';
import { emitCode } from '../../emitter/ASTEmitter';

export class ReactGenerator {
  generate(schema: AnalyzedSchema): OutputFile[] {
    const files: OutputFile[] = [];
    const componentName = schema.meta.componentName;

    const collector = new ImportCollector();
    collector.addDefault('react', 'React');
    collector.addNamed('react', 'React');

    const componentBuilder = new ComponentBuilder(schema, collector);
    const dataFlowBuilder = new DataFlowBuilder(schema);
    const styleBuilder = new StyleBuilder();

    const hasStyles = schema.styles.length > 0;
    const hasVariables = schema.variables.length > 0;
    const hasHandlers = schema.eventHandlers.length > 0;

    if (hasStyles) {
      collector.addNamed('./styles.module.css', 'styles');
    }
    if (hasVariables) {
      collector.addNamed('./hooks/useStateVars', 'useVars');
    }
    if (hasHandlers) {
      collector.addNamed('./handlers/eventHandlers', 'createHandlers');
    }

    for (const name of schema.antdImports) {
      collector.addNamed('antd', name);
    }
    for (const iconKey of schema.iconImports) {
      collector.addNamed('@ant-design/icons', iconKey);
    }

    const jsxTree = componentBuilder.buildRootJSX();
    const mainFile = this.buildMainFile(componentName, collector, jsxTree, hasVariables, hasHandlers);
    files.push({
      path: 'index.tsx',
      content: emitCode(mainFile),
    });

    if (hasStyles) {
      files.push({
        path: 'styles.module.css',
        content: styleBuilder.build(schema.styles),
      });
    }

    files.push({
      path: 'types.ts',
      content: this.buildTypesFile(componentName),
    });

    if (hasVariables) {
      const hooksAst = dataFlowBuilder.buildHooksFile();
      files.push({
        path: 'hooks/useStateVars.ts',
        content: emitCode(hooksAst),
      });
    }

    if (hasHandlers) {
      const handlersAst = dataFlowBuilder.buildHandlersFile();
      files.push({
        path: 'handlers/eventHandlers.ts',
        content: emitCode(handlersAst),
      });
    }

    return files;
  }

  private buildMainFile(
    componentName: string,
    collector: ImportCollector,
    jsxTree: t.JSXElement,
    hasVariables: boolean,
    hasHandlers: boolean,
  ): t.File {
    const statements: t.Statement[] = [];

    const imports = collector.getAll();
    for (const imp of imports) {
      if (imp.isDefault) {
        statements.push(
          t.importDeclaration(
            [t.importDefaultSpecifier(t.identifier(imp.names[0]))],
            t.stringLiteral(imp.source),
          ),
        );
      } else {
        statements.push(
          t.importDeclaration(
            imp.names.map((name) => t.importSpecifier(t.identifier(name), t.identifier(name))),
            t.stringLiteral(imp.source),
          ),
        );
      }
    }

    const componentBody: t.Statement[] = [];

    if (hasVariables) {
      componentBody.push(
        t.variableDeclaration('const', [
          t.variableDeclarator(
            t.identifier('vars'),
            t.callExpression(t.identifier('useVars'), []),
          ),
        ]),
      );
    }

    if (hasHandlers) {
      const handlerArgs = hasVariables
        ? [t.identifier('vars')]
        : [];
      componentBody.push(
        t.variableDeclaration('const', [
          t.variableDeclarator(
            t.identifier('handlers'),
            t.callExpression(t.identifier('createHandlers'), handlerArgs),
          ),
        ]),
      );
    }

    componentBody.push(
      t.returnStatement(jsxTree),
    );

    const componentDecl = t.variableDeclaration('const', [
      t.variableDeclarator(
        t.identifier(componentName),
        t.arrowFunctionExpression(
          [t.identifier('props')],
          t.blockStatement(componentBody),
        ),
      ),
    ]);

    statements.push(
      t.exportNamedDeclaration(componentDecl, []),
    );

    statements.push(
      t.exportDefaultDeclaration(t.identifier(componentName)),
    );

    return t.file(t.program(statements));
  }

  private buildTypesFile(componentName: string): string {
    return `import type { CSSProperties, ReactNode } from 'react';

export interface ${componentName}Props {
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
}
`;
  }
}

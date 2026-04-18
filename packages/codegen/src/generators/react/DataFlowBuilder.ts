import * as t from '@babel/types';
import type { AnalyzedSchema, AnalyzedVariable, AnalyzedEventHandler } from '../../analyzer/types';
import { toPascalCase } from '../../utils/naming';

export class DataFlowBuilder {
  constructor(private schema: AnalyzedSchema) {}

  buildHooksFile(): t.File {
    const statements: t.Statement[] = [];

    statements.push(
      t.importDeclaration(
        [t.importSpecifier(t.identifier('useState'), t.identifier('useState'))],
        t.stringLiteral('react'),
      ),
    );

    const bodyStatements: t.Statement[] = [];

    for (const v of this.schema.variables) {
      bodyStatements.push(
        t.variableDeclaration('const', [
          t.variableDeclarator(
            t.arrayPattern([t.identifier(v.name), t.identifier(v.setterName)]),
            t.callExpression(
              t.identifier('useState'),
              [this.defaultValueToAST(v.defaultValue, v.type)],
            ),
          ),
        ]),
      );
    }

    const returnProperties = this.schema.variables.map((v) =>
      t.objectProperty(t.identifier(v.name), t.identifier(v.name), false, true),
    );
    for (const v of this.schema.variables) {
      returnProperties.push(
        t.objectProperty(t.identifier(v.setterName), t.identifier(v.setterName), false, true),
      );
    }

    bodyStatements.push(
      t.returnStatement(t.objectExpression(returnProperties)),
    );

    statements.push(
      t.exportNamedDeclaration(
        t.functionDeclaration(
          t.identifier('useVars'),
          [],
          t.blockStatement(bodyStatements),
        ),
      ),
    );

    return t.file(t.program(statements));
  }

  buildHandlersFile(): t.File {
    if (this.schema.eventHandlers.length === 0) {
      return this.buildEmptyHandlersFile();
    }

    const statements: t.Statement[] = [];

    const handlerFunctions = this.schema.eventHandlers.map((handler) =>
      this.buildHandlerFunction(handler),
    );

    const returnProperties = this.schema.eventHandlers.map((handler) =>
      t.objectProperty(t.identifier(handler.functionName), t.identifier(handler.functionName), false, true),
    );

    const createHandlersBody = [
      ...handlerFunctions,
      t.returnStatement(t.objectExpression(returnProperties)),
    ];

    statements.push(
      t.exportNamedDeclaration(
        t.functionDeclaration(
          t.identifier('createHandlers'),
          [t.identifier('ctx')],
          t.blockStatement(createHandlersBody),
        ),
      ),
    );

    return t.file(t.program(statements));
  }

  private buildHandlerFunction(handler: AnalyzedEventHandler): t.Statement {
    const bodyStatements: t.Statement[] = [];

    for (const action of handler.actions) {
      bodyStatements.push(...this.actionToStatements(action));
    }

    return t.variableDeclaration('const', [
      t.variableDeclarator(
        t.identifier(handler.functionName),
        t.arrowFunctionExpression([], t.blockStatement(bodyStatements)),
      ),
    ]);
  }

  private actionToStatements(action: { type: string; config: Record<string, any> }): t.Statement[] {
    switch (action.type) {
      case 'setState': {
        const varName = action.config.variable;
        const setterName = `set${varName.charAt(0).toUpperCase()}${varName.slice(1)}`;
        const value = action.config.value || action.config.newValue || '';
        return [
          t.expressionStatement(
            t.callExpression(
              t.memberExpression(t.identifier('ctx'), t.identifier(setterName)),
              [t.identifier(value.startsWith('ctx.') ? value : `ctx.${value}`)],
            ),
          ),
        ];
      }
      case 'callApi': {
        const url = action.config.url || "'/api/data'";
        const method = action.config.method || 'GET';
        const stmts: t.Statement[] = [];
        stmts.push(
          t.expressionStatement(
            t.callExpression(
              t.memberExpression(t.identifier('Promise'), t.identifier('resolve')),
              [
                t.callExpression(t.identifier('fetch'), [
                  t.stringLiteral(url.replace(/^['"]|['"]$/g, '')),
                ]),
              ],
            ),
          ),
        );
        return stmts;
      }
      case 'navigate': {
        const url = action.config.url || '/';
        return [
          t.expressionStatement(
            t.assignmentExpression(
              '=',
              t.memberExpression(
                t.memberExpression(t.identifier('window'), t.identifier('location')),
                t.identifier('href'),
              ),
              t.stringLiteral(url),
            ),
          ),
        ];
      }
      case 'showMessage': {
        const content = action.config.content || "''";
        const level = action.config.level || 'success';
        return [
          t.expressionStatement(
            t.callExpression(
              t.memberExpression(t.identifier('message'), t.identifier(level)),
              [t.stringLiteral(content)],
            ),
          ),
        ];
      }
      default:
        return [
          t.emptyStatement(),
        ];
    }
  }

  private buildEmptyHandlersFile(): t.File {
    const statements: t.Statement[] = [
      t.exportNamedDeclaration(
        t.functionDeclaration(
          t.identifier('createHandlers'),
          [t.identifier('_ctx')],
          t.blockStatement([t.returnStatement(t.objectExpression([]))]),
        ),
      ),
    ];
    return t.file(t.program(statements));
  }

  private defaultValueToAST(value: any, type: string): t.Expression {
    if (value === undefined || value === null) {
      switch (type) {
        case 'string': return t.stringLiteral('');
        case 'number': return t.numericLiteral(0);
        case 'boolean': return t.booleanLiteral(false);
        case 'array': return t.arrayExpression([]);
        default: return t.nullLiteral();
      }
    }

    if (typeof value === 'string') return t.stringLiteral(value);
    if (typeof value === 'number') return t.numericLiteral(value);
    if (typeof value === 'boolean') return t.booleanLiteral(value);
    if (Array.isArray(value)) return t.arrayExpression(value.map((v) => this.defaultValueToAST(v, typeof v)));

    if (typeof value === 'object') {
      const props = Object.entries(value).map(([key, val]) =>
        t.objectProperty(
          t.isValidIdentifier(key) ? t.identifier(key) : t.stringLiteral(key),
          this.defaultValueToAST(val, typeof val),
        ),
      );
      return t.objectExpression(props);
    }

    return t.nullLiteral();
  }

  private varTypeToTSType(type: string): t.TSType {
    switch (type) {
      case 'string': return t.tsStringKeyword();
      case 'number': return t.tsNumberKeyword();
      case 'boolean': return t.tsBooleanKeyword();
      case 'array': return t.tsArrayType(t.tsAnyKeyword());
      case 'object': return t.tsObjectKeyword();
      default: return t.tsAnyKeyword();
    }
  }
}

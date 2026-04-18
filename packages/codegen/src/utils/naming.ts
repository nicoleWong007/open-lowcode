/**
 * 命名工具 — 组件名/变量名/CSS 类名生成规则
 */

/** 将字符串转为 PascalCase */
export function toPascalCase(str: string): string {
  return str
    .replace(/[^a-zA-Z0-9]+(.)/g, (_, char: string) => char.toUpperCase())
    .replace(/^[a-z]/, (c) => c.toUpperCase())
    .replace(/[^a-zA-Z0-9]/g, '');
}

/** 将字符串转为 camelCase */
export function toCamelCase(str: string): string {
  const pascal = toPascalCase(str);
  return pascal.replace(/^[A-Z]/, (c) => c.toLowerCase());
}

/** 根据 setter 名生成变量名，e.g. 'count' -> 'setCount' */
export function toSetterName(varName: string): string {
  return `set${varName.charAt(0).toUpperCase()}${varName.slice(1)}`;
}

/** 根据组件 ID 生成短哈希后缀（取前 6 位） */
export function shortId(id: string): string {
  return id.replace(/-/g, '').slice(0, 6);
}

/** 生成 CSS Module 类名：组件类型 + 短 ID */
export function toClassName(componentType: string, id: string): string {
  return toCamelCase(componentType) + shortId(id).charAt(0).toUpperCase() + shortId(id).slice(1);
}

/** 生成事件处理函数名 */
export function toHandlerName(componentType: string, eventName: string, id: string): string {
  return `handle${toPascalCase(componentType)}${toPascalCase(eventName)}${shortId(id).charAt(0).toUpperCase() + shortId(id).slice(1)}`;
}

/** hook 名 */
export function toHookName(base: string): string {
  return `use${toPascalCase(base)}`;
}

/** 从文档 meta.name 生成组件名 */
export function toComponentName(metaName: string): string {
  return toPascalCase(metaName) || 'ExportedComponent';
}

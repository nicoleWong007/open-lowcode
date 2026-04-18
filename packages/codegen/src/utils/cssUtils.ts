/**
 * CSS 工具 — camelCase → kebab-case, CSS 值格式化
 */

/** camelCase 属性名 → kebab-case */
export function camelToKebab(str: string): string {
  return str.replace(/[A-Z]/g, (match) => `-${match.toLowerCase()}`);
}

/** 判断 CSS 值是否需要 px 单位（纯数字值） */
const UNITLESS_PROPERTIES = new Set([
  'fontWeight',
  'lineHeight',
  'opacity',
  'zIndex',
  'flex',
  'flexGrow',
  'flexShrink',
  'order',
  'gridColumn',
  'gridRow',
  'gridColumnStart',
  'gridColumnEnd',
  'gridRowStart',
  'gridRowEnd',
]);

/** 格式化 CSS 属性值 */
export function formatCssValue(prop: string, value: string | number): string {
  if (typeof value === 'number') {
    // 0 不需要单位
    if (value === 0) return '0';
    // 无单位属性
    if (UNITLESS_PROPERTIES.has(prop)) return String(value);
    return `${value}px`;
  }
  return value;
}

/** 将 React CSSProperties 对象转为 CSS 文本行数组 */
export function cssPropertiesToLines(props: Record<string, string | number>): string[] {
  return Object.entries(props)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(([key, value]) => `  ${camelToKebab(key)}: ${formatCssValue(key, value)};`);
}

import type { AnalyzedStyle } from '../../analyzer/types';
import { camelToKebab, formatCssValue } from '../../utils/cssUtils';

export class StyleBuilder {
  build(styles: AnalyzedStyle[]): string {
    if (styles.length === 0) return '';

    const sections: string[] = [];

    const rootStyle = styles.find((s) => s.id.startsWith('style-root'));
    if (!rootStyle && styles.length > 0) {
      sections.push(this.buildRootStyle(styles[0]));
    }

    for (const style of styles) {
      sections.push(this.buildClass(style));
    }

    return sections.join('\n\n') + '\n';
  }

  private buildRootStyle(firstStyle: AnalyzedStyle): string {
    return `.root {\n  min-height: 400px;\n}`;
  }

  private buildClass(style: AnalyzedStyle): string {
    const { className, cssProperties } = style;
    const lines = Object.entries(cssProperties)
      .filter(([, value]) => value !== undefined && value !== null && value !== '')
      .map(([key, value]) => `  ${camelToKebab(key)}: ${formatCssValue(key, value as string | number)};`);

    return `.${className} {\n${lines.join('\n')}\n}`;
  }
}

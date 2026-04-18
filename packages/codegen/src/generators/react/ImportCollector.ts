export interface CollectedImport {
  source: string;
  names: string[];
  isDefault: boolean;
}

export class ImportCollector {
  private imports = new Map<string, Set<string>>();
  private defaultImports = new Map<string, string>();

  addNamed(source: string, name: string): void {
    if (!this.imports.has(source)) {
      this.imports.set(source, new Set());
    }
    this.imports.get(source)!.add(name);
  }

  addDefault(source: string, localName: string): void {
    this.defaultImports.set(source, localName);
  }

  addNamedMany(source: string, names: string[]): void {
    for (const name of names) {
      this.addNamed(source, name);
    }
  }

  getAll(): CollectedImport[] {
    const result: CollectedImport[] = [];

    for (const [source, localName] of this.defaultImports) {
      result.push({ source, names: [localName], isDefault: true });
    }

    for (const [source, names] of this.imports) {
      result.push({ source, names: Array.from(names).sort(), isDefault: false });
    }

    return result.sort((a, b) => {
      const order = (s: string) => {
        if (s === 'react') return 0;
        if (s === 'antd') return 1;
        if (s.startsWith('@ant-design')) return 2;
        if (s.startsWith('.')) return 4;
        return 3;
      };
      return order(a.source) - order(b.source);
    });
  }
}

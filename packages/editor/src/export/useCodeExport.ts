import { useMemo, useState } from 'react';
import type { DocumentSchema } from '@open-lowcode/engine';
import { SchemaAnalyzer, ReactGenerator } from '@open-lowcode/codegen';
import type { OutputFile } from '@open-lowcode/codegen';

export function useCodeExport(document: DocumentSchema | null) {
  const [isGenerating, setIsGenerating] = useState(false);

  const result = useMemo(() => {
    if (!document) return null;

    setIsGenerating(true);
    try {
      const analyzer = new SchemaAnalyzer();
      const analyzed = analyzer.analyze(document);
      const generator = new ReactGenerator();
      const files = generator.generate(analyzed);
      return { componentName: analyzed.meta.componentName, files };
    } finally {
      setIsGenerating(false);
    }
  }, [document]);

  return {
    files: result?.files ?? [],
    componentName: result?.componentName ?? '',
    isGenerating,
  };
}

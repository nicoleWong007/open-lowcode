import { useMemo } from 'react';
import { ComponentRegistry } from '@open-lowcode/engine';
import { createEditorStore } from '@open-lowcode/engine';
import { registerBuiltinComponents } from '@open-lowcode/components';
import { Editor } from '@open-lowcode/editor';

export function EditorPage() {
  const registry = useMemo(() => {
    const reg = new ComponentRegistry();
    registerBuiltinComponents(reg);
    return reg;
  }, []);

  const store = useMemo(() => createEditorStore(), []);

  return <Editor registry={registry} store={store} />;
}

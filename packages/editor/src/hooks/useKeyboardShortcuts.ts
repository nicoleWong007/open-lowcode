import { useEffect } from 'react';
import type { EditorStoreHook, ComponentRegistry } from '@open-lowcode/engine';
import { findNode, findParent } from '@open-lowcode/engine';

export function useKeyboardShortcuts(store: EditorStoreHook, registry: ComponentRegistry): void {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const storeApi = store.getState();
      const { selectedIds } = storeApi;

      const tag = (e.target as HTMLElement).tagName;
      const isEditable =
        tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' ||
        (e.target as HTMLElement).isContentEditable;
      if (isEditable) return;

      const ctrl = e.metaKey || e.ctrlKey;

      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedIds.length > 0) {
        e.preventDefault();
        [...selectedIds].forEach((id) => storeApi.deleteComponent(id));
        return;
      }

      if (ctrl && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        storeApi.undo();
        return;
      }

      if ((ctrl && e.key === 'y') || (ctrl && e.shiftKey && e.key === 'z')) {
        e.preventDefault();
        storeApi.redo();
        return;
      }

      if (ctrl && e.key === 'c' && selectedIds.length === 1) {
        e.preventDefault();
        storeApi.copyComponent(selectedIds[0]);
        return;
      }

      if (ctrl && e.key === 'v' && storeApi.clipboard) {
        e.preventDefault();
        const id = selectedIds[0] ?? storeApi.document.root.id;
        const target = findNode(storeApi.document.root, id);
        const meta = target ? registry.getMeta(target.type) : undefined;
        const parentId = meta?.isContainer ? id : storeApi.document.root.id;
        const parent = findNode(storeApi.document.root, parentId);
        const index = parent?.children?.length ?? 0;
        storeApi.pasteComponent(parentId, index);
        return;
      }

      if (ctrl && e.key === 'd' && selectedIds.length === 1) {
        e.preventDefault();
        storeApi.duplicateComponent(selectedIds[0]);
        return;
      }

      if (ctrl && e.key === 'a') {
        e.preventDefault();
        const allIds = storeApi.document.root.children?.map((c) => c.id) ?? [];
        storeApi.select(allIds);
        return;
      }

      if (e.key === 'Escape') {
        storeApi.select([]);
        return;
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [store, registry]);
}

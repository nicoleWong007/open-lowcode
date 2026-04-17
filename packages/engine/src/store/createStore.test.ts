import { describe, it, expect, beforeEach } from 'vitest';
import { createEditorStore } from './createStore';
import type { EditorStoreHook } from './createStore';

let store: EditorStoreHook;

beforeEach(() => {
  store = createEditorStore();
});

describe('EditorStore — insertComponent', () => {
  it('should insert a component into the root', () => {
    const rootId = store.getState().document.root.id;
    store.getState().insertComponent('Text', rootId, 0);
    const root = store.getState().document.root;
    expect(root.children).toHaveLength(1);
    expect(root.children![0].type).toBe('Text');
  });

  it('should assign a unique id to the new component', () => {
    const rootId = store.getState().document.root.id;
    store.getState().insertComponent('Text', rootId, 0);
    store.getState().insertComponent('Text', rootId, 1);
    const root = store.getState().document.root;
    expect(root.children![0].id).not.toBe(root.children![1].id);
  });
});

describe('EditorStore — deleteComponent', () => {
  it('should delete a component', () => {
    const rootId = store.getState().document.root.id;
    store.getState().insertComponent('Text', rootId, 0);
    const childId = store.getState().document.root.children![0].id;
    store.getState().deleteComponent(childId);
    expect(store.getState().document.root.children).toHaveLength(0);
  });
});

describe('EditorStore — updateProps', () => {
  it('should update component props', () => {
    const rootId = store.getState().document.root.id;
    store.getState().insertComponent('Text', rootId, 0);
    const childId = store.getState().document.root.children![0].id;
    store.getState().updateProps(childId, { text: 'Hello World' });
    const child = store.getState().document.root.children![0];
    expect(child.props.text).toBe('Hello World');
  });
});

describe('EditorStore — updateStyle', () => {
  it('should update component style', () => {
    const rootId = store.getState().document.root.id;
    store.getState().insertComponent('Text', rootId, 0);
    const childId = store.getState().document.root.children![0].id;
    store.getState().updateStyle(childId, { fontSize: 24 });
    const child = store.getState().document.root.children![0];
    expect(child.style.fontSize).toBe(24);
  });
});

describe('EditorStore — select', () => {
  it('should set selected ids', () => {
    store.getState().select(['id-1', 'id-2']);
    expect(store.getState().selectedIds).toEqual(['id-1', 'id-2']);
  });

  it('should clear selection', () => {
    store.getState().select(['id-1']);
    store.getState().select([]);
    expect(store.getState().selectedIds).toEqual([]);
  });
});

describe('EditorStore — undo/redo', () => {
  it('should undo the last operation', () => {
    const rootId = store.getState().document.root.id;
    store.getState().insertComponent('Text', rootId, 0);
    expect(store.getState().document.root.children).toHaveLength(1);
    store.getState().undo();
    expect(store.getState().document.root.children).toHaveLength(0);
  });

  it('should redo an undone operation', () => {
    const rootId = store.getState().document.root.id;
    store.getState().insertComponent('Text', rootId, 0);
    store.getState().undo();
    expect(store.getState().document.root.children).toHaveLength(0);
    store.getState().redo();
    expect(store.getState().document.root.children).toHaveLength(1);
  });

  it('should clear future on new action after undo', () => {
    const rootId = store.getState().document.root.id;
    store.getState().insertComponent('Text', rootId, 0);
    store.getState().undo();
    store.getState().insertComponent('Button', rootId, 0);
    store.getState().redo();
    expect(store.getState().document.root.children).toHaveLength(1);
    expect(store.getState().document.root.children![0].type).toBe('Button');
  });

  it('should not undo when past is empty', () => {
    store.getState().undo();
    expect(store.getState().past).toHaveLength(0);
  });

  it('should not redo when future is empty', () => {
    store.getState().redo();
    expect(store.getState().future).toHaveLength(0);
  });
});

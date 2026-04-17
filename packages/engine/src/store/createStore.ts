import { create } from 'zustand';
import type { CSSProperties, ComponentInstance, DocumentSchema, Variable, DataSource } from '../schema/types';
import { createDefaultDocument } from './defaults';
import {
  findNode,
  findParent,
  insertNode,
  removeNode,
  updateNodeProps,
  updateNodeStyle,
  cloneSubtree,
  pasteNode,
} from '../actions/treeOperations';
import { generateId } from '@open-lowcode/shared';

export interface EditorStore {
  document: DocumentSchema;
  selectedIds: string[];
  hoveredId: string | null;
  past: DocumentSchema[];
  future: DocumentSchema[];
  canvasScale: number;
  canvasMode: 'design' | 'preview';
  viewport: 'pc' | 'mobile';
  runtimeVariables: Record<string, any>;
  dataSourceCache: Record<string, any>;
  clipboard: ComponentInstance | null;

  insertComponent(type: string, parentId: string, index: number): void;
  moveComponent(id: string, newParentId: string, newIndex: number): void;
  deleteComponent(id: string): void;
  updateProps(id: string, partial: Record<string, any>): void;
  updateStyle(id: string, partial: CSSProperties): void;
  select(ids: string[]): void;
  setHoveredId(id: string | null): void;
  undo(): void;
  redo(): void;
  setCanvasScale(scale: number): void;
  setCanvasMode(mode: 'design' | 'preview'): void;
  setViewport(viewport: 'pc' | 'mobile'): void;
  setVariable(name: string, value: any): void;
  loadDocument(doc: DocumentSchema): void;
  copyComponent(id: string): void;
  pasteComponent(targetParentId: string, index: number): void;
  duplicateComponent(id: string): void;
  moveUp(id: string): void;
  moveDown(id: string): void;
  addVariable(variable: Omit<Variable, 'id'>): void;
  removeVariable(id: string): void;
  updateVariable(id: string, partial: Partial<Variable>): void;
  setRuntimeVariable(name: string, value: any): void;
  addDataSource(dataSource: Omit<DataSource, 'id'>): void;
  removeDataSource(id: string): void;
  updateDataSource(id: string, partial: Partial<DataSource>): void;
  setDataSourceCache(name: string, data: any): void;
  updateEventHandlers(id: string, eventName: string, actions: import('../schema/types').Action[]): void;
  updateBinding(id: string, propName: string, binding: import('../schema/types').Binding | null): void;
}

function createComponentInstance(type: string): ComponentInstance {
  return {
    id: generateId(),
    type,
    props: {},
    style: {},
    children: undefined,
  };
}

export function createEditorStore() {
  return create<EditorStore>((set, get) => ({
    document: createDefaultDocument(),
    selectedIds: [],
    hoveredId: null,
    past: [],
    future: [],
    canvasScale: 1,
    canvasMode: 'design',
    viewport: 'pc',
    runtimeVariables: {},
    dataSourceCache: {},
    clipboard: null,

    insertComponent(type, parentId, index) {
      const state = get();
      const newNode = createComponentInstance(type);
      const newDoc = insertNode(state.document.root, parentId, index, newNode);
      set({
        past: [...state.past, state.document],
        future: [],
        document: { ...state.document, root: newDoc, meta: { ...state.document.meta, updatedAt: new Date().toISOString() } },
      });
    },

    moveComponent(id, newParentId, newIndex) {
      const state = get();
      const node = findNode(state.document.root, id);
      if (!node) return;
      const removed = removeNode(state.document.root, id);
      const inserted = insertNode(removed, newParentId, newIndex, node);
      set({
        past: [...state.past, state.document],
        future: [],
        document: { ...state.document, root: inserted, meta: { ...state.document.meta, updatedAt: new Date().toISOString() } },
      });
    },

    deleteComponent(id) {
      const state = get();
      const newDoc = removeNode(state.document.root, id);
      const newSelectedIds = state.selectedIds.filter(sid => sid !== id);
      set({
        past: [...state.past, state.document],
        future: [],
        document: { ...state.document, root: newDoc, meta: { ...state.document.meta, updatedAt: new Date().toISOString() } },
        selectedIds: newSelectedIds,
      });
    },

    updateProps(id, partial) {
      const state = get();
      const newDoc = updateNodeProps(state.document.root, id, partial);
      set({
        past: [...state.past, state.document],
        future: [],
        document: { ...state.document, root: newDoc, meta: { ...state.document.meta, updatedAt: new Date().toISOString() } },
      });
    },

    updateStyle(id, partial) {
      const state = get();
      const newDoc = updateNodeStyle(state.document.root, id, partial);
      set({
        past: [...state.past, state.document],
        future: [],
        document: { ...state.document, root: newDoc, meta: { ...state.document.meta, updatedAt: new Date().toISOString() } },
      });
    },

    select(ids) {
      set({ selectedIds: ids });
    },

    setHoveredId(id) {
      set({ hoveredId: id });
    },

    undo() {
      const state = get();
      if (state.past.length === 0) return;
      const previous = state.past[state.past.length - 1];
      set({
        past: state.past.slice(0, -1),
        future: [state.document, ...state.future],
        document: previous,
      });
    },

    redo() {
      const state = get();
      if (state.future.length === 0) return;
      const next = state.future[0];
      set({
        past: [...state.past, state.document],
        future: state.future.slice(1),
        document: next,
      });
    },

    setCanvasScale(scale) {
      set({ canvasScale: scale });
    },

    setCanvasMode(mode) {
      set({ canvasMode: mode });
    },

    setViewport(viewport) {
      set({ viewport });
    },

    setVariable(name, value) {
      const state = get();
      set({
        runtimeVariables: { ...state.runtimeVariables, [name]: value },
      });
    },

    loadDocument(doc) {
      set({
        document: doc,
        past: [],
        future: [],
        selectedIds: [],
        hoveredId: null,
        clipboard: null,
      });
    },

    copyComponent(id) {
      const state = get();
      const node = findNode(state.document.root, id);
      if (!node) return;
      set({ clipboard: structuredClone(node) });
    },

    pasteComponent(targetParentId, index) {
      const state = get();
      if (!state.clipboard) return;
      const newDoc = pasteNode(state.document.root, targetParentId, index, state.clipboard);
      set({
        past: [...state.past, state.document],
        future: [],
        document: { ...state.document, root: newDoc, meta: { ...state.document.meta, updatedAt: new Date().toISOString() } },
      });
    },

    duplicateComponent(id) {
      const state = get();
      const node = findNode(state.document.root, id);
      if (!node) return;
      const parentInfo = findParent(state.document.root, id);
      if (!parentInfo) return;
      const cloned = cloneSubtree(node);
      const newDoc = insertNode(state.document.root, parentInfo.parent.id, parentInfo.index + 1, cloned);
      set({
        past: [...state.past, state.document],
        future: [],
        document: { ...state.document, root: newDoc, meta: { ...state.document.meta, updatedAt: new Date().toISOString() } },
        selectedIds: [cloned.id],
      });
    },

    moveUp(id) {
      const state = get();
      const parentInfo = findParent(state.document.root, id);
      if (!parentInfo || parentInfo.index === 0) return;
      state.moveComponent(id, parentInfo.parent.id, parentInfo.index - 1);
    },

    moveDown(id) {
      const state = get();
      const parentInfo = findParent(state.document.root, id);
      if (!parentInfo) return;
      const siblingCount = parentInfo.parent.children?.length ?? 0;
      if (parentInfo.index >= siblingCount - 1) return;
      state.moveComponent(id, parentInfo.parent.id, parentInfo.index + 1);
    },

    addVariable(variable) {
      const state = get();
      const newVar: Variable = { ...variable, id: generateId() };
      set({
        past: [...state.past, state.document],
        future: [],
        document: {
          ...state.document,
          variables: [...state.document.variables, newVar],
          meta: { ...state.document.meta, updatedAt: new Date().toISOString() },
        },
      });
    },

    removeVariable(id) {
      const state = get();
      set({
        past: [...state.past, state.document],
        future: [],
        document: {
          ...state.document,
          variables: state.document.variables.filter((v) => v.id !== id),
          meta: { ...state.document.meta, updatedAt: new Date().toISOString() },
        },
      });
    },

    updateVariable(id, partial) {
      const state = get();
      set({
        past: [...state.past, state.document],
        future: [],
        document: {
          ...state.document,
          variables: state.document.variables.map((v) =>
            v.id === id ? { ...v, ...partial } : v,
          ),
          meta: { ...state.document.meta, updatedAt: new Date().toISOString() },
        },
      });
    },

    setRuntimeVariable(name, value) {
      const state = get();
      set({
        runtimeVariables: { ...state.runtimeVariables, [name]: value },
      });
    },

    addDataSource(dataSource) {
      const state = get();
      const newDs: DataSource = { ...dataSource, id: generateId() };
      set({
        past: [...state.past, state.document],
        future: [],
        document: {
          ...state.document,
          dataSources: [...state.document.dataSources, newDs],
          meta: { ...state.document.meta, updatedAt: new Date().toISOString() },
        },
      });
    },

    removeDataSource(id) {
      const state = get();
      set({
        past: [...state.past, state.document],
        future: [],
        document: {
          ...state.document,
          dataSources: state.document.dataSources.filter((ds) => ds.id !== id),
          meta: { ...state.document.meta, updatedAt: new Date().toISOString() },
        },
      });
    },

    updateDataSource(id, partial) {
      const state = get();
      set({
        past: [...state.past, state.document],
        future: [],
        document: {
          ...state.document,
          dataSources: state.document.dataSources.map((ds) =>
            ds.id === id ? { ...ds, ...partial } : ds,
          ),
          meta: { ...state.document.meta, updatedAt: new Date().toISOString() },
        },
      });
    },

    setDataSourceCache(name, data) {
      const state = get();
      set({
        dataSourceCache: { ...state.dataSourceCache, [name]: data },
      });
    },

    updateEventHandlers(id, eventName, actions) {
      const state = get();
      const tree = structuredClone(state.document.root);
      const node = findNode(tree, id);
      if (!node) return;
      if (!node.eventHandlers) node.eventHandlers = {};
      node.eventHandlers[eventName] = actions;
      set({
        past: [...state.past, state.document],
        future: [],
        document: {
          ...state.document,
          root: tree,
          meta: { ...state.document.meta, updatedAt: new Date().toISOString() },
        },
      });
    },

    updateBinding(id, propName, binding) {
      const state = get();
      const tree = structuredClone(state.document.root);
      const node = findNode(tree, id);
      if (!node) return;
      if (!node.bindings) node.bindings = {};
      if (binding) {
        node.bindings[propName] = binding;
      } else {
        delete node.bindings[propName];
      }
      set({
        past: [...state.past, state.document],
        future: [],
        document: {
          ...state.document,
          root: tree,
          meta: { ...state.document.meta, updatedAt: new Date().toISOString() },
        },
      });
    },
  }));
}

export type EditorStoreHook = ReturnType<typeof createEditorStore>;

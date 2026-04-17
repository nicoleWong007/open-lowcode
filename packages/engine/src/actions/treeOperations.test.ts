import { describe, it, expect } from 'vitest';
import type { ComponentInstance } from '../schema/types';
import {
  findNode,
  findParent,
  insertNode,
  removeNode,
  updateNodeProps,
  updateNodeStyle,
  cloneSubtree,
  pasteNode,
} from './treeOperations';

function createTestTree(): ComponentInstance {
  return {
    id: 'root',
    type: 'Box',
    props: {},
    style: { padding: 8 },
    children: [
      {
        id: 'child-1',
        type: 'Text',
        props: { text: 'Hello' },
        style: { color: 'black' },
      },
      {
        id: 'child-2',
        type: 'Button',
        props: { text: 'Click me' },
        style: {},
      },
      {
        id: 'container-1',
        type: 'Box',
        props: {},
        style: {},
        children: [
          {
            id: 'nested-1',
            type: 'Text',
            props: { text: 'Nested' },
            style: {},
          },
        ],
      },
    ],
  };
}

describe('findNode', () => {
  it('should find the root node', () => {
    const tree = createTestTree();
    const found = findNode(tree, 'root');
    expect(found).not.toBeNull();
    expect(found!.id).toBe('root');
  });

  it('should find a direct child', () => {
    const tree = createTestTree();
    const found = findNode(tree, 'child-1');
    expect(found).not.toBeNull();
    expect(found!.type).toBe('Text');
  });

  it('should find a nested child', () => {
    const tree = createTestTree();
    const found = findNode(tree, 'nested-1');
    expect(found).not.toBeNull();
    expect(found!.props.text).toBe('Nested');
  });

  it('should return null for non-existent id', () => {
    const tree = createTestTree();
    const found = findNode(tree, 'non-existent');
    expect(found).toBeNull();
  });
});

describe('findParent', () => {
  it('should return null for the root node', () => {
    const tree = createTestTree();
    const result = findParent(tree, 'root');
    expect(result).toBeNull();
  });

  it('should find parent of a direct child', () => {
    const tree = createTestTree();
    const result = findParent(tree, 'child-1');
    expect(result).not.toBeNull();
    expect(result!.parent.id).toBe('root');
    expect(result!.index).toBe(0);
  });

  it('should find parent of a nested child', () => {
    const tree = createTestTree();
    const result = findParent(tree, 'nested-1');
    expect(result).not.toBeNull();
    expect(result!.parent.id).toBe('container-1');
    expect(result!.index).toBe(0);
  });
});

describe('insertNode', () => {
  it('should insert a node at the specified index', () => {
    const tree = createTestTree();
    const newNode: ComponentInstance = {
      id: 'new-1',
      type: 'Text',
      props: { text: 'New' },
      style: {},
    };
    const result = insertNode(tree, 'root', 1, newNode);
    expect(result.children![1].id).toBe('new-1');
    expect(result.children!).toHaveLength(4);
  });

  it('should not modify the original tree', () => {
    const tree = createTestTree();
    const newNode: ComponentInstance = {
      id: 'new-1',
      type: 'Text',
      props: { text: 'New' },
      style: {},
    };
    insertNode(tree, 'root', 0, newNode);
    expect(tree.children!).toHaveLength(3);
  });

  it('should insert into a nested container', () => {
    const tree = createTestTree();
    const newNode: ComponentInstance = {
      id: 'new-2',
      type: 'Button',
      props: { text: 'Nested Button' },
      style: {},
    };
    const result = insertNode(tree, 'container-1', 0, newNode);
    const container = result.children![2];
    expect(container.children!).toHaveLength(2);
    expect(container.children![0].id).toBe('new-2');
  });

  it('should initialize children array if container has none', () => {
    const tree: ComponentInstance = {
      id: 'root',
      type: 'Box',
      props: {},
      style: {},
    };
    const newNode: ComponentInstance = {
      id: 'new-1',
      type: 'Text',
      props: { text: 'Hello' },
      style: {},
    };
    const result = insertNode(tree, 'root', 0, newNode);
    expect(result.children).toBeDefined();
    expect(result.children!).toHaveLength(1);
    expect(result.children![0].id).toBe('new-1');
  });
});

describe('removeNode', () => {
  it('should remove a direct child', () => {
    const tree = createTestTree();
    const result = removeNode(tree, 'child-1');
    expect(result.children!).toHaveLength(2);
    expect(result.children![0].id).toBe('child-2');
  });

  it('should not modify the original tree', () => {
    const tree = createTestTree();
    removeNode(tree, 'child-1');
    expect(tree.children!).toHaveLength(3);
  });

  it('should remove a nested child', () => {
    const tree = createTestTree();
    const result = removeNode(tree, 'nested-1');
    const container = result.children![2];
    expect(container.children!).toHaveLength(0);
  });
});

describe('updateNodeProps', () => {
  it('should update props of a node', () => {
    const tree = createTestTree();
    const result = updateNodeProps(tree, 'child-1', { text: 'Updated' });
    expect(result.children![0].props.text).toBe('Updated');
  });

  it('should not modify the original tree', () => {
    const tree = createTestTree();
    updateNodeProps(tree, 'child-1', { text: 'Updated' });
    expect(tree.children![0].props.text).toBe('Hello');
  });

  it('should merge props, not replace', () => {
    const tree = createTestTree();
    const result = updateNodeProps(tree, 'child-2', { disabled: true });
    expect(result.children![1].props.text).toBe('Click me');
    expect(result.children![1].props.disabled).toBe(true);
  });
});

describe('updateNodeStyle', () => {
  it('should update style of a node', () => {
    const tree = createTestTree();
    const result = updateNodeStyle(tree, 'child-1', { fontSize: 16 });
    expect(result.children![0].style.fontSize).toBe(16);
  });

  it('should not modify the original tree', () => {
    const tree = createTestTree();
    updateNodeStyle(tree, 'child-1', { fontSize: 16 });
    expect(tree.children![0].style.fontSize).toBeUndefined();
  });

  it('should merge styles, not replace', () => {
    const tree = createTestTree();
    const result = updateNodeStyle(tree, 'child-1', { fontSize: 16 });
    expect(result.children![0].style.color).toBe('black');
    expect(result.children![0].style.fontSize).toBe(16);
  });
});

describe('cloneSubtree', () => {
  it('should produce a copy with different IDs', () => {
    const tree = createTestTree();
    const container = tree.children![2];
    const cloned = cloneSubtree(container);
    expect(cloned.id).not.toBe('container-1');
    expect(cloned.children![0].id).not.toBe('nested-1');
  });

  it('should preserve structure and props', () => {
    const tree = createTestTree();
    const container = tree.children![2];
    const cloned = cloneSubtree(container);
    expect(cloned.type).toBe('Box');
    expect(cloned.children).toHaveLength(1);
    expect(cloned.children![0].type).toBe('Text');
    expect(cloned.children![0].props.text).toBe('Nested');
  });

  it('should not modify the original', () => {
    const tree = createTestTree();
    const container = tree.children![2];
    cloneSubtree(container);
    expect(container.id).toBe('container-1');
    expect(container.children![0].id).toBe('nested-1');
  });

  it('should handle 3-level nesting', () => {
    const deep: ComponentInstance = {
      id: 'l1',
      type: 'Box',
      props: {},
      style: {},
      children: [{
        id: 'l2',
        type: 'Box',
        props: {},
        style: {},
        children: [{
          id: 'l3',
          type: 'Text',
          props: { text: 'deep' },
          style: {},
        }],
      }],
    };
    const cloned = cloneSubtree(deep);
    expect(cloned.id).not.toBe('l1');
    expect(cloned.children![0].id).not.toBe('l2');
    expect(cloned.children![0].children![0].id).not.toBe('l3');
    expect(cloned.children![0].children![0].props.text).toBe('deep');
  });
});

describe('pasteNode', () => {
  it('should insert a cloned subtree with new IDs', () => {
    const tree = createTestTree();
    const nodeToPaste = tree.children![1]; // Button
    const result = pasteNode(tree, 'root', 0, nodeToPaste);
    expect(result.children!).toHaveLength(4);
    expect(result.children![0].type).toBe('Button');
    expect(result.children![0].id).not.toBe('child-2');
  });

  it('should not modify the original tree', () => {
    const tree = createTestTree();
    const nodeToPaste = tree.children![1];
    pasteNode(tree, 'root', 0, nodeToPaste);
    expect(tree.children!).toHaveLength(3);
    expect(tree.children![1].id).toBe('child-2');
  });

  it('should preserve children in pasted subtree', () => {
    const tree = createTestTree();
    const container = tree.children![2]; // container-1 with nested-1
    const result = pasteNode(tree, 'root', 0, container);
    const pasted = result.children![0];
    expect(pasted.type).toBe('Box');
    expect(pasted.children).toHaveLength(1);
    expect(pasted.children![0].type).toBe('Text');
    expect(pasted.children![0].id).not.toBe('nested-1');
  });
});

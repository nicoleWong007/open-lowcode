import type { CSSProperties, ComponentInstance } from '../schema/types';
import { generateId } from '@open-lowcode/shared';

/**
 * Find a node by ID in the component tree.
 */
export function findNode(root: ComponentInstance, id: string): ComponentInstance | null {
  if (root.id === id) return root;
  if (root.children) {
    for (const child of root.children) {
      const found = findNode(child, id);
      if (found) return found;
    }
  }
  return null;
}

/**
 * Find the parent of a node and its index within parent's children.
 * Returns null if the node is the root or not found.
 */
export function findParent(
  root: ComponentInstance,
  id: string,
): { parent: ComponentInstance; index: number } | null {
  if (root.children) {
    for (let i = 0; i < root.children.length; i++) {
      if (root.children[i].id === id) {
        return { parent: root, index: i };
      }
      const found = findParent(root.children[i], id);
      if (found) return found;
    }
  }
  return null;
}

/**
 * Insert a new node as a child of parentId at the given index.
 * Returns a new tree; does not mutate the original.
 */
export function insertNode(
  root: ComponentInstance,
  parentId: string,
  index: number,
  newNode: ComponentInstance,
): ComponentInstance {
  const tree = structuredClone(root);
  const parent = findNode(tree, parentId);
  if (!parent) throw new Error(`Parent node "${parentId}" not found`);
  if (!parent.children) parent.children = [];
  parent.children.splice(index, 0, newNode);
  return tree;
}

/**
 * Remove a node from the tree by ID.
 * Returns a new tree; does not mutate the original.
 */
export function removeNode(root: ComponentInstance, id: string): ComponentInstance {
  const tree = structuredClone(root);
  const result = findParent(tree, id);
  if (!result) throw new Error(`Node "${id}" not found or is root`);
  result.parent.children!.splice(result.index, 1);
  return tree;
}

/**
 * Update a node's props (shallow merge).
 * Returns a new tree; does not mutate the original.
 */
export function updateNodeProps(
  root: ComponentInstance,
  id: string,
  partial: Record<string, any>,
): ComponentInstance {
  const tree = structuredClone(root);
  const node = findNode(tree, id);
  if (!node) throw new Error(`Node "${id}" not found`);
  node.props = { ...node.props, ...partial };
  return tree;
}

/**
 * Update a node's style (shallow merge).
 * Returns a new tree; does not mutate the original.
 */
export function updateNodeStyle(
  root: ComponentInstance,
  id: string,
  partial: CSSProperties,
): ComponentInstance {
  const tree = structuredClone(root);
  const node = findNode(tree, id);
  if (!node) throw new Error(`Node "${id}" not found`);
  node.style = { ...node.style, ...partial };
  return tree;
}

/**
 * Reassign all IDs in a subtree (recursive, mutates the node in place).
 */
function reassignIds(node: ComponentInstance): void {
  node.id = generateId();
  node.children?.forEach(reassignIds);
}

/**
 * Deep-clone a subtree, assigning fresh IDs to every node.
 * Returns a completely independent copy with new UUIDs.
 */
export function cloneSubtree(node: ComponentInstance): ComponentInstance {
  const clone = structuredClone(node);
  reassignIds(clone);
  return clone;
}

/**
 * Paste (insert) a cloned subtree into parent at index.
 * The original node is not mutated; a fresh copy with new IDs is inserted.
 * Returns a new tree; does not mutate the original.
 */
export function pasteNode(
  root: ComponentInstance,
  parentId: string,
  index: number,
  nodeToPaste: ComponentInstance,
): ComponentInstance {
  const cloned = cloneSubtree(nodeToPaste);
  return insertNode(root, parentId, index, cloned);
}

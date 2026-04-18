import { useMemo, useCallback } from 'react';
import { Dropdown } from 'antd';
import type { MenuProps } from 'antd';
import {
  CopyOutlined,
  DeleteOutlined,
  ScissorOutlined,
  SnippetsOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  CopyFilled,
} from '@ant-design/icons';
import type { EditorStoreHook, ComponentRegistry } from '@open-lowcode/engine';
import { findNode, findParent } from '@open-lowcode/engine';

interface ContextMenuProps {
  store: EditorStoreHook;
  registry: ComponentRegistry;
  children: React.ReactNode;
}

export const ContextMenu: React.FC<ContextMenuProps> = ({ store, registry, children }) => {
  const buildMenuItems = useCallback((): MenuProps['items'] => {
    const state = store.getState();
    const { selectedIds, clipboard } = state;
    const selectedId = selectedIds[0];

    if (!selectedId) {
      if (clipboard) {
        return [
      {
        key: 'paste',
        label: '粘贴',
        icon: <SnippetsOutlined />,
        onClick: () => {
          const s = store.getState();
          const parentId = s.document.root.id;
          const index = s.document.root.children?.length ?? 0;
          s.pasteComponent(parentId, index);
        },
      },
        ];
      }
      return [];
    }

    const parentInfo = findParent(state.document.root, selectedId);
    const isFirst = parentInfo?.index === 0;
    const isLast = parentInfo
      ? parentInfo.index >= (parentInfo.parent.children?.length ?? 0) - 1
      : true;

    const items: MenuProps['items'] = [
      {
        key: 'copy',
        label: '复制',
        icon: <CopyOutlined />,
        onClick: () => store.getState().copyComponent(selectedId),
      },
      {
        key: 'paste',
        label: '粘贴',
        icon: <SnippetsOutlined />,
        disabled: !clipboard,
        onClick: () => {
          const s = store.getState();
          const target = findNode(s.document.root, selectedId);
          const meta = target ? registry.getMeta(target.type) : undefined;
          const parentId = meta?.isContainer ? selectedId : s.document.root.id;
          const parent = findNode(s.document.root, parentId);
          const index = parent?.children?.length ?? 0;
          s.pasteComponent(parentId, index);
        },
      },
      { type: 'divider' },
      {
        key: 'delete',
        label: '删除',
        icon: <DeleteOutlined />,
        danger: true,
        onClick: () => store.getState().deleteComponent(selectedId),
      },
      { type: 'divider' },
      {
        key: 'moveUp',
        label: '上移',
        icon: <ArrowUpOutlined />,
        disabled: isFirst,
        onClick: () => store.getState().moveUp(selectedId),
      },
      {
        key: 'moveDown',
        label: '下移',
        icon: <ArrowDownOutlined />,
        disabled: isLast,
        onClick: () => store.getState().moveDown(selectedId),
      },
      { type: 'divider' },
      {
        key: 'duplicate',
        label: '复制组件',
        icon: <CopyFilled />,
        onClick: () => store.getState().duplicateComponent(selectedId),
      },
    ];

    return items;
  }, [store, registry]);

  return (
    <Dropdown
      menu={{
        items: buildMenuItems(),
        style: { minWidth: 120, fontSize: 12 },
      }}
      trigger={['contextMenu']}
    >
      {children}
    </Dropdown>
  );
};

import type { ComponentInstance, ComponentRegistry, EditorStoreHook } from '@open-lowcode/engine';
import { ComponentRenderer } from './ComponentRenderer';
import { SelectionBox } from './SelectionBox';
import { SortableComponentRenderer } from './SortableComponentRenderer';

interface DesignRendererProps {
  instance: ComponentInstance;
  registry: ComponentRegistry;
  store: EditorStoreHook;
}

export const DesignRenderer: React.FC<DesignRendererProps> = ({ instance, registry, store }) => {
  const selectedIds = store((s) => s.selectedIds);
  const hoveredId = store((s) => s.hoveredId);
  const select = store((s) => s.select);
  const setHoveredId = store((s) => s.setHoveredId);

  const isSelected = selectedIds.includes(instance.id);
  const isHovered = hoveredId === instance.id;

  const meta = registry.getMeta(instance.type);
  const isContainer = meta?.isContainer ?? false;

  return (
    <SelectionBox
      id={instance.id}
      type={instance.type}
      isSelected={isSelected}
      isHovered={isHovered}
      onSelect={(id) => select([id])}
      onHover={setHoveredId}
    >
      <DesignComponentWrapper
        instance={instance}
        registry={registry}
        store={store}
        isContainer={isContainer}
      />
    </SelectionBox>
  );
};

const DesignComponentWrapper: React.FC<{
  instance: ComponentInstance;
  registry: ComponentRegistry;
  store: EditorStoreHook;
  isContainer: boolean;
}> = ({ instance, registry, store, isContainer }) => {
  const Component = registry.getComponent(instance.type);

  if (!Component) {
    return (
      <div style={{ padding: 8, border: '1px dashed #ff4d4f', color: '#ff4d4f', fontSize: 12, borderRadius: 4 }}>
        未注册组件: {instance.type}
      </div>
    );
  }

  const childContent = instance.children?.map((child) => (
    <SortableComponentRenderer key={child.id} instance={child} registry={registry} store={store} />
  ));

  if (isContainer) {
    return (
      <Component style={instance.style} {...instance.props}>
        {childContent}
        {(!instance.children || instance.children.length === 0) && (
          <div
            style={{
              padding: 16,
              border: '1px dashed #d9d9d9',
              borderRadius: 4,
              color: '#bfbfbf',
              fontSize: 12,
              textAlign: 'center',
              minHeight: 40,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            拖拽组件到此处
          </div>
        )}
      </Component>
    );
  }

  return <Component style={instance.style} {...instance.props} />;
};

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { ComponentInstance, ComponentRegistry, EditorStoreHook } from '@open-lowcode/engine';
import { DesignRenderer } from './DesignRenderer';

interface SortableComponentRendererProps {
  instance: ComponentInstance;
  registry: ComponentRegistry;
  store: EditorStoreHook;
}

export const SortableComponentRenderer: React.FC<SortableComponentRendererProps> = ({
  instance,
  registry,
  store,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: instance.id,
    data: { type: instance.type, fromCanvas: true },
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    position: 'relative',
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <DesignRenderer instance={instance} registry={registry} store={store} />
    </div>
  );
};

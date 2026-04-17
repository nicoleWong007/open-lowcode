import type { ComponentInstance, ComponentRegistry } from '@open-lowcode/engine';

interface ComponentRendererProps {
  instance: ComponentInstance;
  registry: ComponentRegistry;
}

export const ComponentRenderer: React.FC<ComponentRendererProps> = ({ instance, registry }) => {
  const Component = registry.getComponent(instance.type);

  if (!Component) {
    return (
      <div
        style={{
          padding: 8,
          border: '1px dashed #ff4d4f',
          color: '#ff4d4f',
          fontSize: 12,
          borderRadius: 4,
        }}
      >
        未注册组件: {instance.type}
      </div>
    );
  }

  return (
    <Component style={instance.style} {...instance.props}>
      {instance.children?.map((child) => (
        <ComponentRenderer key={child.id} instance={child} registry={registry} />
      ))}
    </Component>
  );
};

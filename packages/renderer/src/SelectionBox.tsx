import type { ReactNode } from 'react';

interface SelectionBoxProps {
  id: string;
  type: string;
  isSelected: boolean;
  isHovered: boolean;
  onSelect: (id: string, e: React.MouseEvent) => void;
  onHover: (id: string | null) => void;
  children: ReactNode;
}

export const SelectionBox: React.FC<SelectionBoxProps> = ({
  id,
  type,
  isSelected,
  isHovered,
  onSelect,
  onHover,
  children,
}) => {
  const outlineColor = isSelected ? '#1677ff' : isHovered ? '#69b1ff' : 'transparent';
  const showLabel = isSelected || isHovered;

  return (
    <div
      data-component-id={id}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(id, e);
      }}
      onMouseEnter={(e) => {
        e.stopPropagation();
        onHover(id);
      }}
      onMouseLeave={(e) => {
        e.stopPropagation();
        onHover(null);
      }}
      style={{
        position: 'relative',
        outline: `2px solid ${outlineColor}`,
        outlineOffset: -1,
        cursor: 'pointer',
        transition: 'outline-color 0.15s',
      }}
    >
      {showLabel && (
        <div
          style={{
            position: 'absolute',
            top: -20,
            left: 0,
            fontSize: 11,
            lineHeight: '18px',
            padding: '0 4px',
            backgroundColor: isSelected ? '#1677ff' : '#69b1ff',
            color: '#fff',
            borderRadius: 2,
            whiteSpace: 'nowrap',
            zIndex: 10,
            pointerEvents: 'none',
          }}
        >
          {type}
        </div>
      )}
      {children}
    </div>
  );
};

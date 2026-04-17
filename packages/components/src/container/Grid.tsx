import type { CSSProperties, ReactNode } from 'react';

export interface GridComponentProps {
  columns?: number;
  gap?: number;
  padding?: number;
  style?: CSSProperties;
  children?: ReactNode;
}

export const GridComponent: React.FC<GridComponentProps> = ({
  columns = 2,
  gap = 12,
  padding = 0,
  style: externalStyle,
  children,
}) => {
  const style: CSSProperties = {
    display: 'grid',
    gridTemplateColumns: `repeat(${columns}, 1fr)`,
    gap,
    padding,
    minHeight: 40,
    boxSizing: 'border-box',
    ...externalStyle,
  };
  return <div style={style}>{children}</div>;
};

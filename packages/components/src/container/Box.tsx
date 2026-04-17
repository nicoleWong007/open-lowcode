import type { CSSProperties, ReactNode } from 'react';

export interface BoxComponentProps {
  padding?: number | string;
  gap?: number;
  direction?: 'row' | 'column';
  borderRadius?: number;
  background?: string;
  border?: string;
  style?: CSSProperties;
  children?: ReactNode;
}

export const BoxComponent: React.FC<BoxComponentProps> = ({
  children,
  padding = 8,
  gap = 0,
  direction = 'column',
  borderRadius = 0,
  background = 'transparent',
  border = 'none',
  style: externalStyle,
}) => {
  const style: CSSProperties = {
    display: 'flex',
    flexDirection: direction,
    padding,
    gap,
    borderRadius,
    background,
    border,
    minHeight: 40,
    boxSizing: 'border-box',
    ...externalStyle,
  };
  return <div style={style}>{children}</div>;
};

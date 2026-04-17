import type { CSSProperties, ReactNode } from 'react';

export interface FormComponentProps {
  labelAlign?: 'left' | 'right' | 'top';
  gap?: number;
  padding?: number;
  style?: CSSProperties;
  children?: ReactNode;
}

export const FormComponent: React.FC<FormComponentProps> = ({
  labelAlign = 'top',
  gap = 12,
  padding = 16,
  style: externalStyle,
  children,
}) => {
  const style: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap,
    padding,
    minHeight: 60,
    boxSizing: 'border-box',
    ...externalStyle,
  };
  return <div style={style}>{children}</div>;
};

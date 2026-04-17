import type { CSSProperties, ReactNode } from 'react';

export interface CardComponentProps {
  title?: string;
  padding?: number;
  borderRadius?: number;
  background?: string;
  style?: CSSProperties;
  children?: ReactNode;
}

export const CardComponent: React.FC<CardComponentProps> = ({
  title,
  padding = 16,
  borderRadius = 8,
  background = '#ffffff',
  style: externalStyle,
  children,
}) => {
  const style: CSSProperties = {
    padding, borderRadius, background,
    border: '1px solid #f0f0f0',
    boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
    boxSizing: 'border-box',
    minHeight: 60,
    ...externalStyle,
  };
  return (
    <div style={style}>
      {title && (
        <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 12, color: '#333' }}>
          {title}
        </div>
      )}
      {children}
    </div>
  );
};

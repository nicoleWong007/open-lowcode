import type { CSSProperties } from 'react';

export interface TextComponentProps {
  text?: string;
  fontSize?: number;
  fontWeight?: string;
  color?: string;
  textAlign?: 'left' | 'center' | 'right';
  style?: CSSProperties;
  children?: React.ReactNode;
}

export const TextComponent: React.FC<TextComponentProps> = ({
  text = '文本',
  fontSize = 14,
  fontWeight = 'normal',
  color = '#333333',
  textAlign = 'left',
  style: externalStyle,
  children,
}) => {
  const style: CSSProperties = {
    fontSize,
    fontWeight,
    color,
    textAlign,
    wordBreak: 'break-word',
    ...externalStyle,
  };
  return <span style={style}>{text}{children}</span>;
};

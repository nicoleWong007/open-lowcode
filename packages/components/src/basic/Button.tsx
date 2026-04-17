import { Button as AntButton } from 'antd';
import type { CSSProperties } from 'react';

export interface ButtonComponentProps {
  text?: string;
  type?: 'primary' | 'default' | 'dashed' | 'link' | 'text';
  disabled?: boolean;
  size?: 'small' | 'middle' | 'large';
  block?: boolean;
  danger?: boolean;
  style?: CSSProperties;
  children?: React.ReactNode;
}

export const ButtonComponent: React.FC<ButtonComponentProps> = ({
  text = '按钮',
  type = 'primary',
  disabled = false,
  size = 'middle',
  block = false,
  danger = false,
  style,
}) => {
  return (
    <AntButton type={type} disabled={disabled} size={size} block={block} danger={danger} style={style}>
      {text}
    </AntButton>
  );
};

import { Input as AntInput } from 'antd';
import type { CSSProperties } from 'react';

export interface InputComponentProps {
  placeholder?: string;
  size?: 'small' | 'middle' | 'large';
  disabled?: boolean;
  style?: CSSProperties;
}

export const InputComponent: React.FC<InputComponentProps> = ({
  placeholder = '请输入',
  size = 'middle',
  disabled = false,
  style,
}) => {
  return <AntInput placeholder={placeholder} size={size} disabled={disabled} style={style} />;
};

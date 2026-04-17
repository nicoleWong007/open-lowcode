import { Select as AntSelect } from 'antd';
import type { CSSProperties } from 'react';

export interface SelectComponentProps {
  placeholder?: string;
  options?: string;
  disabled?: boolean;
  size?: 'small' | 'middle' | 'large';
  style?: CSSProperties;
}

export const SelectComponent: React.FC<SelectComponentProps> = ({
  placeholder = '请选择',
  options = '选项1,选项2,选项3',
  disabled = false,
  size = 'middle',
  style,
}) => {
  const parsedOptions = options.split(',').map((o) => ({ label: o.trim(), value: o.trim() }));
  return (
    <AntSelect
      placeholder={placeholder}
      options={parsedOptions}
      disabled={disabled}
      size={size}
      style={{ width: '100%', ...style }}
    />
  );
};

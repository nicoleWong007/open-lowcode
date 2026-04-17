import { Checkbox as AntCheckbox } from 'antd';
import type { CSSProperties } from 'react';

export interface CheckboxComponentProps {
  label?: string;
  checked?: boolean;
  disabled?: boolean;
  style?: CSSProperties;
}

export const CheckboxComponent: React.FC<CheckboxComponentProps> = ({
  label = '复选框',
  disabled = false,
  style,
}) => {
  return <AntCheckbox disabled={disabled} style={style}>{label}</AntCheckbox>;
};

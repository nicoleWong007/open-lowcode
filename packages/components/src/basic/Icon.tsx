import { SmileOutlined, StarOutlined, HeartOutlined, SearchOutlined, HomeOutlined, SettingOutlined, UserOutlined } from '@ant-design/icons';
import type { CSSProperties } from 'react';

const ICON_MAP: Record<string, React.FC<any>> = {
  smile: SmileOutlined,
  star: StarOutlined,
  heart: HeartOutlined,
  search: SearchOutlined,
  home: HomeOutlined,
  setting: SettingOutlined,
  user: UserOutlined,
};

export interface IconComponentProps {
  icon?: string;
  size?: number;
  color?: string;
  style?: CSSProperties;
}

export const IconComponent: React.FC<IconComponentProps> = ({
  icon = 'smile',
  size = 24,
  color = '#333333',
  style: externalStyle,
}) => {
  const IconComp = ICON_MAP[icon] ?? SmileOutlined;
  const style: CSSProperties = { fontSize: size, color, display: 'inline-flex', ...externalStyle };
  return <IconComp style={style} />;
};

export const ICON_OPTIONS = Object.keys(ICON_MAP).map((key) => ({ label: key, value: key }));

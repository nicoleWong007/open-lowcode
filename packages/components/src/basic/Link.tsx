import type { CSSProperties } from 'react';

export interface LinkComponentProps {
  text?: string;
  href?: string;
  target?: '_blank' | '_self';
  fontSize?: number;
  color?: string;
  style?: CSSProperties;
}

export const LinkComponent: React.FC<LinkComponentProps> = ({
  text = '链接',
  href = '#',
  target = '_blank',
  fontSize = 14,
  color = '#1677ff',
  style: externalStyle,
}) => {
  const style: CSSProperties = {
    fontSize, color, textDecoration: 'none', cursor: 'pointer',
    ...externalStyle,
  };
  return (
    <a href={href} target={target} rel="noopener noreferrer" style={style}>
      {text}
    </a>
  );
};

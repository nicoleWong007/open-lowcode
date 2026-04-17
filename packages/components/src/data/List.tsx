import type { CSSProperties } from 'react';

export interface ListComponentProps {
  items?: string;
  ordered?: boolean;
  gap?: number;
  style?: CSSProperties;
}

export const ListComponent: React.FC<ListComponentProps> = ({
  items = '项目 1,项目 2,项目 3',
  ordered = false,
  gap = 4,
  style: externalStyle,
}) => {
  const list = items.split(',').map((i) => i.trim()).filter(Boolean);
  const Tag = ordered ? 'ol' : 'ul';

  const style: CSSProperties = {
    listStyle: ordered ? 'decimal' : 'disc',
    paddingLeft: 20,
    margin: 0,
    display: 'flex',
    flexDirection: 'column',
    gap,
    ...externalStyle,
  };

  return (
    <Tag style={style}>
      {list.map((item, i) => (
        <li key={i} style={{ fontSize: 13, color: '#333' }}>{item}</li>
      ))}
    </Tag>
  );
};

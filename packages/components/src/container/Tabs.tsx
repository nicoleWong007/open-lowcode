import { useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';

export interface TabsComponentProps {
  items?: string;
  style?: CSSProperties;
  children?: ReactNode;
}

export const TabsComponent: React.FC<TabsComponentProps> = ({
  items = 'Tab 1,Tab 2,Tab 3',
  style: externalStyle,
}) => {
  const tabs = items.split(',').map((t) => t.trim()).filter(Boolean);
  const [active, setActive] = useState(0);

  const style: CSSProperties = {
    minHeight: 40,
    boxSizing: 'border-box',
    ...externalStyle,
  };

  return (
    <div style={style}>
      <div style={{ display: 'flex', borderBottom: '1px solid #f0f0f0' }}>
        {tabs.map((tab, i) => (
          <div
            key={i}
            onClick={() => setActive(i)}
            style={{
              padding: '8px 16px',
              cursor: 'pointer',
              fontSize: 13,
              color: active === i ? '#1677ff' : '#666',
              fontWeight: active === i ? 600 : 400,
              borderBottom: active === i ? '2px solid #1677ff' : '2px solid transparent',
              userSelect: 'none',
            }}
          >
            {tab}
          </div>
        ))}
      </div>
      <div style={{ padding: 12, color: '#999', fontSize: 12 }}>
        {tabs[active]} 内容区
      </div>
    </div>
  );
};

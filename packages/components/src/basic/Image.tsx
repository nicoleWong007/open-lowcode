import type { CSSProperties } from 'react';

export interface ImageComponentProps {
  src?: string;
  alt?: string;
  width?: number | string;
  height?: number | string;
  objectFit?: 'cover' | 'contain' | 'fill' | 'none';
  borderRadius?: number;
  style?: CSSProperties;
}

export const ImageComponent: React.FC<ImageComponentProps> = ({
  src = '',
  alt = '图片',
  width = '100%',
  height = 'auto',
  objectFit = 'cover',
  borderRadius = 0,
  style: externalStyle,
}) => {
  if (!src) {
    return (
      <div style={{
        width, height: typeof height === 'number' ? height : 120,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        backgroundColor: '#f5f5f5', borderRadius, color: '#bfbfbf', fontSize: 12,
        ...externalStyle,
      }}>
        请设置图片地址
      </div>
    );
  }

  const style: CSSProperties = {
    width, height, objectFit, borderRadius, display: 'block',
    ...externalStyle,
  };
  return <img src={src} alt={alt} style={style} />;
};

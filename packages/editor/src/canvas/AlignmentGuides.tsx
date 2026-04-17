export interface GuideLine {
  orientation: 'horizontal' | 'vertical';
  position: number;
}

interface AlignmentGuidesProps {
  guides: GuideLine[];
}

export const AlignmentGuides: React.FC<AlignmentGuidesProps> = ({ guides }) => {
  return (
    <>
      {guides.map((guide, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            backgroundColor: '#1677ff',
            pointerEvents: 'none',
            zIndex: 1000,
            ...(guide.orientation === 'horizontal'
              ? { left: 0, right: 0, top: guide.position, height: 1 }
              : { top: 0, bottom: 0, left: guide.position, width: 1 }),
          }}
        />
      ))}
    </>
  );
}

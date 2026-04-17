import { useCallback, useEffect, useRef, useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { DesignRenderer, RuntimeRenderer } from '@open-lowcode/renderer';
import type { ComponentRegistry, EditorStoreHook } from '@open-lowcode/engine';
import { ContextMenu } from './ContextMenu';
import { AlignmentGuides, type GuideLine } from './AlignmentGuides';

interface CanvasProps {
  registry: ComponentRegistry;
  store: EditorStoreHook;
  activeId: string | null;
}

const ALIGN_THRESHOLD = 5;

function computeGuides(canvasEl: HTMLElement, activeId: string): GuideLine[] {
  const canvasRect = canvasEl.getBoundingClientRect();
  const allElements = canvasEl.querySelectorAll('[data-component-id]');
  let activeRect: DOMRect | null = null;
  const otherRects: { id: string; rect: DOMRect }[] = [];

  allElements.forEach((el) => {
    const id = (el as HTMLElement).dataset.componentId!;
    const rect = el.getBoundingClientRect();
    if (id === activeId) {
      activeRect = rect;
    } else {
      otherRects.push({ id, rect });
    }
  });

  if (!activeRect) return [];

  const active: DOMRect = activeRect;
  const guides: GuideLine[] = [];

  const aTop = active.top - canvasRect.top;
  const aCenterY = aTop + active.height / 2;
  const aBottom = aTop + active.height;
  const aLeft = active.left - canvasRect.left;
  const aCenterX = aLeft + active.width / 2;
  const aRight = aLeft + active.width;

  for (const { rect } of otherRects) {
    const t = rect.top - canvasRect.top;
    const cy = t + rect.height / 2;
    const b = t + rect.height;
    const l = rect.left - canvasRect.left;
    const cx = l + rect.width / 2;
    const r = l + rect.width;

    if (Math.abs(aTop - t) < ALIGN_THRESHOLD) guides.push({ orientation: 'horizontal', position: t });
    if (Math.abs(aCenterY - cy) < ALIGN_THRESHOLD) guides.push({ orientation: 'horizontal', position: cy });
    if (Math.abs(aBottom - b) < ALIGN_THRESHOLD) guides.push({ orientation: 'horizontal', position: b });
    if (Math.abs(aLeft - l) < ALIGN_THRESHOLD) guides.push({ orientation: 'vertical', position: l });
    if (Math.abs(aCenterX - cx) < ALIGN_THRESHOLD) guides.push({ orientation: 'vertical', position: cx });
    if (Math.abs(aRight - r) < ALIGN_THRESHOLD) guides.push({ orientation: 'vertical', position: r });
  }

  return guides;
}

export const Canvas: React.FC<CanvasProps> = ({ registry, store, activeId }) => {
  const document = store((s) => s.document);
  const canvasScale = store((s) => s.canvasScale);
  const canvasMode = store((s) => s.canvasMode);
  const viewport = store((s) => s.viewport);
  const select = store((s) => s.select);
  const setCanvasScale = store((s) => s.setCanvasScale);

  const canvasWidth = viewport === 'mobile' ? 375 : document.canvas.width;

  const { setNodeRef, isOver } = useDroppable({ id: 'canvas-root' });

  const [isPanning, setIsPanning] = useState(false);
  const [isSpaceDown, setIsSpaceDown] = useState(false);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const panStartRef = useRef({ x: 0, y: 0 });
  const panOffsetStartRef = useRef({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const [guides, setGuides] = useState<GuideLine[]>([]);

  const isDesign = canvasMode === 'design';

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      if (!isDesign) return;
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -0.1 : 0.1;
        setCanvasScale(Math.min(3, Math.max(0.25, canvasScale + delta)));
      }
    },
    [canvasScale, setCanvasScale, isDesign],
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !(e.target as HTMLElement).closest('input, textarea, select, [contenteditable]')) {
        e.preventDefault();
        setIsSpaceDown(true);
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setIsSpaceDown(false);
        setIsPanning(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (isSpaceDown && e.button === 0) {
        e.preventDefault();
        setIsPanning(true);
        panStartRef.current = { x: e.clientX, y: e.clientY };
        panOffsetStartRef.current = { ...panOffset };
      }
    },
    [isSpaceDown, panOffset],
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (isPanning) {
        const dx = e.clientX - panStartRef.current.x;
        const dy = e.clientY - panStartRef.current.y;
        setPanOffset({
          x: panOffsetStartRef.current.x + dx,
          y: panOffsetStartRef.current.y + dy,
        });
      }
      if (activeId && containerRef.current) {
        const newGuides = computeGuides(containerRef.current, activeId);
        setGuides(newGuides);
      }
    },
    [isPanning, activeId],
  );

  const handleMouseUp = useCallback(() => {
    if (isPanning) setIsPanning(false);
  }, [isPanning]);

  const childIds = document.root.children?.map((c) => c.id) ?? [];

  useEffect(() => {
    if (!activeId) setGuides([]);
  }, [activeId]);

  const canvasContent = (
    <div
      ref={containerRef}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      style={{
        flex: 1,
        overflow: 'hidden',
        backgroundColor: '#f0f0f0',
        padding: 24,
        cursor: isDesign ? (isPanning ? 'grabbing' : isSpaceDown ? 'grab' : 'default') : 'default',
        position: 'relative',
      }}
      onClick={() => select([])}
    >
      <div
        style={{
          width: '100%',
          height: '100%',
          transform: `translate(${panOffset.x}px, ${panOffset.y}px)`,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'flex-start',
          transition: isPanning ? 'none' : 'transform 0.2s',
        }}
      >
        <div
          ref={setNodeRef}
          style={{
            width: canvasWidth,
            minHeight: 400,
            backgroundColor: document.canvas.backgroundColor || '#ffffff',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            transform: `scale(${canvasScale})`,
            transformOrigin: 'top center',
            transition: isPanning ? 'none' : 'transform 0.2s',
            outline: isDesign && isOver ? '2px dashed #1677ff' : 'none',
            outlineOffset: 2,
          }}
        >
          {isDesign ? (
            <SortableContext items={childIds} strategy={verticalListSortingStrategy}>
              <DesignRenderer instance={document.root} registry={registry} store={store} />
            </SortableContext>
          ) : (
            <RuntimeRenderer instance={document.root} registry={registry} store={store} />
          )}
        </div>
      </div>
      <div
        style={{
          position: 'absolute',
          bottom: 12,
          right: 12,
          fontSize: 12,
          color: '#666',
          backgroundColor: 'rgba(255,255,255,0.85)',
          padding: '2px 8px',
          borderRadius: 4,
          pointerEvents: 'none',
        }}
      >
        {Math.round(canvasScale * 100)}%
      </div>
      {isDesign && <AlignmentGuides guides={guides} />}
    </div>
  );

  return isDesign ? (
    <ContextMenu store={store} registry={registry}>{canvasContent}</ContextMenu>
  ) : (
    canvasContent
  );
};

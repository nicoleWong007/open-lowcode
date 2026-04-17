import { useState, useCallback, type RefObject } from 'react';
import type { EditorStoreHook } from '@open-lowcode/engine';
import type { GuideLine } from './AlignmentGuides';

const THRESHOLD = 5;

interface UseAlignmentGuidesOptions {
  canvasRef: RefObject<HTMLDivElement>;
  store: EditorStoreHook;
}

function getComponentElements(canvasEl: HTMLElement): Map<string, DOMRect> {
  const map = new Map<string, DOMRect>();
  const elements = canvasEl.querySelectorAll('[data-component-id]');
  elements.forEach((el) => {
    const id = (el as HTMLElement).dataset.componentId!;
    map.set(id, el.getBoundingClientRect());
  });
  return map;
}

export function useAlignmentGuides({ canvasRef, store }: UseAlignmentGuidesOptions) {
  const [guides, setGuides] = useState<GuideLine[]>([]);

  const computeGuides = useCallback(
    (activeId: string) => {
      const canvasEl = canvasRef.current;
      if (!canvasEl) return;

      const canvasRect = canvasEl.getBoundingClientRect();
      const allRects = getComponentElements(canvasEl);
      const activeRect = allRects.get(activeId);
      if (!activeRect) return;

      const newGuides: GuideLine[] = [];

      const aTop = activeRect.top - canvasRect.top;
      const aCenterY = aTop + activeRect.height / 2;
      const aBottom = aTop + activeRect.height;
      const aLeft = activeRect.left - canvasRect.left;
      const aCenterX = aLeft + activeRect.width / 2;
      const aRight = aLeft + activeRect.width;

      for (const [id, rect] of allRects) {
        if (id === activeId) continue;

        const t = rect.top - canvasRect.top;
        const cy = t + rect.height / 2;
        const b = t + rect.height;
        const l = rect.left - canvasRect.left;
        const cx = l + rect.width / 2;
        const r = l + rect.width;

        if (Math.abs(aTop - t) < THRESHOLD) newGuides.push({ orientation: 'horizontal', position: t });
        if (Math.abs(aCenterY - cy) < THRESHOLD) newGuides.push({ orientation: 'horizontal', position: cy });
        if (Math.abs(aBottom - b) < THRESHOLD) newGuides.push({ orientation: 'horizontal', position: b });
        if (Math.abs(aLeft - l) < THRESHOLD) newGuides.push({ orientation: 'vertical', position: l });
        if (Math.abs(aCenterX - cx) < THRESHOLD) newGuides.push({ orientation: 'vertical', position: cx });
        if (Math.abs(aRight - r) < THRESHOLD) newGuides.push({ orientation: 'vertical', position: r });
      }

      setGuides(newGuides);
    },
    [canvasRef],
  );

  const clearGuides = useCallback(() => setGuides([]), []);

  return { guides, computeGuides, clearGuides };
}

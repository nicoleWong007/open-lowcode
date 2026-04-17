import { useEffect, useRef } from 'react';
import type { EditorStoreHook } from '@open-lowcode/engine';

const STORAGE_KEY = 'open-lowcode-document';
const AUTO_SAVE_INTERVAL = 5000;

export function useAutoSave(store: EditorStoreHook): void {
  const document = store((s) => s.document);
  const canvasMode = store((s) => s.canvasMode);
  const lastSavedRef = useRef<string>('');

  useEffect(() => {
    if (canvasMode !== 'design') return;

    const timer = setInterval(() => {
      const serialized = JSON.stringify(document);
      if (serialized !== lastSavedRef.current) {
        try {
          localStorage.setItem(STORAGE_KEY, serialized);
          lastSavedRef.current = serialized;
        } catch {
          // localStorage quota exceeded — silently ignore
        }
      }
    }, AUTO_SAVE_INTERVAL);

    return () => clearInterval(timer);
  }, [document, canvasMode]);
}

export function loadFromLocalStorage(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function saveToLocalStorage(json: string): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, json);
    return true;
  } catch {
    return false;
  }
}

export function clearLocalStorage(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // localStorage unavailable (e.g. private browsing restrictions)
  }
}

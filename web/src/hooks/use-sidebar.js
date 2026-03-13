import { useState, useCallback } from 'react';

const STORAGE_KEY = 'default_collapse_sidebar';

function getInitialValue() {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

export function useSidebar() {
  const [collapsed, _setCollapsed] = useState(getInitialValue);

  const toggle = useCallback(() => {
    _setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_KEY, String(next));
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  const setCollapsed = useCallback((value) => {
    _setCollapsed(value);
    try {
      localStorage.setItem(STORAGE_KEY, String(value));
    } catch {
      // ignore
    }
  }, []);

  return [collapsed, toggle, setCollapsed];
}

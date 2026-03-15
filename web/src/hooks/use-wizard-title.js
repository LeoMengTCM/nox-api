import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'pet-wizard-title';
const WIZARD_CHANGE_EVENT = 'wizard-title-change';

/**
 * Hook to manage wizard/witch title preference.
 * Stores choice in localStorage and syncs across components via a custom event.
 *
 * Returns:
 *  - title: 'wizard' | 'witch'
 *  - setTitle: (value) => void
 *  - wizardLabel: translated label for current title (use with t())
 *  - titleKey: i18n key — '巫师' or '女巫'
 */
export function useWizardTitle() {
  const [title, setTitleState] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) || 'wizard';
    } catch {
      return 'wizard';
    }
  });

  const setTitle = useCallback((value) => {
    const v = value === 'witch' ? 'witch' : 'wizard';
    setTitleState(v);
    try {
      localStorage.setItem(STORAGE_KEY, v);
    } catch {}
    window.dispatchEvent(new CustomEvent(WIZARD_CHANGE_EVENT, { detail: v }));
  }, []);

  // Sync across components / tabs
  useEffect(() => {
    const handler = (e) => {
      if (e.detail) setTitleState(e.detail);
    };
    window.addEventListener(WIZARD_CHANGE_EVENT, handler);
    return () => window.removeEventListener(WIZARD_CHANGE_EVENT, handler);
  }, []);

  const titleKey = title === 'witch' ? '女巫' : '巫师';

  return { title, setTitle, titleKey };
}

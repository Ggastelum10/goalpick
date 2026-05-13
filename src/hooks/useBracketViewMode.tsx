import { useState, useEffect } from 'react';

export type BracketViewMode = 'group' | 'bracket';

const BRACKET_VIEW_MODE_KEY = 'bracket-view-mode';

export function useBracketViewMode() {
  const [bracketViewMode, setBracketViewModeState] = useState<BracketViewMode>(() => {
    const saved = localStorage.getItem(BRACKET_VIEW_MODE_KEY) as BracketViewMode | null;
    if (saved === 'group' || saved === 'bracket') {
      return saved;
    }
    return 'group'; // Default to 'group'
  });

  useEffect(() => {
    localStorage.setItem(BRACKET_VIEW_MODE_KEY, bracketViewMode);
  }, [bracketViewMode]);

  return { bracketViewMode, setBracketViewMode: setBracketViewModeState };
}

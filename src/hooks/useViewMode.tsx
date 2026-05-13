import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useIsAdmin } from '@/hooks/useProfile';

type ViewMode = 'admin' | 'user';

interface ViewModeContextType {
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  isAdminViewActive: boolean;
  toggleViewMode: () => void;
}

const ViewModeContext = createContext<ViewModeContextType | undefined>(undefined);

const VIEW_MODE_KEY = 'admin-view-mode';

export function ViewModeProvider({ children }: { children: ReactNode }) {
  const { data: isAdmin } = useIsAdmin();
  const [viewMode, setViewModeState] = useState<ViewMode>('user');

  // Load from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(VIEW_MODE_KEY) as ViewMode | null;
    if (stored && isAdmin) {
      setViewModeState(stored);
    }
  }, [isAdmin]);

  const setViewMode = (mode: ViewMode) => {
    setViewModeState(mode);
    localStorage.setItem(VIEW_MODE_KEY, mode);
  };

  const toggleViewMode = () => {
    const newMode = viewMode === 'admin' ? 'user' : 'admin';
    setViewMode(newMode);
  };

  // Only admins can have admin view
  const effectiveViewMode = isAdmin ? viewMode : 'user';
  const isAdminViewActive = effectiveViewMode === 'admin' && !!isAdmin;

  return (
    <ViewModeContext.Provider value={{ 
      viewMode: effectiveViewMode, 
      setViewMode, 
      isAdminViewActive,
      toggleViewMode 
    }}>
      {children}
    </ViewModeContext.Provider>
  );
}

export function useViewMode() {
  const context = useContext(ViewModeContext);
  if (context === undefined) {
    throw new Error('useViewMode must be used within a ViewModeProvider');
  }
  return context;
}

import React, { createContext, useContext, useReducer, useCallback, useEffect } from 'react';
import type { InitData, SectionId, SectionData } from '../types';

interface Toast {
  id: number;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
}

interface AppState {
  init: InitData | null;
  sectionId: SectionId | '';
  sectionData: SectionData | null;
  sectionLoading: boolean;
  sidebarCollapsed: boolean;
  mobileOpen: boolean;
  globalError: string;
  toasts: Toast[];
  authValid: boolean;
}

type Action =
  | { type: 'SET_INIT'; payload: InitData }
  | { type: 'SET_SECTION'; payload: SectionId }
  | { type: 'SET_SECTION_DATA'; payload: SectionData | null }
  | { type: 'SET_SECTION_LOADING'; payload: boolean }
  | { type: 'TOGGLE_SIDEBAR' }
  | { type: 'TOGGLE_MOBILE' }
  | { type: 'CLOSE_MOBILE' }
  | { type: 'SET_ERROR'; payload: string }
  | { type: 'PUSH_TOAST'; payload: Toast }
  | { type: 'POP_TOAST'; payload: number }
  | { type: 'SET_AUTH_INVALID' }
  | { type: 'PATCH_SECTION_DATA'; payload: Partial<SectionData> };

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'SET_INIT':
      return { ...state, init: action.payload, authValid: !action.payload.denied };
    case 'SET_SECTION':
      return { ...state, sectionId: action.payload, sectionData: null, globalError: '' };
    case 'SET_SECTION_DATA':
      return { ...state, sectionData: action.payload };
    case 'SET_SECTION_LOADING':
      return { ...state, sectionLoading: action.payload };
    case 'TOGGLE_SIDEBAR':
      return { ...state, sidebarCollapsed: !state.sidebarCollapsed };
    case 'TOGGLE_MOBILE':
      return { ...state, mobileOpen: !state.mobileOpen };
    case 'CLOSE_MOBILE':
      return { ...state, mobileOpen: false };
    case 'SET_ERROR':
      return { ...state, globalError: action.payload };
    case 'PUSH_TOAST':
      return { ...state, toasts: [...state.toasts, action.payload] };
    case 'POP_TOAST':
      return { ...state, toasts: state.toasts.filter(t => t.id !== action.payload) };
    case 'SET_AUTH_INVALID':
      return { ...state, authValid: false };
    case 'PATCH_SECTION_DATA':
      return { ...state, sectionData: state.sectionData ? { ...state.sectionData, ...action.payload } : action.payload as SectionData };
    default:
      return state;
  }
}

const initialState: AppState = {
  init: null,
  sectionId: '',
  sectionData: null,
  sectionLoading: false,
  sidebarCollapsed: false,
  mobileOpen: false,
  globalError: '',
  toasts: [],
  authValid: false,
};

interface AppContextValue {
  state: AppState;
  dispatch: React.Dispatch<Action>;
  toast: (message: string, type?: Toast['type']) => void;
  currentLabel: () => string;
}

const AppContext = createContext<AppContextValue | null>(null);

let _toastCounter = 0;

export function AppProvider({ children, initData }: { children: React.ReactNode; initData: InitData }) {
  const [state, dispatch] = useReducer(reducer, { ...initialState, init: initData, authValid: !initData.denied });

  const toast = useCallback((message: string, type: Toast['type'] = 'info') => {
    const id = ++_toastCounter;
    dispatch({ type: 'PUSH_TOAST', payload: { id, type, message } });
    setTimeout(() => dispatch({ type: 'POP_TOAST', payload: id }), 4000);
  }, []);

  const currentLabel = useCallback((): string => {
    if (!state.sectionId || !state.init?.sections) return 'Operations Intelligence';
    return state.init.sections.find(s => s.id === state.sectionId)?.label ?? 'Operations Intelligence';
  }, [state.sectionId, state.init]);

  useEffect(() => {
    const interval = setInterval(async () => {
      if (!window.__OI__?.serverCall) return;
      try {
        const res = await window.__OI__.serverCall({ action: 'check_auth' });
        if (res.data?.denied) dispatch({ type: 'SET_AUTH_INVALID' });
      } catch { /* network blip — stay put */ }
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <AppContext.Provider value={{ state, dispatch, toast, currentLabel }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be inside AppProvider');
  return ctx;
}

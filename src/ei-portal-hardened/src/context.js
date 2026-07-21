import React from 'react';

export const initialState = {
  section: 'workspace',
  sectionData: null,
  loading: true,
  mobileOpen: false,
  showRequests: false,
  error: null,
  toasts: [],
  authDenied: false,
  initData: null,
  assistantSeed: null,
};

export function reducer(state, action) {
  switch (action.type) {
    case 'SET_INIT':
      return { ...state, initData: action.payload, loading: false };
    case 'SET_SECTION':
      return { ...state, section: action.payload, sectionData: null, error: null, mobileOpen: false };
    case 'SET_SECTION_DATA':
      return { ...state, sectionData: action.payload, loading: false };
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'TOGGLE_MOBILE':
      return { ...state, mobileOpen: !state.mobileOpen };
    case 'CLOSE_MOBILE':
      return { ...state, mobileOpen: false };
    case 'SET_ERROR':
      return { ...state, error: action.payload, loading: false };
    case 'PUSH_TOAST':
      return { ...state, toasts: [...state.toasts, action.payload] };
    case 'POP_TOAST':
      return { ...state, toasts: state.toasts.filter(t => t.id !== action.payload) };
    case 'PATCH_SECTION_DATA':
      return { ...state, sectionData: { ...state.sectionData, ...action.payload } };
    case 'SET_AUTH_DENIED':
      return { ...state, authDenied: action.payload, loading: false };
    case 'SET_ASSISTANT_SEED':
      return { ...state, assistantSeed: action.payload };
    case 'CLEAR_ASSISTANT_SEED':
      return { ...state, assistantSeed: null };
    case 'TOGGLE_REQUESTS':
      return { ...state, showRequests: !state.showRequests };
    case 'CLOSE_REQUESTS':
      return { ...state, showRequests: false };
    default:
      return state;
  }
}

export const AppContext = React.createContext(null);

export function useApp() {
  return React.useContext(AppContext);
}

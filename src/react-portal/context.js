import { createContext, useContext } from 'react';

export const AppContext = createContext(null);

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
};

export const initialState = {
  mod:         'operations',
  govTab:      'pending',
  devTab:      'tables',
  searchTerm:  '',
  chatOpen:    true,
  sidebarOpen: true,
  chatInput:   '',
  chatHistory: {},
  selectedItem: null,
};

export function reducer(state, action) {
  switch (action.type) {
    case 'SET_MOD':
      return { ...state, mod: action.payload, selectedItem: null, searchTerm: '' };
    case 'SET_GOV_TAB':
      return { ...state, govTab: action.payload };
    case 'SET_DEV_TAB':
      return { ...state, devTab: action.payload };
    case 'SET_SEARCH':
      return { ...state, searchTerm: action.payload };
    case 'TOGGLE_CHAT':
      return { ...state, chatOpen: !state.chatOpen };
    case 'TOGGLE_SIDEBAR':
      return { ...state, sidebarOpen: !state.sidebarOpen };
    case 'SET_CHAT_INPUT':
      return { ...state, chatInput: action.payload };
    case 'SEND_CHAT': {
      const { mod, q, r } = action.payload;
      const existing = state.chatHistory[mod] || [];
      return {
        ...state,
        chatInput: '',
        chatHistory: {
          ...state.chatHistory,
          [mod]: [...existing, { role: 'user', text: q }, { role: 'assistant', text: r }],
        },
      };
    }
    case 'SELECT_ITEM':
      return { ...state, selectedItem: action.payload };
    default:
      return state;
  }
}

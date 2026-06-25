import React, { useReducer, useCallback, useTransition, useMemo } from 'react';
import { AppContext, initialState, reducer } from './context.js';
import Sidebar from './components/Sidebar.jsx';
import Header from './components/Header.jsx';
import ChatPanel from './components/ChatPanel.jsx';
import Operations from './components/modules/Operations.jsx';
import Automations from './components/modules/Automations.jsx';
import Agentic from './components/modules/Agentic.jsx';
import Creator from './components/modules/Creator.jsx';
import Governance from './components/modules/Governance.jsx';
import Leadership from './components/modules/Leadership.jsx';
import Developer from './components/modules/Developer.jsx';
import Admin from './components/modules/Admin.jsx';

const MODULE_MAP = {
  operations:  Operations,
  automations: Automations,
  agentic:     Agentic,
  creator:     Creator,
  governance:  Governance,
  leadership:  Leadership,
  developer:   Developer,
  admin:       Admin,
};

function App({ initialData }) {
  const [state, rawDispatch] = useReducer(reducer, {
    ...initialState,
    ...(initialData || {}),
  });

  const [isPending, startTransition] = useTransition();

  const dispatch = useCallback((action) => {
    if (action.type === 'SET_MOD') {
      startTransition(() => rawDispatch(action));
    } else {
      rawDispatch(action);
    }
  }, []);

  const ctx = useMemo(() => ({ state, dispatch }), [state, dispatch]);
  const ActiveModule = MODULE_MAP[state.mod] || Operations;

  return (
    <AppContext.Provider value={ctx}>
      {isPending && <div className="loading-bar" />}
      <div className="shell">
        <Sidebar />
        <div className="main">
          <Header />
          <div className="content-wrap">
            <div className="content">
              <ActiveModule />
            </div>
            <ChatPanel />
          </div>
        </div>
      </div>
    </AppContext.Provider>
  );
}

export default App;

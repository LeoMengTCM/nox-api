import React, { useContext } from 'react';

const initialState = {
  status: undefined,
};

function reducer(state, action) {
  switch (action.type) {
    case 'set':
      return { ...state, status: action.payload };
    case 'unset':
      return { ...state, status: undefined };
    default:
      return state;
  }
}

export const StatusContext = React.createContext({
  state: initialState,
  dispatch: () => null,
});

export function StatusProvider({ children }) {
  const [state, dispatch] = React.useReducer(reducer, initialState);

  return (
    <StatusContext.Provider value={[state, dispatch]}>
      {children}
    </StatusContext.Provider>
  );
}

export function useStatus() {
  const ctx = useContext(StatusContext);
  if (!ctx) {
    throw new Error('useStatus must be used within a StatusProvider');
  }
  return ctx;
}

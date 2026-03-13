import React, { useContext } from 'react';

const initialState = {
  user: undefined,
};

function reducer(state, action) {
  switch (action.type) {
    case 'login':
      return { ...state, user: action.payload };
    case 'logout':
      return { ...state, user: undefined };
    default:
      return state;
  }
}

export const UserContext = React.createContext({
  state: initialState,
  dispatch: () => null,
});

export function UserProvider({ children }) {
  const [state, dispatch] = React.useReducer(reducer, initialState);

  return (
    <UserContext.Provider value={[state, dispatch]}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const ctx = useContext(UserContext);
  if (!ctx) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return ctx;
}

'use client';
import { createContext, useContext, useState } from 'react';

// 1. Crear contexto
const AppContext = createContext();

// 2. Crear Provider
export function AppProvider({ children }) {
  const [usuario, setUsuario] = useState(null);
  const [isAuth, setIsAuth] = useState(false);

  return <AppContext.Provider value={{ usuario, setUsuario, isAuth, setIsAuth }}>{children}</AppContext.Provider>;
}

// 3. Hook para consumir contexto
export function useAppContext() {
  return useContext(AppContext);
}

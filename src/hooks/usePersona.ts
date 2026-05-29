import { useApp } from '../context/AppContext';

export function usePersona() {
  const { currentUser, setCurrentUser, users } = useApp();
  return { currentUser, personas: users, setPersona: setCurrentUser };
}

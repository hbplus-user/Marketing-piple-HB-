import { useApp } from '../context/AppContext';
import { USERS } from '../data/mockData';

export function usePersona() {
  const { currentUser, setCurrentUser } = useApp();
  return { currentUser, personas: USERS, setPersona: setCurrentUser };
}

import { useAuthContext } from '../context/AuthContext';

/**
 * Custom hook providing authentication state, login, logout, sign up,
 * and profile management capabilities.
 * 
 * @returns {useAuthContext} Current AuthContext containing authentication status and methods.
 */
export function useAuth() {
  return useAuthContext();
}

import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';

export type UserRole = 'ADMIN' | 'LAB_INCHARGE' | 'STUDENT';

export interface AuthUser {
  id:          string;
  name:        string;
  email:       string;
  role:        UserRole;
  rollNo?:     string;
  batch?:      string;
  department?: string;
  rfidTag?:    string;
  employeeId?: string;
}

interface AuthContextType {
  user:          AuthUser | null;
  token:         string | null;
  loading:       boolean;
  isAdmin:       boolean;
  isLabIncharge: boolean;
  isStudent:     boolean;
  login:         (token: string, user: AuthUser) => void;
  logout:        () => void;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

function getStoredAuth(): { token: string | null; user: AuthUser | null } {
  try {
    const token = localStorage.getItem('token');
    const raw   = localStorage.getItem('user');
    const user  = raw ? (JSON.parse(raw) as AuthUser) : null;
    return { token, user };
  } catch {
    return { token: null, user: null };
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const stored = getStoredAuth();

  const [user,    setUser]    = useState<AuthUser | null>(stored.user);
  const [token,   setToken]   = useState<string | null>(stored.token);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(false);
  }, []);

  const login = (newToken: string, newUser: AuthUser) => {
    localStorage.setItem('token', newToken);
    localStorage.setItem('user',  JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        logout,
        isAdmin:       user?.role === 'ADMIN',
        isLabIncharge: user?.role === 'LAB_INCHARGE',
        isStudent:     user?.role === 'STUDENT',
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  return useContext(AuthContext);
}
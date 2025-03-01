import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { createContext, useContext, ReactNode } from "react";

interface User {
  id: number;
  username: string;
  email?: string;
  role: 'user' | 'admin' | 'superadmin';
  service_order?: number[];
}

interface AuthContextType {
  user: User | undefined;
  isLoading: boolean;
  logoutMutation: {
    mutate: () => void;
    isPending: boolean;
  };
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [, setLocation] = useLocation();

  const { data: user, isLoading } = useQuery<User>({
    queryKey: ['/api/auth/user'],
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Logout failed');
      return response.json();
    },
    onSuccess: () => {
      setLocation('/auth');
    },
  });

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        logoutMutation: {
          mutate: logoutMutation.mutate,
          isPending: logoutMutation.isLoading,
        },
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
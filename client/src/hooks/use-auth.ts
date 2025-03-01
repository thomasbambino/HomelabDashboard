import * as React from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";

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

const AuthContext = React.createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
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

  const value = {
    user,
    isLoading,
    logoutMutation: {
      mutate: () => logoutMutation.mutate(),
      isPending: logoutMutation.isPending ?? false,
    },
  };

  return React.createElement(AuthContext.Provider, { value }, children);
}

export function useAuth(): AuthContextType {
  const context = React.useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
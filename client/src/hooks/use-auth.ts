import * as React from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface User {
  id: number;
  username: string;
  email?: string;
  role: 'user' | 'admin' | 'superadmin';
  service_order?: number[];
}

interface LoginData {
  username: string;
  password: string;
}

interface RegisterData {
  username: string;
  password: string;
  email?: string;
}

interface AuthContextType {
  user: User | undefined;
  isLoading: boolean;
  loginMutation: {
    mutate: (data: LoginData) => void;
    isPending: boolean;
  };
  registerMutation: {
    mutate: (data: RegisterData) => void;
    isPending: boolean;
  };
  logoutMutation: {
    mutate: () => void;
    isPending: boolean;
  };
}

const AuthContext = React.createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [, setLocation] = useLocation();

  const { data: user, isLoading } = useQuery<User>({
    queryKey: ['/api/user'],
    retry: false,
  });

  const loginMutation = useMutation({
    mutationFn: async (data: LoginData) => {
      const result = await apiRequest<User>("POST", "/api/login", data);
      queryClient.setQueryData(['/api/user'], result);
      return result;
    },
    onSuccess: () => {
      setLocation('/');
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (data: RegisterData) => {
      const result = await apiRequest<User>("POST", "/api/register", data);
      queryClient.setQueryData(['/api/user'], result);
      return result;
    },
    onSuccess: () => {
      setLocation('/');
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/logout");
      queryClient.setQueryData(['/api/user'], null);
    },
    onSuccess: () => {
      setLocation('/auth');
    },
  });

  const value = {
    user,
    isLoading,
    loginMutation: {
      mutate: (data: LoginData) => loginMutation.mutate(data),
      isPending: loginMutation.isPending ?? false,
    },
    registerMutation: {
      mutate: (data: RegisterData) => registerMutation.mutate(data),
      isPending: registerMutation.isPending ?? false,
    },
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
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";

interface User {
  id: number;
  username: string;
  email?: string;
  role: 'user' | 'admin' | 'superadmin';
  service_order?: number[];
}

export function useAuth() {
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

  return {
    user,
    isLoading,
    logoutMutation,
  };
}

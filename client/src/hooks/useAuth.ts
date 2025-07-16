import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { User, LoginData } from "@shared/schema";

export function useAuth() {
  const queryClient = useQueryClient();

  const { data: user, isLoading } = useQuery<User | null>({
    queryKey: ["/api/auth/user"],
    queryFn: async () => {
      try {
        const response = await fetch("/api/auth/user");
        if (response.status === 401) {
          return null;
        }
        return response.json();
      } catch (error) {
        return null;
      }
    },
    retry: false,
  });

  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginData) => {
      const response = await apiRequest("POST", "/api/login", credentials);
      return response.json();
    },
    onSuccess: (user: User) => {
      queryClient.setQueryData(["/api/auth/user"], user);
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/logout");
    },
    onSuccess: () => {
      queryClient.setQueryData(["/api/auth/user"], null);
    },
  });

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    loginMutation,
    logoutMutation,
  };
}
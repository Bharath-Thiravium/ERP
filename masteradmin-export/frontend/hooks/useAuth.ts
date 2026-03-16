import { useAuthStore } from '../store/authStore';

export const useAuth = () => {
  const { user, isAuthenticated, isLoading } = useAuthStore();
  
  return {
    user,
    isAuthenticated,
    loading: isLoading,
    login: () => {}, // Placeholder - actual login handled by authStore
    logout: () => {}, // Placeholder - actual logout handled by authStore
  };
};
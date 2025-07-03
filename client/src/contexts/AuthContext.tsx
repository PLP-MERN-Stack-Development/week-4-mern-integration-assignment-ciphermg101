import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import apiClient from '@/lib/axios';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  isEmailVerified: boolean;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  // Check if user is authenticated on initial load
  const checkAuth = useCallback(async () => {
    try {
      const { data } = await apiClient.get('/auth/me');
      setUser(data.user);
    } catch (error) {
      // If unauthorized, try to refresh token
      if ((error as any)?.response?.status === 401) {
        const refreshed = await refreshToken();
        if (!refreshed) {
          // If refresh fails, clear auth state
          setUser(null);
        }
      } else {
        console.error('Auth check failed:', error);
        setUser(null);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Check auth status on mount and when location changes
  useEffect(() => {
    checkAuth();
  }, [checkAuth, location.pathname]);

  // Handle token refresh
  const refreshToken = useCallback(async (): Promise<boolean> => {
    try {
      const response = await apiClient.post('/auth/refresh-token');
      const { user: userData } = response.data;
      
      // Update user data
      setUser(userData);
      return true;
    } catch (error) {
      console.error('Failed to refresh token:', error);
      // Clear auth state on refresh failure
      setUser(null);
      return false;
    }
  }, []);

  const login = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      const { data } = await apiClient.post('/auth/login', { email, password });
      
      // User data is returned from login response
      setUser(data.user);
      
      // Redirect to home or previous location
      const from = location.state?.from?.pathname || '/';
      navigate(from, { replace: true });
      
      toast.success('Logged in successfully');
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Login failed';
      toast.error(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (name: string, email: string, password: string) => {
    try {
      setIsLoading(true);
      await apiClient.post('/auth/register', { name, email, password });
      
      toast.success('Registration successful! Please check your email to verify your account.');
      navigate('/login');
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Registration failed';
      toast.error(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await apiClient.post('/auth/logout');
    } catch (error) {
      console.error('Error during logout:', error);
    } finally {
      // Clear user data regardless of API call success
      setUser(null);
      
      // Redirect to login page
      navigate('/login', { replace: true });
      
      // Show success message
      toast.success('Logged out successfully');
    }
  };

  // Add response interceptor to handle 401 errors
  useEffect(() => {
    const responseInterceptor = apiClient.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;
        
        // If error is not 401 or it's a retry request, reject with error
        if (error.response?.status !== 401 || originalRequest._retry) {
          return Promise.reject(error);
        }
        
        // Mark request as retried
        originalRequest._retry = true;
        
        try {
          // Try to refresh token
          const refreshed = await refreshToken();
          if (refreshed) {
            // Retry the original request with new token
            return apiClient(originalRequest);
          }
        } catch (refreshError) {
          // If refresh fails, logout the user
          await logout();
        }
        
        return Promise.reject(error);
      }
    );
    
    // Cleanup interceptor on unmount
    return () => {
      apiClient.interceptors.response.eject(responseInterceptor);
    };
  }, [refreshToken, logout]);

  const value = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    register,
    logout,
    refreshToken,
  };

  return (
    <AuthContext.Provider value={value}>
      {!isLoading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

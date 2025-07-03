import axios, { AxiosInstance, AxiosResponse, AxiosError, InternalAxiosRequestConfig } from 'axios';

// Create a new Axios instance
const apiClient: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  withCredentials: true, // Required for cookies
  timeout: 10000, // 10 seconds
});

// Request interceptor
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // You can add auth headers here if needed
    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

// Response interceptor
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    // Return the data property from the response
    return response.data;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
    
    // Handle 401 Unauthorized responses
    if (error.response?.status === 401 && !originalRequest._retry) {
      // Don't retry refresh token or logout requests
      if (originalRequest.url?.includes('/auth/')) {
        return Promise.reject(error);
      }
      
      try {
        // Try to refresh the token
        originalRequest._retry = true;
        await apiClient.post('/auth/refresh-token');
        
        // Retry the original request
        return apiClient(originalRequest);
      } catch (refreshError) {
        // If refresh fails, redirect to login
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
        return Promise.reject(refreshError);
      }
    }
    
    // Handle other errors
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      const errorData = (error.response.data as any)?.message || error.message;
      console.error('API Error:', {
        status: error.response.status,
        url: error.config?.url,
        error: errorData,
      });
      
      return Promise.reject({
        status: error.response.status,
        message: errorData,
        data: error.response.data,
      });
    } else if (error.request) {
      // The request was made but no response was received
      console.error('No response from server:', error.request);
      return Promise.reject({
        status: 0,
        message: 'No response from server',
        data: null,
      });
    } else {
      // Something happened in setting up the request that triggered an Error
      console.error('Request setup error:', error.message);
      return Promise.reject({
        status: 0,
        message: error.message,
        data: null,
      });
    }
  }
);

// Helper function to handle API errors in components
export const handleApiError = (error: any, defaultMessage = 'An error occurred') => {
  if (error.response?.data?.message) {
    return error.response.data.message;
  } else if (error.message) {
    return error.message;
  }
  return defaultMessage;
};

export default apiClient;

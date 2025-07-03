import { toast } from 'sonner';

export class ApiError extends Error {
  status: number;
  data: any;

  constructor(message: string, status: number, data?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
    
    // Maintain proper stack trace for where our error was thrown
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ApiError);
    }
  }

  static fromError(error: any): ApiError {
    if (error instanceof ApiError) return error;
    
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      const { data, status } = error.response;
      return new ApiError(
        data?.message || error.message || 'An unknown error occurred',
        status,
        data
      );
    } else if (error.request) {
      // The request was made but no response was received
      return new ApiError('No response from server', 0);
    } else {
      // Something happened in setting up the request that triggered an Error
      return new ApiError(error.message || 'An error occurred', 0);
    }
  }
}

export const handleApiError = (error: any, defaultMessage = 'An error occurred') => {
  const apiError = ApiError.fromError(error);
  console.error('API Error:', apiError);
  
  // Show error toast with user-friendly message
  toast.error(apiError.message || defaultMessage, {
    duration: 5000,
    position: 'top-center',
  });
  
  // You can add more sophisticated error handling here
  // For example, redirect to login on 401 errors
  if (apiError.status === 401) {
    // Handle unauthorized (e.g., redirect to login)
    // router.navigate('/login');
  }
  
  return apiError;
};

export const handleSuccess = (message: string) => {
  toast.success(message, {
    duration: 3000,
    position: 'top-center',
  });
};

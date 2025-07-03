import { AxiosResponse } from 'axios';

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
  status?: number;
  timestamp?: string;
}

export const createApiResponse = <T>(
  data: T,
  options: {
    success?: boolean;
    message?: string;
    error?: string;
    status?: number;
  } = {}
): ApiResponse<T> => {
  return {
    success: options.success ?? true,
    data,
    message: options.message,
    error: options.error,
    status: options.status,
    timestamp: new Date().toISOString(),
  };
};

export const handleApiResponse = <T>(response: AxiosResponse<ApiResponse<T>>): T => {
  const { data } = response;
  
  if (!data.success) {
    const error = new Error(data.error || 'Request failed');
    (error as any).status = response.status;
    throw error;
  }
  
  return data.data;
};

export const createErrorResponse = (error: any): ApiResponse<null> => {
  console.error('API Error:', error);
  
  if (error.response) {
    const { data, status } = error.response;
    return {
      success: false,
      data: null,
      error: data?.error || 'An error occurred',
      message: data?.message,
      status,
      timestamp: new Date().toISOString(),
    };
  } else if (error.request) {
    return {
      success: false,
      data: null,
      error: 'No response from server',
      status: 0,
      timestamp: new Date().toISOString(),
    };
  } else {
    return {
      success: false,
      data: null,
      error: error.message || 'An unknown error occurred',
      status: 0,
      timestamp: new Date().toISOString(),
    };
  }
};

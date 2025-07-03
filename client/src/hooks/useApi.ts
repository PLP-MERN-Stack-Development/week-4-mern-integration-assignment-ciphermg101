import { useState, useCallback, useRef, useEffect } from 'react';
import { AxiosRequestConfig } from 'axios';
import apiClient from '@/lib/axios';
import { handleApiError, ApiError } from '@/lib/api-error';

type HttpMethod = 'get' | 'post' | 'put' | 'patch' | 'delete';

interface UseApiOptions<T> {
  onSuccess?: (data: T) => void;
  onError?: (error: ApiError) => void;
  initialData?: T;
  enabled?: boolean;
  autoFetch?: boolean;
  autoFetchDeps?: any[];
}

export function useApi<T = any>(
  url: string,
  method: HttpMethod = 'get',
  options: UseApiOptions<T> = {}
) {
  const {
    onSuccess,
    onError,
    initialData = null,
    enabled = true,
    autoFetch = method === 'get',
    autoFetchDeps = [],
  } = options;

  const [data, setData] = useState<T | null>(initialData);
  const [error, setError] = useState<ApiError | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>(
    initialData !== undefined && initialData !== null ? 'success' : 'idle'
  );

  const abortControllerRef = useRef<AbortController | null>(null);

  const execute = useCallback(
    async (body?: any, config: Omit<AxiosRequestConfig, 'method' | 'url' | 'data'> = {}) => {
      // Cancel previous request if it exists
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      // Create new AbortController for this request
      abortControllerRef.current = new AbortController();

      setIsLoading(true);
      setIsError(false);
      setStatus('loading');

      try {
        let response;
        const requestConfig: AxiosRequestConfig = {
          ...config,
          signal: abortControllerRef.current.signal,
        };

        switch (method.toLowerCase()) {
          case 'post':
          case 'put':
          case 'patch':
            response = await apiClient[method]<T>(url, body, requestConfig);
            break;
          case 'delete':
            response = await apiClient.delete<T>(url, {
              ...requestConfig,
              data: body, // For DELETE requests, data goes in the config
            });
            break;
          default: // get
            response = await apiClient.get<T>(url, {
              ...requestConfig,
              params: body, // For GET requests, data is passed as params
            });
        }

        setData(response.data);
        setIsSuccess(true);
        setStatus('success');
        onSuccess?.(response.data);
        return response.data;
      } catch (error: any) {
        // Ignore aborted requests
        if (error.name === 'AbortError' || error.code === 'ERR_CANCELED') {
          return;
        }

        const apiError = handleApiError(error);
        setError(apiError);
        setIsError(true);
        setStatus('error');
        onError?.(apiError);
        throw apiError;
      } finally {
        setIsLoading(false);
        abortControllerRef.current = null;
      }
    },
    [url, method, onSuccess, onError]
  );

  // Auto-fetch when component mounts if enabled
  useEffect(() => {
    if (enabled && autoFetch) {
      execute();
    }

    // Cleanup function to abort any pending requests
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [enabled, execute, autoFetch, ...autoFetchDeps]);

  // Function to manually trigger the request
  const refetch = useCallback(
    (body?: any, config?: Omit<AxiosRequestConfig, 'method' | 'url' | 'data'>) => {
      return execute(body, config);
    },
    [execute]
  );

  return {
    data,
    error,
    isLoading,
    isError,
    isSuccess,
    status,
    execute: refetch,
    refetch,
    setData, // Allow manual data updates
  };
}

// Helper hooks for common methods
export function useGet<T = any>(
  url: string,
  options?: Omit<UseApiOptions<T>, 'initialData'> & { params?: any }
) {
  const { params, ...restOptions } = options || {};
  const result = useApi<T>(url, 'get', restOptions);
  
  // Auto-fetch with params if provided
  useEffect(() => {
    if (params) {
      result.execute(params);
    }
  }, [JSON.stringify(params)]); // Deep comparison for params
  
  return result;
}

export function usePost<R = any>(
  url: string,
  options?: Omit<UseApiOptions<R>, 'initialData'>
) {
  return useApi<R>(url, 'post', options);
}

export function usePut<R = any>(
  url: string,
  options?: Omit<UseApiOptions<R>, 'initialData'>
) {
  return useApi<R>(url, 'put', options);
}

export function usePatch<R = any>(
  url: string,
  options?: Omit<UseApiOptions<R>, 'initialData'>
) {
  return useApi<R>(url, 'patch', options);
}

export function useDelete<T = any>(
  url: string,
  options?: Omit<UseApiOptions<T>, 'initialData'>
) {
  return useApi<T>(url, 'delete', options);
}

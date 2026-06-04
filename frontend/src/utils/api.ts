/**
 * API Configuration
 * Uses VITE_API_URL environment variable for backend communication
 * Automatically defaults to localhost for development
 */

// Determine the API base URL from environment or use relative path
const getApiBaseUrl = (): string => {
  const envUrl = import.meta.env.VITE_API_URL as string | undefined;
  
  // If VITE_API_URL is set, use it (supports both relative and absolute URLs)
  if (envUrl) {
    return envUrl.replace(/\/$/, ''); // Remove trailing slash
  }
  
  // Default to relative path for development
  return '/api';
};

export const API_BASE_URL = getApiBaseUrl();

// Create a fetch wrapper for API calls
export const apiCall = async (
  endpoint: string,
  options?: RequestInit
): Promise<Response> => {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const defaultOptions: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include', // Include cookies for authentication
  };

  const mergedOptions = {
    ...defaultOptions,
    ...options,
    headers: {
      ...defaultOptions.headers,
      ...(options?.headers as Record<string, string>),
    },
  };

  const response = await fetch(url, mergedOptions);
  
  if (!response.ok) {
    throw new Error(`API request failed: ${response.status} ${response.statusText}`);
  }
  
  return response;
};

// Convenience methods
export const apiGet = (endpoint: string) => 
  apiCall(endpoint, { method: 'GET' });

export const apiPost = (endpoint: string, data?: any) =>
  apiCall(endpoint, {
    method: 'POST',
    body: data ? JSON.stringify(data) : undefined,
  });

export const apiPut = (endpoint: string, data?: any) =>
  apiCall(endpoint, {
    method: 'PUT',
    body: data ? JSON.stringify(data) : undefined,
  });

export const apiDelete = (endpoint: string) =>
  apiCall(endpoint, { method: 'DELETE' });

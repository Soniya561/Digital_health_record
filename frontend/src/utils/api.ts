/**
 * API Configuration
 * Automatically uses the correct backend URL based on the environment
 */

// Determine the API base URL
const getApiBaseUrl = (): string => {
  // In development, use the network IP if available
  if (import.meta.env.MODE === 'development') {
    // Get the current hostname/IP
    const host = window.location.hostname;
    
    // If it's 192.168.56.1, use that with port 4001
    if (host === '192.168.56.1' || host === '10.53.186.5') {
      return `http://${host}:4001`;
    }
    
    // Otherwise use localhost
    return 'http://localhost:4001';
  }
  
  // In production, use the relative API path
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

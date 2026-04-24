import axios, { type AxiosInstance, type AxiosRequestConfig, type AxiosResponse, type AxiosError, type InternalAxiosRequestConfig, AxiosHeaders } from 'axios';
import { useAuthStore } from '@/store/auth';

const createHttpClient = (): AxiosInstance => {
  const client = axios.create({
    timeout: 30000,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  client.interceptors.request.use((config: InternalAxiosRequestConfig) => {
    const { getAuthHeader } = useAuthStore.getState();
    const authHeader = getAuthHeader();
    const headers = new AxiosHeaders(config.headers);
    if (authHeader.Authorization) {
      headers.set('Authorization', authHeader.Authorization);
    }
    return {
      ...config,
      headers,
    };
  });

  client.interceptors.response.use(
    (response) => response,
    (error) => {
      console.error('HTTP request error:', error);
      return Promise.reject(error);
    }
  );

  return client;
};

export const httpClient = createHttpClient();

export interface RequestResult {
  status: number;
  headers: Record<string, string>;
  body: unknown;
  duration: number;
}

export async function sendRequest(
  method: string,
  url: string,
  headers: Record<string, string> = {},
  body?: unknown
): Promise<RequestResult> {
  const startTime = Date.now();
  
  try {
    const config: AxiosRequestConfig = {
      method,
      url,
      headers,
      data: body,
    };

    const response: AxiosResponse = await httpClient(config);
    
    const duration = Date.now() - startTime;
    
    return {
      status: response.status,
      headers: Object.fromEntries(
        Object.entries(response.headers as Record<string, unknown>).map(([key, value]) => [key, String(value)])
      ),
      body: response.data,
      duration,
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;
      if (axiosError.response) {
        return {
          status: axiosError.response.status,
          headers: Object.fromEntries(
            Object.entries(axiosError.response.headers as Record<string, unknown>).map(([key, value]) => [key, String(value)])
          ),
          body: axiosError.response.data,
          duration,
        };
      }
    }
    
    throw error;
  }
}

export interface OpenApiConfigItem {
  name: string;
  path: string;
}

interface Config {
  openApiConfig: OpenApiConfigItem[];
  appTitle: string;
  appDescription: string;
}

const defaultOpenApiConfig: OpenApiConfigItem[] = [
  { name: '认证端 API', path: '/v3/api-docs/auth-api' },
  { name: '管理端 API', path: '/v3/api-docs/manage-api' },
];

export function getOpenApiConfig(): OpenApiConfigItem[] {
  if (import.meta.env.VITE_OPENAPI_CONFIG) {
    try {
      return JSON.parse(import.meta.env.VITE_OPENAPI_CONFIG);
    } catch {
      console.error('Invalid VITE_OPENAPI_CONFIG format, using default');
      return defaultOpenApiConfig;
    }
  }
  return defaultOpenApiConfig;
}

export function getAppTitle(): string {
  return import.meta.env.VITE_APP_TITLE || 'API Explorer';
}

export function getAppDescription(): string {
  return import.meta.env.VITE_APP_DESCRIPTION || 'API 文档中心';
}

export function getBasePath(): string {
  return import.meta.env.VITE_BASE_PATH || '/';
}

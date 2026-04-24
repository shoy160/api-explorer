export interface OpenApiConfigItem {
  name: string;
  path: string;
}

interface Config {
  openApiConfig: OpenApiConfigItem[];
  appTitle: string;
  appDescription: string;
}

const defaultConfig: Config = {
  openApiConfig: [
    { name: '认证端 API', path: '/v3/api-docs/auth-api' },
    { name: '管理端 API', path: '/v3/api-docs/manage-api' },
  ],
  appTitle: 'API Explorer',
  appDescription: 'API 文档中心',
};

export function getConfig(): Config {
  const config: Config = { ...defaultConfig };

  if (import.meta.env.VITE_OPENAPI_CONFIG) {
    try {
      config.openApiConfig = JSON.parse(import.meta.env.VITE_OPENAPI_CONFIG);
    } catch {
      console.error('Invalid VITE_OPENAPI_CONFIG format, using default');
    }
  }

  if (import.meta.env.VITE_APP_TITLE) {
    config.appTitle = import.meta.env.VITE_APP_TITLE;
  }

  if (import.meta.env.VITE_APP_DESCRIPTION) {
    config.appDescription = import.meta.env.VITE_APP_DESCRIPTION;
  }

  return config;
}

export const config = getConfig();

export type {
  OpenApiDocument,
  ApiEndpoint,
  ApiGroup,
  ParsedOpenApi,
  ParameterInfo,
  ResponseInfo,
  RequestExample,
  HistoryItem,
  FavoriteItem,
} from './openapi';

export interface AppSettings {
  theme: 'light' | 'dark';
  language: 'zh' | 'en';
  fontSize: 'small' | 'medium' | 'large' | 'custom';
  customFontSize: number;
}

export interface AuthState {
  token: string;
  tokenType: string;
}

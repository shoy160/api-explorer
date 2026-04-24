import type { OpenAPIV3 } from 'openapi-types';

export type OpenApiDocument = OpenAPIV3.Document;

export interface ApiEndpoint {
  id: string;
  path: string;
  method: string;
  summary?: string;
  description?: string;
  operationId?: string;
  tags?: string[];
  parameters?: (OpenAPIV3.ParameterObject | OpenAPIV3.ReferenceObject)[];
  requestBody?: {
    content: Record<string, { schema: OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject }>;
  };
  responses?: Record<string, OpenAPIV3.ResponseObject | OpenAPIV3.ReferenceObject>;
}

export interface ApiGroup {
  name: string;
  description?: string;
  endpoints: ApiEndpoint[];
}

export interface ParsedOpenApi {
  info: {
    title: string;
    description?: string;
    version: string;
  };
  servers?: { url: string; description?: string }[];
  groups: ApiGroup[];
  components?: OpenAPIV3.ComponentsObject;
}

export interface ParameterInfo {
  name: string;
  in: string;
  description?: string;
  required?: boolean;
  type?: string;
  schema?: OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject;
}

export interface ResponseInfo {
  status: string;
  description?: string;
  schema?: OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject;
  example?: unknown;
}

export interface RequestExample {
  method: string;
  url: string;
  headers: Record<string, string>;
  body?: unknown;
}

export interface HistoryItem {
  id: string;
  timestamp: number;
  endpointId: string;
  method: string;
  path: string;
  request: {
    headers: Record<string, string>;
    body?: unknown;
  };
  response: {
    status: number;
    headers: Record<string, string>;
    body?: unknown;
  };
  duration: number;
}

export interface FavoriteItem {
  id: string;
  endpointId: string;
  method: string;
  path: string;
  groupName: string;
}

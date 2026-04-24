import type { ParsedOpenApi, ApiEndpoint } from '@/types';
import type { OpenAPIV3 } from 'openapi-types';

export async function parseOpenApiDocument(url: string): Promise<ParsedOpenApi> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  const document = await response.json();
  return transformDocument(document as OpenAPIV3.Document);
}

export function transformDocument(document: OpenAPIV3.Document): ParsedOpenApi {
  const groups: { name: string; description?: string; endpoints: ApiEndpoint[] }[] = [];
  const tagMap = new Map<string, ApiEndpoint[]>();
  const paths = document.paths || {};
  for (const [path, pathItem] of Object.entries(paths)) {
    if (!pathItem) continue;
    const endpoints = parsePathItem(path, pathItem);
    for (const endpoint of endpoints) {
      const tags = endpoint.tags || ['default'];
      for (const tag of tags) {
        if (!tagMap.has(tag)) {
          tagMap.set(tag, []);
        }
        tagMap.get(tag)!.push(endpoint);
      }
    }
  }
  for (const [name, endpoints] of tagMap) {
    groups.push({
      name,
      description: document.tags?.find((t) => t.name === name)?.description,
      endpoints,
    });
  }
  return {
    info: {
      title: document.info.title,
      description: document.info.description,
      version: document.info.version,
    },
    servers: document.servers?.map((s) => ({
      url: s.url,
      description: s.description,
    })),
    groups: groups.sort((a, b) => a.name.localeCompare(b.name)),
    components: document.components,
  };
}

function parsePathItem(path: string, pathItem: OpenAPIV3.PathItemObject): ApiEndpoint[] {
  const endpoints: ApiEndpoint[] = [];
  const methods: Array<'get' | 'post' | 'put' | 'delete' | 'patch' | 'options' | 'head' | 'trace'> = ['get', 'post', 'put', 'delete', 'patch', 'options', 'head', 'trace'];
  for (const method of methods) {
    const operation = pathItem[method] as OpenAPIV3.OperationObject | undefined;
    if (operation) {
      endpoints.push({
        id: `${method}-${path}`,
        path,
        method: method.toUpperCase(),
        summary: operation.summary,
        description: operation.description,
        operationId: operation.operationId,
        tags: operation.tags,
        parameters: operation.parameters,
        requestBody: operation.requestBody as ApiEndpoint['requestBody'],
        responses: operation.responses as ApiEndpoint['responses'],
      });
    }
  }
  return endpoints;
}

export function getBaseUrl(documents: ParsedOpenApi[], docIndex: number): string {
  const doc = documents[docIndex];
  if (!doc?.servers || doc.servers.length === 0) {
    return '';
  }
  return doc.servers[0].url;
}


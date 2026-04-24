import type { OpenAPIV3 } from 'openapi-types';
import type { ParameterInfo, ResponseInfo } from '@/types';

type SchemaType = OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject | undefined;

export function resolveSchemaType(schema: SchemaType): string {
  if (!schema) return 'unknown';
  
  if ('$ref' in schema) {
    const parts = schema.$ref.split('/');
    return parts[parts.length - 1];
  }
  
  if (schema.type) {
    if (schema.type === 'array' && schema.items) {
      return `${resolveSchemaType(schema.items)}[]`;
    }
    return schema.type;
  }
  
  if (schema.oneOf) {
    return schema.oneOf.map(resolveSchemaType).join(' | ');
  }
  
  if (schema.anyOf) {
    return schema.anyOf.map(resolveSchemaType).join(' | ');
  }
  
  if (schema.allOf) {
    return schema.allOf.map(resolveSchemaType).join(' & ');
  }
  
  return 'unknown';
}

export function parseParameters(parameters?: (OpenAPIV3.ParameterObject | OpenAPIV3.ReferenceObject)[]): ParameterInfo[] {
  if (!parameters) return [];
  
  return parameters.map((param) => {
    if ('$ref' in param) {
      const refName = param.$ref.split('/').pop();
      return {
        name: refName || 'unknown',
        in: 'unknown',
        description: undefined,
        required: false,
        type: 'unknown',
        schema: param,
      };
    }
    return {
      name: param.name,
      in: param.in,
      description: param.description,
      required: param.required,
      type: resolveSchemaType(param.schema),
      schema: param.schema,
    };
  });
}

export function parseResponses(responses?: Record<string, OpenAPIV3.ResponseObject | OpenAPIV3.ReferenceObject>): ResponseInfo[] {
  if (!responses) return [];
  
  return Object.entries(responses).map(([status, response]) => {
    if ('$ref' in response) {
      const refName = response.$ref.split('/').pop();
      return {
        status,
        description: `Reference: ${refName}`,
        schema: response,
        example: undefined,
      };
    }
    
    let content = response.content?.['application/json'];
    if (!content) {
      content = response.content?.['*/*'];
    }
    if (!content && response.content) {
      const keys = Object.keys(response.content);
      content = response.content[keys[0]];
    }
    
    const schema = content?.schema;
    return {
      status,
      description: response.description,
      schema,
      example: content?.example,
    };
  });
}

export function generateExampleFromSchema(schema: SchemaType): unknown {
  if (!schema) return undefined;
  
  if ('$ref' in schema) {
    const refName = schema.$ref.split('/').pop();
    return { [refName || 'ref']: '...' };
  }
  
  if (schema.example !== undefined) {
    return schema.example;
  }
  
  if (schema.type === 'string') {
    return schema.format === 'date' ? '2024-01-01' : 'string';
  }
  
  if (schema.type === 'number' || schema.type === 'integer') {
    return 0;
  }
  
  if (schema.type === 'boolean') {
    return false;
  }
  
  if (schema.type === 'array') {
    const itemExample = generateExampleFromSchema(schema.items);
    return itemExample !== undefined ? [itemExample] : [];
  }
  
  if (schema.type === 'object' && schema.properties) {
    const obj: Record<string, unknown> = {};
    for (const [key, prop] of Object.entries(schema.properties)) {
      obj[key] = generateExampleFromSchema(prop);
    }
    return obj;
  }
  
  return undefined;
}

export function formatSchemaAsTree(schema: SchemaType, indent = 0): string {
  if (!schema) return '';
  
  if ('$ref' in schema) {
    return schema.$ref.split('/').pop() || 'unknown';
  }
  
  const padding = '  '.repeat(indent);
  
  if (schema.type === 'object' && schema.properties) {
    let result = `{\n`;
    for (const [key, prop] of Object.entries(schema.properties)) {
      const required = schema.required?.includes(key) ? '*' : '';
      result += `${padding}  ${key}${required}: ${resolveSchemaType(prop)}\n`;
      result += formatSchemaAsTree(prop, indent + 1);
    }
    result += `${padding}}`;
    return result;
  }
  
  if (schema.type === 'array' && schema.items) {
    return `${resolveSchemaType(schema.items)}[]`;
  }
  
  return resolveSchemaType(schema);
}

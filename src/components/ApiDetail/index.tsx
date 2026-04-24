import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Heart, Send, Copy, Check, FileJson, Zap, Server, Tag, BookOpen, ChevronRight, ChevronDown, RefreshCw, Code, Download, Layers, FileText, X, FolderOpen, AlignLeft, Minimize2, CheckCircle, XCircle } from 'lucide-react';
import { Button, Card, Tabs, Tag as AntTag, message, Dropdown, Select } from 'antd';
import type { SelectProps } from 'antd';
import { useApiStore } from '@/store/api';
import { useFavoritesStore } from '@/store/favorites';
import { useAuthStore } from '@/store/auth';
import { useHistoryStore } from '@/store/history';
import { useSettingsStore } from '@/store/settings';
import { sendRequest } from '@/services/httpClient';
import type { ApiEndpoint, RequestExample } from '@/types';
import type { OpenAPIV3 } from 'openapi-types';
import { parseParameters, parseResponses, generateExampleFromSchema } from '@/utils/openapi';
import { formatJson, copyToClipboard } from '@/utils/format';
import { DEFAULT_HEADERS, METHOD_COLORS, FAVORITE_COLORS } from '@/utils/constants';
import { generateCode, languageLabels, languageGroups } from '@/services/codeGenerator';
import type { CodeLanguage } from '@/services/codeGenerator';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneLight, oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import 'react-syntax-highlighter/dist/esm/languages/prism/javascript';
import 'react-syntax-highlighter/dist/esm/languages/prism/java';
import 'react-syntax-highlighter/dist/esm/languages/prism/bash';
import 'react-syntax-highlighter/dist/esm/languages/prism/python';
import 'react-syntax-highlighter/dist/esm/languages/prism/go';
import 'react-syntax-highlighter/dist/esm/languages/prism/json';
import CodeMirror from '@uiw/react-codemirror';
import { json } from '@codemirror/lang-json';
import { EditorView } from '@codemirror/view';

interface SchemaField {
  name: string;
  type: string;
  required: boolean;
  description: string;
  children?: SchemaField[];
}

function parseSchemaFields(
  schema: OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject | undefined,
  prefix: string = '',
  components?: OpenAPIV3.ComponentsObject | undefined
): SchemaField[] {
  if (!schema) return [];
  
  let resolvedSchema: OpenAPIV3.SchemaObject | undefined = undefined;
  
  if ('$ref' in schema) {
    const refPath = schema.$ref.split('/');
    const schemaName = refPath.pop();
    
    if (components?.schemas && schemaName) {
      const referencedSchema = components.schemas[schemaName];
      if (referencedSchema) {
        if ('$ref' in referencedSchema) {
          return parseSchemaFields(referencedSchema, prefix, components);
        }
        resolvedSchema = referencedSchema as OpenAPIV3.SchemaObject;
      }
    }
    
    if (!resolvedSchema) {
      const refName = schema.$ref.split('/').pop() || 'unknown';
      return [{
        name: `${prefix}`,
        type: refName,
        required: false,
        description: `引用: ${schema.$ref}`,
      }];
    }
  } else {
    resolvedSchema = schema;
  }
  
  const fields: SchemaField[] = [];
  
  if (resolvedSchema.type === 'object' && resolvedSchema.properties) {
    const requiredFields = resolvedSchema.required || [];
    
    for (const [name, propSchema] of Object.entries(resolvedSchema.properties)) {
      const fieldType = getSchemaType(propSchema);
      const isRequired = requiredFields.includes(name);
      const desc = ('description' in propSchema && propSchema.description) || '';
      
      const nestedFields = parseSchemaFields(propSchema, `${prefix}${name}.`, components);
      
      fields.push({
        name: `${prefix}${name}`,
        type: fieldType,
        required: isRequired,
        description: desc,
        children: nestedFields.length > 0 ? nestedFields : undefined,
      });
    }
  } else if (resolvedSchema.type === 'array' && resolvedSchema.items) {
    const itemType = getSchemaType(resolvedSchema.items);
    fields.push({
      name: `${prefix}[*]`,
      type: `array<${itemType}>`,
      required: false,
      description: resolvedSchema.description || '',
      children: parseSchemaFields(resolvedSchema.items, `${prefix}[*].`, components),
    });
  }
  
  return fields;
}

function getSchemaType(schema: OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject | undefined): string {
  if (!schema) return 'unknown';
  if ('$ref' in schema) {
    return schema.$ref.split('/').pop() || 'object';
  }
  if (schema.type === 'array' && schema.items) {
    return `array<${getSchemaType(schema.items)}>`;
  }
  return schema.type || schema.format || 'object';
}

function generateRequestBodyExample(schema: OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject | undefined, components?: OpenAPIV3.ComponentsObject): unknown {
  if (!schema) return undefined;
  
  if ('$ref' in schema) {
    const refPath = schema.$ref.split('/');
    const schemaName = refPath.pop();
    
    if (components?.schemas && schemaName) {
      const referencedSchema = components.schemas[schemaName];
      if (referencedSchema) {
        return generateRequestBodyExample(referencedSchema, components);
      }
    }
    return { [schemaName || 'ref']: '...' };
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
    const itemExample = generateRequestBodyExample(schema.items, components);
    return itemExample !== undefined ? [itemExample] : [];
  }
  
  if (schema.type === 'object' && schema.properties) {
    const obj: Record<string, unknown> = {};
    for (const [key, prop] of Object.entries(schema.properties)) {
      obj[key] = generateRequestBodyExample(prop, components);
    }
    return obj;
  }
  
  return undefined;
}

function SchemaTable({ fields, title }: { fields: SchemaField[]; title?: string }) {
  const renderFields = (items: SchemaField[], level: number = 0) => {
    return items.map((field, index) => (
      <React.Fragment key={`${field.name}-${index}`}>
        <tr className="border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
          <td className="py-3 px-4 font-mono text-sm-dynamic text-slate-800 dark:text-slate-200 min-w-[150px]">
            <div className="flex items-center gap-2">
              {level > 0 && <span className="text-slate-400 dark:text-slate-500">└──</span>}
              {field.name.split('.').pop()}
            </div>
          </td>
          <td className="py-3 px-4 min-w-[120px]">
            <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs-dynamic font-medium bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400">{field.type}</span>
          </td>
          <td className="py-3 px-4 min-w-[80px]">
            {field.required ? (
              <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs-dynamic font-medium bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400">是</span>
            ) : (
              <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs-dynamic font-medium bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400">否</span>
            )}
          </td>
          <td className="py-3 px-4 text-sm-dynamic text-slate-600 dark:text-slate-400 min-w-[200px] max-w-[400px]">
            {field.description}
          </td>
        </tr>
        {field.children && renderFields(field.children, level + 1)}
      </React.Fragment>
    ));
  };

  if (fields.length === 0) return null;

  return (
    <div className="mt-4">
      {title && <h4 className="text-sm-dynamic font-semibold text-slate-700 dark:text-slate-300 mb-3">{title}</h4>}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
        <table className="min-w-full">
          <thead>
            <tr className="bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-700 dark:to-slate-700/50">
              <th className="text-left py-3 px-4 font-semibold text-slate-600 dark:text-slate-400 text-sm-dynamic min-w-[150px]">参数名</th>
              <th className="text-left py-3 px-4 font-semibold text-slate-600 dark:text-slate-400 text-sm-dynamic min-w-[120px]">类型</th>
              <th className="text-left py-3 px-4 font-semibold text-slate-600 dark:text-slate-400 text-sm-dynamic min-w-[80px]">必填</th>
              <th className="text-left py-3 px-4 font-semibold text-slate-600 dark:text-slate-400 text-sm-dynamic min-w-[200px]">说明</th>
            </tr>
          </thead>
          <tbody>
            {renderFields(fields)}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function ApiDetail() {
  const { selectedEndpoint, documents, currentDocIndex } = useApiStore();
  const { isFavorite, toggleFavorite } = useFavoritesStore();
  const { getAuthHeader } = useAuthStore();
  const { addHistory } = useHistoryStore();
  const { theme } = useSettingsStore();
  const isDarkTheme = theme === 'dark';
  const [activeTab, setActiveTab] = useState('parameters');
  const [testActiveTab, setTestActiveTab] = useState('params');
  const [responseTab, setResponseTab] = useState('formatted');
  const [requestBody, setRequestBody] = useState('');
  const [requestHeaders, setRequestHeaders] = useState<Record<string, string>>(DEFAULT_HEADERS);
  const [response, setResponse] = useState<{ status: number; body: unknown; headers: Record<string, string>; duration: number } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['requestBody', 'response-200', 'response-201', 'response-400', 'response-401', 'response-403', 'response-404', 'response-500']));
  const [showCodeModal, setShowCodeModal] = useState(false);
  const [codeLanguage, setCodeLanguage] = useState<CodeLanguage>('curl');
  const [generatedCode, setGeneratedCode] = useState('');
  const [customQueryParams, setCustomQueryParams] = useState<{ name: string; value: string }[]>([]);
  const [removedQueryParams, setRemovedQueryParams] = useState<Set<string>>(new Set());
  const [codeCopied, setCodeCopied] = useState(false);
  const [fillExampleClicked, setFillExampleClicked] = useState(false);
  const [isJsonValid, setIsJsonValid] = useState<boolean | null>(null);

  useEffect(() => {
    setResponse(null);
    setRequestBody('');
    setRequestHeaders(DEFAULT_HEADERS);
  }, [selectedEndpoint?.id]);

  const parameters = useMemo(() => {
    return selectedEndpoint ? parseParameters(selectedEndpoint.parameters) : [];
  }, [selectedEndpoint]);

  const pathParams = useMemo(() => {
    return parameters.filter(p => p.in === 'path');
  }, [parameters]);

  const queryParams = useMemo(() => {
    return parameters.filter(p => p.in === 'query');
  }, [parameters]);

  const currentDoc = documents[currentDocIndex];
  const baseUrl = currentDoc?.servers?.[0]?.url || '';
  const normalizedBaseUrl = baseUrl.replace(/\/$/, '');

  const { 
    fullUrl, 
    responses, 
    hasRequestBody, 
    requestSchema, 
    components, 
    requestExample, 
    requestFields 
  } = useMemo(() => {
    if (!selectedEndpoint) {
      return {
        fullUrl: '',
        responses: [],
        hasRequestBody: false,
        requestSchema: undefined,
        components: undefined,
        requestExample: undefined,
        requestFields: []
      };
    }
    
    const normalizedPath = selectedEndpoint.path.startsWith('/') ? selectedEndpoint.path : `/${selectedEndpoint.path}`;
    const fullUrl = `${normalizedBaseUrl}${normalizedPath}`;
    const responses = parseResponses(selectedEndpoint.responses);
    
    let requestContentType = selectedEndpoint.requestBody?.content?.['application/json'];
    if (!requestContentType) {
      requestContentType = selectedEndpoint.requestBody?.content?.['*/*'];
    }
    if (!requestContentType && selectedEndpoint.requestBody?.content) {
      const keys = Object.keys(selectedEndpoint.requestBody.content);
      requestContentType = selectedEndpoint.requestBody.content[keys[0]];
    }
    const hasRequestBody = !!requestContentType;
    const requestSchema = requestContentType?.schema;
    const components = (currentDoc as unknown as { components?: OpenAPIV3.ComponentsObject })?.components;
    const requestExample = generateRequestBodyExample(requestSchema, components);
    const requestFields = parseSchemaFields(requestSchema, '', components);

    return {
      fullUrl,
      responses,
      hasRequestBody,
      requestSchema,
      components,
      requestExample,
      requestFields
    };
  }, [selectedEndpoint, normalizedBaseUrl, currentDoc]);

  if (!selectedEndpoint) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-56px)] p-6 text-slate-400 dark:text-slate-500">
        <div className="w-32 h-32 mb-6 flex items-center justify-center">
          <div className="w-full h-full rounded-2xl bg-gradient-to-br from-emerald-50 dark:from-emerald-900/20 to-blue-50 dark:to-blue-900/20 flex items-center justify-center">
            <Server className="w-16 h-16 text-emerald-500" />
          </div>
        </div>
        <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-2">欢迎使用 API Explorer</h3>
        <p className="text-sm text-center max-w-md">选择左侧 API 分组，开始浏览和调试接口</p>
      </div>
    );
  }

  const methodColors: Record<string, { 
    primary: string; 
    secondary: string; 
    light: string; 
    badge: string; 
    badgeLight: string; 
    textColor: string;
    cardBg: string;
    border: string;
    headerBg: string;
    sidebarBg: string;
    sidebarItemHover: string;
    hoverBg: string;
    textPrimary: string;
    textMuted: string;
    codeBg: string;
    codeHeaderBg: string;
    codeBorder: string;
    codeText: string;
    codeTextMuted: string;
  }> = {
    GET: { 
      primary: 'from-emerald-500', 
      secondary: 'to-teal-600', 
      light: 'bg-emerald-50 dark:bg-emerald-900/10', 
      badge: 'bg-emerald-500 text-white', 
      badgeLight: 'bg-emerald-100 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400', 
      textColor: 'text-emerald-600 dark:text-emerald-400',
      cardBg: 'bg-white dark:bg-slate-900',
      border: 'border-slate-200 dark:border-slate-700',
      headerBg: 'bg-gradient-to-r from-slate-50 to-white dark:from-slate-800 dark:to-slate-900',
      sidebarBg: 'bg-slate-50 dark:bg-slate-800/50',
      sidebarItemHover: 'hover:bg-slate-200 dark:hover:bg-slate-700',
      hoverBg: 'hover:bg-slate-100 dark:hover:bg-slate-800',
      textPrimary: 'text-slate-900 dark:text-slate-100',
      textMuted: 'text-slate-500 dark:text-slate-500',
      codeBg: 'bg-slate-100 dark:bg-slate-900',
      codeHeaderBg: 'bg-white dark:bg-slate-800',
      codeBorder: 'border-slate-200 dark:border-slate-700',
      codeText: 'text-slate-800 dark:text-slate-200',
      codeTextMuted: 'text-slate-500 dark:text-slate-500',
    },
    POST: { 
      primary: 'from-blue-500', 
      secondary: 'to-indigo-600', 
      light: 'bg-blue-50 dark:bg-blue-900/10', 
      badge: 'bg-blue-500 text-white', 
      badgeLight: 'bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400', 
      textColor: 'text-blue-600 dark:text-blue-400',
      cardBg: 'bg-white dark:bg-slate-900',
      border: 'border-slate-200 dark:border-slate-700',
      headerBg: 'bg-gradient-to-r from-slate-50 to-white dark:from-slate-800 dark:to-slate-900',
      sidebarBg: 'bg-slate-50 dark:bg-slate-800/50',
      sidebarItemHover: 'hover:bg-slate-200 dark:hover:bg-slate-700',
      hoverBg: 'hover:bg-slate-100 dark:hover:bg-slate-800',
      textPrimary: 'text-slate-900 dark:text-slate-100',
      textMuted: 'text-slate-500 dark:text-slate-500',
      codeBg: 'bg-slate-100 dark:bg-slate-900',
      codeHeaderBg: 'bg-white dark:bg-slate-800',
      codeBorder: 'border-slate-200 dark:border-slate-700',
      codeText: 'text-slate-800 dark:text-slate-200',
      codeTextMuted: 'text-slate-500 dark:text-slate-500',
    },
    PUT: { 
      primary: 'from-orange-500', 
      secondary: 'to-amber-600', 
      light: 'bg-orange-50 dark:bg-orange-900/10', 
      badge: 'bg-orange-500 text-white', 
      badgeLight: 'bg-orange-100 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400', 
      textColor: 'text-orange-600 dark:text-orange-400',
      cardBg: 'bg-white dark:bg-slate-900',
      border: 'border-slate-200 dark:border-slate-700',
      headerBg: 'bg-gradient-to-r from-slate-50 to-white dark:from-slate-800 dark:to-slate-900',
      sidebarBg: 'bg-slate-50 dark:bg-slate-800/50',
      sidebarItemHover: 'hover:bg-slate-200 dark:hover:bg-slate-700',
      hoverBg: 'hover:bg-slate-100 dark:hover:bg-slate-800',
      textPrimary: 'text-slate-900 dark:text-slate-100',
      textMuted: 'text-slate-500 dark:text-slate-500',
      codeBg: 'bg-slate-100 dark:bg-slate-900',
      codeHeaderBg: 'bg-white dark:bg-slate-800',
      codeBorder: 'border-slate-200 dark:border-slate-700',
      codeText: 'text-slate-800 dark:text-slate-200',
      codeTextMuted: 'text-slate-500 dark:text-slate-500',
    },
    DELETE: { 
      primary: 'from-red-400', 
      secondary: 'to-red-500', 
      light: 'bg-red-50 dark:bg-red-900/10', 
      badge: 'bg-red-400 text-white', 
      badgeLight: 'bg-red-100 dark:bg-red-900/20 text-red-500 dark:text-red-400', 
      textColor: 'text-red-500 dark:text-red-400',
      cardBg: 'bg-white dark:bg-slate-900',
      border: 'border-slate-200 dark:border-slate-700',
      headerBg: 'bg-gradient-to-r from-slate-50 to-white dark:from-slate-800 dark:to-slate-900',
      sidebarBg: 'bg-slate-50 dark:bg-slate-800/50',
      sidebarItemHover: 'hover:bg-slate-200 dark:hover:bg-slate-700',
      hoverBg: 'hover:bg-slate-100 dark:hover:bg-slate-800',
      textPrimary: 'text-slate-900 dark:text-slate-100',
      textMuted: 'text-slate-500 dark:text-slate-500',
      codeBg: 'bg-slate-100 dark:bg-slate-900',
      codeHeaderBg: 'bg-white dark:bg-slate-800',
      codeBorder: 'border-slate-200 dark:border-slate-700',
      codeText: 'text-slate-800 dark:text-slate-200',
      codeTextMuted: 'text-slate-500 dark:text-slate-500',
    },
    PATCH: { 
      primary: 'from-violet-500', 
      secondary: 'to-purple-600', 
      light: 'bg-violet-50 dark:bg-violet-900/10', 
      badge: 'bg-violet-500 text-white', 
      badgeLight: 'bg-violet-100 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400', 
      textColor: 'text-violet-600 dark:text-violet-400',
      cardBg: 'bg-white dark:bg-slate-900',
      border: 'border-slate-200 dark:border-slate-700',
      headerBg: 'bg-gradient-to-r from-slate-50 to-white dark:from-slate-800 dark:to-slate-900',
      sidebarBg: 'bg-slate-50 dark:bg-slate-800/50',
      sidebarItemHover: 'hover:bg-slate-200 dark:hover:bg-slate-700',
      hoverBg: 'hover:bg-slate-100 dark:hover:bg-slate-800',
      textPrimary: 'text-slate-900 dark:text-slate-100',
      textMuted: 'text-slate-500 dark:text-slate-500',
      codeBg: 'bg-slate-100 dark:bg-slate-900',
      codeHeaderBg: 'bg-white dark:bg-slate-800',
      codeBorder: 'border-slate-200 dark:border-slate-700',
      codeText: 'text-slate-800 dark:text-slate-200',
      codeTextMuted: 'text-slate-500 dark:text-slate-500',
    },
  };

  const colors = methodColors[selectedEndpoint.method] || methodColors.GET;

  const handleCopyUrl = async () => {
    try {
      await copyToClipboard(fullUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      message.success('已复制');
    } catch {
      message.error('复制失败');
    }
  };

  const handleSendRequest = async () => {
    setIsLoading(true);
    try {
      let body: unknown = undefined;
      if (requestBody) {
        body = JSON.parse(requestBody);
      }

      const result = await sendRequest(
        selectedEndpoint.method,
        fullUrl,
        requestHeaders,
        body
      );

      setResponse({
        status: result.status,
        body: result.body,
        headers: result.headers,
        duration: result.duration,
      });

      addHistory({
        endpointId: selectedEndpoint.id,
        method: selectedEndpoint.method,
        path: selectedEndpoint.path,
        request: { headers: requestHeaders, body },
        response: { status: result.status, headers: result.headers, body: result.body },
        duration: result.duration,
      });

      message.success('请求成功');
    } catch (error) {
      message.error('请求失败');
      console.error('Request error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFavorite = () => {
    toggleFavorite({
      endpointId: selectedEndpoint.id,
      method: selectedEndpoint.method,
      path: selectedEndpoint.path,
      groupName: selectedEndpoint.tags?.[0] || 'default',
    });
  };

  const handleGenerateCode = () => {
    if (!selectedEndpoint) return;
    
    let body: unknown = undefined;
    if (requestBody) {
      try {
        body = JSON.parse(requestBody);
      } catch {
        body = requestBody;
      }
    } else if (requestExample) {
      body = requestExample;
    }

    let urlWithParams = fullUrl;
    const queryStringParts: string[] = [];
    
    queryParams.forEach(param => {
      let exampleValue: unknown;
      
      if (selectedEndpoint?.parameters) {
        const originalParam = selectedEndpoint.parameters.find(p => 
          ('$ref' in p ? p.$ref.split('/').pop() === param.name : p.name === param.name)
        );
        if (originalParam && !('$ref' in originalParam)) {
          if (originalParam.example !== undefined) {
            exampleValue = originalParam.example;
          } else if ((originalParam.schema as OpenAPIV3.SchemaObject)?.example !== undefined) {
            exampleValue = (originalParam.schema as OpenAPIV3.SchemaObject)?.example;
          } else if (param.schema) {
            exampleValue = generateRequestBodyExample(param.schema, components);
          }
        } else if (param.schema) {
          exampleValue = generateRequestBodyExample(param.schema, components);
        }
      }
      
      if (exampleValue !== undefined) {
        queryStringParts.push(`${param.name}=${encodeURIComponent(String(exampleValue))}`);
      }
    });
    
    customQueryParams.forEach(param => {
      if (param.name && param.value) {
        queryStringParts.push(`${param.name}=${encodeURIComponent(param.value)}`);
      }
    });
    
    if (queryStringParts.length > 0) {
      const separator = urlWithParams.includes('?') ? '&' : '?';
      urlWithParams += `${separator}${queryStringParts.join('&')}`;
    }

    const example: RequestExample = {
      method: selectedEndpoint.method,
      url: urlWithParams,
      headers: requestHeaders,
      body,
    };

    const code = generateCode(selectedEndpoint, example, codeLanguage);
    setGeneratedCode(code);
    setShowCodeModal(true);
  };

  const handleCodeLanguageChange = (language: CodeLanguage) => {
    if (!selectedEndpoint) return;
    
    setCodeLanguage(language);
    
    let body: unknown = undefined;
    if (requestBody) {
      try {
        body = JSON.parse(requestBody);
      } catch {
        body = requestBody;
      }
    } else if (requestExample) {
      body = requestExample;
    }

    let urlWithParams = fullUrl;
    const queryStringParts: string[] = [];
    
    queryParams.forEach(param => {
      let exampleValue: unknown;
      
      if (selectedEndpoint?.parameters) {
        const originalParam = selectedEndpoint.parameters.find(p => 
          ('$ref' in p ? p.$ref.split('/').pop() === param.name : p.name === param.name)
        );
        if (originalParam && !('$ref' in originalParam)) {
          if (originalParam.example !== undefined) {
            exampleValue = originalParam.example;
          } else if ((originalParam.schema as OpenAPIV3.SchemaObject)?.example !== undefined) {
            exampleValue = (originalParam.schema as OpenAPIV3.SchemaObject)?.example;
          } else if (param.schema) {
            exampleValue = generateRequestBodyExample(param.schema, components);
          }
        } else if (param.schema) {
          exampleValue = generateRequestBodyExample(param.schema, components);
        }
      }
      
      if (exampleValue !== undefined) {
        queryStringParts.push(`${param.name}=${encodeURIComponent(String(exampleValue))}`);
      }
    });
    
    customQueryParams.forEach(param => {
      if (param.name && param.value) {
        queryStringParts.push(`${param.name}=${encodeURIComponent(param.value)}`);
      }
    });
    
    if (queryStringParts.length > 0) {
      const separator = urlWithParams.includes('?') ? '&' : '?';
      urlWithParams += `${separator}${queryStringParts.join('&')}`;
    }

    const example: RequestExample = {
      method: selectedEndpoint.method,
      url: urlWithParams,
      headers: requestHeaders,
      body,
    };

    const code = generateCode(selectedEndpoint, example, language);
    setGeneratedCode(code);
  };

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => {
      const newExpanded = new Set(prev);
      if (newExpanded.has(section)) {
        newExpanded.delete(section);
      } else {
        newExpanded.add(section);
      }
      return newExpanded;
    });
  };

  const hasResponseContent = response !== null;
  const isSuccessful = response !== null && response.status >= 200 && response.status < 300;

  const apiTitle = selectedEndpoint.summary || selectedEndpoint.operationId || selectedEndpoint.path;
  const docTitle = currentDoc?.info?.title || '未分组';
  const tagsPath = selectedEndpoint.tags?.join(' / ') || '未分组';
  const fullPath = `${docTitle} / ${tagsPath} / ${apiTitle}`;
  const apiDescription = selectedEndpoint.description || fullPath;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 transition-colors duration-500 pt-14">
      <div className="mx-auto px-4 sm:px-6 lg:px-10 xl:px-16 2xl:px-24 py-8 animate-fadeIn">
        <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden mb-8 animate-slideUp">
          <div className="bg-gradient-to-r from-slate-50 via-white to-slate-50 dark:from-slate-700/50 dark:via-slate-800 dark:to-slate-700/50 px-6 sm:px-10 lg:px-14 py-6 sm:py-8">
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
              <div className="flex-1">
                <div className="flex items-center gap-4 mb-4">
                  <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl ${colors.badge} flex items-center justify-center shadow-lg animate-pulse-once`}>
                    <Zap className="w-6 h-6 sm:w-7 sm:h-7" />
                  </div>
                  <div>
                    <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-slate-900 dark:text-slate-100 animate-fadeInUp">{apiTitle}</h1>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-sm font-semibold ${colors.textColor}`}>{selectedEndpoint.method}</span>
                      <ChevronRight className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                      <span className="text-sm text-slate-500 dark:text-slate-400">{selectedEndpoint.path}</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex flex-wrap items-center gap-2.5 mb-4">
                  {selectedEndpoint.tags?.map((tag) => (
                    <span 
                      key={tag}
                      className={`inline-flex items-center text-sm px-3.5 py-1.5 rounded-full ${colors.light} ${colors.textColor} font-medium border border-slate-200 dark:border-slate-600 shadow-sm`}
                    >
                      <Tag className="w-3.5 h-3.5 mr-1.5" />
                      {tag}
                    </span>
                  ))}
                </div>
                
                <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                  <FolderOpen className="w-5 h-5" />
                  <span className="text-sm-dynamic">{fullPath}</span>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <button
                  onClick={handleFavorite}
                  className={`p-2.5 sm:p-3 rounded-full transition-all duration-200 ${
                    isFavorite(selectedEndpoint.id) 
                      ? FAVORITE_COLORS[selectedEndpoint.method]?.bgFilled || 'bg-amber-50 dark:bg-amber-900/30' 
                      : FAVORITE_COLORS[selectedEndpoint.method]?.bgUnfilled || 'hover:bg-slate-200 dark:hover:bg-slate-700'
                  } group`}
                  title={isFavorite(selectedEndpoint.id) ? '取消收藏' : '添加收藏'}
                >
                  <Heart className={`w-5 h-5 sm:w-6 sm:h-6 transition-all duration-200 ${
                    isFavorite(selectedEndpoint.id) 
                      ? `${FAVORITE_COLORS[selectedEndpoint.method]?.filled || 'text-amber-500 fill-amber-500'} scale-110 group-hover:animate-heartbeat` 
                      : FAVORITE_COLORS[selectedEndpoint.method]?.unfilled || 'text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 group-hover:animate-heartbeat-unfilled'
                  }`} />
                </button>
              </div>
            </div>
            
            {selectedEndpoint.description && (
              <div className="mt-6 p-4 sm:p-5 bg-white/80 dark:bg-slate-700/50 rounded-2xl border border-slate-200 dark:border-slate-600">
                <div className="flex items-start gap-4">
                  <BookOpen className={`w-6 h-6 ${colors.textColor} flex-shrink-0 mt-0.5`} />
                  <p className="text-sm-dynamic sm:text-base-dynamic text-slate-600 dark:text-slate-300 leading-relaxed">{selectedEndpoint.description}</p>
                </div>
              </div>
            )}
            
            <div className="mt-6 flex items-center gap-4 bg-white/90 dark:bg-slate-700/80 rounded-2xl px-4 sm:px-5 py-3 sm:py-4 border border-slate-200 dark:border-slate-600 shadow-sm">
              <span className={`px-4 py-2 rounded-xl ${colors.badge} font-bold text-sm-dynamic sm:text-base-dynamic shadow-md`}>
                {selectedEndpoint.method}
              </span>
              <span className="font-mono text-sm-dynamic sm:text-base-dynamic text-slate-600 dark:text-slate-300 truncate flex-1" title={fullUrl}>{fullUrl}</span>
              <Button
                type="text"
                icon={copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                onClick={handleCopyUrl}
                className={`${copied ? colors.textColor : 'text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300'} hover:bg-slate-100 dark:hover:bg-slate-600 rounded-xl transition-all p-2.5`}
                title={copied ? '已复制' : '复制 URL'}
              />
            </div>
          </div>

          <div className="px-6 sm:px-10 py-5">
            <Tabs
              activeKey={activeTab}
              onChange={setActiveTab}
              items={[
                {
                  key: 'parameters',
                  label: <span className="text-base font-semibold text-slate-700 dark:text-slate-300">参数</span>,
                },
                {
                  key: 'response',
                  label: <span className="text-base font-semibold text-slate-700 dark:text-slate-300">响应</span>,
                },
                {
                  key: 'test',
                  label: <span className="text-base font-semibold text-slate-700 dark:text-slate-300">调试</span>,
                },
              ]}
            />
          </div>

          <div className="px-6 sm:px-10 pb-8">
            {activeTab === 'parameters' && (
              <div className="space-y-5 mt-3">
                {queryParams.length > 0 && (
                  <div className="bg-gradient-to-br from-slate-50 to-white dark:from-slate-700/50 dark:to-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-600">
                    <div className="flex items-center gap-4 mb-5">
                      <div className={`w-12 h-12 rounded-2xl ${colors.light} flex items-center justify-center`}>
                        <BookOpen className={`w-6 h-6 ${colors.textColor}`} />
                      </div>
                      <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">查询参数</h3>
                    </div>
                    
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="bg-slate-100 dark:bg-slate-700/50">
                            <th className="text-left py-4 px-5 font-semibold text-slate-600 dark:text-slate-400 text-base">参数名</th>
                            <th className="text-left py-4 px-5 font-semibold text-slate-600 dark:text-slate-400 text-base">类型</th>
                            <th className="text-left py-4 px-5 font-semibold text-slate-600 dark:text-slate-400 text-base">必填</th>
                            <th className="text-left py-4 px-5 font-semibold text-slate-600 dark:text-slate-400 text-base">说明</th>
                          </tr>
                        </thead>
                        <tbody>
                          {queryParams.map((param) => {
                            const fieldType = param.schema ? getSchemaType(param.schema) : param.type;
                            const paramFields = param.schema ? parseSchemaFields(param.schema, '', components) : [];
                            
                            if (paramFields.length > 0) {
                              return (
                                <React.Fragment key={param.name}>
                                  {paramFields.map((field, index) => (
                                    <tr key={`${param.name}-${index}`} className="border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                                      <td className="py-4 px-5 font-mono text-base text-slate-800 dark:text-slate-200">{field.name}</td>
                                      <td className="py-4 px-5">
                                        <span className="inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-medium bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400">{field.type}</span>
                                      </td>
                                      <td className="py-4 px-5">
                                        {field.required ? (
                                          <span className={`inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-medium ${colors.badgeLight}`}>是</span>
                                        ) : (
                                          <span className="inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-medium bg-slate-100 dark:bg-slate-600 text-slate-600 dark:text-slate-400">否</span>
                                        )}
                                      </td>
                                      <td className="py-4 px-5 text-base text-slate-600 dark:text-slate-400">{field.description || '-'}</td>
                                    </tr>
                                  ))}
                                </React.Fragment>
                              );
                            }
                            
                            return (
                              <tr key={param.name} className="border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                                <td className="py-4 px-5 font-mono text-base text-slate-800 dark:text-slate-200">{param.name}</td>
                                <td className="py-4 px-5">
                                  <span className="inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-medium bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400">{fieldType}</span>
                                </td>
                                <td className="py-4 px-5">
                                  {param.required ? (
                                    <span className={`inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-medium ${colors.badgeLight}`}>是</span>
                                  ) : (
                                    <span className="inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-medium bg-slate-100 dark:bg-slate-600 text-slate-600 dark:text-slate-400">否</span>
                                  )}
                                </td>
                                <td className="py-4 px-5 text-base text-slate-600 dark:text-slate-400">{param.description || '-'}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {hasRequestBody && (
                  <div className="bg-gradient-to-br from-slate-50 to-white dark:from-slate-700/50 dark:to-slate-800 rounded-2xl border border-slate-200 dark:border-slate-600 overflow-hidden">
                    <div className="flex items-center justify-between cursor-pointer p-6" onClick={() => toggleSection('requestBody')}>
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
                          <FileJson className="w-6 h-6 text-violet-600 dark:text-violet-400" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">请求体参数</h3>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-slate-500 dark:text-slate-400 font-medium">
                          {expandedSections.has('requestBody') ? '收起' : '展开'}
                        </span>
                        {expandedSections.has('requestBody') ? (
                          <ChevronDown className="w-5 h-5 text-slate-400" />
                        ) : (
                          <ChevronRight className="w-5 h-5 text-slate-400" />
                        )}
                      </div>
                    </div>
                    
                    <div
                      className={`overflow-hidden transition-all duration-300 ${
                        expandedSections.has('requestBody') ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'
                      }`}
                    >
                      <div className="px-6 pb-6">
                        <SchemaTable fields={requestFields} />
                        
                        <div className="mt-6">
                          <h4 className="text-base font-semibold text-slate-700 dark:text-slate-300 mb-4">JSON 示例</h4>
                          <div className="bg-slate-100 dark:bg-slate-800 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-600">
                            <div className="flex items-center px-5 py-4 bg-white dark:bg-slate-700 border-b border-slate-200 dark:border-slate-600">
                              <span className="text-base text-slate-500 dark:text-slate-400 font-medium">JSON</span>
                            </div>
                            <div className="overflow-x-auto">
                              <SyntaxHighlighter
                                language="json"
                                style={isDarkTheme ? oneDark : oneLight}
                                customStyle={{ margin: 0, padding: '20px', borderRadius: 0, fontSize: '14px' }}
                                showLineNumbers={false}
                              >
                                {formatJson(requestExample)}
                              </SyntaxHighlighter>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'response' && (
              <div className="space-y-4 mt-2">
                {responses.map((resp) => {
                  const responseSchema = resp.schema;
                  const responseFields = parseSchemaFields(responseSchema, '', components);
                  const statusColor = resp.status.startsWith('2') 
                    ? 'bg-emerald-500 text-white' 
                    : resp.status.startsWith('4') || resp.status.startsWith('5')
                    ? 'bg-rose-500 text-white'
                    : 'bg-blue-500 text-white';
                  const statusBgColor = resp.status.startsWith('2') 
                    ? 'bg-emerald-50 dark:bg-emerald-900/10' 
                    : resp.status.startsWith('4') || resp.status.startsWith('5')
                    ? 'bg-rose-50 dark:bg-rose-900/10'
                    : 'bg-blue-50 dark:bg-blue-900/10';
                  const statusTextColor = resp.status.startsWith('2') 
                    ? 'text-emerald-600 dark:text-emerald-400' 
                    : resp.status.startsWith('4') || resp.status.startsWith('5')
                    ? 'text-rose-600 dark:text-rose-400'
                    : 'text-blue-600 dark:text-blue-400';
                  
                  return (
                    <div key={resp.status} className="bg-gradient-to-br from-slate-50 to-white dark:from-slate-700/50 dark:to-slate-800 rounded-xl border border-slate-200 dark:border-slate-600 overflow-hidden">
                      <div className="flex items-center justify-between p-5">
                        <div className="flex items-center gap-3">
                          <span className={`px-4 py-2 rounded-lg text-sm font-bold ${statusColor} shadow-sm`}>
                            {resp.status}
                          </span>
                          <span className={`text-lg font-semibold ${statusTextColor}`}>{resp.description}</span>
                        </div>
                        <div className="flex items-center gap-2 cursor-pointer" onClick={() => toggleSection(`response-${resp.status}`)}>
                          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                            {expandedSections.has(`response-${resp.status}`) ? '收起' : '展开'}
                          </span>
                          {expandedSections.has(`response-${resp.status}`) ? (
                            <ChevronDown className="w-5 h-5 text-slate-400" />
                          ) : (
                            <ChevronRight className="w-5 h-5 text-slate-400" />
                          )}
                        </div>
                      </div>
                      
                      <div
                        className={`overflow-hidden transition-all duration-300 ${
                          expandedSections.has(`response-${resp.status}`) ? 'max-h-none opacity-100' : 'max-h-0 opacity-0'
                        }`}
                      >
                        <div className="px-5 pb-5">
                          <SchemaTable fields={responseFields} title="响应字段" />
                          
                          {resp.example !== undefined && (
                            <div className="mt-5">
                              <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">响应示例</h4>
                              <div className="bg-slate-100 dark:bg-slate-800 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-600">
                                <div className="flex items-center justify-between px-4 py-3 bg-white dark:bg-slate-700 border-b border-slate-200 dark:border-slate-600">
                                  <span className="text-sm text-slate-500 dark:text-slate-400 font-medium">JSON</span>
                                  <button
                                    onClick={() => copyToClipboard(formatJson(resp.example))}
                                    className={`text-sm ${colors.textColor} hover:opacity-80 font-medium flex items-center gap-1`}
                                  >
                                    <Copy className="w-4 h-4" />
                                    复制
                                  </button>
                                </div>
                                <div className="overflow-x-auto">
                                  <SyntaxHighlighter
                                    language="json"
                                    style={isDarkTheme ? oneDark : oneLight}
                                    customStyle={{ margin: 0, padding: '16px', borderRadius: 0 }}
                                    showLineNumbers={false}
                                  >
                                    {formatJson(resp.example)}
                                  </SyntaxHighlighter>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {activeTab === 'test' && (
              <div className="space-y-4 mt-2">
                <div className="bg-gradient-to-br from-slate-50 to-white dark:from-slate-700/50 dark:to-slate-800 rounded-xl border border-slate-200 dark:border-slate-600 p-5">
                  <Tabs
                    activeKey={testActiveTab}
                    onChange={setTestActiveTab}
                    items={[
                      {
                        key: 'params',
                        label: <span className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300"><Layers className="w-4 h-4" /> 参数</span>,
                      },
                      {
                        key: 'headers',
                        label: <span className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300"><FileText className="w-4 h-4" /> 请求头</span>,
                      },
                      {
                        key: 'body',
                        label: <span className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300"><FileJson className="w-4 h-4" /> 请求体</span>,
                      },
                    ]}
                  />

                  {testActiveTab === 'params' && (
                    <div className="space-y-4 mt-4">
                      <div className="bg-white dark:bg-slate-700 rounded-xl p-4 border border-slate-200 dark:border-slate-600">
                        <div className="flex items-center gap-2 mb-3">
                          <span className="text-sm font-semibold text-slate-600 dark:text-slate-400">路径参数</span>
                        </div>
                        <div className="text-center py-4 text-slate-400 dark:text-slate-500 text-sm">
                          {pathParams.length > 0 ? (
                            <div className="space-y-3">
                              {pathParams.map((param) => (
                                <div key={param.name} className="flex items-center justify-between">
                                  <span className="font-mono text-slate-700 dark:text-slate-300">{param.name}</span>
                                  <input
                                    type="text"
                                    className={`px-4 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-lg w-48 bg-white dark:bg-slate-600 text-slate-900 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-${selectedEndpoint.method.toLowerCase() === 'get' ? 'emerald' : selectedEndpoint.method.toLowerCase() === 'post' ? 'blue' : selectedEndpoint.method.toLowerCase() === 'put' ? 'amber' : selectedEndpoint.method.toLowerCase() === 'delete' ? 'rose' : 'violet'}-500/20 focus:border-${selectedEndpoint.method.toLowerCase() === 'get' ? 'emerald' : selectedEndpoint.method.toLowerCase() === 'post' ? 'blue' : selectedEndpoint.method.toLowerCase() === 'put' ? 'amber' : selectedEndpoint.method.toLowerCase() === 'delete' ? 'rose' : 'violet'}-500 hover:border-slate-300 dark:hover:border-slate-500`}
                                    placeholder="请输入"
                                  />
                                </div>
                              ))}
                            </div>
                          ) : (
                            '无路径参数'
                          )}
                        </div>
                      </div>

                      <div className="bg-white dark:bg-slate-700 rounded-xl p-4 border border-slate-200 dark:border-slate-600">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-sm font-semibold text-slate-600 dark:text-slate-400">查询参数</span>
                          <button 
                            onClick={() => setCustomQueryParams(prev => [...prev, { name: '', value: '' }])} 
                            className={`flex items-center gap-1.5 text-sm font-medium transition-all duration-200 ${colors.textColor} hover:opacity-80`}
                          >
                            <span className={`w-6 h-6 flex items-center justify-center rounded-full ${colors.badgeLight} text-lg font-bold leading-none`}>+</span>
                            添加参数
                          </button>
                        </div>
                        <div className="space-y-3">
                          {queryParams.length > 0 && queryParams.map((param) => {
                            const paramFields = param.schema ? parseSchemaFields(param.schema, '', components) : [];
                            
                            if (paramFields.length > 0) {
                              return (
                                <React.Fragment key={param.name}>
                                  {paramFields.map((field, index) => {
                                    const fieldKey = `${param.name}-${field.name}`;
                                    if (removedQueryParams.has(fieldKey)) return null;
                                    return (
                                      <div key={fieldKey} className="flex items-center gap-2">
                                        <input
                                          type="text"
                                          readOnly
                                          value={field.name}
                                          className="px-3 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-lg w-64 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-slate-200 font-mono"
                                        />
                                        <span className="text-slate-400 dark:text-slate-500">=</span>
                                        <input
                                          type="text"
                                          className={`px-3 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-lg flex-1 bg-white dark:bg-slate-600 text-slate-900 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-${selectedEndpoint.method.toLowerCase() === 'get' ? 'emerald' : selectedEndpoint.method.toLowerCase() === 'post' ? 'blue' : selectedEndpoint.method.toLowerCase() === 'put' ? 'amber' : selectedEndpoint.method.toLowerCase() === 'delete' ? 'rose' : 'violet'}-500/20 focus:border-${selectedEndpoint.method.toLowerCase() === 'get' ? 'emerald' : selectedEndpoint.method.toLowerCase() === 'post' ? 'blue' : selectedEndpoint.method.toLowerCase() === 'put' ? 'amber' : selectedEndpoint.method.toLowerCase() === 'delete' ? 'rose' : 'violet'}-500`}
                                          placeholder="请输入"
                                        />
                                        <button
                                          onClick={() => setRemovedQueryParams(prev => new Set([...prev, fieldKey]))}
                                          className="p-1.5 hover:bg-rose-100 dark:hover:bg-rose-900/30 rounded-lg text-rose-500 dark:text-rose-400 transition-colors"
                                        >
                                          <X className="w-4 h-4" />
                                        </button>
                                      </div>
                                    );
                                  })}
                                </React.Fragment>
                              );
                            }
                            
                            if (removedQueryParams.has(param.name)) return null;
                            return (
                              <div key={param.name} className="flex items-center gap-2">
                                <input
                                  type="text"
                                  readOnly
                                  value={param.name}
                                  className="px-3 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-lg w-64 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-slate-200 font-mono"
                                />
                                <span className="text-slate-400 dark:text-slate-500">=</span>
                                <input
                                  type="text"
                                  className={`px-3 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-lg flex-1 bg-white dark:bg-slate-600 text-slate-900 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-${selectedEndpoint.method.toLowerCase() === 'get' ? 'emerald' : selectedEndpoint.method.toLowerCase() === 'post' ? 'blue' : selectedEndpoint.method.toLowerCase() === 'put' ? 'amber' : selectedEndpoint.method.toLowerCase() === 'delete' ? 'rose' : 'violet'}-500/20 focus:border-${selectedEndpoint.method.toLowerCase() === 'get' ? 'emerald' : selectedEndpoint.method.toLowerCase() === 'post' ? 'blue' : selectedEndpoint.method.toLowerCase() === 'put' ? 'amber' : selectedEndpoint.method.toLowerCase() === 'delete' ? 'rose' : 'violet'}-500`}
                                  placeholder="请输入"
                                />
                                <button
                                  onClick={() => setRemovedQueryParams(prev => new Set([...prev, param.name]))}
                                  className="p-1.5 hover:bg-rose-100 dark:hover:bg-rose-900/30 rounded-lg text-rose-500 dark:text-rose-400 transition-colors"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            );
                          })}
                          {customQueryParams.map((param, index) => (
                            <div key={`custom-${index}`} className="flex items-center gap-2">
                              <input
                                type="text"
                                value={param.name}
                                onChange={(e) => {
                                  const newParams = [...customQueryParams];
                                  newParams[index].name = e.target.value;
                                  setCustomQueryParams(newParams);
                                }}
                                className={`px-3 py-2 text-sm border border-dashed border-slate-300 dark:border-slate-500 rounded-lg w-64 bg-white dark:bg-slate-600 text-slate-900 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-${selectedEndpoint.method.toLowerCase() === 'get' ? 'emerald' : selectedEndpoint.method.toLowerCase() === 'post' ? 'blue' : selectedEndpoint.method.toLowerCase() === 'put' ? 'amber' : selectedEndpoint.method.toLowerCase() === 'delete' ? 'rose' : 'violet'}-500/20 focus:border-${selectedEndpoint.method.toLowerCase() === 'get' ? 'emerald' : selectedEndpoint.method.toLowerCase() === 'post' ? 'blue' : selectedEndpoint.method.toLowerCase() === 'put' ? 'amber' : selectedEndpoint.method.toLowerCase() === 'delete' ? 'rose' : 'violet'}-500 font-mono`}
                                placeholder="参数名"
                              />
                              <span className="text-slate-400 dark:text-slate-500">=</span>
                              <input
                                type="text"
                                value={param.value}
                                onChange={(e) => {
                                  const newParams = [...customQueryParams];
                                  newParams[index].value = e.target.value;
                                  setCustomQueryParams(newParams);
                                }}
                                className={`px-3 py-2 text-sm border border-dashed border-slate-300 dark:border-slate-500 rounded-lg flex-1 bg-white dark:bg-slate-600 text-slate-900 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-${selectedEndpoint.method.toLowerCase() === 'get' ? 'emerald' : selectedEndpoint.method.toLowerCase() === 'post' ? 'blue' : selectedEndpoint.method.toLowerCase() === 'put' ? 'amber' : selectedEndpoint.method.toLowerCase() === 'delete' ? 'rose' : 'violet'}-500/20 focus:border-${selectedEndpoint.method.toLowerCase() === 'get' ? 'emerald' : selectedEndpoint.method.toLowerCase() === 'post' ? 'blue' : selectedEndpoint.method.toLowerCase() === 'put' ? 'amber' : selectedEndpoint.method.toLowerCase() === 'delete' ? 'rose' : 'violet'}-500`}
                                placeholder="值"
                              />
                              <button
                                onClick={() => setCustomQueryParams(prev => prev.filter((_, i) => i !== index))}
                                className="p-1.5 hover:bg-rose-100 dark:hover:bg-rose-900/30 rounded-lg text-rose-500 dark:text-rose-400 transition-colors"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                          {queryParams.length === 0 && customQueryParams.length === 0 && (
                            <div className="text-center py-4 text-slate-400 dark:text-slate-500 text-sm">无查询参数</div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {testActiveTab === 'headers' && (
                    <div className="space-y-4 mt-4">
                      <div className="bg-white dark:bg-slate-700 rounded-xl p-4 border border-slate-200 dark:border-slate-600">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-sm font-semibold text-slate-600 dark:text-slate-400">请求头</span>
                          <button 
                            onClick={() => setRequestHeaders(prev => ({ ...prev, ['']: '' }))}
                            className={`flex items-center gap-1.5 text-sm font-medium transition-all duration-200 ${colors.textColor} hover:opacity-80`}
                          >
                            <span className={`w-6 h-6 flex items-center justify-center rounded-full ${colors.badgeLight} text-lg font-bold leading-none`}>+</span>
                            添加请求头
                          </button>
                        </div>
                        <div className="text-center py-4 text-slate-400 dark:text-slate-500 text-sm">
                          {Object.keys(requestHeaders).length > 0 ? (
                            <div className="space-y-3">
                              {Object.entries(requestHeaders).map(([key, value], index) => {
                                const existingKeys = Object.keys(requestHeaders).filter(k => k !== key);
                                const commonHeaders: Record<string, string> = {
                                  'Content-Type': 'application/json',
                                  'Authorization': 'Bearer ',
                                  'Accept': 'application/json',
                                  'Accept-Encoding': 'gzip, deflate, br',
                                  'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
                                  'User-Agent': 'API Explorer',
                                  'X-Requested-With': 'XMLHttpRequest',
                                  'Cache-Control': 'no-cache',
                                  'Connection': 'keep-alive',
                                  'Host': '',
                                  'Origin': '',
                                  'Referer': '',
                                  'Cookie': '',
                                  'Content-Length': '',
                                  'Content-Encoding': '',
                                };

                                const handleKeyChange = (newKey: string) => {
                                  if (newKey === key) return;
                                  if (Object.keys(requestHeaders).includes(newKey) && newKey !== key) return;
                                  const newHeaders = { ...requestHeaders };
                                  delete newHeaders[key];
                                  newHeaders[newKey] = newKey in commonHeaders && !value ? commonHeaders[newKey] : value;
                                  setRequestHeaders(newHeaders);
                                };

                                return (
                                  <div key={`${key}-${index}`} className="flex items-center gap-3">
                                    <Select
                                      value={key}
                                      onChange={handleKeyChange}
                                      allowClear={false}
                                      showSearch
                                      placeholder="选择或输入请求头"
                                      className="w-48 text-sm"
                                      dropdownStyle={{ textAlign: 'left' }}
                                      dropdownClassName="text-left"
                                      options={[
                                        { value: 'Content-Type', label: 'Content-Type', disabled: existingKeys.includes('Content-Type') },
                                        { value: 'Authorization', label: 'Authorization', disabled: existingKeys.includes('Authorization') },
                                        { value: 'Accept', label: 'Accept', disabled: existingKeys.includes('Accept') },
                                        { value: 'Accept-Encoding', label: 'Accept-Encoding', disabled: existingKeys.includes('Accept-Encoding') },
                                        { value: 'Accept-Language', label: 'Accept-Language', disabled: existingKeys.includes('Accept-Language') },
                                        { value: 'User-Agent', label: 'User-Agent', disabled: existingKeys.includes('User-Agent') },
                                        { value: 'X-Requested-With', label: 'X-Requested-With', disabled: existingKeys.includes('X-Requested-With') },
                                        { value: 'Cache-Control', label: 'Cache-Control', disabled: existingKeys.includes('Cache-Control') },
                                        { value: 'Connection', label: 'Connection', disabled: existingKeys.includes('Connection') },
                                        { value: 'Host', label: 'Host', disabled: existingKeys.includes('Host') },
                                        { value: 'Origin', label: 'Origin', disabled: existingKeys.includes('Origin') },
                                        { value: 'Referer', label: 'Referer', disabled: existingKeys.includes('Referer') },
                                        { value: 'Cookie', label: 'Cookie', disabled: existingKeys.includes('Cookie') },
                                      ]}
                                      filterOption={(input, option) => 
                                        (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                                      }
                                    />
                                    <span className="text-slate-400 dark:text-slate-500">:</span>
                                    <input
                                      type="text"
                                      value={value}
                                      onChange={(e) => setRequestHeaders({ ...requestHeaders, [key]: e.target.value })}
                                      className={`px-4 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-lg flex-1 bg-white dark:bg-slate-600 text-slate-900 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-${selectedEndpoint.method.toLowerCase() === 'get' ? 'emerald' : selectedEndpoint.method.toLowerCase() === 'post' ? 'blue' : selectedEndpoint.method.toLowerCase() === 'put' ? 'amber' : selectedEndpoint.method.toLowerCase() === 'delete' ? 'rose' : 'violet'}-500/20 focus:border-${selectedEndpoint.method.toLowerCase() === 'get' ? 'emerald' : selectedEndpoint.method.toLowerCase() === 'post' ? 'blue' : selectedEndpoint.method.toLowerCase() === 'put' ? 'amber' : selectedEndpoint.method.toLowerCase() === 'delete' ? 'rose' : 'violet'}-500 hover:border-slate-300 dark:hover:border-slate-500`}
                                      placeholder="Value"
                                    />
                                    <button
                                      onClick={() => {
                                        const newHeaders = { ...requestHeaders };
                                        delete newHeaders[key];
                                        setRequestHeaders(newHeaders);
                                      }}
                                      className="p-2 hover:bg-rose-100 dark:hover:bg-rose-900/30 rounded-lg text-rose-500 dark:text-rose-400 transition-colors"
                                    >
                                      <X className="w-4 h-4" />
                                    </button>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            '无请求头'
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {testActiveTab === 'body' && hasRequestBody && (
                    <div className="rounded-xl overflow-hidden mt-4 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm">
                      <div className="flex items-center justify-between px-4 py-3 bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-600">
                        <div className="flex items-center gap-3">
                          <span className="text-sm-dynamic font-medium text-slate-600 dark:text-slate-400 flex items-center gap-2">
                            <FileJson className="w-4 h-4" />
                            Body (JSON)
                          </span>
                          <span className={`inline-flex items-center text-xs-dynamic px-2.5 py-1 rounded-full font-medium ${
                            isJsonValid === true ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400' : 
                            isJsonValid === false ? 'bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400' : 
                            'bg-slate-100 dark:bg-slate-600 text-slate-500'
                          }`}>
                            {isJsonValid === true ? '✓ 有效' : isJsonValid === false ? '✗ 无效' : '未校验'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              const currentContent = requestBody || formatJson(requestExample);
                              if (!currentContent.trim()) {
                                message.warning('请先输入内容');
                                return;
                              }
                              try {
                                const parsed = JSON.parse(currentContent);
                                const formatted = JSON.stringify(parsed, null, 2);
                                setRequestBody(formatted);
                                setIsJsonValid(true);
                                message.success('已格式化');
                              } catch {
                                message.error('JSON 格式错误');
                              }
                            }}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-sm-dynamic font-medium text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-white dark:hover:bg-slate-600 rounded-lg transition-all duration-200"
                          >
                            <AlignLeft className="w-4 h-4" />
                            格式化
                          </button>
                          <button
                            onClick={() => {
                              const currentContent = requestBody || formatJson(requestExample);
                              if (!currentContent.trim()) {
                                message.warning('请先输入内容');
                                return;
                              }
                              try {
                                const parsed = JSON.parse(currentContent);
                                const compressed = JSON.stringify(parsed);
                                setRequestBody(compressed);
                                setIsJsonValid(true);
                                message.success('已压缩');
                              } catch {
                                message.error('JSON 格式错误');
                              }
                            }}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-sm-dynamic font-medium text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-white dark:hover:bg-slate-600 rounded-lg transition-all duration-200"
                          >
                            <Minimize2 className="w-4 h-4" />
                            压缩
                          </button>
                          <button
                            onClick={() => {
                              const currentContent = requestBody || formatJson(requestExample);
                              if (!currentContent.trim()) {
                                setIsJsonValid(null);
                                message.info('请输入内容后再校验');
                                return;
                              }
                              try {
                                JSON.parse(currentContent);
                                setIsJsonValid(true);
                                message.success('JSON 格式有效');
                              } catch {
                                setIsJsonValid(false);
                                message.error('JSON 格式无效');
                              }
                            }}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-sm-dynamic font-medium text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-white dark:hover:bg-slate-600 rounded-lg transition-all duration-200"
                          >
                            <CheckCircle className="w-4 h-4" />
                            校验
                          </button>
                          <button
                            onClick={() => {
                              setRequestBody(formatJson(requestExample));
                              setIsJsonValid(true);
                              setFillExampleClicked(true);
                              message.success('示例已填充');
                              setTimeout(() => setFillExampleClicked(false), 2000);
                            }}
                            className={`flex items-center gap-1.5 px-3 py-1.5 text-sm-dynamic font-medium transition-all duration-200 rounded-lg ${
                              fillExampleClicked 
                                ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400' 
                                : `${colors.badgeLight} hover:opacity-80`
                            }`}
                          >
                            {fillExampleClicked ? (
                              <span className="flex items-center gap-1">
                                <Check className="w-4 h-4" />
                                已填充
                              </span>
                            ) : (
                              '填充示例'
                            )}
                          </button>
                        </div>
                      </div>
                      <div className="p-4">
                        <CodeMirror
                          value={requestBody || formatJson(requestExample)}
                          height="auto"
                          minHeight="280px"
                          maxHeight="600px"
                          theme={isDarkTheme ? 'dark' : 'light'}
                          extensions={[json()]}
                          onChange={(value) => {
                            setRequestBody(value);
                            setIsJsonValid(null);
                          }}
                          basicSetup={{
                            lineNumbers: true,
                            highlightActiveLineGutter: true,
                            highlightActiveLine: true,
                          }}
                          style={{
                            fontSize: '14px',
                            fontFamily: "'JetBrains Mono', 'Fira Code', Menlo, Monaco, 'Courier New', monospace",
                            borderRadius: '8px',
                            border: '1px solid #e5e7eb',
                          }}
                          editable
                        />
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-600">
                    <Button
                      type="text"
                      icon={<RefreshCw className="w-4 h-4" />}
                      onClick={() => {
                        setRequestBody('');
                        setRequestHeaders(DEFAULT_HEADERS);
                      }}
                      className="text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-600 rounded-lg font-medium"
                    >
                      重置
                    </Button>
                    <div className="flex items-center gap-3">
                      <Button
                        type="text"
                        icon={<Code className="w-4 h-4" />}
                        onClick={handleGenerateCode}
                        className="text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-600 rounded-lg font-medium"
                      >
                        生成代码
                      </Button>
                      <button
                        onClick={handleSendRequest}
                        disabled={isLoading}
                        className={`relative px-8 py-3.5 text-white font-bold text-base-dynamic rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-0.5 active:translate-y-0 inline-flex items-center justify-center gap-2 overflow-hidden
                          ${selectedEndpoint.method === 'GET' ? 'bg-emerald-500 hover:bg-emerald-600 shadow-[0_4px_20px_rgba(16,185,129,0.4)] hover:shadow-[0_6px_28px_rgba(16,185,129,0.5)]' : ''}
                          ${selectedEndpoint.method === 'POST' ? 'bg-blue-500 hover:bg-blue-600 shadow-[0_4px_20px_rgba(59,130,246,0.4)] hover:shadow-[0_6px_28px_rgba(59,130,246,0.5)]' : ''}
                          ${selectedEndpoint.method === 'PUT' ? 'bg-orange-500 hover:bg-orange-600 shadow-[0_4px_20px_rgba(249,115,22,0.4)] hover:shadow-[0_6px_28px_rgba(249,115,22,0.5)]' : ''}
                          ${selectedEndpoint.method === 'DELETE' ? 'bg-red-500 hover:bg-red-600 shadow-[0_4px_20px_rgba(239,68,68,0.4)] hover:shadow-[0_6px_28px_rgba(239,68,68,0.5)]' : ''}
                          ${selectedEndpoint.method === 'PATCH' ? 'bg-violet-500 hover:bg-violet-600 shadow-[0_4px_20px_rgba(139,92,246,0.4)] hover:shadow-[0_6px_28px_rgba(139,92,246,0.5)]' : ''}
                          disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:transform-none
                        `}
                      >
                        <span className="relative z-10 flex items-center gap-2">
                          <Send className="w-5 h-5" />
                          {isLoading ? '发送中...' : '发送请求'}
                        </span>
                        <span className="absolute inset-0 bg-white/20 translate-x-[-100%] hover:translate-x-[100%] transition-transform duration-700" />
                      </button>
                    </div>
                  </div>
                </div>

                {hasResponseContent && (
                  <div className="bg-gradient-to-br from-slate-50 to-white dark:from-slate-700/50 dark:to-slate-800 rounded-xl border border-slate-200 dark:border-slate-600 p-5">
                    <div className="flex items-center justify-between mb-4 pb-4 border-b border-slate-200 dark:border-slate-600">
                      <div className="flex items-center gap-3">
                        <span className={`px-4 py-2 rounded-lg text-sm font-bold shadow-sm ${
                          isSuccessful ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'
                        }`}>
                          {response.status}
                        </span>
                        <span className={`text-lg font-semibold ${
                          isSuccessful ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                        }`}>
                          {isSuccessful ? '成功' : '错误'}
                        </span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-sm text-slate-500 dark:text-slate-400">{response.duration}ms</span>
                        <button
                          onClick={() => copyToClipboard(formatJson(response.body))}
                          className={`text-sm ${colors.textColor} hover:opacity-80 font-medium flex items-center gap-1`}
                        >
                          <Copy className="w-4 h-4" />
                          复制
                        </button>
                        <button className="text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 font-medium flex items-center gap-1">
                          <Download className="w-4 h-4" />
                          下载
                        </button>
                      </div>
                    </div>

                    <Tabs
                      activeKey={responseTab}
                      onChange={setResponseTab}
                      items={[
                        {
                          key: 'formatted',
                          label: <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">格式化</span>,
                        },
                        {
                          key: 'raw',
                          label: <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">原始</span>,
                        },
                        {
                          key: 'responseHeaders',
                          label: <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">响应头</span>,
                        },
                      ]}
                    />

                    <div className="bg-white dark:bg-slate-800 rounded-xl overflow-hidden mt-4 border border-slate-200 dark:border-slate-600">
                      <div className="overflow-x-auto max-h-96 overflow-y-auto">
                        <SyntaxHighlighter
                          language="json"
                          style={isDarkTheme ? oneDark : oneLight}
                          customStyle={{ margin: 0, padding: '16px', borderRadius: 0 }}
                          showLineNumbers={false}
                        >
                          {responseTab === 'formatted' ? formatJson(response.body) : 
                           responseTab === 'raw' ? typeof response.body === 'string' ? response.body : JSON.stringify(response.body) :
                           JSON.stringify(response.headers, null, 2)}
                        </SyntaxHighlighter>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {showCodeModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[300] p-4">
          <div className={`rounded-2xl shadow-2xl w-full max-w-5xl h-[85vh] flex flex-col overflow-hidden ${
            colors.cardBg
          }`}>
            <div className={`flex items-center justify-between px-6 py-4 border-b ${colors.border} ${colors.headerBg}`}>
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl ${colors.badge} flex items-center justify-center shadow-lg`}>
                  <Code className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className={`text-lg font-semibold ${colors.textPrimary}`}>生成代码</h3>
                  <p className={`text-xs ${colors.textMuted}`}>选择语言生成对应的代码示例</p>
                </div>
              </div>
              <button
                onClick={() => setShowCodeModal(false)}
                className={`p-2 rounded-xl transition-all duration-200 hover:scale-105 ${colors.hoverBg}`}
              >
                <X className={`w-5 h-5 ${colors.textMuted}`} />
              </button>
            </div>
            
            <div className="flex-1 flex overflow-hidden">
              <div className={`w-72 border-r ${colors.border} ${colors.sidebarBg} p-4 overflow-y-auto`}>
                <div className={`text-xs font-semibold uppercase tracking-wider mb-4 ${colors.textMuted}`}>语言选择</div>
                <div className="space-y-4">
                  {languageGroups.map((group) => (
                    <div key={group.name}>
                      <div className={`text-xs font-medium mb-2 px-1 ${colors.textMuted}`}>{group.name}</div>
                      <div className="space-y-1">
                        {group.languages.map((lang) => (
                          <button
                            key={lang}
                            onClick={() => handleCodeLanguageChange(lang)}
                            className={`w-full text-left px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                              codeLanguage === lang
                                ? `${colors.badge} text-white shadow-md`
                                : `${colors.sidebarItemHover} ${colors.textPrimary}`
                            }`}
                          >
                            {languageLabels[lang]}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="flex-1 flex flex-col overflow-hidden">
                <div className={`flex items-center justify-between px-5 py-3 ${colors.codeHeaderBg} border-b ${colors.codeBorder}`}>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-rose-500" />
                    <div className="w-3 h-3 rounded-full bg-amber-500" />
                    <div className="w-3 h-3 rounded-full bg-emerald-500" />
                    <span className={`ml-3 text-sm font-medium ${colors.codeTextMuted}`}>{languageLabels[codeLanguage]}</span>
                  </div>
                  <button
                    onClick={() => {
                      copyToClipboard(generatedCode);
                      setCodeCopied(true);
                      setTimeout(() => setCodeCopied(false), 2000);
                    }}
                    className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                      codeCopied 
                        ? 'bg-emerald-500 text-white' 
                        : `${colors.badge} text-white hover:opacity-90`
                    }`}
                  >
                    {codeCopied ? (
                      <>
                        <Check className="w-4 h-4" />
                        <span className="flex items-center gap-1">
                          <span>已复制</span>
                          <span className="animate-pulse">✓</span>
                        </span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        复制代码
                      </>
                    )}
                  </button>
                </div>
                <div className={`flex-1 ${colors.codeBg}`} style={{ height: '100%' }}>
                  <SyntaxHighlighter
                    language={codeLanguage.startsWith('javascript') ? 'javascript' : codeLanguage.startsWith('java') ? 'java' : codeLanguage === 'curl' ? 'bash' : codeLanguage === 'python' ? 'python' : codeLanguage === 'go' ? 'go' : 'text'}
                    style={isDarkTheme ? oneDark : oneLight}
                    customStyle={{ margin: 0, padding: '24px', borderRadius: 0, height: '100%', minHeight: '100%', display: 'block' }}
                    showLineNumbers={false}
                    wrapLines={true}
                  >
                    {generatedCode}
                  </SyntaxHighlighter>
                </div>
              </div>
            </div>
            
            <div className={`flex items-center justify-end gap-3 px-6 py-3 border-t ${colors.border} ${colors.headerBg}`}>
              <Button
                onClick={() => setShowCodeModal(false)}
                className={`px-5 py-2 text-sm font-medium ${colors.textMuted} hover:${colors.textPrimary} ${colors.hoverBg} rounded-lg transition-all duration-200`}
              >
                关闭
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
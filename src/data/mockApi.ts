import type { ParsedOpenApi } from '@/types';

export const mockAuthApiData: ParsedOpenApi = {
  info: { title: '认证端 API', description: '用户认证相关接口', version: '1.0.0' },
  servers: [{ url: 'http://localhost:8010/v3/api-docs/auth-api', description: '认证服务' }],
  groups: [
    {
      name: '认证接口',
      description: '用户登录、登出等认证相关接口',
      endpoints: [
        {
          id: 'post-/auth/login',
          path: '/auth/login',
          method: 'POST',
          summary: '用户登录',
          description: '用户通过邮箱和密码登录系统',
          operationId: 'login',
          tags: ['认证接口'],
          parameters: [],
          requestBody: {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    email: { type: 'string', format: 'email', description: '用户邮箱' },
                    password: { type: 'string', description: '用户密码' },
                  },
                  required: ['email', 'password'],
                },
              },
            },
          },
          responses: {
            '200': {
              description: '登录成功',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      token: { type: 'string', description: '访问令牌' },
                      refreshToken: { type: 'string', description: '刷新令牌' },
                      user: {
                        type: 'object',
                        properties: { id: { type: 'string' }, name: { type: 'string' }, email: { type: 'string' } },
                      },
                    },
                  },
                  example: { token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...', refreshToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...', user: { id: '12345', name: '张三', email: 'zhangsan@example.com' } },
                },
              },
            },
            '401': {
              description: '用户名或密码错误',
              content: {
                'application/json': {
                  schema: { type: 'object', properties: { code: { type: 'integer' }, message: { type: 'string' } } },
                },
              },
            },
          },
        },
        {
          id: 'post-/auth/logout',
          path: '/auth/logout',
          method: 'POST',
          summary: '用户登出',
          description: '用户退出登录',
          operationId: 'logout',
          tags: ['认证接口'],
          parameters: [],
          responses: {
            '200': {
              description: '登出成功',
              content: {
                'application/json': {
                  schema: { type: 'object', properties: { message: { type: 'string' } } },
                },
              },
            },
          },
        },
        {
          id: 'post-/auth/refresh',
          path: '/auth/refresh',
          method: 'POST',
          summary: '刷新令牌',
          description: '使用刷新令牌获取新的访问令牌',
          operationId: 'refreshToken',
          tags: ['认证接口'],
          parameters: [],
          requestBody: {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: { refreshToken: { type: 'string', description: '刷新令牌' } },
                  required: ['refreshToken'],
                },
              },
            },
          },
          responses: {
            '200': {
              description: '刷新成功',
              content: {
                'application/json': {
                  schema: { type: 'object', properties: { token: { type: 'string', description: '新的访问令牌' } } },
                },
              },
            },
          },
        },
      ],
    },
    {
      name: '权限验证',
      description: '权限验证相关接口',
      endpoints: [
        {
          id: 'get-/auth/verify',
          path: '/auth/verify',
          method: 'GET',
          summary: '验证令牌',
          description: '验证访问令牌是否有效',
          operationId: 'verifyToken',
          tags: ['权限验证'],
          parameters: [],
          responses: {
            '200': {
              description: '令牌有效',
              content: {
                'application/json': {
                  schema: { type: 'object', properties: { valid: { type: 'boolean' }, userId: { type: 'string' } } },
                },
              },
            },
            '401': {
              description: '令牌无效或已过期',
              content: {
                'application/json': {
                  schema: { type: 'object', properties: { code: { type: 'integer' }, message: { type: 'string' } } },
                },
              },
            },
          },
        },
      ],
    },
  ],
};

export const mockManageApiData: ParsedOpenApi = {
  info: { title: '管理端 API', description: '系统管理相关接口', version: '1.0.0' },
  servers: [{ url: 'http://localhost:8010/v3/api-docs/manage-api', description: '管理服务' }],
  groups: [
    {
      name: '用户管理',
      description: '用户管理相关接口',
      endpoints: [
        {
          id: 'get-/users',
          path: '/users',
          method: 'GET',
          summary: '获取用户列表',
          description: '获取系统中的用户列表，支持分页',
          operationId: 'getUsers',
          tags: ['用户管理'],
          parameters: [
            { name: 'page', in: 'query', description: '页码', required: false, schema: { type: 'integer', default: 1 } },
            { name: 'limit', in: 'query', description: '每页数量', required: false, schema: { type: 'integer', default: 10 } },
            { name: 'search', in: 'query', description: '搜索关键词', required: false, schema: { type: 'string' } },
          ],
          responses: {
            '200': {
              description: '获取成功',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      data: { type: 'array', items: { type: 'object', properties: { id: { type: 'string' }, name: { type: 'string' }, email: { type: 'string' }, createdAt: { type: 'string', format: 'date-time' } } } },
                      total: { type: 'integer' },
                      page: { type: 'integer' },
                      limit: { type: 'integer' },
                    },
                  },
                  example: { data: [{ id: '1', name: '张三', email: 'zhangsan@example.com', createdAt: '2024-01-01T10:00:00Z' }], total: 100, page: 1, limit: 10 },
                },
              },
            },
          },
        },
        {
          id: 'get-/users/{id}',
          path: '/users/{id}',
          method: 'GET',
          summary: '获取用户详情',
          description: '根据用户ID获取用户详细信息',
          operationId: 'getUserById',
          tags: ['用户管理'],
          parameters: [{ name: 'id', in: 'path', description: '用户ID', required: true, schema: { type: 'string' } }],
          responses: {
            '200': {
              description: '获取成功',
              content: {
                'application/json': {
                  schema: { type: 'object', properties: { id: { type: 'string' }, name: { type: 'string' }, email: { type: 'string' }, createdAt: { type: 'string', format: 'date-time' }, updatedAt: { type: 'string', format: 'date-time' } } },
                },
              },
            },
            '404': {
              description: '用户不存在',
              content: {
                'application/json': {
                  schema: { type: 'object', properties: { code: { type: 'integer' }, message: { type: 'string' } } },
                },
              },
            },
          },
        },
        {
          id: 'post-/users',
          path: '/users',
          method: 'POST',
          summary: '创建用户',
          description: '创建新用户',
          operationId: 'createUser',
          tags: ['用户管理'],
          parameters: [],
          requestBody: {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    name: { type: 'string', description: '用户姓名' },
                    email: { type: 'string', format: 'email', description: '用户邮箱' },
                    password: { type: 'string', description: '用户密码' },
                  },
                  required: ['name', 'email', 'password'],
                },
              },
            },
          },
          responses: {
            '201': {
              description: '创建成功',
              content: {
                'application/json': {
                  schema: { type: 'object', properties: { id: { type: 'string' }, name: { type: 'string' }, email: { type: 'string' }, createdAt: { type: 'string', format: 'date-time' } } },
                },
              },
            },
            '400': {
              description: '参数错误',
              content: {
                'application/json': {
                  schema: { type: 'object', properties: { code: { type: 'integer' }, message: { type: 'string' } } },
                },
              },
            },
          },
        },
        {
          id: 'put-/users/{id}',
          path: '/users/{id}',
          method: 'PUT',
          summary: '更新用户',
          description: '更新用户信息',
          operationId: 'updateUser',
          tags: ['用户管理'],
          parameters: [{ name: 'id', in: 'path', description: '用户ID', required: true, schema: { type: 'string' } }],
          requestBody: {
            content: {
              'application/json': {
                schema: { type: 'object', properties: { name: { type: 'string', description: '用户姓名' }, email: { type: 'string', format: 'email', description: '用户邮箱' } } },
              },
            },
          },
          responses: {
            '200': {
              description: '更新成功',
              content: {
                'application/json': {
                  schema: { type: 'object', properties: { id: { type: 'string' }, name: { type: 'string' }, email: { type: 'string' }, updatedAt: { type: 'string', format: 'date-time' } } },
                },
              },
            },
          },
        },
        {
          id: 'delete-/users/{id}',
          path: '/users/{id}',
          method: 'DELETE',
          summary: '删除用户',
          description: '删除指定用户',
          operationId: 'deleteUser',
          tags: ['用户管理'],
          parameters: [{ name: 'id', in: 'path', description: '用户ID', required: true, schema: { type: 'string' } }],
          responses: {
            '200': {
              description: '删除成功',
              content: {
                'application/json': {
                  schema: { type: 'object', properties: { message: { type: 'string' } } },
                },
              },
            },
            '404': {
              description: '用户不存在',
              content: {
                'application/json': {
                  schema: { type: 'object', properties: { code: { type: 'integer' }, message: { type: 'string' } } },
                },
              },
            },
          },
        },
      ],
    },
    {
      name: '角色管理',
      description: '角色和权限管理接口',
      endpoints: [
        {
          id: 'get-/roles',
          path: '/roles',
          method: 'GET',
          summary: '获取角色列表',
          description: '获取系统角色列表',
          operationId: 'getRoles',
          tags: ['角色管理'],
          parameters: [],
          responses: {
            '200': {
              description: '获取成功',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      data: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            id: { type: 'string' },
                            name: { type: 'string' },
                            permissions: { type: 'array', items: { type: 'string' } },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      ],
    },
  ],
};

export const mockDocuments: ParsedOpenApi[] = [mockAuthApiData, mockManageApiData];

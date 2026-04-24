import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'
import dotenv from 'dotenv'

dotenv.config()

const defaultOpenApiConfig = JSON.stringify([
  { name: '认证端 API', path: '/v3/api-docs/auth-api' },
  { name: '管理端 API', path: '/v3/api-docs/manage-api' },
])

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  define: {
    'import.meta.env.VITE_OPENAPI_CONFIG': JSON.stringify(process.env.VITE_OPENAPI_CONFIG || defaultOpenApiConfig),
    'import.meta.env.VITE_APP_TITLE': JSON.stringify(process.env.VITE_APP_TITLE || 'API Explorer'),
    'import.meta.env.VITE_APP_DESCRIPTION': JSON.stringify(process.env.VITE_APP_DESCRIPTION || 'API 文档中心'),
    'import.meta.env.VITE_API_BASE_URL': JSON.stringify(process.env.VITE_API_BASE_URL || 'http://localhost:8010'),
  },
  server: {
    proxy: {
      '/v3/api-docs': {
        target: process.env.VITE_API_BASE_URL || 'http://localhost:8010',
        changeOrigin: true,
        secure: false,
        ws: true,
      },
      '/api': {
        target: process.env.VITE_API_BASE_URL || 'http://localhost:8010',
        changeOrigin: true,
        secure: false,
        ws: true,
      },
    },
  },
})

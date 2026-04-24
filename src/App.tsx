import { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ConfigProvider, theme } from 'antd';
import { Layout } from '@/components/Layout';
import { useApiStore } from '@/store/api';
import { useSettingsStore } from '@/store/settings';
import { parseOpenApiDocument } from '@/services/apiParser';
import { getOpenApiConfig, getBasePath } from '@/config';
import { mockDocuments } from '@/data/mockApi';
import type { OpenApiConfigItem } from '@/config';

function AppContent() {
  const { setDocuments, setLoading, setError } = useApiStore();
  const { theme: appTheme, fontSize, customFontSize } = useSettingsStore();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    const root = document.documentElement;
    if (appTheme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, []);

  useEffect(() => {
    if (!isMounted) return;
    
    const loadDocuments = async () => {
      setLoading(true);
      try {
        const openApiConfig = getOpenApiConfig();
        
        if (openApiConfig && openApiConfig.length > 0) {
          const documents = await Promise.all(
            openApiConfig.map(async (item: OpenApiConfigItem) => {
              try {
                const document = await parseOpenApiDocument(item.path);
                return {
                  ...document,
                  info: {
                    ...document.info,
                    title: item.name,
                  },
                };
              } catch (error) {
                console.error(`Failed to load ${item.name}:`, error);
                return null;
              }
            })
          );
          
          const validDocuments = documents.filter((doc) => doc !== null);
          
          if (validDocuments.length > 0) {
            setDocuments(validDocuments);
            setError(null);
          } else {
            throw new Error('All OpenAPI documents failed to load');
          }
        } else {
          setDocuments(mockDocuments);
          setError(null);
        }
      } catch (error) {
        console.error('Failed to load documents:', error);
        setDocuments(mockDocuments);
        setError('Failed to load API documents, using mock data');
      } finally {
        setLoading(false);
      }
    };

    loadDocuments();
  }, [setDocuments, setLoading, setError, isMounted]);

  useEffect(() => {
    const root = document.documentElement;
    if (appTheme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [appTheme]);

  useEffect(() => {
    const root = document.documentElement;
    
    const getFontSize = () => {
      const screenWidth = window.innerWidth;
      
      let baseSize = 14;
      if (fontSize === 'small') {
        baseSize = 12;
      } else if (fontSize === 'large') {
        baseSize = 16;
      } else if (fontSize === 'custom') {
        baseSize = customFontSize;
      }
      
      const resolutionFactor = screenWidth > 1920 ? 1.1 : screenWidth < 768 ? 0.9 : 1;
      
      return baseSize * resolutionFactor;
    };

    const fontSizeValue = getFontSize();
    root.style.setProperty('--font-size-base', `${fontSizeValue}px`);
    document.body.style.fontSize = `${fontSizeValue}px`;
  }, [fontSize, customFontSize]);

  useEffect(() => {
    const handleResize = () => {
      const root = document.documentElement;
      
      const getFontSize = () => {
        const screenWidth = window.innerWidth;
        
        let baseSize = 14;
        if (fontSize === 'small') {
          baseSize = 12;
        } else if (fontSize === 'large') {
          baseSize = 16;
        } else if (fontSize === 'custom') {
          baseSize = customFontSize;
        }
        
        const resolutionFactor = screenWidth > 1920 ? 1.1 : screenWidth < 768 ? 0.9 : 1;
        
        return baseSize * resolutionFactor;
      };

      const fontSizeValue = getFontSize();
      root.style.setProperty('--font-size-base', `${fontSizeValue}px`);
      document.body.style.fontSize = `${fontSizeValue}px`;
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [fontSize, customFontSize]);

  const antdTheme = appTheme === 'dark' ? theme.darkAlgorithm : theme.defaultAlgorithm;

  return (
    <ConfigProvider theme={{ algorithm: antdTheme }}>
      <Layout />
    </ConfigProvider>
  );
}

function App() {
  const basePath = getBasePath();
  
  return (
    <Router basename={basePath}>
      <Routes>
        <Route path="/" element={<AppContent />} />
        <Route path="/api-docs/*" element={<AppContent />} />
      </Routes>
    </Router>
  );
}

export default App;

import { Menu, Search, Sun, Moon, Globe, Settings, Building2 } from 'lucide-react';
import { Input, Button, Dropdown, Space } from 'antd';
import { useState } from 'react';
import { useSettingsStore } from '@/store/settings';

interface HeaderProps {
  onMenuClick: () => void;
  onSettingsClick: () => void;
}

export function Header({ onMenuClick, onSettingsClick }: HeaderProps) {
  const { theme, updateTheme, language, updateLanguage } = useSettingsStore();
  const [searchFocused, setSearchFocused] = useState(false);

  const isDark = theme === 'dark';

  const handleThemeToggle = () => {
    updateTheme(isDark ? 'light' : 'dark');
  };

  const handleLanguageChange = (lang: 'zh' | 'en') => {
    updateLanguage(lang);
  };

  const navItems = ['概览', '接入流程', 'API文档', '代码示例'];

  return (
    <header className={`fixed top-0 left-0 right-0 z-30 h-14 bg-[var(--color-surface-light)] dark:bg-[var(--color-surface-dark)] border-b border-[var(--color-border-light)] dark:border-[var(--color-border-dark)] transition-all duration-300 ${searchFocused ? 'shadow-lg' : ''}`}>
      <div className="flex items-center justify-between h-full px-4 lg:px-6">
        <div className="flex items-center gap-4">
          <button
            onClick={onMenuClick}
            className="lg:hidden p-2 hover:bg-[var(--color-surface-light-secondary)] dark:hover:bg-[var(--color-surface-dark-hover)] rounded-lg transition-colors"
          >
            <Menu className="w-5 h-5 text-[var(--color-text-light-secondary)] dark:text-[var(--color-text-dark-secondary)]" />
          </button>
          
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-secondary)] flex items-center justify-center shadow-md">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <div className="hidden sm:block">
              <h1 className="text-base-dynamic font-semibold text-[var(--color-text-light-primary)] dark:text-[var(--color-text-dark-primary)]">API Explorer</h1>
              <p className="text-xs-dynamic text-[var(--color-text-light-muted)] dark:text-[var(--color-text-dark-muted)]">企业级 API 文档管理平台</p>
            </div>
          </div>
        </div>

        <nav className="hidden lg:flex items-center gap-1">
          {navItems.map((item) => (
            <button
              key={item}
              className={`px-4 py-2 text-sm-dynamic font-medium rounded-lg transition-all duration-200 ${
                item === 'API文档'
                  ? 'bg-blue-50 dark:bg-blue-900/30 text-[var(--color-primary-light)]'
                  : 'text-[var(--color-text-light-secondary)] dark:text-[var(--color-text-dark-secondary)] hover:bg-[var(--color-surface-light-secondary)] dark:hover:bg-[var(--color-surface-dark-hover)]'
              }`}
            >
              {item}
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-1">
          <Dropdown
            menu={{
              items: [
                { key: 'zh', label: '中文', onClick: () => handleLanguageChange('zh') },
                { key: 'en', label: 'English', onClick: () => handleLanguageChange('en') },
              ],
            }}
            placement="bottom"
          >
            <Button type="text" className="text-[var(--color-text-light-secondary)] dark:text-[var(--color-text-dark-secondary)] hover:bg-[var(--color-surface-light-secondary)] dark:hover:bg-[var(--color-surface-dark-hover)] rounded-lg">
              <Space>
                <Globe className="w-4 h-4" />
                <span className="hidden sm:inline text-sm-dynamic">{language === 'zh' ? '中文' : 'English'}</span>
              </Space>
            </Button>
          </Dropdown>

          <Button
            type="text"
            onClick={handleThemeToggle}
            className="text-[var(--color-text-light-secondary)] dark:text-[var(--color-text-dark-secondary)] hover:bg-[var(--color-surface-light-secondary)] dark:hover:bg-[var(--color-surface-dark-hover)] rounded-lg"
          >
            {isDark ? (
              <Sun className="w-5 h-5" />
            ) : (
              <Moon className="w-5 h-5" />
            )}
          </Button>

          <Button 
            type="text" 
            onClick={onSettingsClick}
            className="text-[var(--color-text-light-secondary)] dark:text-[var(--color-text-dark-secondary)] hover:bg-[var(--color-surface-light-secondary)] dark:hover:bg-[var(--color-surface-dark-hover)] rounded-lg"
          >
            <Settings className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </header>
  );
}

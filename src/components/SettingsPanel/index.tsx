import React, { useState, useEffect } from 'react';
import { X, Sun, Moon, Globe, Type, Monitor } from 'lucide-react';
import { Slider, Select, Card } from 'antd';
import { useSettingsStore } from '@/store/settings';

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const fontSizeOptions = [
  { value: 'small', label: '小', description: '12px' },
  { value: 'medium', label: '中', description: '14px' },
  { value: 'large', label: '大', description: '16px' },
  { value: 'custom', label: '自定义', description: '自定义大小' },
];

const languageOptions = [
  { value: 'zh', label: '中文' },
  { value: 'en', label: 'English' },
];

const themeOptions = [
  { value: 'light', label: '亮色模式', icon: Sun },
  { value: 'dark', label: '暗色模式', icon: Moon },
];

export function SettingsPanel({ isOpen, onClose }: SettingsPanelProps) {
  const {
    theme,
    language,
    fontSize,
    customFontSize,
    updateTheme,
    updateLanguage,
    updateFontSize,
    updateCustomFontSize,
  } = useSettingsStore();

  const [localCustomSize, setLocalCustomSize] = useState(customFontSize);
  const [applyCustomSize, setApplyCustomSize] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setLocalCustomSize(customFontSize);
      setApplyCustomSize(false);
    }
  }, [isOpen, customFontSize]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const handleFontSizeChange = (value: string) => {
    updateFontSize(value as 'small' | 'medium' | 'large' | 'custom');
    if (value === 'custom') {
      setApplyCustomSize(true);
    }
  };

  const handleCustomSizeChange = (value: number | number[]) => {
    setLocalCustomSize(Array.isArray(value) ? value[0] : value);
  };

  const applyCustomFontSize = () => {
    updateCustomFontSize(localCustomSize);
    updateFontSize('custom');
    setApplyCustomSize(false);
  };

  const getFontSizeValue = () => {
    switch (fontSize) {
      case 'small':
        return 12;
      case 'medium':
        return 14;
      case 'large':
        return 16;
      case 'custom':
        return customFontSize;
      default:
        return 14;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center">
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-md animate-fadeIn"
        onClick={onClose}
      />
      
      <div className="relative w-full max-w-lg mx-4 sm:mx-6 lg:max-w-xl xl:max-w-2xl bg-white dark:bg-slate-800 rounded-3xl shadow-2xl overflow-hidden animate-slideUp">
        <div className="flex items-center justify-between px-6 sm:px-8 py-6 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg">
              <Type className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl-dynamic sm:text-2xl-dynamic font-bold text-slate-900 dark:text-slate-100">系统设置</h2>
              <p className="text-sm-dynamic text-slate-500 dark:text-slate-400">配置您的个性化体验</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-3 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-all duration-200 hover:scale-110"
          >
            <X className="w-6 h-6 text-slate-500 dark:text-slate-400" />
          </button>
        </div>

        <div className="p-6 sm:p-8 space-y-8">
          <Card className="bg-gradient-to-br from-slate-50 to-white dark:from-slate-700/50 dark:to-slate-800 border-slate-200 dark:border-slate-700 rounded-2xl">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                <Monitor className="w-6 h-6 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <h3 className="text-lg-dynamic font-bold text-slate-900 dark:text-slate-100">主题模式</h3>
                <p className="text-sm-dynamic text-slate-500 dark:text-slate-400">选择适合您的界面风格</p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              {themeOptions.map((option) => {
                const Icon = option.icon;
                const isActive = theme === option.value;
                return (
                  <button
                    key={option.value}
                    onClick={() => updateTheme(option.value as 'light' | 'dark')}
                    className={`flex items-center gap-4 p-5 rounded-2xl border-2 transition-all duration-300 ${
                      isActive
                        ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/30 shadow-md'
                        : 'border-slate-200 dark:border-slate-600 hover:border-slate-300 dark:hover:border-slate-500 hover:shadow-sm'
                    }`}
                  >
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300 ${
                      isActive ? 'bg-amber-500 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                    }`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <span className={`text-base-dynamic font-semibold ${isActive ? 'text-amber-700 dark:text-amber-400' : 'text-slate-700 dark:text-slate-300'}`}>
                      {option.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </Card>

          <Card className="bg-gradient-to-br from-slate-50 to-white dark:from-slate-700/50 dark:to-slate-800 border-slate-200 dark:border-slate-700 rounded-2xl">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <Globe className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h3 className="text-lg-dynamic font-bold text-slate-900 dark:text-slate-100">语言</h3>
                <p className="text-sm-dynamic text-slate-500 dark:text-slate-400">选择界面显示语言</p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              {languageOptions.map((option) => {
                const isActive = language === option.value;
                return (
                  <button
                    key={option.value}
                    onClick={() => updateLanguage(option.value as 'zh' | 'en')}
                    className={`p-5 rounded-2xl border-2 transition-all duration-300 ${
                      isActive
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 shadow-md'
                        : 'border-slate-200 dark:border-slate-600 hover:border-slate-300 dark:hover:border-slate-500 hover:shadow-sm'
                    }`}
                  >
                    <span className={`text-base-dynamic font-semibold ${isActive ? 'text-blue-700 dark:text-blue-400' : 'text-slate-700 dark:text-slate-300'}`}>
                      {option.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </Card>

          <Card className="bg-gradient-to-br from-slate-50 to-white dark:from-slate-700/50 dark:to-slate-800 border-slate-200 dark:border-slate-700 rounded-2xl">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 rounded-xl bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
                <Type className="w-6 h-6 text-violet-600 dark:text-violet-400" />
              </div>
              <div>
                <h3 className="text-lg-dynamic font-bold text-slate-900 dark:text-slate-100">字体大小</h3>
                <p className="text-sm-dynamic text-slate-500 dark:text-slate-400">调整界面文字大小</p>
              </div>
            </div>
            
            <Select
              value={fontSize}
              onChange={handleFontSizeChange}
              options={fontSizeOptions.map((opt) => ({
                value: opt.value,
                label: (
                  <div className="flex items-center justify-between">
                    <span className="text-base-dynamic font-medium">{opt.label}</span>
                    <span className="text-sm-dynamic text-slate-500">{opt.description}</span>
                  </div>
                ),
              }))}
              className="w-full mb-6"
              size="large"
            />

            {(fontSize === 'custom' || applyCustomSize) && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-base-dynamic font-medium text-slate-700 dark:text-slate-300">自定义大小</span>
                  <span className="text-base-dynamic font-mono font-bold text-violet-600 dark:text-violet-400">
                    {localCustomSize}px
                  </span>
                </div>
                <Slider
                  min={10}
                  max={24}
                  value={localCustomSize}
                  onChange={handleCustomSizeChange}
                  tooltip={{ formatter: (value) => `${value}px` }}
                  className="w-full"
                />
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setLocalCustomSize(14);
                    }}
                    className="flex-1 py-3 text-base-dynamic font-medium text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-600 hover:text-slate-800 dark:hover:text-slate-200 transition-all duration-200"
                  >
                    重置
                  </button>
                  <button
                    onClick={applyCustomFontSize}
                    className="flex-1 py-3 text-base-dynamic font-medium text-white bg-gradient-to-r from-violet-500 to-violet-600 rounded-xl shadow-md hover:shadow-lg hover:from-violet-600 hover:to-violet-700 transition-all duration-200"
                  >
                    应用
                  </button>
                </div>
              </div>
            )}

            <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-700">
              <div className="flex items-center justify-between">
                <span className="text-base-dynamic font-medium text-slate-500 dark:text-slate-400">当前字体大小</span>
                <span className="text-lg-dynamic font-mono font-bold text-violet-600 dark:text-violet-400">
                  {getFontSizeValue()}px
                </span>
              </div>
            </div>
          </Card>
        </div>

        <div className="flex gap-4 px-6 sm:px-8 py-6 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
          <button 
            onClick={onClose} 
            className="flex-1 py-3.5 px-6 text-base-dynamic font-semibold text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-600 hover:border-slate-300 dark:hover:border-slate-500 shadow-sm hover:shadow-md transition-all duration-250 transform hover:-translate-y-0.5"
          >
            取消
          </button>
          <button 
            onClick={onClose} 
            className="flex-1 py-3.5 px-6 text-base-dynamic font-semibold text-white bg-gradient-to-r from-blue-500 via-blue-600 to-indigo-600 rounded-xl shadow-lg hover:shadow-xl hover:from-blue-600 hover:via-blue-700 hover:to-indigo-700 transition-all duration-250 transform hover:-translate-y-0.5 active:translate-y-0"
          >
            确定
          </button>
        </div>
      </div>
    </div>
  );
}
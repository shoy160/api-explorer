import { useState, useEffect, useMemo, useCallback } from 'react';
import { Search, Heart, ChevronDown, ChevronRight, Clock, FolderOpen, FileCode2, Star, X, Trash2 } from 'lucide-react';
import { Input, Tooltip } from 'antd';
import { useApiStore } from '@/store/api';
import { useFavoritesStore } from '@/store/favorites';
import { useHistoryStore } from '@/store/history';
import { FAVORITE_COLORS } from '@/utils/constants';
import type { ApiEndpoint, ApiGroup, ParsedOpenApi } from '@/types';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { documents, currentDocIndex, selectedEndpoint, selectEndpoint, searchQuery, setSearchQuery, setActiveTab } = useApiStore();
  const { favorites, isFavorite, toggleFavorite, reorderFavorites } = useFavoritesStore();
  const { history, removeHistory, clearHistory } = useHistoryStore();
  const [expandedDocs, setExpandedDocs] = useState<Set<number>>(new Set([0]));
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [expandedFavorites, setExpandedFavorites] = useState<Set<string>>(new Set());
  const [activeSection, setActiveSection] = useState<'favorites' | 'history' | 'api'>('api');
  const [isFirstLoad, setIsFirstLoad] = useState(true);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  useEffect(() => {
    if (documents.length > 0 && currentDocIndex >= 0 && !expandedDocs.has(currentDocIndex)) {
      setExpandedDocs((prev) => new Set([...prev, currentDocIndex]));
    }
  }, [currentDocIndex, documents.length]);

  useEffect(() => {
    if (isFirstLoad) {
      const currentDoc = documents[currentDocIndex];
      if (currentDoc?.groups.length > 0) {
        setExpandedGroups(new Set([currentDoc.groups[0].name]));
      }
      setIsFirstLoad(false);
    }
  }, [currentDocIndex, documents, isFirstLoad]);

  const toggleDoc = (docIndex: number) => {
    setExpandedDocs((prev) => {
      const newExpanded = new Set(prev);
      if (newExpanded.has(docIndex)) {
        if (documents.length > 1) {
          newExpanded.delete(docIndex);
        }
      } else {
        newExpanded.add(docIndex);
      }
      return newExpanded;
    });
  };

  const toggleGroup = (groupName: string) => {
    setExpandedGroups((prev) => {
      const newExpanded = new Set(prev);
      if (newExpanded.has(groupName)) {
        newExpanded.delete(groupName);
      } else {
        newExpanded.add(groupName);
      }
      return newExpanded;
    });
  };

  const handleEndpointClick = (endpoint: ApiEndpoint, openTestTab: boolean = false) => {
    selectEndpoint(endpoint);
    if (openTestTab) {
      setActiveTab('test');
    }
    onClose();
  };

  const toggleFavoriteGroup = (docTitle: string) => {
    setExpandedFavorites((prev) => {
      const newExpanded = new Set(prev);
      if (newExpanded.has(docTitle)) {
        newExpanded.delete(docTitle);
      } else {
        newExpanded.add(docTitle);
      }
      return newExpanded;
    });
  };

  const filteredEndpoints = (group: ApiGroup, doc: ParsedOpenApi): ApiEndpoint[] => {
    if (!searchQuery) return group.endpoints;
    const query = searchQuery.toLowerCase();
    return group.endpoints.filter(
      (e) =>
        e.summary?.toLowerCase().includes(query) ||
        e.path.toLowerCase().includes(query) ||
        e.operationId?.toLowerCase().includes(query)
    );
  };

  const hasFilteredEndpoints = (group: ApiGroup, doc: ParsedOpenApi): boolean => {
    return filteredEndpoints(group, doc).length > 0;
  };

  const searchResultCount = useMemo(() => {
    if (!searchQuery) return 0;
    const query = searchQuery.toLowerCase();
    
    if (activeSection === 'api') {
      let count = 0;
      documents.forEach((doc) => {
        doc.groups.forEach((group) => {
          count += filteredEndpoints(group, doc).length;
        });
      });
      return count;
    } else if (activeSection === 'favorites') {
      let count = 0;
      favorites.forEach((favorite) => {
        for (const doc of documents) {
          for (const group of doc.groups) {
            const endpoint = group.endpoints.find(e => e.id === favorite.endpointId);
            if (endpoint) {
              const fullPath = `${doc.info?.title || ''} / ${group.name} / ${endpoint.summary || endpoint.path}`;
              if (fullPath.toLowerCase().includes(query) || 
                  endpoint.summary?.toLowerCase().includes(query) || 
                  endpoint.path.toLowerCase().includes(query)) {
                count++;
                break;
              }
            }
          }
        }
      });
      return count;
    } else if (activeSection === 'history') {
      const counts: Record<string, number> = {};
      history.forEach((item) => {
        counts[item.endpointId] = (counts[item.endpointId] || 0) + 1;
      });
      return Object.keys(counts).length;
    }
    return 0;
  }, [searchQuery, documents, favorites, history, activeSection]);

  useEffect(() => {
    if (searchQuery) {
      const docsWithResults = new Set<number>();
      const groupsWithResults = new Set<string>();
      
      documents.forEach((doc, docIndex) => {
        doc.groups.forEach((group) => {
          if (hasFilteredEndpoints(group, doc)) {
            docsWithResults.add(docIndex);
            groupsWithResults.add(group.name);
          }
        });
      });
      
      setExpandedDocs(docsWithResults);
      setExpandedGroups(groupsWithResults);
    } else if (!isFirstLoad) {
      const currentDoc = documents[currentDocIndex];
      if (currentDoc?.groups.length > 0) {
        setExpandedGroups(new Set([currentDoc.groups[0].name]));
      }
    }
  }, [searchQuery, documents, currentDocIndex, isFirstLoad]);

  const getMethodClass = (method: string) => {
    const methodClasses: Record<string, string> = {
      GET: 'bg-green-500 text-white text-xs-dynamic',
      POST: 'bg-blue-500 text-white text-xs-dynamic',
      PUT: 'bg-orange-500 text-white text-xs-dynamic',
      DELETE: 'bg-red-500 text-white text-xs-dynamic',
      PATCH: 'bg-purple-500 text-white text-xs-dynamic',
    };
    return methodClasses[method] || 'bg-green-500 text-white text-xs-dynamic';
  };

  const getMethodBorderClass = (method: string) => {
    const borderClasses: Record<string, string> = {
      GET: 'bg-green-50 dark:bg-green-900/30 border-l-green-500',
      POST: 'bg-blue-50 dark:bg-blue-900/30 border-l-blue-500',
      PUT: 'bg-orange-50 dark:bg-orange-900/30 border-l-orange-500',
      DELETE: 'bg-red-50 dark:bg-red-900/30 border-l-red-500',
      PATCH: 'bg-purple-50 dark:bg-purple-900/30 border-l-purple-500',
    };
    return borderClasses[method] || 'bg-green-50 dark:bg-green-900/30 border-l-green-500';
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - timestamp;
    
    if (diff < 60000) {
      return '刚刚';
    } else if (diff < 3600000) {
      return `${Math.floor(diff / 60000)}分钟前`;
    } else if (diff < 86400000) {
      return `${Math.floor(diff / 3600000)}小时前`;
    } else if (diff < 604800000) {
      return `${Math.floor(diff / 86400000)}天前`;
    } else {
      return `${date.getMonth() + 1}/${date.getDate()}`;
    }
  };

  const truncateUrl = (url: string, maxLength: number = 40) => {
    if (url.length <= maxLength) return url;
    
    const protocolEnd = url.indexOf('://');
    const afterProtocol = protocolEnd >= 0 ? url.substring(protocolEnd + 3) : url;
    
    if (afterProtocol.length <= maxLength) return url;
    
    const halfLength = Math.floor((maxLength - 3) / 2);
    const start = afterProtocol.substring(0, halfLength);
    const end = afterProtocol.substring(afterProtocol.length - halfLength);
    
    return (protocolEnd >= 0 ? url.substring(0, protocolEnd + 3) : '') + start + '...' + end;
  };

  const mergedHistory = useMemo(() => {
    const counts: Record<string, number> = {};
    const latestItems: Record<string, typeof history[0]> = {};
    
    history.forEach((item) => {
      counts[item.endpointId] = (counts[item.endpointId] || 0) + 1;
      if (!latestItems[item.endpointId] || item.timestamp > latestItems[item.endpointId].timestamp) {
        latestItems[item.endpointId] = item;
      }
    });
    
    const result = Object.entries(latestItems).map(([endpointId, item]) => ({
      ...item,
      count: counts[endpointId] as number,
    }));
    
    result.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    return result;
  }, [history]);

  const groupedFavorites = useMemo(() => {
    const result: Record<string, Array<{ docTitle: string; groupName: string; endpoint: ApiEndpoint }>> = {};
    
    favorites.forEach((favorite) => {
      for (const doc of documents) {
        for (const group of doc.groups) {
          const endpoint = group.endpoints.find(e => e.id === favorite.endpointId);
          if (endpoint) {
            const key = doc.info?.title || '未分组';
            if (!result[key]) {
              result[key] = [];
            }
            result[key].push({
              docTitle: doc.info?.title || '',
              groupName: group.name,
              endpoint
            });
          }
        }
      }
    });

    return result;
  }, [favorites, documents]);

  useEffect(() => {
    const favoriteDocTitles = new Set<string>();
    Object.keys(groupedFavorites).forEach((docTitle) => {
      favoriteDocTitles.add(docTitle);
    });
    setExpandedFavorites(favoriteDocTitles);
  }, [groupedFavorites]);

  return (
    <>
      <div
        className={`fixed inset-0 bg-black/50 z-40 lg:hidden transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />

      <aside
        className={`fixed left-0 top-14 bg-[var(--color-surface-light)] dark:bg-[var(--color-surface-dark)] border-r border-[var(--color-border-light)] dark:border-[var(--color-border-dark)] z-[200] transition-transform duration-300 ease-out lg:translate-x-0 flex flex-col overflow-hidden w-[280px] md:w-[300px] lg:w-[320px] xl:w-[340px] ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{ height: 'calc(100vh - 56px)' }}
      >
        <button
          className="absolute top-3 right-3 lg:hidden p-1.5 hover:bg-[var(--color-surface-light-secondary)] dark:hover:bg-[var(--color-surface-dark-hover)] rounded-lg transition-colors"
        >
          <X className="w-4 h-4 text-[var(--color-text-light-muted)] dark:text-[var(--color-text-dark-muted)]" />
        </button>

        <div className="p-3 border-b border-[var(--color-border-light)] dark:border-[var(--color-border-dark)]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 z-10 pointer-events-none" />
            <Input
              placeholder="搜索接口..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full pl-10 pr-40 py-2.5 border-2 text-sm-dynamic rounded-xl focus:outline-none transition-all duration-200 ${
                searchQuery 
                  ? 'border-blue-500 bg-white dark:bg-[var(--color-surface-dark)] shadow-md' 
                  : 'border-[var(--color-border-light)] dark:border-[var(--color-border-dark)] bg-[var(--color-surface-light-secondary)] dark:bg-[var(--color-surface-dark-secondary)] hover:border-[var(--color-border-light-hover)]'
              }`}
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
              {searchQuery && (
                <>
                  <span className="text-xs-dynamic px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-md">
                    找到 {searchResultCount} 个结果
                  </span>
                  <button
                    onClick={() => setSearchQuery('')}
                    className="p-1 hover:bg-[var(--color-surface-light-tertiary)] dark:hover:bg-[var(--color-surface-dark-hover)] rounded-lg transition-colors"
                  >
                    <X className="w-3.5 h-3.5 text-[var(--color-text-light-muted)] dark:text-[var(--color-text-dark-muted)]" />
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex border-b border-[var(--color-border-light)] dark:border-[var(--color-border-dark)]">
          <button
            onClick={() => setActiveSection('api')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm-dynamic font-medium transition-all duration-200 ${
              activeSection === 'api'
                ? 'text-[var(--color-primary-light)] border-b-2 border-[var(--color-primary-light)] bg-blue-50 dark:bg-blue-900/30'
                : 'text-[var(--color-text-light-muted)] dark:text-[var(--color-text-dark-muted)] hover:text-[var(--color-text-light-secondary)] dark:hover:text-[var(--color-text-dark-secondary)]'
            }`}
          >
            <FileCode2 className="w-4 h-4" />
            <span>API</span>
          </button>
          <button
            onClick={() => setActiveSection('favorites')}
            className={`relative flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm-dynamic font-medium transition-all duration-200 ${
              activeSection === 'favorites'
                ? 'text-[var(--color-primary-light)] border-b-2 border-[var(--color-primary-light)] bg-blue-50 dark:bg-blue-900/30'
                : 'text-[var(--color-text-light-muted)] dark:text-[var(--color-text-dark-muted)] hover:text-[var(--color-text-light-secondary)] dark:hover:text-[var(--color-text-dark-secondary)]'
            }`}
          >
            <Heart className="w-4 h-4" />
            <span>收藏</span>
            {favorites.length > 0 && (
              <span className="absolute top-1 right-1 text-xs-dynamic bg-blue-500 text-white px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
                {favorites.length > 99 ? '99+' : favorites.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveSection('history')}
            className={`relative flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm-dynamic font-medium transition-all duration-200 ${
              activeSection === 'history'
                ? 'text-[var(--color-primary-light)] border-b-2 border-[var(--color-primary-light)] bg-blue-50 dark:bg-blue-900/30'
                : 'text-[var(--color-text-light-muted)] dark:text-[var(--color-text-dark-muted)] hover:text-[var(--color-text-light-secondary)] dark:hover:text-[var(--color-text-dark-secondary)]'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>历史</span>
            {history.length > 0 && (
              <span className="absolute top-1 right-1 text-xs-dynamic bg-blue-500 text-white px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
                {history.length > 99 ? '99+' : history.length}
              </span>
            )}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-2" style={{ maxHeight: 'calc(100vh - 200px)' }}>
          {activeSection === 'api' && (
            <div className="space-y-1">
              {documents.map((doc, docIndex) => (
                <div key={docIndex}>
                  <div
                    className="flex items-center gap-2 px-3 py-2.5 bg-[var(--color-surface-light-secondary)] dark:bg-[var(--color-surface-dark-secondary)] cursor-pointer hover:bg-[var(--color-surface-light-tertiary)] dark:hover:bg-[var(--color-surface-dark-hover)] transition-all duration-200 rounded-lg mx-2"
                    onClick={() => toggleDoc(docIndex)}
                  >
                    {expandedDocs.has(docIndex) ? (
                      <ChevronDown className="w-4 h-4 text-[var(--color-text-light-muted)] dark:text-[var(--color-text-dark-muted)]" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-[var(--color-text-light-muted)] dark:text-[var(--color-text-dark-muted)]" />
                    )}
                    <FolderOpen className="w-4 h-4 text-[var(--color-primary-light)]" />
                    <span className="text-sm-dynamic font-medium text-[var(--color-text-light-primary)] dark:text-[var(--color-text-dark-primary)] truncate flex-1">
                      {doc.info.title}
                    </span>
                    <span className={`text-xs-dynamic px-2 py-0.5 rounded-full transition-colors duration-200 ${
                        searchQuery 
                          ? 'text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30' 
                          : 'text-[var(--color-text-light-muted)] dark:text-[var(--color-text-dark-muted)] bg-[var(--color-surface-light-tertiary)] dark:bg-[var(--color-surface-dark-tertiary)]'
                      }`}>
                      {searchQuery 
                        ? doc.groups.reduce((acc, group) => acc + filteredEndpoints(group, doc).length, 0)
                        : doc.groups.reduce((acc, group) => acc + group.endpoints.length, 0)
                      }
                    </span>
                  </div>

                  <div
                    className={`overflow-hidden transition-all duration-300 ${
                      expandedDocs.has(docIndex) ? 'max-h-none opacity-100' : 'max-h-0 opacity-0'
                    }`}
                  >
                    {doc.groups.map((group) => {
                      if (searchQuery && !hasFilteredEndpoints(group, doc)) return null;
                      const isGroupExpanded = expandedGroups.has(group.name);
                      const endpoints = filteredEndpoints(group, doc);

                      return (
                        <div key={group.name} className="ml-4">
                          <div
                            className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-[var(--color-surface-light-secondary)] dark:hover:bg-[var(--color-surface-dark-hover)] transition-all duration-200 rounded-lg mx-1"
                            onClick={() => toggleGroup(group.name)}
                          >
                            {isGroupExpanded ? (
                              <ChevronDown className="w-3.5 h-3.5 text-[var(--color-text-light-muted)] dark:text-[var(--color-text-dark-muted)]" />
                            ) : (
                              <ChevronRight className="w-3.5 h-3.5 text-[var(--color-text-light-muted)] dark:text-[var(--color-text-dark-muted)]" />
                            )}
                            <span className="text-sm-dynamic text-[var(--color-text-light-secondary)] dark:text-[var(--color-text-dark-secondary)] truncate flex-1">
                              {group.name}
                            </span>
                            <span className="text-xs-dynamic text-[var(--color-text-light-muted)] dark:text-[var(--color-text-dark-muted)] px-1.5 py-0.5 bg-[var(--color-surface-light-tertiary)] dark:bg-[var(--color-surface-dark-tertiary)] rounded-full">
                              {endpoints.length}
                            </span>
                          </div>

                          <div
                            className={`overflow-hidden transition-all duration-200 ${
                              isGroupExpanded ? 'max-h-none opacity-100' : 'max-h-0 opacity-0'
                            }`}
                          >
                            <div className="py-1">
                              {endpoints.map((endpoint) => {
                                const methodColorClass = getMethodBorderClass(endpoint.method);
                                return (
                                  <div
                                    key={endpoint.id}
                                    className={`flex items-center gap-2 px-3 py-2 ml-3 cursor-pointer transition-all duration-200 rounded-lg mx-1 mb-1 ${
                                      selectedEndpoint?.id === endpoint.id
                                        ? `${methodColorClass} border-l-2`
                                        : 'hover:bg-[var(--color-surface-light-secondary)] dark:hover:bg-[var(--color-surface-dark-hover)] border-l-2 border-transparent'
                                    }`}
                                    onClick={() => handleEndpointClick(endpoint)}
                                  >
                                    <span className={`badge ${getMethodClass(endpoint.method)} w-14 text-center`}>
                                      {endpoint.method}
                                    </span>
                                    <span className="text-sm-dynamic font-medium text-[var(--color-text-light-primary)] dark:text-[var(--color-text-dark-primary)] truncate flex-1">
                                      {endpoint.summary || endpoint.path}
                                    </span>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        toggleFavorite({
                                          endpointId: endpoint.id,
                                          method: endpoint.method,
                                          path: endpoint.path,
                                          groupName: endpoint.tags?.[0] || '未分组',
                                        });
                                      }}
                                      className={`p-1.5 rounded-full transition-all duration-200 flex-shrink-0 ${
                                        isFavorite(endpoint.id)
                                          ? FAVORITE_COLORS[endpoint.method]?.bgFilled || 'bg-amber-50 dark:bg-amber-900/30'
                                          : FAVORITE_COLORS[endpoint.method]?.bgUnfilled || 'hover:bg-slate-200 dark:hover:bg-slate-700'
                                      }`}
                                    >
                                      <Heart className={`w-3.5 h-3.5 transition-all duration-200 ${
                                        isFavorite(endpoint.id)
                                          ? `${FAVORITE_COLORS[endpoint.method]?.filled || 'text-yellow-500 fill-yellow-500'} scale-110`
                                          : FAVORITE_COLORS[endpoint.method]?.unfilled || 'text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300'
                                      }`} />
                                    </button>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}

              {documents.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 text-[var(--color-text-light-muted)] dark:text-[var(--color-text-dark-muted)]">
                  <FileCode2 className="w-12 h-12 mb-3 opacity-50" />
                  <p className="text-sm-dynamic">暂无 API 数据</p>
                </div>
              )}
            </div>
          )}

          {activeSection === 'favorites' && (
            <div className="px-2">
              {favorites.length > 0 ? (
                <div className="space-y-2">
                  {Object.entries(groupedFavorites).map(([docTitle, items]) => {
                    const isExpanded = expandedFavorites.has(docTitle);
                    const filteredItems = searchQuery 
                      ? items.filter(item => {
                          const { endpoint, groupName } = item;
                          const fullPath = `${docTitle} / ${groupName} / ${endpoint.summary || endpoint.path}`;
                          const query = searchQuery.toLowerCase();
                          return fullPath.toLowerCase().includes(query) || 
                                 endpoint.summary?.toLowerCase().includes(query) || 
                                 endpoint.path.toLowerCase().includes(query);
                        })
                      : items;
                    
                    if (searchQuery && filteredItems.length === 0) return null;
                    
                    const docFavoritesIndex = Object.keys(groupedFavorites).indexOf(docTitle);
                    
                    return (
                      <div key={docTitle} className="rounded-lg overflow-hidden">
                        <button
                          className="w-full flex items-center justify-between px-3 py-2 text-sm-dynamic font-medium text-[var(--color-text-light-primary)] dark:text-[var(--color-text-dark-primary)] hover:bg-[var(--color-surface-light-secondary)] dark:hover:bg-[var(--color-surface-dark-hover)] transition-colors"
                          onClick={() => toggleFavoriteGroup(docTitle)}
                        >
                          <div className="flex items-center gap-2">
                            {isExpanded ? (
                              <ChevronDown className="w-4 h-4 text-[var(--color-text-light-muted)] dark:text-[var(--color-text-dark-muted)]" />
                            ) : (
                              <ChevronRight className="w-4 h-4 text-[var(--color-text-light-muted)] dark:text-[var(--color-text-dark-muted)]" />
                            )}
                            <span>{docTitle}</span>
                          </div>
                          <span className="text-xs-dynamic text-[var(--color-text-light-muted)] dark:text-[var(--color-text-dark-muted)] px-2 py-0.5 bg-[var(--color-surface-light-tertiary)] dark:bg-[var(--color-surface-dark-tertiary)] rounded-full">
                            {filteredItems.length}
                          </span>
                        </button>
                        <div
                          className={`overflow-hidden transition-all duration-200 ${
                            isExpanded ? 'max-h-none opacity-100' : 'max-h-0 opacity-0'
                          }`}
                        >
                          <div className="pl-4 space-y-1">
                            {filteredItems.map((item) => {
                              const { endpoint, groupName } = item;
                              const fullPath = `${groupName} / ${endpoint.summary || endpoint.path}`;
                              const flatIndex = favorites.findIndex(f => f.endpointId === endpoint.id);
                              
                              return (
                                <div
                                  key={endpoint.id}
                                  className={`flex items-center gap-2 px-3 py-2 cursor-pointer transition-all duration-200 rounded-lg ${
                                    selectedEndpoint?.id === endpoint.id
                                      ? `${getMethodBorderClass(endpoint.method)} border-l-2`
                                      : 'hover:bg-[var(--color-surface-light-secondary)] dark:hover:bg-[var(--color-surface-dark-hover)] border-l-2 border-transparent'
                                  } ${draggedIndex === flatIndex ? 'opacity-50 scale-95' : ''}`}
                                  onClick={() => handleEndpointClick(endpoint)}
                                  draggable
                                  onDragStart={(e) => {
                                    e.dataTransfer.effectAllowed = 'move';
                                    setDraggedIndex(flatIndex);
                                  }}
                                  onDragOver={(e) => {
                                    e.preventDefault();
                                    e.dataTransfer.dropEffect = 'move';
                                    setDragOverIndex(flatIndex);
                                  }}
                                  onDragLeave={() => {
                                    setDragOverIndex(null);
                                  }}
                                  onDrop={() => {
                                    if (draggedIndex !== null && draggedIndex !== flatIndex) {
                                      reorderFavorites(draggedIndex, flatIndex);
                                    }
                                    setDraggedIndex(null);
                                    setDragOverIndex(null);
                                  }}
                                  onDragEnd={() => {
                                    setDraggedIndex(null);
                                    setDragOverIndex(null);
                                  }}
                                >
                                  <span className={`badge ${getMethodClass(endpoint.method)}`}>
                                    {endpoint.method}
                                  </span>
                                  <span className="text-sm-dynamic text-[var(--color-text-light-primary)] dark:text-[var(--color-text-dark-primary)] truncate flex-1">
                                    {fullPath}
                                  </span>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toggleFavorite({
                                        endpointId: endpoint.id,
                                        method: endpoint.method,
                                        path: endpoint.path,
                                        groupName: endpoint.tags?.[0] || '未分组',
                                      });
                                    }}
                                    className={`p-1.5 rounded-full transition-all duration-200 flex-shrink-0 ${FAVORITE_COLORS[endpoint.method]?.bgFilled || 'bg-amber-50 dark:bg-amber-900/30'} hover:opacity-80`}
                                  >
                                    <Heart className={`w-4 h-4 ${FAVORITE_COLORS[endpoint.method]?.filled || 'text-yellow-500 fill-yellow-500'}`} />
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-[var(--color-text-light-muted)] dark:text-[var(--color-text-dark-muted)]">
                  <Heart className="w-12 h-12 mb-3 opacity-50" />
                  <p className="text-sm-dynamic">暂无收藏</p>
                </div>
              )}
            </div>
          )}

          {activeSection === 'history' && (
            <div className="px-2">
              {mergedHistory.length > 0 && (
                <div className="flex items-center justify-between px-2 py-2 mb-2">
                  <span className="text-xs-dynamic text-[var(--color-text-light-muted)] dark:text-[var(--color-text-dark-muted)]">
                    共 {mergedHistory.length} 条记录
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      clearHistory();
                    }}
                    className="flex items-center gap-1 text-xs-dynamic text-red-500 hover:text-red-600 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>清空</span>
                  </button>
                </div>
              )}
              <div className="space-y-2">
                {mergedHistory.length > 0 ? (
                  mergedHistory.map((item) => {
                    const endpoint = documents.flatMap(doc => 
                      doc.groups.flatMap(group => 
                        group.endpoints.filter(e => e.id === item.endpointId)
                      )
                    )[0];
                    if (!endpoint) return null;
                    
                    let baseUrl = '';
                    for (const doc of documents) {
                      for (const group of doc.groups) {
                        if (group.endpoints.find(e => e.id === item.endpointId)) {
                          baseUrl = doc.servers?.[0]?.url || '';
                          break;
                        }
                      }
                      if (baseUrl) break;
                    }
                    
                    const fullApiUrl = baseUrl ? `${baseUrl.replace(/\/$/, '')}${endpoint.path.startsWith('/') ? '' : '/'}${endpoint.path}` : endpoint.path;
                    
                    const isSuccess = item.response.status >= 200 && item.response.status < 300;
                    const statusText = isSuccess ? '成功' : '失败';
                    const statusClass = isSuccess 
                      ? 'text-green-500 bg-green-100 dark:bg-green-900/30' 
                      : 'text-red-500 bg-red-100 dark:bg-red-900/30';
                    
                    return (
                      <div
                        key={item.id}
                        className={`group flex gap-2 px-3 py-3 cursor-pointer transition-all duration-200 rounded-lg ${
                          selectedEndpoint?.id === endpoint.id
                            ? `${getMethodBorderClass(endpoint.method)} border-l-2`
                            : 'hover:bg-[var(--color-surface-light-secondary)] dark:hover:bg-[var(--color-surface-dark-hover)] border-l-2 border-transparent'
                        }`}
                        onClick={() => handleEndpointClick(endpoint, true)}
                      >
                        <span className={`badge ${getMethodClass(endpoint.method)} w-12`}>
                          {endpoint.method}
                        </span>
                        <div className="flex-1 min-w-0 flex flex-col gap-1.5">
                          <Tooltip title={fullApiUrl}>
                            <span className="text-sm-dynamic text-[var(--color-text-light-primary)] dark:text-[var(--color-text-dark-primary)] font-mono truncate cursor-help">
                              {truncateUrl(fullApiUrl, 45)}
                            </span>
                          </Tooltip>
                          <div className="flex items-center gap-2">
                            <span className={`text-xs-dynamic px-1.5 py-0.5 rounded ${statusClass} flex-shrink-0`}>
                              {statusText}
                            </span>
                            {item.count && item.count > 1 && (
                              <span className="text-xs-dynamic px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded flex-shrink-0">
                                {item.count}次
                              </span>
                            )}
                            <span className="text-xs-dynamic text-[var(--color-text-light-muted)] dark:text-[var(--color-text-dark-muted)] flex-shrink-0 ml-auto">
                              {formatTime(item.timestamp)}
                            </span>
                          </div>
                        </div>
                        <Tooltip title="删除记录">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              removeHistory(item.id);
                            }}
                            className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors opacity-0 group-hover:opacity-100 flex-shrink-0"
                          >
                            <X className="w-3.5 h-3.5 text-red-500" />
                          </button>
                        </Tooltip>
                      </div>
                    );
                  })
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-[var(--color-text-light-muted)] dark:text-[var(--color-text-dark-muted)]">
                    <Clock className="w-12 h-12 mb-3 opacity-50" />
                    <p className="text-sm-dynamic">暂无历史记录</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}

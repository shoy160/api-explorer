export const DEFAULT_HEADERS: Record<string, string> = {
  'Content-Type': 'application/json',
  Accept: 'application/json',
};

export const METHOD_COLORS: Record<string, string> = {
  GET: 'bg-green-100 text-green-700',
  POST: 'bg-blue-100 text-blue-700',
  PUT: 'bg-yellow-100 text-yellow-700',
  DELETE: 'bg-red-100 text-red-700',
  PATCH: 'bg-orange-100 text-orange-700',
  OPTIONS: 'bg-gray-100 text-gray-700',
  HEAD: 'bg-purple-100 text-purple-700',
  TRACE: 'bg-pink-100 text-pink-700',
};

export const FAVORITE_COLORS: Record<string, { filled: string; unfilled: string; bgFilled: string; bgUnfilled: string }> = {
  GET: {
    filled: 'text-green-500 fill-green-500',
    unfilled: 'text-green-400 hover:text-green-600 dark:text-green-500 dark:hover:text-green-300',
    bgFilled: 'bg-green-50 dark:bg-green-900/30',
    bgUnfilled: 'hover:bg-green-100/50 dark:hover:bg-green-900/20',
  },
  POST: {
    filled: 'text-blue-500 fill-blue-500',
    unfilled: 'text-blue-400 hover:text-blue-600 dark:text-blue-500 dark:hover:text-blue-300',
    bgFilled: 'bg-blue-50 dark:bg-blue-900/30',
    bgUnfilled: 'hover:bg-blue-100/50 dark:hover:bg-blue-900/20',
  },
  PUT: {
    filled: 'text-orange-500 fill-orange-500',
    unfilled: 'text-orange-400 hover:text-orange-600 dark:text-orange-500 dark:hover:text-orange-300',
    bgFilled: 'bg-orange-50 dark:bg-orange-900/30',
    bgUnfilled: 'hover:bg-orange-100/50 dark:hover:bg-orange-900/20',
  },
  DELETE: {
    filled: 'text-red-500 fill-red-500',
    unfilled: 'text-red-400 hover:text-red-600 dark:text-red-500 dark:hover:text-red-300',
    bgFilled: 'bg-red-50 dark:bg-red-900/30',
    bgUnfilled: 'hover:bg-red-100/50 dark:hover:bg-red-900/20',
  },
  PATCH: {
    filled: 'text-orange-500 fill-orange-500',
    unfilled: 'text-orange-400 hover:text-orange-600 dark:text-orange-500 dark:hover:text-orange-300',
    bgFilled: 'bg-orange-50 dark:bg-orange-900/30',
    bgUnfilled: 'hover:bg-orange-100/50 dark:hover:bg-orange-900/20',
  },
  OPTIONS: {
    filled: 'text-gray-500 fill-gray-500',
    unfilled: 'text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300',
    bgFilled: 'bg-gray-50 dark:bg-gray-900/30',
    bgUnfilled: 'hover:bg-gray-100/50 dark:hover:bg-gray-900/20',
  },
  HEAD: {
    filled: 'text-purple-500 fill-purple-500',
    unfilled: 'text-purple-400 hover:text-purple-600 dark:text-purple-500 dark:hover:text-purple-300',
    bgFilled: 'bg-purple-50 dark:bg-purple-900/30',
    bgUnfilled: 'hover:bg-purple-100/50 dark:hover:bg-purple-900/20',
  },
  TRACE: {
    filled: 'text-pink-500 fill-pink-500',
    unfilled: 'text-pink-400 hover:text-pink-600 dark:text-pink-500 dark:hover:text-pink-300',
    bgFilled: 'bg-pink-50 dark:bg-pink-900/30',
    bgUnfilled: 'hover:bg-pink-100/50 dark:hover:bg-pink-900/20',
  },
};

export const METHOD_LABELS: Record<string, string> = {
  GET: 'GET',
  POST: 'POST',
  PUT: 'PUT',
  DELETE: 'DELETE',
  PATCH: 'PATCH',
  OPTIONS: 'OPTIONS',
  HEAD: 'HEAD',
  TRACE: 'TRACE',
};

export const LANGUAGES = [
  { value: 'zh', label: '中文' },
  { value: 'en', label: 'English' },
];

export const THEMES = [
  { value: 'light', label: '亮色' },
  { value: 'dark', label: '暗色' },
];

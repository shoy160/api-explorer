import type { ApiEndpoint } from '@/types';

interface MethodBadgeProps {
  method: ApiEndpoint['method'];
}

const METHOD_STYLES: Record<string, string> = {
  GET: 'bg-green-500 text-white shadow-md',
  POST: 'bg-blue-500 text-white shadow-md',
  PUT: 'bg-yellow-500 text-white shadow-md',
  DELETE: 'bg-red-500 text-white shadow-md',
  PATCH: 'bg-orange-500 text-white shadow-md',
  OPTIONS: 'bg-gray-500 text-white shadow-md',
  HEAD: 'bg-purple-500 text-white shadow-md',
  TRACE: 'bg-pink-500 text-white shadow-md',
};

export function MethodBadge({ method }: MethodBadgeProps) {
  return (
    <span
      className={`px-2.5 py-1 text-xs font-bold rounded-lg flex-shrink-0 transition-all-200 ${METHOD_STYLES[method]} hover:opacity-90 hover:scale-105`}
    >
      {method}
    </span>
  );
}

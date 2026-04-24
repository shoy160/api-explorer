import { useState } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface CodeBlockProps {
  code: string;
  language: string;
}

const LANGUAGE_MAP: Record<string, string> = {
  curl: 'bash',
  javascript: 'javascript',
  python: 'python',
  java: 'java',
  go: 'go',
  php: 'php',
  ruby: 'ruby',
};

export function CodeBlock({ code, language }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const displayLanguage = LANGUAGE_MAP[language] || language;

  return (
    <div className="relative">
      <SyntaxHighlighter
        language={displayLanguage}
        style={oneDark}
        showLineNumbers={true}
        wrapLines={true}
        lineNumberStyle={{
          minWidth: '2.5rem' as const,
          textAlign: 'right' as const,
          paddingRight: '1rem' as const,
          userSelect: 'none' as const,
          opacity: 0.5,
        }}
      >
        {code}
      </SyntaxHighlighter>
    </div>
  );
}

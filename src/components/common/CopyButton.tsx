import { useState, type ReactNode } from 'react';
import { Copy, Check } from 'lucide-react';
import { Button, Tooltip } from 'antd';

interface CopyButtonProps {
  text: string;
  children?: ReactNode;
  className?: string;
}

export function CopyButton({ text, children, className }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <Tooltip title={copied ? '已复制' : '复制'}>
      <Button
        type="text"
        icon={copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
        onClick={handleCopy}
        className={className}
      >
        {children}
      </Button>
    </Tooltip>
  );
}

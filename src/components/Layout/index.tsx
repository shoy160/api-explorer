import { useState } from 'react';
import { Header } from '@/components/Header';
import { Sidebar } from '@/components/Sidebar';
import { ApiDetail } from '@/components/ApiDetail';
import { SettingsPanel } from '@/components/SettingsPanel';

interface LayoutProps {
  children?: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[var(--color-surface-light-secondary)] dark:bg-slate-900 transition-colors duration-300">
      <Header 
        onMenuClick={() => setSidebarOpen(true)} 
        onSettingsClick={() => setSettingsOpen(true)}
      />
      
      <div className="flex">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        
        <main className="flex-1 min-h-[calc(100vh-56px)] lg:ml-[280px]">
          <div className="bg-gradient-to-r from-[var(--color-primary)] via-[var(--color-secondary)] to-[var(--color-accent)] h-1" />
          
          {children || <ApiDetail />}
        </main>
      </div>
      
      <SettingsPanel isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}

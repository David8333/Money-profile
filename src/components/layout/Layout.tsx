import React, { useState } from 'react';
import { Header } from './Header';
import { Sidebar, NavTab } from './Sidebar';
import { MobileNav } from './MobileNav';
import { ConnectionStatusBanner } from '../common/ConnectionStatusBanner';
import { SetupGuideModal } from '../setup/SetupGuideModal';

interface LayoutProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  isConfigured: boolean;
  userEmail?: string | null;
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({
  currentTab,
  onSelectTab,
  isConfigured,
  userEmail,
  children,
}) => {
  const [isGuideOpen, setIsGuideOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-slate-800">
      <Header
        isConfigured={isConfigured}
        onOpenSetupGuide={() => setIsGuideOpen(true)}
        userEmail={userEmail}
      />
      <ConnectionStatusBanner
        isConfigured={isConfigured}
        onOpenSetupGuide={() => setIsGuideOpen(true)}
      />

      <div className="flex flex-1">
        <Sidebar
          currentTab={currentTab}
          onSelectTab={onSelectTab}
          onOpenSetupGuide={() => setIsGuideOpen(true)}
          isConfigured={isConfigured}
        />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full pb-20 md:pb-8">
          {children}
        </main>
      </div>

      <MobileNav currentTab={currentTab} onSelectTab={onSelectTab} />

      <SetupGuideModal
        isOpen={isGuideOpen}
        onClose={() => setIsGuideOpen(false)}
        isConfigured={isConfigured}
      />
    </div>
  );
};

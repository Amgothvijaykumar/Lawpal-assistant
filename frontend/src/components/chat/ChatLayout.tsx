import { useState, useEffect } from 'react';
import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ChatSidebar } from './ChatSidebar';
import { ChatContainer } from './ChatContainer';
import { EnhancedChatView } from './EnhancedChatView';
import { EnhancedDocumentView } from '../documents/EnhancedDocumentView';
import { ProfileSheet } from '../profile/ProfileSheet';
import { SettingsSheet } from '../settings/SettingsSheet';
import { LawyerPanel } from './LawyerPanel';
import { CaseSummaryPanel } from './CaseSummaryPanel';
import { MiniCourt } from './MiniCourt';
import { useChatSessions } from '@/hooks/useChatSessions';
import { useChatMessages } from '@/hooks/useChatMessages';
import { cn } from '@/lib/utils';

type ChatType = 'ai' | 'lawyer';
type ConsultationStatus = 'request_sent' | 'accepted' | 'ongoing' | 'closed';
type ViewMode = 'chat' | 'enhanced-chat' | 'documents' | 'session';

export function ChatLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [showLawyerPanel, setShowLawyerPanel] = useState(false);
  const [showCaseSummary, setShowCaseSummary] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('session');
  const [miniCourtOpen, setMiniCourtOpen] = useState(false);

  // Enhanced state for lawyer chat features
  const [currentChatType, setCurrentChatType] = useState<ChatType>('ai');
  const [consultationStatus, setConsultationStatus] = useState<ConsultationStatus>('request_sent');

  const {
    sessions,
    loading: sessionsLoading,
    currentSessionId,
    setCurrentSessionId,
    createSession,
    renameSession,
    deleteSession,
  } = useChatSessions();

  const {
    messages,
    loading: messagesLoading,
    streaming,
    sendMessage,
    updateMessage,
  } = useChatMessages(currentSessionId);

  // DO NOT auto-select any session on page load
  // User must explicitly click a session to load it

  const handleNewChat = async () => {
    await createSession();
  };

  const handleStartNewChat = async (prompt: string) => {
    const sessionId = await createSession();
    if (sessionId) {
      setTimeout(() => {
        sendMessage(prompt);
      }, 100);
    }
  };

  const handleSelectSession = (id: string) => {
    setCurrentSessionId(id);
    setViewMode('session');
    // Determine chat type based on session ID (mock logic)
    setCurrentChatType(id.includes('lawyer') ? 'lawyer' : 'ai');
  };

  const handleOpenChat = () => {
    setViewMode('enhanced-chat');
  };

  const handleOpenDocuments = () => {
    setViewMode('documents');
  };

  const renderMainContent = () => {
    switch (viewMode) {
      case 'enhanced-chat':
        return <EnhancedChatView />;
      case 'documents':
        return <EnhancedDocumentView />;
      case 'session':
      default:
        return (
          <ChatContainer
            messages={messages}
            loading={messagesLoading}
            streaming={streaming}
            onSendMessage={sendMessage}
            onStartNewChat={handleStartNewChat}
            hasSession={!!currentSessionId}
            sessionId={currentSessionId}
            chatType={currentChatType}
            consultationStatus={consultationStatus}
            onShowLawyers={() => setShowLawyerPanel(true)}
            onUpdateMessage={updateMessage}
            onOpenMiniCourt={() => setMiniCourtOpen(true)}
          />
        );
    }
  };

  return (
    <div className="h-screen flex bg-[#F9FAFB] dark:bg-slate-900 overflow-hidden">
      {/* Mobile Sidebar Toggle */}
      <Button
        variant="ghost"
        size="icon"
        className={cn(
          'fixed top-4 left-4 z-50 lg:hidden h-9 w-9 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border border-slate-200/60 dark:border-slate-700/60 shadow-sm',
          sidebarOpen && 'hidden'
        )}
        onClick={() => setSidebarOpen(true)}
      >
        <Menu className="w-4 h-4" />
      </Button>

      {/* Sidebar - Positioned absolutely on mobile, relative on desktop */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 bg-[#F9FAFB] dark:bg-slate-900 border-r border-slate-200/50 dark:border-slate-700',
          'lg:relative lg:z-0',
          'transition-all duration-300 ease-out',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
          sidebarCollapsed ? 'lg:w-16' : 'lg:w-64'
        )}
      >
        <ChatSidebar
          sessions={sessions}
          loading={sessionsLoading}
          currentSessionId={currentSessionId}
          onSelectSession={handleSelectSession}
          onNewChat={handleNewChat}
          onRenameSession={renameSession}
          onDeleteSession={deleteSession}
          isCollapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
          onOpenProfile={() => setProfileOpen(true)}
          onOpenSettings={() => setSettingsOpen(true)}
          onOpenChat={handleOpenChat}
          onOpenDocuments={handleOpenDocuments}
        />
      </aside>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-30 lg:hidden backdrop-blur-[2px]"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Chat Area - FIXED width, always centered, NOT affected by sidebar */}
      <main className="flex-1 flex justify-center min-w-0">
        <div className="w-full max-w-4xl flex flex-col">
          {renderMainContent()}
        </div>
      </main>

      {/* Case Summary Panel */}
      {showCaseSummary && currentSessionId && currentChatType === 'lawyer' && (
        <div className="w-96 border-l border-slate-200/60 dark:border-slate-700/60 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl">
          <CaseSummaryPanel
            chatId={currentSessionId}
            onClose={() => setShowCaseSummary(false)}
          />
        </div>
      )}

      {/* Lawyer Panel - Right Sidebar */}
      {showLawyerPanel && (
        <div className="w-96 border-l border-slate-200/60 dark:border-slate-700/60 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl shrink-0 transition-all duration-300">
          <LawyerPanel
            isOpen={true}
            onClose={() => setShowLawyerPanel(false)}
          />
        </div>
      )}

      {/* Profile Sheet */}
      <ProfileSheet
        open={profileOpen}
        onOpenChange={setProfileOpen}
      />

      {/* Settings Sheet */}
      <SettingsSheet
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
      />

      {/* MiniCourt Modal */}
      <MiniCourt
        open={miniCourtOpen}
        onOpenChange={setMiniCourtOpen}
      />

      {/* Font Preloader to prevent layout shifts */}
      <div className="preload-fonts absolute pointer-events-none opacity-0 select-none -z-50">
        Preload .
      </div>
    </div>
  );
}
import { useState, useEffect } from 'react';
import { Menu, Scale, ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ChatSidebar } from './ChatSidebar';
import { ChatContainer } from './ChatContainer';
import { LawyerChatContainer } from './LawyerChatContainer';
import { RecommendedLawyers } from './RecommendedLawyers';
import { LawyerDashboard } from './LawyerDashboard';
import { EnhancedDocumentView } from '../documents/EnhancedDocumentView';
import { ProfileSheet } from '../profile/ProfileSheet';
import { SettingsSheet } from '../settings/SettingsSheet';
import { ProfileCompletionModal } from '../profile/ProfileCompletionModal';
import { LawyerPanel } from './LawyerPanel';
import { CaseSummaryPanel } from './CaseSummaryPanel';
import { MiniCourt } from './MiniCourt';
import { useChatSessions } from '@/hooks/useChatSessions';
import { useChatMessages } from '@/hooks/useChatMessages';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

type ChatType = 'ai' | 'lawyer';
type ConsultationStatus = 'request_sent' | 'accepted' | 'ongoing' | 'closed';
type ViewMode = 'chat' | 'enhanced-chat' | 'documents' | 'session' | 'lawyer-consultation' | 'mini-court';

export function ChatLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [showLawyerPanel, setShowLawyerPanel] = useState(false);
  const [showCaseSummary, setShowCaseSummary] = useState(true);
  // Persist viewMode in localStorage
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    const saved = localStorage.getItem('actright_viewMode');
    return (saved as ViewMode) || 'session';
  });

  // Enhanced state for lawyer chat features
  const { user, refreshProfile } = useAuth();
  const [currentChatType, setCurrentChatType] = useState<ChatType>(() => {
    const saved = localStorage.getItem('actright_chatType');
    return (saved as ChatType) || 'ai';
  });
  const [consultationStatus, setConsultationStatus] = useState<ConsultationStatus>('request_sent');
  const [showCompletionModal, setShowCompletionModal] = useState(false);

  // Persist viewMode changes
  useEffect(() => {
    localStorage.setItem('actright_viewMode', viewMode);
  }, [viewMode]);

  // Persist chatType changes
  useEffect(() => {
    localStorage.setItem('actright_chatType', currentChatType);
  }, [currentChatType]);

  useEffect(() => {
    if (user && !user.profileCompleted) {
      const timer = setTimeout(() => {
        setShowCompletionModal(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [user]);

  const handleProfileComplete = async () => {
    setShowCompletionModal(false);
    await refreshProfile();
  };

  const {
    sessions,
    loading: sessionsLoading,
    currentSessionId,
    setCurrentSessionId,
    createSession,
    renameSession,
    deleteSession,
    refreshSessions,
  } = useChatSessions();

  const {
    messages,
    loading: messagesLoading,
    streaming,
    sendMessage,
    updateMessage,
    addHighlight,
    removeHighlight,
  } = useChatMessages(currentSessionId);

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

  const handleSendLawyerMessage = async (content: string) => {
    if (!currentSessionId) return;
    sendMessage(content, {
      skipAI: true,
      manualRole: user?.role === 'lawyer' ? 'lawyer' : 'user'
    });
  };

  const handleSelectSession = (id: string) => {
    setCurrentSessionId(id);
    setViewMode('session');

    const selectedSession = sessions.find(s => s.id === id);
    if (selectedSession) {
      setCurrentChatType(selectedSession.type);
    } else {
      setCurrentChatType('ai');
    }
  };

  const handleOpenChat = async () => {
    setCurrentChatType('ai');
    if (!currentSessionId) {
      await createSession('New Chat', 'ai');
    }
    setViewMode('session');
  };

  const handleOpenDocuments = () => {
    setViewMode('documents');
  };

  const handleOpenLawyerConsultation = () => {
    setViewMode('lawyer-consultation');
  };

  const renderMainContent = () => {
    switch (viewMode) {
      case 'lawyer-consultation':
        if (user?.role === 'lawyer') {
          return <LawyerDashboard onOpenChat={handleSelectSession} onRefreshSessions={refreshSessions} />;
        }
        return <RecommendedLawyers onOpenChat={handleSelectSession} />;
      case 'documents':
        return <EnhancedDocumentView />;
      case 'mini-court':
        return <MiniCourt onClose={() => setViewMode('session')} />;
      case 'session':
        if (currentChatType === 'lawyer') {
          const session = sessions.find(s => s.id === currentSessionId);
          return (
            <LawyerChatContainer
              messages={messages}
              loading={messagesLoading}
              onSendMessage={handleSendLawyerMessage}
              onClose={() => setViewMode('session')}
              sessionTitle={session?.title}
              isLawyer={user?.role === 'lawyer'}
            />
          );
        }
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
            onAddHighlight={addHighlight}
            onRemoveHighlight={removeHighlight}
            onOpenMiniCourt={() => setViewMode('mini-court')}
          />
        );
      default:
        return <EmptyMainContent />;
    }
  };

  return (
    <div className="h-screen flex bg-[#F9FAFB] dark:bg-slate-900 overflow-hidden">
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
          onOpenLawyerConsultation={handleOpenLawyerConsultation}
          activeView={viewMode}
        />
      </aside>

      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-30 lg:hidden backdrop-blur-[2px]"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <main className="flex-1 flex justify-center min-w-0">
        <div className="w-full max-w-4xl flex flex-col">
          {renderMainContent()}
        </div>
      </main>

      {showCaseSummary && currentSessionId && currentChatType === 'lawyer' && (
        <div className="w-96 border-l border-slate-200/60 dark:border-slate-700/60 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl">
          <CaseSummaryPanel
            chatId={currentSessionId}
            onClose={() => setShowCaseSummary(false)}
          />
        </div>
      )}

      {showLawyerPanel && (
        <div className="w-96 border-l border-slate-200/60 dark:border-slate-700/60 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl shrink-0 transition-all duration-300">
          <LawyerPanel
            isOpen={true}
            onClose={() => setShowLawyerPanel(false)}
          />
        </div>
      )}

      <ProfileSheet
        open={profileOpen}
        onOpenChange={setProfileOpen}
      />

      <SettingsSheet
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
      />

      <div className="preload-fonts absolute pointer-events-none opacity-0 select-none -z-50">
        Preload .
      </div>

      <ProfileCompletionModal
        isOpen={showCompletionModal}
        onComplete={handleProfileComplete}
      />
    </div>
  );
}

function EmptyMainContent() {
  return (
    <div className="flex-1 flex items-center justify-center">
      <p className="text-slate-400">Select a session to start</p>
    </div>
  );
}
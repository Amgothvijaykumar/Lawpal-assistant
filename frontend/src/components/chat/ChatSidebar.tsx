import { useState } from 'react';
import {
  Plus, MessageSquare, MoreHorizontal, Pencil, Trash2,
  Search, Scale, ChevronLeft, ChevronRight, Settings,
  FileText, Pin, Share2, User2, X, Briefcase
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/AuthContext';
import { ChatSession } from '@/hooks/useChatSessions';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface ChatSidebarProps {
  sessions: ChatSession[];
  loading: boolean;
  currentSessionId: string | null;
  onSelectSession: (id: string) => void;
  onNewChat: () => void;
  onRenameSession: (id: string, title: string) => void;
  onDeleteSession: (id: string) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onOpenProfile: () => void;
  onOpenSettings: () => void;
  onOpenChat: () => void;
  onOpenDocuments: () => void;
  onOpenLawyerConsultation: () => void;
  activeView: string;
}

export function ChatSidebar({
  sessions,
  loading,
  currentSessionId,
  onSelectSession,
  onNewChat,
  onRenameSession,
  onDeleteSession,
  isCollapsed,
  onToggleCollapse,
  onOpenProfile,
  onOpenSettings,
  onOpenChat,
  onOpenDocuments,
  onOpenLawyerConsultation,
  activeView,
}: ChatSidebarProps) {
  const { user, signOut } = useAuth();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const handleStartRename = (session: ChatSession) => {
    setEditingId(session.id);
    setEditTitle(session.title);
  };

  const handleSaveRename = (id: string) => {
    if (editTitle.trim()) {
      onRenameSession(id, editTitle.trim());
    }
    setEditingId(null);
    setEditTitle('');
  };

  // Filter sessions based on search
  // Filter sessions based on search
  const filteredSessions = sessions.filter(session =>
    session.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Split into AI and Lawyer sessions
  const aiSessions = filteredSessions.filter(s => s.type !== 'lawyer');
  const lawyerSessions = filteredSessions.filter(s => s.type === 'lawyer');

  // Group AI sessions by date
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const todaySessions = aiSessions.filter(s => {
    const date = new Date(s.updated_at || new Date());
    return date.toDateString() === today.toDateString();
  });

  const yesterdaySessions = aiSessions.filter(s => {
    const date = new Date(s.updated_at || new Date());
    return date.toDateString() === yesterday.toDateString();
  });

  const olderSessions = aiSessions.filter(s => {
    const date = new Date(s.updated_at || new Date());
    return date.toDateString() !== today.toDateString() &&
      date.toDateString() !== yesterday.toDateString();
  });

  const renderSessionItem = (session: ChatSession) => {
    const isActive = currentSessionId === session.id;

    return (
      <div
        key={session.id}
        className={cn(
          'group flex items-center gap-2.5 px-3 py-2.5 rounded-lg cursor-pointer transition-all duration-150',
          isActive
            ? 'bg-[#E0E7FF] text-foreground'
            : 'text-muted-foreground hover:bg-[#EEF2FF] hover:text-foreground'
        )}
        onClick={() => onSelectSession(session.id)}
      >
        {session.type === 'lawyer' ? (
          <Briefcase className="w-4 h-4 shrink-0 opacity-70" />
        ) : (
          <MessageSquare className="w-4 h-4 shrink-0 opacity-70" />
        )}

        {!isCollapsed && (
          <>
            {editingId === session.id ? (
              <Input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                onBlur={() => handleSaveRename(session.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveRename(session.id);
                  if (e.key === 'Escape') setEditingId(null);
                }}
                className="h-6 text-sm bg-background border-border"
                autoFocus
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <span className="flex-1 truncate text-sm font-medium">{session.title}</span>
            )}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 opacity-0 group-hover:opacity-100 hover:bg-white/50 shrink-0 transition-opacity"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40">
                <DropdownMenuItem onClick={() => handleStartRename(session)}>
                  <Pencil className="w-4 h-4 mr-2" />
                  Rename
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Pin className="w-4 h-4 mr-2" />
                  Pin
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Share2 className="w-4 h-4 mr-2" />
                  Share
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => onDeleteSession(session.id)}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        )}
      </div>
    );
  };

  const SectionLabel = ({ children }: { children: React.ReactNode }) => (
    <p className="text-[11px] font-semibold text-muted-foreground/70 uppercase tracking-wider px-3 mb-1.5">
      {children}
    </p>
  );

  return (
    <aside
      className={cn(
        'h-full flex flex-col transition-all duration-300 ease-out',
        'bg-[#F8FAFC] border-r border-[#E5E7EB]',
        isCollapsed ? 'w-16' : 'w-[260px]'
      )}
    >
      {/* Header with Logo & Collapse */}
      <div className="px-3 pt-3 pb-2">
        <div className="flex items-center justify-between">
          <div className={cn(
            'flex items-center gap-2.5 transition-all duration-300',
            isCollapsed && 'justify-center w-full'
          )}>
            <div className="p-1.5 bg-primary rounded-lg shrink-0">
              <Scale className="w-4 h-4 text-primary-foreground" />
            </div>
            {!isCollapsed && (
              <span className="font-serif font-semibold text-foreground text-base">ACTRIGHT</span>
            )}
          </div>

          {!isCollapsed && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onToggleCollapse}
                  className="h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-[#EEF2FF]"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">Collapse sidebar</TooltipContent>
            </Tooltip>
          )}
        </div>

        {isCollapsed && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={onToggleCollapse}
                className="h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-[#EEF2FF] mt-2 mx-auto"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">Expand sidebar</TooltipContent>
          </Tooltip>
        )}
      </div>

      {/* New Chat Button */}
      <div className="px-3 py-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              onClick={onNewChat}
              variant="outline"
              className={cn(
                'w-full gap-2 h-10 bg-white/80 border-slate-200/60 text-foreground',
                'hover:bg-white hover:border-primary/30 transition-all font-medium',
                isCollapsed ? 'justify-center px-0' : 'justify-start px-3'
              )}
            >
              <Plus className="w-4 h-4" />
              {!isCollapsed && <span>New Chat</span>}
            </Button>
          </TooltipTrigger>
          {isCollapsed && <TooltipContent side="right">New Chat</TooltipContent>}
        </Tooltip>
      </div>

      {/* Search */}
      {!isCollapsed && (
        <div className="px-3 pb-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search chats..."
              className="pl-8 h-9 text-sm bg-white/80 border-slate-200/60 placeholder:text-muted-foreground/50"
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSearchQuery('')}
                className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 text-muted-foreground hover:text-foreground"
              >
                <X className="w-3 h-3" />
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Divider */}
      <div className="h-px bg-[#E5E7EB] mx-3" />

      {/* Sessions List */}
      <ScrollArea className="flex-1 px-1.5 py-3">
        <div className="space-y-5">
          {/* Primary Actions - Only show when not searching */}
          {!loading && !searchQuery && (
            <>
              {/* Consultation Section (Manual) */}
              {!isCollapsed && (
                <div className="mb-4">
                  <SectionLabel>Consultation</SectionLabel>
                  <button
                    onClick={onOpenLawyerConsultation}
                    className={cn(
                      'w-full flex items-center gap-3 px-3 py-2.5 mx-3 rounded-lg text-sm font-medium transition-all duration-200 text-left border-l-[3px] pr-8 box-border width-[calc(100%-1.5rem)]',
                      activeView === 'lawyer-consultation'
                        ? 'bg-primary/5 border-primary text-primary'
                        : 'border-transparent text-muted-foreground/70 hover:bg-[#EEF2FF] hover:text-foreground'
                    )}
                  >
                    <Briefcase className={cn("w-4 h-4", activeView === 'lawyer-consultation' ? "text-primary" : "opacity-70")} />
                    {user?.role === 'lawyer' ? 'Client Requests' : 'Talk to a Lawyer'}
                  </button>
                </div>
              )}

              {/* Document Section */}
              {!isCollapsed && (
                <div className="mb-6">
                  <SectionLabel>Documents</SectionLabel>
                  <button
                    onClick={onOpenDocuments}
                    className={cn(
                      'w-full flex items-center gap-3 px-3 py-2.5 mx-3 rounded-lg text-sm font-medium transition-all duration-200 text-left border-l-[3px] pr-8 box-border width-[calc(100%-1.5rem)]',
                      activeView === 'documents'
                        ? 'bg-primary/5 border-primary text-primary'
                        : 'border-transparent text-muted-foreground/70 hover:bg-[#EEF2FF] hover:text-foreground'
                    )}
                  >
                    <FileText className={cn("w-4 h-4", activeView === 'documents' ? "text-primary" : "opacity-70")} />
                    Upload Documents
                  </button>
                </div>
              )}
            </>
          )}

          {/* Consultations (Lawyer Chats) */}
          {lawyerSessions.length > 0 && (
            <div>
              {!isCollapsed && <SectionLabel>Consultations</SectionLabel>}
              <div className="space-y-0.5 px-1.5 mb-4">
                {lawyerSessions.map(renderSessionItem)}
              </div>
            </div>
          )}

          {/* History Section (AI Chats) */}
          {loading ? (
            <div className="space-y-2 px-1.5">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-10 w-full rounded-lg" />
              ))}
            </div>
          ) : (lawyerSessions.length === 0 && aiSessions.length === 0) ? (
            !isCollapsed && (
              <div className="text-center py-8 text-muted-foreground/60 text-sm">
                {searchQuery ? 'No chats found' : 'No history yet'}
              </div>
            )
          ) : (
            <>
              {/* AI History Header - Only show if there ARE AI sessions */}
              {(todaySessions.length > 0 || yesterdaySessions.length > 0 || olderSessions.length > 0) && (
                <>
                  {!isCollapsed && <p className="text-[11px] font-semibold text-muted-foreground/70 uppercase tracking-wider px-3 mb-1.5">AI History</p>}
                </>
              )}

              {/* Today */}
              {todaySessions.length > 0 && (
                <div>
                  {!isCollapsed && <SectionLabel>Today</SectionLabel>}
                  <div className="space-y-0.5 px-1.5">
                    {todaySessions.map(renderSessionItem)}
                  </div>
                </div>
              )}

              {/* Yesterday and Older with Scrolling */}
              {(yesterdaySessions.length > 0 || olderSessions.length > 0) && (
                <div>
                  <ScrollArea className="max-h-64">
                    <div className="space-y-0.5 px-1.5 pr-2">
                      {/* Yesterday */}
                      {yesterdaySessions.length > 0 && (
                        <div className="mb-3">
                          {!isCollapsed && <p className="text-[10px] font-medium text-muted-foreground/50 uppercase tracking-wider px-3 mb-2">Yesterday</p>}
                          <div className="space-y-0.5">
                            {yesterdaySessions.map(renderSessionItem)}
                          </div>
                        </div>
                      )}

                      {/* Older Sessions */}
                      {olderSessions.length > 0 && (
                        <div>
                          {!isCollapsed && <p className="text-[10px] font-medium text-muted-foreground/50 uppercase tracking-wider px-3 mb-2">Older</p>}
                          <div className="space-y-0.5">
                            {olderSessions.map(renderSessionItem)}
                          </div>
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </div>
              )}
            </>
          )}
        </div>
      </ScrollArea>

      {/* Divider */}
      <div className="h-px bg-[#E5E7EB] mx-3" />

      {/* User Section */}
      <div className="p-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className={cn(
              'w-full flex items-center gap-3 p-2 rounded-lg hover:bg-[#EEF2FF] transition-colors cursor-pointer',
              isCollapsed && 'justify-center'
            )}>
              {user?.avatarUrl ? (
                <div className="w-9 h-9 rounded-full overflow-hidden shrink-0 border border-primary/20 shadow-sm">
                  <img src={user.avatarUrl} alt="User Avatar" className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary shrink-0 border border-primary/20">
                  {user?.displayName?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U'}
                </div>
              )}
              {!isCollapsed && (
                <>
                  <div className="flex-1 min-w-0 text-left">
                    <p className="text-sm font-medium text-foreground truncate">
                      {user?.displayName || user?.email?.split('@')[0]}
                    </p>
                    <p className="text-xs text-muted-foreground capitalize">{user?.role}</p>
                  </div>
                  <Settings className="w-4 h-4 text-muted-foreground" />
                </>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align={isCollapsed ? 'center' : 'end'} side="top" className="w-48">
            <DropdownMenuItem onClick={onOpenProfile}>
              <User2 className="w-4 h-4 mr-2" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onOpenSettings}>
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={signOut} className="text-destructive focus:text-destructive">
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside >
  );
}
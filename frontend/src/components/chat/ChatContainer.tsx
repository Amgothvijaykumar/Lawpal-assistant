import { useEffect, useRef, useState, useCallback } from 'react';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';
import { EmptyChat } from './EmptyChat';
import { Skeleton } from '@/components/ui/skeleton';
import { ChatMessage as ChatMessageType } from '@/hooks/useChatMessages';
import { cn } from '@/lib/utils';
import { ArrowDown } from 'lucide-react';

function ChatSkeleton() {
  return (
    <div className="flex-1 py-8 chat-skeleton animate-pulse">
      <div className="max-w-4xl mx-auto px-4 md:px-8 space-y-8">
        {/* User message skeleton */}
        <div className="flex flex-row-reverse gap-4">
          <Skeleton className="w-9 h-9 rounded-full shrink-0" />
          <div className="flex flex-col items-end flex-1 min-w-0">
            <Skeleton className="h-14 w-64 rounded-2xl" />
          </div>
        </div>

        {/* Assistant message skeleton */}
        <div className="flex gap-4">
          <Skeleton className="w-9 h-9 rounded-full shrink-0" />
          <div className="flex flex-col flex-1 gap-2 min-w-0 max-w-2xl">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-[90%]" />
            <Skeleton className="h-4 w-[95%]" />
            <div className="h-4"></div>
            <Skeleton className="h-4 w-[85%]" />
          </div>
        </div>
      </div>
    </div>
  );
}

interface ChatContainerProps {
  messages: ChatMessageType[];
  loading: boolean;
  streaming: boolean;
  onSendMessage: (message: string) => void;
  onStartNewChat: (prompt: string) => void;
  hasSession: boolean;
  sessionId?: string | null;
  onShowLawyers: () => void;
  onUpdateMessage: (id: string, newContent: string) => Promise<void>;
  chatType?: 'ai' | 'lawyer';
  consultationStatus?: 'request_sent' | 'accepted' | 'ongoing' | 'closed';
}

export function ChatContainer({
  messages,
  loading,
  streaming,
  onSendMessage,
  onStartNewChat,
  hasSession,
  sessionId,
  onShowLawyers,
  onUpdateMessage,
}: ChatContainerProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const lastScrollTime = useRef(0);
  const isUserScrolling = useRef(false);

  const checkIfAtBottom = useCallback(() => {
    if (!scrollRef.current) return true;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    const threshold = 100;
    return scrollHeight - scrollTop - clientHeight < threshold;
  }, []);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    if (!scrollRef.current) return;
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior
      });
    });
    setShowScrollButton(false);
    setIsAtBottom(true);
  }, []);

  const handleScroll = useCallback(() => {
    const atBottom = checkIfAtBottom();
    const { scrollTop } = scrollRef.current || { scrollTop: 0 };

    setIsAtBottom(atBottom);
    // Show scroll button if not at bottom and scrolled up significantly
    setShowScrollButton(!atBottom && messages.length > 0 && scrollTop > 100);

    isUserScrolling.current = true;
    setTimeout(() => {
      isUserScrolling.current = false;
    }, 150);
  }, [checkIfAtBottom, messages.length]);

  // Auto-scroll logic
  useEffect(() => {
    if (!scrollRef.current || messages.length === 0) return;
    const lastMessage = messages[messages.length - 1];

    // Always scroll for user messages
    if (lastMessage?.role === 'user') {
      scrollToBottom('smooth');
      return;
    }
    // For assistant: Scroll if already at bottom (streaming)
    if (isAtBottom && !isUserScrolling.current) {
      // Throttled scroll
      const now = Date.now();
      if (now - lastScrollTime.current > 100) {
        scrollToBottom('smooth');
        lastScrollTime.current = now;
      }
    }
  }, [messages.length, messages[messages.length - 1]?.content.length, isAtBottom, scrollToBottom]);

  // Initial scroll
  useEffect(() => {
    if (messages.length > 0 && !loading) {
      scrollToBottom('auto');
    }
  }, [loading, messages.length, scrollToBottom]);

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[#F9FAFB] dark:bg-slate-900">

      {/* Messages Area */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden relative">
        {loading && messages.length === 0 ? (
          <ChatSkeleton />
        ) : !hasSession && messages.length === 0 ? (
          <EmptyChat onStartChat={onStartNewChat} />
        ) : (
          <>
            <div
              ref={scrollRef}
              onScroll={handleScroll}
              className="chat-scroll flex-1 overflow-y-auto scroll-smooth"
            >
              {/* Message List Wrapper - Centered */}
              <div className="w-full flex flex-col pb-4">
                {messages.map((message, index) => (
                  <div key={message.id}>
                    <ChatMessage
                      role={message.role}
                      content={message.content}
                      isStreaming={streaming && index === messages.length - 1 && message.role === 'assistant'}
                      onShowLawyers={message.role === 'assistant' ? onShowLawyers : undefined}
                      onRegenerate={(!streaming && index === messages.length - 1 && message.role === 'assistant') ? () => { } : undefined}
                      onEdit={message.role === 'user' ? (newContent) => onUpdateMessage(message.id, newContent) : undefined}
                    />
                  </div>
                ))}

                {/* Suggestions removed */}

                {/* Bottom padding for comfortable reading */}
                <div className="h-8" />
              </div>
            </div>

            {/* Scroll Button */}
            <button
              onClick={() => scrollToBottom('smooth')}
              className={cn(
                'absolute bottom-4 right-6 z-20',
                'w-10 h-10 rounded-full',
                'bg-white dark:bg-slate-800 shadow-xl border border-slate-100 dark:border-slate-700',
                'flex items-center justify-center',
                'text-slate-600 dark:text-slate-300',
                'hover:scale-105 active:scale-95 hover:bg-slate-50 dark:hover:bg-slate-700',
                'transition-all duration-300 cubic-bezier(0.16, 1, 0.3, 1)',
                showScrollButton
                  ? 'opacity-100 translate-y-0'
                  : 'opacity-0 translate-y-4 pointer-events-none'
              )}
            >
              <ArrowDown className="w-5 h-5" />
            </button>
          </>
        )}
      </div>

      {/* Chat Input - Fixed at bottom */}
      <div className="shrink-0 border-t border-slate-200/50 dark:border-slate-700/50">
        <ChatInput
        onSend={hasSession ? onSendMessage : onStartNewChat}
        disabled={loading || streaming}
        isStreaming={streaming}
        placeholder="Ask anything..."
      />
      </div>
    </div>
  );
}
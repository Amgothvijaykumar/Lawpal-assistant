import { useRef, useEffect, useState } from 'react';
import {
  MessageSquare,
  User,
  Send,
  Paperclip,
  Smile,
  MoreVertical,
  ChevronLeft,
  Circle,
  Copy,
  Info,
  ShieldCheck,
  CheckCheck,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { ChatMessage as ChatMessageType } from '@/hooks/useChatMessages';
import { useAuth } from '@/contexts/AuthContext';

interface LawyerChatContainerProps {
  messages: ChatMessageType[];
  loading: boolean;
  onSendMessage: (message: string) => void;
  onClose?: () => void;
  sessionTitle?: string;
  isLawyer?: boolean;
}

export function LawyerChatContainer({
  messages,
  loading,
  onSendMessage,
  onClose,
  sessionTitle,
  isLawyer
}: LawyerChatContainerProps) {
  const { user } = useAuth();
  const [message, setMessage] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  // Debugging log to confirm message reception
  useEffect(() => {
    console.log(`💬 Chat Rendering: ${messages.length} messages received. Loading: ${loading}`);
  }, [messages, loading]);

  useEffect(() => {
    if (scrollRef.current) {
      const scrollContainer = scrollRef.current;
      scrollContainer.scrollTop = scrollContainer.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = () => {
    if (message.trim()) {
      onSendMessage(message);
      setMessage('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="h-full flex flex-col bg-[#F9FAFB] dark:bg-slate-900 font-sans overflow-hidden border-x border-slate-200/60 dark:border-slate-800/40">
      {/* Premium Glassmorphic Header */}
      <header className="px-8 py-5 border-b border-slate-200/60 dark:border-slate-800/40 flex items-center justify-between bg-[#F9FAFB]/70 dark:bg-slate-900/70 backdrop-blur-xl sticky top-0 z-30 shadow-sm">
        <div className="flex items-center gap-5">
          {onClose && (
            <Button variant="ghost" size="icon" onClick={onClose} className="lg:hidden -ml-3 text-slate-400 hover:text-indigo-600 transition-all">
              <ChevronLeft className="w-6 h-6" />
            </Button>
          )}
          <div className="relative group cursor-pointer">
            <div className="absolute -inset-1.5 bg-gradient-to-tr from-indigo-500 to-purple-500 rounded-2xl opacity-20 group-hover:opacity-40 blur-sm transition-opacity duration-500" />
            <Avatar className="relative w-12 h-12 ring-2 ring-white dark:ring-slate-900 shadow-md">
              <AvatarImage src="" />
              <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-indigo-700 text-white font-bold text-lg">
                {sessionTitle?.[0]?.toUpperCase() || <User className="w-5 h-5" />}
              </AvatarFallback>
            </Avatar>
            <span className="absolute bottom-0 right-0 w-4 h-4 bg-emerald-500 border-[3px] border-white dark:border-[#080B14] rounded-full shadow-lg" />
          </div>
          <div className="flex flex-col">
            <h3 className="text-[15px] font-bold text-slate-900 dark:text-slate-100 tracking-tight leading-none mb-1.5">
              {sessionTitle || (isLawyer ? 'Client Consultation' : 'Legal Counsel')}
            </h3>
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-[0.1em]">
                Secure Relay Active
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-10 w-10 text-slate-400 hover:text-indigo-600 rounded-xl transition-all">
                  <ShieldCheck className="w-5 h-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Verified Counsel</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-10 w-10 text-slate-400 hover:text-slate-600 rounded-xl transition-all">
                <MoreVertical className="w-5 h-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 p-1.5 rounded-xl">
              <DropdownMenuItem className="rounded-lg gap-3">
                <Info className="w-4 h-4 text-slate-400" /> Session Details
              </DropdownMenuItem>
              <DropdownMenuItem className="rounded-lg gap-3">
                <Copy className="w-4 h-4 text-slate-400" /> Export Chat
              </DropdownMenuItem>
              <div className="h-px bg-slate-100 dark:bg-slate-800 my-1" />
              <DropdownMenuItem className="rounded-lg gap-3 text-red-500 font-bold">
                End Consultation
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Message Stream */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-6 md:px-12 lg:px-16 py-10 space-y-4 scroll-smooth min-h-0"
      >
        {messages.length === 0 && !loading && (
          <div className="flex flex-col items-center justify-center h-full max-w-sm mx-auto text-center space-y-6">
            <div className="w-20 h-20 rounded-[32px] bg-white dark:bg-slate-800 flex items-center justify-center shadow-xl border border-slate-100 dark:border-slate-700">
              <ShieldCheck className="w-10 h-10 text-indigo-500" />
            </div>
            <div className="space-y-2">
              <p className="text-lg font-bold text-slate-900 dark:text-slate-100 italic">"Justice is immediate."</p>
              <p className="text-xs text-slate-500 font-medium leading-relaxed">Privileged communication link established. All messages are encrypted.</p>
            </div>
          </div>
        )}

        {loading && messages.length === 0 && (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
          </div>
        )}

        {messages.map((msg, index) => {
          // Detect sender
          const isMe = (isLawyer && msg.role === 'lawyer') || (!isLawyer && msg.role === 'user');
          const isFirstInGroup = index === 0 || messages[index - 1].role !== msg.role;

          return (
            <div
              key={msg.id || `msg-${index}`}
              className={cn(
                "flex w-full animate-in fade-in slide-in-from-bottom-2 duration-300",
                isMe ? "justify-end" : "justify-start",
                isFirstInGroup ? "mt-8" : "mt-1"
              )}
            >
              <div
                className={cn(
                  "group relative max-w-[85%] md:max-w-[75%] flex flex-col",
                  isMe ? "items-end" : "items-start"
                )}
              >
                <div
                  className={cn(
                    "px-4 py-3 rounded-2xl text-[14.5px] leading-relaxed shadow-sm transition-all duration-200",
                    isMe
                      ? "bg-indigo-600 text-white rounded-tr-none"
                      : "bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-tl-none border border-slate-100 dark:border-slate-700/50"
                  )}
                >
                  <p className="whitespace-pre-wrap font-medium tracking-tight">
                    {msg.content}
                  </p>

                  {/* Visual Copy Trigger */}
                  <button
                    onClick={() => copyToClipboard(msg.content)}
                    className={cn(
                      "absolute top-0 w-8 h-8 rounded-full bg-white dark:bg-slate-900 shadow-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity",
                      isMe ? "left-[-40px]" : "right-[-40px]"
                    )}
                  >
                    <Copy className="w-3 h-3 text-slate-400" />
                  </button>
                </div>

                {isFirstInGroup && (
                  <div className={cn(
                    "flex items-center gap-2 mt-1.5 px-1",
                    isMe ? "flex-row" : "flex-row-reverse"
                  )}>
                    <span className="text-[9px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest">
                      {msg.created_at ? new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Now'}
                    </span>
                    {isMe && (
                      <CheckCheck className="w-3 h-3 text-indigo-400" />
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Input Area */}
      <div className="px-6 md:px-12 lg:px-16 pb-8 pt-4 bg-[#F9FAFB]/70 dark:bg-slate-900/70 backdrop-blur-md border-t border-slate-100 dark:border-slate-800/40">
        <div className="max-w-5xl mx-auto">
          <div className="relative group transition-all">
            <div className="relative bg-white dark:bg-slate-800 rounded-2xl border-2 border-slate-200 dark:border-slate-700 p-1.5 pr-2 focus-within:border-indigo-500/50 transition-all flex items-end shadow-lg shadow-slate-100 dark:shadow-none">
              <Button variant="ghost" size="icon" className="h-10 w-10 text-slate-400 hover:text-indigo-600 rounded-full shrink-0">
                <Paperclip className="w-5 h-5 rotate-45" />
              </Button>

              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="Compose your message..."
                className="flex-1 min-h-[44px] max-h-[200px] py-3 px-3 resize-none bg-transparent border-none text-[15px] focus-visible:ring-0 focus-visible:ring-offset-0 text-slate-900 dark:text-slate-100"
                rows={1}
              />

              <Button
                onClick={handleSendMessage}
                disabled={!message.trim()}
                className={cn(
                  "h-10 w-10 rounded-xl p-0 transition-all shrink-0",
                  message.trim()
                    ? "bg-indigo-600 hover:bg-indigo-700 text-white"
                    : "bg-slate-100 dark:bg-slate-700 text-slate-400"
                )}
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>

        </div>
      </div>

      <style>
        {`
        .scroll-smooth { scroll-behavior: smooth; }
        .min-h-0 { min-height: 0; }
        `}
      </style>
    </div>
  );
}
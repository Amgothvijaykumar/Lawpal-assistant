import { useState, useRef, useEffect } from 'react';
import { Send, Loader2, Paperclip, StopCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
  isStreaming?: boolean;
  onStopGenerating?: () => void;
  placeholder?: string;
}

export function ChatInput({
  onSend,
  disabled,
  isStreaming,
  onStopGenerating,
  placeholder = "Ask a legal question..."
}: ChatInputProps) {
  const [input, setInput] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
    }
  }, [input]);

  // Save draft to localStorage
  useEffect(() => {
    const savedDraft = localStorage.getItem('chat_draft');
    if (savedDraft) {
      setInput(savedDraft);
    }
  }, []);

  useEffect(() => {
    if (input) {
      localStorage.setItem('chat_draft', input);
    } else {
      localStorage.removeItem('chat_draft');
    }
  }, [input]);

  // Listen for suggestion clicks from messages
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<string>).detail;
      if (typeof detail === 'string') {
        setInput(detail.replace(/^([\p{Emoji_Presentation}\p{Extended_Pictographic}]\s*)/u, ''));
      }
    };
    window.addEventListener('chat:suggestion', handler as EventListener);
    return () => window.removeEventListener('chat:suggestion', handler as EventListener);
  }, []);

  const handleSubmit = () => {
    const trimmed = input.trim();
    if (trimmed && !disabled) {
      onSend(trimmed);
      setInput('');
      localStorage.removeItem('chat_draft');
      // Reset height
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto px-4 md:px-6 pb-4 pt-2 bg-gradient-to-t from-[#F9FAFB] via-[#F9FAFB] to-transparent dark:from-slate-900 dark:via-slate-900">
      {/* Input Box */}
      <div className="relative flex items-end gap-2 bg-white dark:bg-slate-900 rounded-2xl p-2 border border-slate-200 dark:border-slate-700/50 focus-within:border-indigo-400/50 focus-within:ring-2 focus-within:ring-indigo-100 dark:focus-within:ring-indigo-900/30 transition-all shadow-lg">
        {/* Attach Document Button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 rounded-full shrink-0 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-200/50 dark:hover:bg-slate-700/50"
              disabled={disabled}
            >
              <Paperclip className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Attach document</TooltipContent>
          </Tooltip>

          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            className={cn(
              'flex-1 min-h-[44px] max-h-[200px] resize-none border-0 bg-transparent',
              'focus-visible:ring-0 focus-visible:ring-offset-0',
              'placeholder:text-slate-400 dark:placeholder:text-slate-500',
              'text-base leading-relaxed px-2 py-3'
            )}
            rows={1}
          />

          {isStreaming ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={onStopGenerating}
                  size="icon"
                  className="h-10 w-10 rounded-full shrink-0 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 hover:bg-slate-700 dark:hover:bg-slate-200 shadow-sm"
                >
                  <StopCircle className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Stop generating</TooltipContent>
            </Tooltip>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={disabled || !input.trim()}
              size="icon"
              className={cn(
                'h-10 w-10 rounded-full shrink-0 transition-all shadow-sm',
                input.trim()
                  ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
                  : 'bg-slate-200 dark:bg-slate-800 text-slate-400'
              )}
            >
              {disabled ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4 ml-0.5" />
              )}
            </Button>
          )}
      </div>
      {/* Disclaimer */}
      <p className="text-[11px] text-slate-400 text-center mt-2">
        ACTRIGHT provides legal information, not legal advice. Consult a licensed lawyer for specific legal matters.
      </p>
    </div>
  );
}
import { useState, useRef, useEffect } from 'react';
<<<<<<< HEAD
import { Send, Loader2, Paperclip, StopCircle, Mic, MicOff, Check, Trash2 } from 'lucide-react';
=======
import { Send, Loader2, Paperclip, StopCircle, Scale } from 'lucide-react';
>>>>>>> Amar
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { toast } from 'sonner';

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
  isStreaming?: boolean;
  onStopGenerating?: () => void;
  placeholder?: string;
  onOpenMiniCourt?: () => void;
}

export function ChatInput({
  onSend,
  disabled,
  isStreaming,
  onStopGenerating,
  placeholder = "Ask a legal question...",
  onOpenMiniCourt
}: ChatInputProps) {
  const [input, setInput] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<any>(null);

  // Initialize Speech Recognition
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = false; // More stable against 'network' timeouts
        recognition.interimResults = true;
        recognition.lang = 'en-IN';

        recognition.onstart = () => {
          setIsListening(true);
          setInterimTranscript('');
          toast.info("Listening... Speak clearly 🎙️");
        };

        recognition.onresult = (event: any) => {
          let currentTranscript = '';
          for (let i = 0; i < event.results.length; ++i) {
            currentTranscript += event.results[i][0].transcript;
          }
          setInterimTranscript(currentTranscript);
        };

        recognition.onerror = (event: any) => {
          // 'network' error is common if silent for too long or signal drop
          // 'aborted' happens if we stop manually - no need for error logs
          if (event.error !== 'aborted' && event.error !== 'no-speech') {
            console.error("Speech recognition error:", event.error, event.message); // Added more logging
            if (event.error === 'network') {
              toast.error("Network sync issue. Try a shorter sentence.");
            } else if (event.error === 'not-allowed') {
              toast.error("Microphone access blocked.");
            } else {
              toast.error("Voice input error. Let's try again.");
            }
          }
          setIsListening(false);
        };

        recognition.onend = () => {
          setIsListening(false);
        };

        recognitionRef.current = recognition;
      }
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort(); // Ensure recognition is stopped
        recognitionRef.current = null; // Nullify ref on unmount
      }
    };
  }, []);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      toast.error("Voice input is not supported in this browser.");
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
    } else {
      setInterimTranscript('');
      try {
        recognitionRef.current.start();
      } catch (e) {
        console.warn("Recognition start failed:", e);
      }
    }
  };

  const handleConfirmVoice = () => {
    if (interimTranscript.trim()) {
      setInput(prev => {
        const space = prev && !prev.endsWith(' ') ? ' ' : '';
        return prev + space + interimTranscript.trim();
      });
      setInterimTranscript('');
    }
  };

  const handleDiscardVoice = () => {
    setInterimTranscript('');
  };

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
    }
  }, [input, interimTranscript]);

  const handleSubmit = () => {
    const trimmed = input.trim();
    if (trimmed && !disabled) {
      onSend(trimmed);
      setInput('');
      localStorage.removeItem('chat_draft');
      if (textareaRef.current) textareaRef.current.style.height = 'auto';
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

      {/* Voice Review Bar - Appears after speaking */}
      {interimTranscript && !isListening && (
        <div className="mb-2 flex items-center justify-between px-4 py-3 bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-100 dark:border-indigo-800/50 rounded-2xl animate-in slide-in-from-bottom-2 shadow-lg backdrop-blur-sm">
          <div className="flex-1 min-w-0 pr-4">
            <p className="text-xs font-bold text-indigo-500 uppercase tracking-tighter mb-0.5">Voice Preview</p>
            <p className="text-[13.5px] italic text-indigo-700 dark:text-indigo-200 truncate leading-snug">
              "{interimTranscript}"
            </p>
          </div>
          <div className="flex gap-2 shrink-0">
            <Button
              size="icon"
              variant="ghost"
              onClick={handleDiscardVoice}
              className="h-9 w-9 rounded-full text-red-500 hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors"
            >
<<<<<<< HEAD
              <Trash2 className="w-4.5 h-4.5" />
            </Button>
            <Button
              size="icon"
              onClick={handleConfirmVoice}
              className="h-9 w-9 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white shadow-md transition-all active:scale-90"
            >
              <Check className="w-4.5 h-4.5" />
            </Button>
          </div>
        </div>
      )}

      {/* Input Box */}
      <div className={cn(
        "relative flex items-end gap-2 bg-white dark:bg-slate-900 rounded-2xl p-2 border transition-all shadow-xl overflow-hidden",
        isListening ? "border-indigo-500 ring-4 ring-indigo-500/10 dark:ring-indigo-500/20" : "border-slate-200 dark:border-slate-700/50 focus-within:border-indigo-400/50 focus-within:ring-2 focus-within:ring-indigo-100 dark:focus-within:ring-indigo-900/30"
      )}>

        {/* Audio Waves Animation Overlay */}
        {isListening && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center gap-1.5 opacity-[0.15]">
            {[...Array(15)].map((_, i) => (
              <div
                key={i}
                className="w-1.5 bg-indigo-600 rounded-full animate-voice-wave"
                style={{
                  height: '40%',
                  animationDelay: `${i * 0.07}s`
                }}
              />
            ))}
          </div>
        )}

        <Button
          variant="ghost"
          size="icon"
          className="h-10 w-10 rounded-full shrink-0 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 relative z-10"
          disabled={disabled || isListening}
        >
          <Paperclip className="w-4.5 h-4.5" />
        </Button>

        <Textarea
          ref={textareaRef}
          value={isListening ? (interimTranscript || "Listening...") : input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={isListening ? "Speak now..." : placeholder}
          disabled={disabled || isListening}
          className={cn(
            'flex-1 min-h-[44px] max-h-[200px] resize-none border-0 bg-transparent relative z-10',
            'focus-visible:ring-0 focus-visible:ring-offset-0',
            'text-base leading-relaxed px-2 py-3',
            isListening && "italic text-indigo-700 dark:text-indigo-400 font-medium"
          )}
          rows={1}
        />

        {/* Action Buttons */}
        <div className="flex gap-1.5 relative z-10">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={toggleListening}
                variant="ghost"
                size="icon"
                className={cn(
                  "h-10 w-10 rounded-full shrink-0 transition-all duration-300",
                  isListening
                    ? "bg-indigo-600 text-white shadow-lg shadow-indigo-200 dark:shadow-none animate-pulse"
                    : "text-slate-400 hover:text-indigo-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                )}
                disabled={disabled || isStreaming}
              >
                {isListening ? (
                  <div className="relative flex items-center justify-center">
                    <MicOff className="w-5 h-5 animate-in zoom-in duration-300" />
                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-indigo-600" />
                  </div>
                ) : (
                  <Mic className="w-5 h-5 transition-transform hover:scale-110" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>{isListening ? 'Stop recording' : 'Voice input'}</TooltipContent>
=======
              <Paperclip className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Attach document</TooltipContent>
        </Tooltip>

        {/* MiniCourt Button */}
        {onOpenMiniCourt && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={onOpenMiniCourt}
                className="h-10 w-10 rounded-full shrink-0 text-amber-600 hover:text-amber-700 dark:hover:text-amber-400 hover:bg-amber-100/50 dark:hover:bg-amber-900/30"
                disabled={disabled}
              >
                <Scale className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Open Digital Courtroom</TooltipContent>
>>>>>>> Amar
          </Tooltip>
        )}

          {isStreaming ? (
            <Button
              onClick={onStopGenerating}
              size="icon"
              className="h-10 w-10 rounded-full shrink-0 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 hover:scale-105 active:scale-95"
            >
              <StopCircle className="w-4 h-4" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={disabled || !input.trim() || isListening}
              size="icon"
              className={cn(
                'h-10 w-10 rounded-full shrink-0 transition-all',
                input.trim()
                  ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-500/25 shadow-lg'
                  : 'bg-slate-50 dark:bg-slate-800/50 text-slate-300'
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
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes voice-wave {
          0%, 100% { transform: scaleY(1); opacity: 0.3; }
          50% { transform: scaleY(3.5); opacity: 0.9; }
        }
        .animate-voice-wave {
          animation: voice-wave 0.7s ease-in-out infinite;
        }
      `}} />

      {/* Disclaimer */}
      <p className="text-[11px] text-slate-400 text-center mt-3 opacity-60">
        ACTRIGHT provides legal information, not legal advice.
      </p>
    </div>
  );
}
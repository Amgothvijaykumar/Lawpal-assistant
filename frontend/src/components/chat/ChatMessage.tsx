import { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Copy, Check, Pencil, RotateCcw, ThumbsUp, ThumbsDown, ChevronRight, Scale, Volume2, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { polishResponse } from '@/lib/textPolishing';
import { HighlightPopup } from './HighlightPopup';
import type { Highlight } from '@/hooks/useChatMessages';

// Custom theme for code blocks to match "GPT-style" (black background)
const customCodeTheme = {
  ...vscDarkPlus,
  'pre[class*="language-"]': {
    ...vscDarkPlus['pre[class*="language-"]'],
    background: '#09090b', // zinc-950 (near black)
    margin: 0,
    padding: '1rem',
    overflow: 'auto',
    borderRadius: '0 0 0.5rem 0.5rem', // Rounded bottom only
    border: '1px solid #27272a', // zinc-800
    borderTop: 'none',
  },
  'code[class*="language-"]': {
    ...vscDarkPlus['code[class*="language-"]'],
    background: 'transparent',
    fontFamily: 'JetBrains Mono, Menlo, Monaco, Consolas, "Courier New", monospace',
    fontSize: '0.875rem',
    lineHeight: '1.5',
  }
};

interface ChatMessageProps {
  id: string;
  role: 'user' | 'assistant' | 'lawyer';
  content: string;
  highlights?: Highlight[];
  isStreaming?: boolean;
  onRegenerate?: () => void;
  onShowLawyers?: () => void;
  onEdit?: (newContent: string) => void;
  onAddHighlight?: (start: number, end: number, color: string) => void;
  onRemoveHighlight?: (highlightId: string) => void;
  userAvatar?: string;
}

// Code Block Component with Copy & Header
const CodeBlock = ({ node, inline, className, children, ...props }: any) => {
  const match = /language-(\w+)/.exec(className || '');
  const language = match ? match[1] : 'text';
  const StringChildren = String(children).replace(/\n$/, '');
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(StringChildren);
    setCopied(true);
    toast.success('Code copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  if (inline) {
    return (
      <code className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-sm font-mono text-pink-500 dark:text-pink-400" {...props}>
        {children}
      </code>
    );
  }

  return (
    <div className="my-4 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-800 bg-[#09090b] shadow-sm group">
      {/* Code Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-slate-100 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <span className="text-xs font-sans text-slate-500 lowercase">{language}</span>
        </div>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 transition-colors"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-green-500" />
              <span className="text-green-500">Copied</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>

      {/* Code Content */}
      <div className="relative overflow-x-auto">
        <SyntaxHighlighter
          style={customCodeTheme}
          language={language}
          PreTag="div"
          showLineNumbers={false}
          wrapLines={false} // Allow scrolling
          customStyle={{ margin: 0, borderRadius: 0, background: 'transparent' }}
          {...props}
        >
          {StringChildren}
        </SyntaxHighlighter>
      </div>
    </div>
  );
};

export function ChatMessage({ id, role, content, highlights = [], isStreaming, onRegenerate, onShowLawyers, onEdit, onAddHighlight, onRemoveHighlight, userAvatar }: ChatMessageProps) {
  const isUser = role === 'user';
  const [copied, setCopied] = useState(false);
  const [feedback, setFeedback] = useState<'up' | 'down' | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(content);

  // Speech Synthesis State
  const [isSpeaking, setIsSpeaking] = useState(false);
  const speechRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Highlight state
  const [showHighlightPopup, setShowHighlightPopup] = useState(false);
  const [highlightPopupPosition, setHighlightPopupPosition] = useState({ x: 0, y: 0 });
  const [selectedRange, setSelectedRange] = useState<{ start: number; end: number } | null>(null);
  const [existingHighlight, setExistingHighlight] = useState<Highlight | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // Cleanup speech on unmount
  useEffect(() => {
    return () => {
      if (speechRef.current) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const handleSpeak = () => {
    try {
      const synth = window.speechSynthesis;

      // 1. If currently speaking this message, STOP.
      if (isSpeaking) {
        synth.cancel();
        setIsSpeaking(false);
        return;
      }

      // 2. Clear anything else currently speaking/queued
      if (synth.speaking) {
        synth.cancel();
      }

      // 3. Clean complex legal markdown for narration
      const textToSpeak = content
        .replace(/[*#`_~]/g, '')
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
        .replace(/- /g, '. ')
        .replace(/\n/g, ' ')
        .replace(/Section (\d+)/gi, 'Section $1')
        .trim();

      if (!textToSpeak) return;

      const utterance = new SpeechSynthesisUtterance(textToSpeak);

      // Get best English voice
      const voices = synth.getVoices();
      const naturalVoice = voices.find(v => v.lang.startsWith('en') && v.name.includes('Natural'))
        || voices.find(v => v.lang.startsWith('en'))
        || voices[0];

      if (naturalVoice) utterance.voice = naturalVoice;
      utterance.lang = 'en-US';
      utterance.rate = 1.05;
      utterance.pitch = 1.0;

      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);

      utterance.onerror = (e) => {
        // Suppress 'interrupted' / 'canceled' (Code 2) - these are not real errors
        if (e.error !== 'interrupted' && e.error !== 'canceled') {
          console.error('Speech synthesis error:', e);
          toast.error("Speech issue. Try again.");
        }
        setIsSpeaking(false);
      };

      // 4. Start speech
      synth.speak(utterance);
    } catch (err) {
      // Catch rare fatal errors but don't spam console
      setIsSpeaking(false);
    }
  };

  const displayContent = useMemo(() => {
    if (isUser) return content;
    if (isStreaming) {
      return content.trim().replace(/\n{3,}/g, '\n\n');
    }
    return polishResponse(content);
  }, [content, isStreaming, isUser]);

  const handleCopy = async () => {
    const textToCopy = isUser ? content : displayContent;
    await navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleFeedback = (type: 'up' | 'down') => {
    setFeedback(type);
    toast.success(type === 'up' ? 'Thanks for your feedback!' : 'We\'ll improve based on your feedback');
  };

  const { cleanedDisplayContent, confidenceScore } = useMemo(() => {
    if (isUser) return { cleanedDisplayContent: displayContent, confidenceScore: null };

    const confidenceMatch = displayContent.match(/Confidence:\s*(\d+(?:\/\d+)?)/i);
    if (confidenceMatch) {
      const score = confidenceMatch[1];
      const cleaned = displayContent.replace(/Confidence:\s*\d+(?:\/\d+)?/gi, '').trim();
      return { cleanedDisplayContent: cleaned, confidenceScore: score };
    }

    return { cleanedDisplayContent: displayContent, confidenceScore: null };
  }, [displayContent, isUser]);

  const handleMouseUp = useCallback(() => {
    if (isUser || isStreaming || !onAddHighlight) return;

    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    const selectedText = selection.toString();
    if (!selectedText.trim() || !contentRef.current?.contains(range.commonAncestorContainer)) return;

    // Skip code blocks
    if (range.commonAncestorContainer.parentElement?.closest('pre, code, .syntax-highlighter')) return;

    // Visual Text Metrics
    const fullVisualText = contentRef.current.innerText;

    // Get visual indices for debugging & context extraction
    const preSelectionRange = range.cloneRange();
    preSelectionRange.selectNodeContents(contentRef.current);
    preSelectionRange.setEnd(range.startContainer, range.startOffset);
    const visualStartIndex = preSelectionRange.toString().length;
    const visualEndIndex = visualStartIndex + selectedText.length;

    // Boundary Context to identify unique occurrence
    const contextSize = 15;
    const prefixContext = fullVisualText.slice(Math.max(0, visualStartIndex - contextSize), visualStartIndex);
    const suffixContext = fullVisualText.slice(visualEndIndex, visualEndIndex + contextSize);

    // RAWMarkdown Alignment Search
    const rawContent = cleanedDisplayContent;
    let finalRawStart = -1;
    let finalRawEnd = -1;

    // Strategy: Search for instances of selectedText and find the one that matches Visual Context
    let currentPos = 0;
    let bestMatchScore = -1;

    while ((currentPos = rawContent.indexOf(selectedText, currentPos)) !== -1) {
      const matchPrefix = rawContent.slice(Math.max(0, currentPos - 30), currentPos);
      const matchSuffix = rawContent.slice(currentPos + selectedText.length, currentPos + selectedText.length + 30);

      // Calculate match score based on surrounding word overlaps
      let score = 0;
      const prefixWords = prefixContext.trim().split(/\s+/).slice(-2);
      const suffixWords = suffixContext.trim().split(/\s+/).slice(0, 2);

      prefixWords.forEach(w => { if (matchPrefix.toLowerCase().includes(w.toLowerCase())) score += 1; });
      suffixWords.forEach(w => { if (matchSuffix.toLowerCase().includes(w.toLowerCase())) score += 1; });

      if (score > bestMatchScore) {
        bestMatchScore = score;
        finalRawStart = currentPos;
        finalRawEnd = currentPos + selectedText.length;
      }

      currentPos += 1;
    }

    // Telemetry
    console.log('📑 Highlighting mapping:', {
      visual: { start: visualStartIndex, text: selectedText },
      raw: { start: finalRawStart, end: finalRawEnd },
      context: { prefix: prefixContext, suffix: suffixContext }
    });

    if (finalRawStart === -1) {
      console.warn('❌ Context matching failed. Aborting highlight.');
      return;
    }

    const overlappingHighlight = highlights.find(h => finalRawStart < h.end && finalRawEnd > h.start);
    const rect = range.getBoundingClientRect();

    setSelectedRange({ start: finalRawStart, end: finalRawEnd });
    setExistingHighlight(overlappingHighlight || null);
    setHighlightPopupPosition({ x: rect.left + rect.width / 2, y: rect.top });
    setShowHighlightPopup(true);

    // Clear selection so the highlight <mark> is clearly visible
    selection.removeAllRanges();
  }, [isUser, isStreaming, highlights, onAddHighlight, cleanedDisplayContent]);

  const handleApplyHighlight = useCallback((color: string) => {
    if (!selectedRange || !onAddHighlight) return;
    onAddHighlight(selectedRange.start, selectedRange.end, color);
    setSelectedRange(null);
    setShowHighlightPopup(false);
  }, [selectedRange, onAddHighlight]);

  const handleRemoveHighlight = useCallback((highlightId: string) => {
    if (onRemoveHighlight) onRemoveHighlight(highlightId);
    setShowHighlightPopup(false);
  }, [onRemoveHighlight]);

  const closeHighlightPopup = useCallback(() => {
    setShowHighlightPopup(false);
    setSelectedRange(null);
    setExistingHighlight(null);
  }, []);

  const contentWithHighlights = useMemo(() => {
    if (!highlights || highlights.length === 0) return cleanedDisplayContent;
    const sorted = [...highlights].sort((a, b) => b.start - a.start);
    let result = cleanedDisplayContent;
    sorted.forEach(hl => {
      if (hl.start < 0 || hl.end > result.length || hl.start >= hl.end) return;
      const before = result.slice(0, hl.start);
      const target = result.slice(hl.start, hl.end);
      const after = result.slice(hl.end);
      const mark = `<mark class="content-highlight" style="background-color: ${hl.color}40; border-bottom: 2px solid ${hl.color}; border-radius: 2px; padding: 0 2px; cursor: pointer;" data-highlight-id="${hl.highlightId}">${target}</mark>`;
      result = before + mark + after;
    });
    return result;
  }, [cleanedDisplayContent, highlights]);

  const handleSaveEdit = () => {
    if (editedContent.trim() !== content && onEdit) onEdit(editedContent);
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditedContent(content);
    setIsEditing(false);
  };

  return (
    <div className={cn(
      "group py-8 px-4 md:px-8 transition-colors duration-200 w-full",
      !isUser && "ai-message bg-slate-50/30 dark:bg-slate-900/10 border-y border-slate-100/50 dark:border-slate-800/50"
    )}>
      <div className={cn(
        'max-w-3xl mx-auto flex gap-4 md:gap-8 items-start',
        isUser ? 'flex-row-reverse' : 'flex-row'
      )}>
        <div className={cn(
          'ai-avatar w-8 h-8 md:w-10 md:h-10 shrink-0 flex select-none flex-col justify-center items-center rounded-xl overflow-hidden shadow-sm',
          'transition-transform duration-300 hover:scale-110 cursor-default',
          isUser ? 'bg-indigo-100 dark:bg-indigo-900/30' : 'bg-gradient-to-br from-emerald-500 to-teal-600'
        )}>
          {isUser ? (
            userAvatar ? <img src={userAvatar} alt="User" className="w-full h-full object-cover" /> : <User className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          ) : <Scale className="w-5 h-5 text-white" />}
        </div>

        <div className={cn('ai-content relative flex-1 overflow-hidden min-w-0 pt-0.5', isUser ? 'text-right' : 'text-left')}>
          {!isEditing ? (
            <div className={cn("max-w-none transition-all first:mt-0", isUser ? "text-slate-900 px-6 py-3 rounded-2xl rounded-tr-sm inline-block text-left shadow-sm font-medium text-[15px] md:text-base leading-relaxed border border-slate-200/50" : "relative w-full py-2")} style={isUser ? { backgroundColor: 'hsla(220, 14%, 96%, 0.4)' } : {}}>
              {isUser ? (
                <div className="whitespace-pre-wrap">{content}</div>
              ) : isStreaming ? (
                <div className="whitespace-pre-wrap" style={{ letterSpacing: '-0.011em', lineHeight: '1.8' }}>
                  {displayContent}<span className="text-indigo-500 ml-1 animate-pulse font-bold">▍</span>
                </div>
              ) : (
                <div ref={contentRef} onMouseUp={handleMouseUp} className="select-text cursor-text">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    rehypePlugins={[rehypeRaw]}
                    components={{
                      code: CodeBlock,
                      a: ({ node, ...props }: any) => <a className="text-indigo-600 dark:text-indigo-400 font-bold hover:underline underline-offset-4" target="_blank" rel="noopener noreferrer" {...props} />,
                      table: ({ node, ...props }: any) => (
                        <div className="overflow-x-auto my-6 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm bg-white dark:bg-slate-950">
                          <table className="w-full text-sm md:text-[15px] text-left border-collapse" {...props} />
                        </div>
                      ),
                      thead: ({ node, ...props }: any) => <thead className="bg-slate-50 dark:bg-slate-900/80 text-slate-800 dark:text-slate-200 font-bold" {...props} />,
                      th: ({ node, ...props }: any) => <th className="px-5 py-3 border-b border-slate-200 dark:border-slate-800" {...props} />,
                      td: ({ node, ...props }: any) => <td className="px-5 py-3 border-b border-slate-100 dark:border-slate-900" {...props} />,
                      strong: ({ node, ...props }: any) => <strong className="font-bold text-slate-900 dark:text-white" {...props} />,
                      hr: ({ node, ...props }: any) => <hr className="my-8 border-slate-200 dark:border-slate-800" {...props} />,
                    }}
                  >
                    {contentWithHighlights}
                  </ReactMarkdown>
                </div>
              )}

              {!isUser && !isStreaming && (confidenceScore || onShowLawyers) && (
                <div className="mt-6 pt-2 flex items-center justify-between border-t border-slate-200/40 dark:border-slate-700/40">
                  {confidenceScore ? (
                    <div className="group flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest select-none cursor-help">
                      <div className={cn("w-1.5 h-1.5 rounded-full transition-colors", parseInt(confidenceScore) > 7 ? "bg-emerald-500 group-hover:bg-emerald-600" : "bg-amber-500 group-hover:bg-amber-600")} />
                      <span className="text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-colors">Score analysis</span>
                      <span className={cn("ml-0.5 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300", parseInt(confidenceScore) > 7 ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400")}>
                        {confidenceScore}
                      </span>
                    </div>
                  ) : <div />}

                  {onShowLawyers && (
                    <button onClick={onShowLawyers} className="group flex items-center gap-1.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                      <span className="text-[10px] font-medium">Need a lawyer for this? <span className="font-bold ml-1 text-indigo-600 dark:text-indigo-400">View recommended lawyers</span></span>
                      <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                    </button>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="w-full">
              <textarea value={editedContent} onChange={(e) => setEditedContent(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg p-4 text-base focus:outline-none focus:ring-2 focus:ring-primary/50 min-h-[120px] resize-y" />
              <div className="flex justify-end gap-2 mt-3">
                <Button size="sm" variant="ghost" onClick={handleCancelEdit}>Cancel</Button>
                <Button size="sm" onClick={handleSaveEdit}>Save & Submit</Button>
              </div>
            </div>
          )}

          {!isStreaming && !isEditing && (
            <div className={cn("flex items-center gap-1.5 mt-2 transition-all duration-200", isUser ? "justify-end opacity-0 group-hover:opacity-100" : "opacity-100")}>
              {!isUser && (
                <Button variant="ghost" size="icon" className={cn("h-7 w-7 rounded-md transition-colors mr-1", isSpeaking ? "text-indigo-600 bg-indigo-100 dark:bg-indigo-900/30" : "text-slate-400 hover:text-indigo-600 dark:hover:text-white hover:bg-slate-200/80 dark:hover:bg-slate-600/80")} onClick={handleSpeak} title={isSpeaking ? "Stop speaking" : "Read aloud"}>
                  {isSpeaking ? <Square className="w-3.5 h-3.5 animate-pulse fill-current" /> : <Volume2 className="w-3.5 h-3.5" />}
                </Button>
              )}
              <Button variant="ghost" size="icon" className="h-7 w-7 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200/80 dark:hover:bg-slate-600/80 transition-colors" onClick={handleCopy} title="Copy">
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              </Button>
              {isUser && onEdit && (
                <Button variant="ghost" size="icon" className="h-7 w-7 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200/80 dark:hover:bg-slate-600/80 transition-colors" onClick={() => setIsEditing(true)} title="Edit">
                  <Pencil className="w-3.5 h-3.5" />
                </Button>
              )}
              {!isUser && (
                <>
                  <Button variant="ghost" size="icon" className="h-7 w-7 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200/80 dark:hover:bg-slate-600/80 transition-colors" onClick={onRegenerate} title="Regenerate">
                    <RotateCcw className="w-3.5 h-3.5" />
                  </Button>
                  <div className="flex items-center gap-0.5 ml-1.5 border-l border-slate-200 dark:border-slate-700 pl-1.5">
                    <Button variant="ghost" size="icon" className="h-7 w-7 rounded-md text-slate-400 hover:text-green-600 dark:hover:text-green-400 hover:bg-green-100/80 dark:hover:bg-green-900/30 transition-colors" onClick={() => handleFeedback('up')} title="Good response">
                      <ThumbsUp className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 rounded-md text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-100/80 dark:hover:bg-red-900/30 transition-colors" onClick={() => handleFeedback('down')} title="Bad response">
                      <ThumbsDown className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
      {showHighlightPopup && !isUser && !isStreaming && (
        <HighlightPopup position={highlightPopupPosition} existingColor={existingHighlight?.color} existingHighlightId={existingHighlight?.highlightId} onApplyColor={handleApplyHighlight} onRemoveHighlight={handleRemoveHighlight} onClose={closeHighlightPopup} />
      )}
    </div>
  );
}
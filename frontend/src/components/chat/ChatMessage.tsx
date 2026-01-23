import { useState, useMemo } from 'react';
import { User, Copy, Check, Pencil, RotateCcw, ThumbsUp, ThumbsDown, ChevronRight, Scale } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

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
  role: 'user' | 'assistant';
  content: string;
  isStreaming?: boolean;
  onRegenerate?: () => void;
  onShowLawyers?: () => void;
  onEdit?: (newContent: string) => void;
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

export function ChatMessage({ role, content, isStreaming, onRegenerate, onShowLawyers, onEdit }: ChatMessageProps) {
  const isUser = role === 'user';
  const [copied, setCopied] = useState(false);
  const [feedback, setFeedback] = useState<'up' | 'down' | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(content);

  // Add blinking cursor only during streaming and only at the very end of content
  const displayContent = useMemo(() => {
    if (isStreaming && !isUser) {
      return content + ' ▍';
    }
    return content;
  }, [content, isStreaming, isUser]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleFeedback = (type: 'up' | 'down') => {
    setFeedback(type);
    toast.success(type === 'up' ? 'Thanks for your feedback!' : 'We\'ll improve based on your feedback');
  };

  const handleSaveEdit = () => {
    if (editedContent.trim() !== content && onEdit) {
      onEdit(editedContent);
    }
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditedContent(content);
    setIsEditing(false);
  };

  return (
    <div className="group py-5 px-4 md:px-8 transition-colors duration-200">
      <div className={cn(
        'max-w-4xl mx-auto flex gap-4 md:gap-6',
        isUser ? 'flex-row-reverse' : 'flex-row'
      )}>

        {/* Avatar */}
        <div className={cn(
          'w-8 h-8 md:w-9 md:h-9 shrink-0 flex select-none flex-col justify-center items-center rounded-sm',
          isUser ? 'bg-transparent' : 'bg-green-500/10'
        )}>
          {isUser ? (
            <div className="w-8 h-8 md:w-9 md:h-9 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
              <User className="w-5 h-5 text-slate-600 dark:text-slate-300" />
            </div>
          ) : (
            <div className="w-8 h-8 md:w-9 md:h-9 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-md">
              <Scale className="w-4 h-4 md:w-5 md:h-5 text-white" />
            </div>
          )}
        </div>

        {/* Message Content */}
        <div className={cn(
          'relative flex-1 overflow-hidden min-w-0',
          isUser ? 'text-right' : 'text-left'
        )}>

          {/* User Name / Role Label (Optional, good for layout) */}
          <div className="mb-1 hidden">
            <span className="font-semibold text-sm opacity-90">
              {isUser ? 'You' : 'LawPal AI'}
            </span>
          </div>

          {!isEditing ? (
            <div className={cn(
              "prose dark:prose-invert max-w-none leading-[1.6] transition-all first:mt-0 text-base text-slate-800 dark:text-gray-200",
              // Typography tweaks for GPT-style
              "prose-p:mb-4 prose-p:last:mb-0",
              "prose-headings:font-semibold prose-headings:tracking-tight prose-headings:mt-6 prose-headings:mb-3",
              "prose-ul:my-4 prose-ul:list-disc prose-ul:pl-6",
              "prose-ol:my-4 prose-ol:list-decimal prose-ol:pl-6",
              "prose-li:my-1.5",
              "prose-strong:font-semibold prose-strong:text-foreground",
              "prose-blockquote:border-l-4 prose-blockquote:border-slate-300 dark:prose-blockquote:border-slate-700 prose-blockquote:pl-4 prose-blockquote:italic",
              isUser && "bg-slate-100 dark:bg-slate-800/60 px-5 py-3.5 rounded-2xl rounded-tr-sm inline-block text-left text-base"
            )}>
              {isUser ? (
                <div className="whitespace-pre-wrap">{content}</div>
              ) : isStreaming ? (
                // Stable Streaming State (Plain Text, Locked Typography)
                <div
                  className="whitespace-pre-wrap text-base text-slate-800 dark:text-gray-200 font-normal"
                  style={{ lineHeight: '1.6', letterSpacing: '0px' }}
                >
                  {content}
                  <span className="text-indigo-500 ml-1 animate-pulse">▍</span>
                </div>
              ) : (
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    code: CodeBlock,
                    a: ({ node, ...props }) => <a className="text-primary hover:underline underline-offset-4" target="_blank" rel="noopener noreferrer" {...props} />,
                    table: ({ node, ...props }) => <div className="overflow-x-auto my-4 border rounded-lg"><table className="w-full text-base text-left" {...props} /></div>,
                    thead: ({ node, ...props }) => <thead className="bg-slate-100 dark:bg-slate-800/50 uppercase text-xs" {...props} />,
                    th: ({ node, ...props }) => <th className="px-4 py-3 font-semibold border-b" {...props} />,
                    td: ({ node, ...props }) => <td className="px-4 py-3 border-b border-slate-100 dark:border-slate-800" {...props} />,
                    p: ({ node, ...props }) => <p className="mb-3 last:mb-0 leading-[1.6]" {...props} />,
                    ul: ({ node, ...props }) => <ul className="my-3 pl-6 list-disc space-y-1" {...props} />,
                    ol: ({ node, ...props }) => <ol className="my-3 pl-6 list-decimal space-y-1" {...props} />,
                    li: ({ node, ...props }) => <li className="leading-[1.6]" {...props} />,
                  }}
                >
                  {displayContent}
                </ReactMarkdown>
              )}
            </div>
          ) : (
            <div className="w-full">
              <textarea
                value={editedContent}
                onChange={(e) => setEditedContent(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg p-4 text-base focus:outline-none focus:ring-2 focus:ring-primary/50 min-h-[120px] resize-y"
              />
              <div className="flex justify-end gap-2 mt-3">
                <Button size="sm" variant="ghost" onClick={handleCancelEdit}>Cancel</Button>
                <Button size="sm" onClick={handleSaveEdit}>Save & Submit</Button>
              </div>
            </div>
          )}

          {/* Message Actions */}
          {!isStreaming && !isEditing && (
            <div className={cn(
              "flex items-center gap-1.5 mt-2 transition-all duration-200",
              isUser ? "justify-end opacity-0 group-hover:opacity-100" : "opacity-100"
            )}>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200/80 dark:hover:bg-slate-600/80 transition-colors"
                onClick={handleCopy}
                title="Copy"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              </Button>

              {isUser && onEdit && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200/80 dark:hover:bg-slate-600/80 transition-colors"
                  onClick={() => setIsEditing(true)}
                  title="Edit"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </Button>
              )}

              {!isUser && (
                <>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200/80 dark:hover:bg-slate-600/80 transition-colors"
                    onClick={onRegenerate}
                    title="Regenerate"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </Button>
                  <div className="flex items-center gap-0.5 ml-1.5 border-l border-slate-200 dark:border-slate-700 pl-1.5">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 rounded-md text-slate-400 hover:text-green-600 dark:hover:text-green-400 hover:bg-green-100/80 dark:hover:bg-green-900/30 transition-colors"
                      onClick={() => handleFeedback('up')}
                      title="Good response"
                    >
                      <ThumbsUp className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 rounded-md text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-100/80 dark:hover:bg-red-900/30 transition-colors"
                      onClick={() => handleFeedback('down')}
                      title="Bad response"
                    >
                      <ThumbsDown className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Lawyer Suggestion (Only for Assistant) */}
          {!isUser && !isStreaming && onShowLawyers && (
            <div className="mt-4 pt-3 flex items-center gap-2 text-sm border-t border-slate-100 dark:border-slate-800/50">
              <span className="text-slate-500 dark:text-slate-400">Need a lawyer for this issue?</span>
              <button
                onClick={onShowLawyers}
                className="flex items-center gap-1 font-semibold text-[#1e3a8a] dark:text-blue-400 hover:underline transition-all"
              >
                View recommended lawyers
                <ChevronRight className="w-4 h-4 ml-0.5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
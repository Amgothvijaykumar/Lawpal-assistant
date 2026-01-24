import { useState, useEffect } from 'react';
import { Sparkles, ArrowRight } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import axios from 'axios';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface SuggestionsProps {
  sessionId: string | null;
  onSelect: (suggestion: string) => void;
  disabled?: boolean;
}

const API_URL = import.meta.env.VITE_API_BASE_URL;

export function Suggestions({ sessionId, onSelect, disabled }: SuggestionsProps) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const { token } = useAuth();

  useEffect(() => {
    if (!sessionId || !token || disabled) {
      setSuggestions([]);
      return;
    }

    setLoading(true);
    // Add small delay to let the UI settle before fetching suggestions
    const timer = setTimeout(() => {
      axios
        .get(`${API_URL}/chat/suggestions`, {
          params: { sessionId },
          headers: { Authorization: `Bearer ${token}` }
        })
        .then((res) => {
          setSuggestions(res.data || []);
        })
        .catch((err) => {
          console.error('Error fetching suggestions:', err);
          setSuggestions([]);
        })
        .finally(() => {
          setLoading(false);
        });
    }, 500);

    return () => clearTimeout(timer);
  }, [sessionId, token, disabled]);

  if (!sessionId || suggestions.length === 0 || loading) {
    return null;
  }

  return (
    <div className="max-w-3xl mx-auto px-4 md:px-6 py-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex items-center gap-2 mb-5 ml-1">
        <div className="flex items-center justify-center w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-900/30">
          <Sparkles className="w-3 h-3 text-indigo-600 dark:text-indigo-400 animate-pulse" />
        </div>
        <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
          Intelligent Next Steps
        </p>
        <div className="h-px flex-1 bg-gradient-to-r from-slate-200 dark:from-slate-800 to-transparent ml-2" />
      </div>

      <div className="flex flex-wrap gap-2.5">
        <AnimatePresence mode="popLayout">
          {suggestions.map((suggestion, index) => (
            <motion.div
              key={suggestion} // Use content as key for better transitions
              initial={{ opacity: 0, scale: 0.9, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{
                duration: 0.4,
                delay: index * 0.08,
                ease: [0.23, 1, 0.32, 1]
              }}
              layout
            >
              <button
                onClick={() => onSelect(suggestion)}
                disabled={disabled}
                className={cn(
                  "group relative flex items-center gap-2.5 px-4 py-2.5",
                  "bg-white dark:bg-slate-900/80 backdrop-blur-md",
                  "border border-slate-200 dark:border-slate-800",
                  "rounded-xl text-[13px] font-medium text-slate-600 dark:text-slate-300",
                  "shadow-sm hover:shadow-indigo-500/10 transition-all duration-300",
                  "hover:border-indigo-400 dark:hover:border-indigo-500/50",
                  "hover:bg-indigo-50/50 dark:hover:bg-indigo-500/5",
                  "hover:text-indigo-700 dark:hover:text-indigo-400",
                  "active:scale-95",
                  disabled && "opacity-50 cursor-not-allowed grayscale"
                )}
              >
                <span className="relative z-10">{suggestion}</span>
                <div className="w-4 h-4 rounded-full bg-indigo-50 dark:bg-indigo-950 flex items-center justify-center group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900 transition-colors">
                  <ArrowRight className="w-2.5 h-2.5 text-indigo-500 group-hover:translate-x-0.5 transition-transform" />
                </div>

                {/* Subtle border glow on hover */}
                <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-500 ring-1 ring-inset ring-indigo-500/20" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

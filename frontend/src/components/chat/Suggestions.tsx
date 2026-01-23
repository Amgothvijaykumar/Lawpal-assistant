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
    <div className="max-w-3xl mx-auto px-4 py-6 fade-in-up">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="w-4 h-4 text-indigo-500" />
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Suggested Actions</p>
      </div>
      <div className="flex flex-wrap gap-3">
        <AnimatePresence>
          {suggestions.map((suggestion, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.2, delay: index * 0.05 }}
            >
              <button
                onClick={() => onSelect(suggestion)}
                disabled={disabled}
                className={cn(
                  "group relative flex items-center gap-2 px-4 py-2.5",
                  "bg-white dark:bg-slate-800",
                  "border border-slate-200 dark:border-slate-700",
                  "rounded-full text-sm text-slate-600 dark:text-slate-300",
                  "shadow-sm hover:shadow-md transition-all duration-200",
                  "hover:border-indigo-200 dark:hover:border-indigo-800",
                  "hover:text-indigo-600 dark:hover:text-indigo-400",
                  disabled && "opacity-50 cursor-not-allowed"
                )}
              >
                <span>{suggestion}</span>
                <ArrowRight className="w-3.5 h-3.5 opacity-0 -ml-2 group-hover:opacity-100 group-hover:ml-0 transition-all duration-200 text-indigo-500" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

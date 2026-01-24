import { useState, useEffect, useRef } from 'react';
import { Trash2, Palette, X } from 'lucide-react';
import { cn } from '@/lib/utils';

// Predefined brand colors (top 5)
const PRESET_COLORS = [
  '#3b82f6', // Blue
  '#fbbf24', // Yellow
  '#22c55e', // Green
  '#ec4899', // Pink
  '#a855f7', // Purple
];

// Extended palette colors
const EXTENDED_COLORS = [
  '#ef4444', // Red
  '#f97316', // Orange
  '#14b8a6', // Teal
  '#06b6d4', // Cyan
  '#6366f1', // Indigo
  '#8b5cf6', // Violet
  '#d946ef', // Fuchsia
  '#f43f5e', // Rose
];

interface HighlightPopupProps {
  position: { x: number; y: number };
  existingColor?: string;
  existingHighlightId?: string;
  onApplyColor: (color: string) => void;
  onRemoveHighlight: (highlightId: string) => void;
  onClose: () => void;
}

export function HighlightPopup({
  position,
  existingColor,
  existingHighlightId,
  onApplyColor,
  onRemoveHighlight,
  onClose,
}: HighlightPopupProps) {
  const [showExtended, setShowExtended] = useState(false);
  const popupRef = useRef<HTMLDivElement>(null);

  // Adjust position to stay within viewport
  const [adjustedPosition, setAdjustedPosition] = useState(position);

  useEffect(() => {
    if (popupRef.current) {
      const rect = popupRef.current.getBoundingClientRect();
      const padding = 10;
      let { x, y } = position;

      // Adjust horizontal position
      if (x + rect.width > window.innerWidth - padding) {
        x = window.innerWidth - rect.width - padding;
      }
      if (x < padding) {
        x = padding;
      }

      // Adjust vertical position (prefer above selection)
      if (y < rect.height + padding) {
        y = position.y + 30; // Show below if not enough space above
      }

      setAdjustedPosition({ x, y });
    }
  }, [position]);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  const handleColorClick = (color: string) => {
    onApplyColor(color);
    onClose();
  };

  const handleRemove = () => {
    if (existingHighlightId) {
      onRemoveHighlight(existingHighlightId);
      onClose();
    }
  };

  return (
    <div
      ref={popupRef}
      className={cn(
        'fixed z-50 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700',
        'animate-in fade-in-0 zoom-in-95 duration-150'
      )}
      style={{
        left: adjustedPosition.x,
        top: adjustedPosition.y - 50,
        transform: 'translateX(-50%)',
      }}
    >
      {/* Main color row */}
      <div className="flex items-center gap-1 p-2">
        {PRESET_COLORS.map((color) => (
          <button
            key={color}
            onClick={() => handleColorClick(color)}
            className={cn(
              'w-7 h-7 rounded-full transition-all hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-400',
              existingColor === color && 'ring-2 ring-offset-2 ring-slate-900 dark:ring-white'
            )}
            style={{ backgroundColor: color }}
            title={`Highlight with ${color}`}
          />
        ))}

        {/* Divider */}
        <div className="w-px h-5 bg-slate-200 dark:bg-slate-700 mx-1" />

        {/* More colors button */}
        <button
          onClick={() => setShowExtended(!showExtended)}
          className={cn(
            'w-7 h-7 rounded-full flex items-center justify-center transition-all hover:bg-slate-100 dark:hover:bg-slate-700',
            showExtended && 'bg-slate-100 dark:bg-slate-700'
          )}
          title="More colors"
        >
          <Palette className="w-4 h-4 text-slate-500" />
        </button>

        {/* Remove highlight button (only if existing) */}
        {existingHighlightId && (
          <>
            <div className="w-px h-5 bg-slate-200 dark:bg-slate-700 mx-1" />
            <button
              onClick={handleRemove}
              className="w-7 h-7 rounded-full flex items-center justify-center transition-all hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500"
              title="Remove highlight"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </>
        )}
      </div>

      {/* Extended palette */}
      {showExtended && (
        <div className="border-t border-slate-200 dark:border-slate-700 p-2">
          <div className="grid grid-cols-4 gap-1">
            {EXTENDED_COLORS.map((color) => (
              <button
                key={color}
                onClick={() => handleColorClick(color)}
                className={cn(
                  'w-7 h-7 rounded-full transition-all hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-400',
                  existingColor === color && 'ring-2 ring-offset-2 ring-slate-900 dark:ring-white'
                )}
                style={{ backgroundColor: color }}
                title={`Highlight with ${color}`}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

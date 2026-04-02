/**
 * AnimatedSelect — A polished dropdown select using Framer Motion.
 * Replaces plain <select> elements with a searchable, animated dropdown.
 */

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, Check } from 'lucide-react'
import { cn } from '@/lib/utils'

export function AnimatedSelect({
  value,
  onChange,
  options = [],
  placeholder = 'Select…',
  label,
  icon,
  className,
  triggerClassName,
  menuClassName,
  variant = 'light', // 'light' | 'dark'
}) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef(null)

  const selected = options.find((o) => o.value === value)

  // Close on click outside
  useEffect(() => {
    if (!open) return
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  // Close on Escape
  useEffect(() => {
    if (!open) return
    const handler = (e) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open])

  const isDark = variant === 'dark'

  return (
    <div className={cn('relative', className)} ref={containerRef}>
      {label && (
        <label className={cn(
          'text-xs font-semibold mb-1 block',
          isDark ? 'text-[#8a8a8f]' : 'text-gray-700'
        )}>
          {label}
        </label>
      )}

      {/* Trigger */}
      <motion.button
        type="button"
        onClick={() => setOpen(!open)}
        whileTap={{ scale: 0.98 }}
        className={cn(
          'w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 text-left',
          isDark
            ? open
              ? 'bg-white/10 text-white ring-1 ring-white/20 shadow-lg'
              : 'bg-[#1a1a1e] text-[#c0c0c5] border border-white/[0.08] hover:border-white/[0.15] hover:bg-white/5'
            : open
              ? 'bg-white text-gray-900 ring-2 ring-purple-400/50 shadow-lg'
              : 'bg-white/80 text-gray-900 border border-gray-200 hover:border-purple-300 hover:shadow-md',
          triggerClassName
        )}
      >
        {icon && <span className="shrink-0 opacity-60">{icon}</span>}
        <span className="flex-1 truncate">
          {selected?.label || placeholder}
        </span>
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="shrink-0"
        >
          <ChevronDown className="size-4 opacity-50" />
        </motion.span>
      </motion.button>

      {/* Dropdown */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.97 }}
            transition={{ duration: 0.15, ease: [0.25, 0.46, 0.45, 0.94] }}
            className={cn(
              'absolute z-50 w-full mt-1.5 rounded-xl overflow-hidden shadow-2xl',
              isDark
                ? 'bg-[#1a1a1e]/98 backdrop-blur-2xl border border-white/[0.08]'
                : 'bg-white/98 backdrop-blur-2xl border border-gray-200 shadow-purple-100/30',
              menuClassName
            )}
          >
            <div className="p-1.5 max-h-[280px] overflow-y-auto custom-scrollbar">
              {options.map((option, idx) => (
                <motion.button
                  key={option.value}
                  type="button"
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.02, duration: 0.15 }}
                  onClick={() => {
                    onChange(option.value)
                    setOpen(false)
                  }}
                  className={cn(
                    'w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-all duration-150',
                    isDark
                      ? value === option.value
                        ? 'bg-white/10 text-white'
                        : 'text-[#a0a0a5] hover:bg-white/5 hover:text-white'
                      : value === option.value
                        ? 'bg-purple-50 text-purple-900'
                        : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                  )}
                >
                  {option.icon && (
                    <span className={cn(
                      'shrink-0 size-7 rounded-lg flex items-center justify-center',
                      isDark ? 'bg-white/[0.04] ring-1 ring-white/[0.06]' : 'bg-gray-100'
                    )}>
                      {option.icon}
                    </span>
                  )}
                  <div className="flex-1 min-w-0">
                    <span className="text-[13px] font-medium block truncate">{option.label}</span>
                    {option.description && (
                      <span className={cn(
                        'text-[11px] block truncate',
                        isDark ? 'text-[#6a6a6f]' : 'text-gray-500'
                      )}>
                        {option.description}
                      </span>
                    )}
                  </div>
                  {value === option.value && (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className={cn(
                        'shrink-0',
                        isDark ? 'text-blue-400' : 'text-purple-600'
                      )}
                    >
                      <Check className="size-4" />
                    </motion.span>
                  )}
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

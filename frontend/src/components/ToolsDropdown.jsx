/**
 * ToolsDropdown — ChatGPT-style "+" tools menu for the header.
 *
 * Consolidates PDF upload, summarizer, topic filter, and future tools
 * into a single clean dropdown panel with icons, titles, and descriptions.
 */

import { useRef, useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus,
  FileText,
  Sparkles,
  Scale,
  Search,
  BarChart3,
  FileDiff,
  Filter,
  ChevronRight,
  X,
  Loader2,
  Upload,
} from 'lucide-react'

const TOOLS = [
  {
    id: 'upload-pdf',
    icon: <FileText className="size-5" />,
    title: 'Upload PDF',
    description: 'Upload a legal document to analyze',
    color: 'text-emerald-400',
    bgHover: 'hover:bg-emerald-500/8',
    accentRing: 'group-hover:ring-emerald-500/20',
  },
  {
    id: 'summarize',
    icon: <Sparkles className="size-5" />,
    title: 'Summarize Document',
    description: 'Generate concise summaries',
    color: 'text-purple-400',
    bgHover: 'hover:bg-purple-500/8',
    accentRing: 'group-hover:ring-purple-500/20',
  },
  {
    id: 'legal-research',
    icon: <Scale className="size-5" />,
    title: 'Legal Research Mode',
    description: 'Deep analysis with precedent matching',
    color: 'text-blue-400',
    bgHover: 'hover:bg-blue-500/8',
    accentRing: 'group-hover:ring-blue-500/20',
  },
  {
    id: 'case-search',
    icon: <Search className="size-5" />,
    title: 'Case Law Search',
    description: 'Search precedents and judgments',
    color: 'text-amber-400',
    bgHover: 'hover:bg-amber-500/8',
    accentRing: 'group-hover:ring-amber-500/20',
  },
]

const FUTURE_TOOLS = [
  {
    id: 'analytics',
    icon: <BarChart3 className="size-5" />,
    title: 'Case Analytics',
    description: 'Statistical analysis of outcomes',
    color: 'text-cyan-400',
    comingSoon: true,
  },
  {
    id: 'compare',
    icon: <FileDiff className="size-5" />,
    title: 'Document Comparison',
    description: 'Compare legal documents side-by-side',
    color: 'text-rose-400',
    comingSoon: true,
  },
]

export default function ToolsDropdown({
  onUploadPdf,
  onOpenSummarizer,
  topic,
  setTopic,
  topics,
  pdfUploading,
  placement = 'top' // 'top' for top-right down, 'bottom' for bottom-left up
}) {
  const [open, setOpen] = useState(false)
  const [showTopics, setShowTopics] = useState(false)
  const dropdownRef = useRef(null)
  const fileInputRef = useRef(null)

  // Close on click outside
  useEffect(() => {
    if (!open) return
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false)
        setShowTopics(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  // Close on Escape
  useEffect(() => {
    if (!open) return
    const handler = (e) => {
      if (e.key === 'Escape') {
        setOpen(false)
        setShowTopics(false)
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open])

  const handleToolClick = (toolId) => {
    switch (toolId) {
      case 'upload-pdf':
        fileInputRef.current?.click()
        setOpen(false)
        break
      case 'summarize':
        onOpenSummarizer()
        setOpen(false)
        break
      case 'legal-research':
        // Toggle topic submenu
        setShowTopics(!showTopics)
        break
      case 'case-search':
        // Focus the search input — just close menu and let user type
        setOpen(false)
        break
      default:
        break
    }
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Hidden file input for PDF upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.txt"
        onChange={(e) => {
          onUploadPdf(e)
          setOpen(false)
        }}
        className="hidden"
      />

      {/* + Trigger button */}
      <button
        onClick={() => { setOpen(!open); setShowTopics(false) }}
        className={`
          relative p-2 rounded-xl transition-all duration-200
          ${open
            ? 'bg-white/10 text-white ring-1 ring-white/20'
            : 'text-[#8a8a8f] hover:text-white hover:bg-white/5'
          }
        `}
        title="Tools"
        aria-label="Open tools menu"
      >
        <Plus className={`size-5 transition-transform duration-300 ${open ? 'rotate-45' : ''}`} />

        {/* Subtle pulse dot when PDF is uploading */}
        {pdfUploading && (
          <span className="absolute -top-0.5 -right-0.5 size-2.5 rounded-full bg-emerald-400 animate-pulse" />
        )}
      </button>

      {/* Dropdown panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            transition={{ duration: 0.18, ease: [0.25, 0.46, 0.45, 0.94] }}
            className={`absolute z-50 w-[320px] ${
              placement === 'bottom' 
                ? 'bottom-[calc(100%+8px)] left-0 origin-bottom-left' 
                : 'top-full mt-2 right-0 origin-top-right'
            }`}
          >
            <div className="bg-[#1a1a1e]/98 backdrop-blur-2xl border border-white/[0.08] rounded-2xl shadow-[0_16px_70px_-12px_rgba(0,0,0,0.8)] overflow-hidden">

              {/* Header */}
              <div className="px-4 pt-4 pb-2 flex items-center justify-between">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[#6a6a6f]">
                  Tools
                </h3>
                {pdfUploading && (
                  <div className="flex items-center gap-1.5 text-[10px] text-emerald-400">
                    <Loader2 className="size-3 animate-spin" />
                    <span>Uploading…</span>
                  </div>
                )}
              </div>

              {/* Main tools */}
              <div className="px-2 pb-2 space-y-0.5">
                {TOOLS.map((tool) => (
                  <button
                    key={tool.id}
                    onClick={() => handleToolClick(tool.id)}
                    disabled={tool.id === 'upload-pdf' && pdfUploading}
                    className={`
                      group w-full flex items-center gap-3.5 px-3 py-3 rounded-xl
                      text-left transition-all duration-150
                      ${tool.bgHover} hover:bg-opacity-100
                      disabled:opacity-40 disabled:cursor-not-allowed
                    `}
                  >
                    <div className={`
                      flex-shrink-0 size-10 rounded-xl flex items-center justify-center
                      bg-white/[0.04] ring-1 ring-white/[0.06] transition-all duration-200
                      ${tool.accentRing} ${tool.color}
                    `}>
                      {tool.id === 'upload-pdf' && pdfUploading
                        ? <Loader2 className="size-5 animate-spin" />
                        : tool.icon
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-[13px] font-medium text-white/90 block leading-tight">
                        {tool.title}
                      </span>
                      <span className="text-[11px] text-[#6a6a6f] leading-tight mt-0.5 block">
                        {tool.description}
                      </span>
                    </div>
                    {tool.id === 'legal-research' && (
                      <ChevronRight className={`size-3.5 text-[#4a4a4f] transition-transform duration-200 ${showTopics ? 'rotate-90' : ''}`} />
                    )}
                  </button>
                ))}

                {/* Topic filter sub-panel (nested under Legal Research) */}
                <AnimatePresence>
                  {showTopics && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="pl-6 pr-2 py-1.5 space-y-0.5">
                        <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-[#5a5a5f] flex items-center gap-1.5">
                          <Filter className="size-3" />
                          <span>Filter by Topic</span>
                        </div>
                        {topics.map((t) => (
                          <button
                            key={t.id}
                            onClick={() => {
                              setTopic(t.id)
                              setShowTopics(false)
                              setOpen(false)
                            }}
                            className={`
                              w-full text-left px-3 py-2 rounded-lg text-xs transition-all duration-150
                              ${topic === t.id
                                ? 'bg-blue-500/15 text-blue-400 font-medium'
                                : 'text-[#a0a0a5] hover:bg-white/5 hover:text-white'
                              }
                            `}
                          >
                            {t.name}
                            {topic === t.id && (
                              <span className="ml-1.5 text-[10px] text-blue-400/60">✓</span>
                            )}
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Divider */}
              <div className="mx-4 border-t border-white/[0.06]" />

              {/* Future tools */}
              <div className="px-2 py-2 space-y-0.5">
                <div className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-[#4a4a4f]">
                  Coming Soon
                </div>
                {FUTURE_TOOLS.map((tool) => (
                  <div
                    key={tool.id}
                    className="flex items-center gap-3.5 px-3 py-2.5 rounded-xl opacity-40 cursor-not-allowed"
                  >
                    <div className={`
                      flex-shrink-0 size-10 rounded-xl flex items-center justify-center
                      bg-white/[0.02] ring-1 ring-white/[0.04] ${tool.color}
                    `}>
                      {tool.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-[13px] font-medium text-white/60 block leading-tight">
                        {tool.title}
                      </span>
                      <span className="text-[11px] text-[#4a4a4f] leading-tight mt-0.5 block">
                        {tool.description}
                      </span>
                    </div>
                    <span className="text-[9px] font-semibold uppercase tracking-wider text-[#4a4a4f] bg-white/[0.03] px-2 py-0.5 rounded-full">
                      Soon
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

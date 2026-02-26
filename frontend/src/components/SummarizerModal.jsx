import { useState, useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  X, Upload, FileText, Loader2, Copy, Check,
  ChevronDown, Sparkles,
} from 'lucide-react'
import { getModelsByCapability } from '../config/models'
import { uploadPDF, saveSummaryMetadata } from '../services/storageService'
import { summarizeText as apiSummarizeText, summarizeFile as apiSummarizeFile } from '../api/summarizeApi'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

export default function SummarizerModal({ isOpen, onClose, userId }) {
  const summarizeModels = getModelsByCapability('summarize')
  const [selectedModel, setSelectedModel] = useState(summarizeModels[0]?.id || '')
  const [mode, setMode] = useState('text')           // 'text' | 'pdf'
  const [text, setText] = useState('')
  const [file, setFile] = useState(null)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [summary, setSummary] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [copied, setCopied] = useState(false)
  const [modelDropdownOpen, setModelDropdownOpen] = useState(false)
  const fileInputRef = useRef(null)

  // ── Generate summary ────────────────────────────────────────────
  const handleGenerate = async () => {
    setLoading(true)
    setError(null)
    setSummary('')

    try {
      let resultSummary = ''
      let fileUrl = ''

      if (mode === 'pdf') {
        if (!file) throw new Error('Please select a PDF file')
        fileUrl = await uploadPDF(userId, file, setUploadProgress)
        // Route through backend — backend calls HuggingFace if needed
        const result = await apiSummarizeFile(fileUrl, selectedModel, 'summary')
        resultSummary = result.summary
      } else {
        if (!text.trim()) throw new Error('Please enter text to summarize')
        // Route through backend — backend handles all providers
        const result = await apiSummarizeText(text, selectedModel, 'summary')
        resultSummary = result.summary
      }

      setSummary(resultSummary)

      // Persist metadata
      await saveSummaryMetadata(userId, {
        fileName: file?.name || 'Text input',
        fileUrl,
        modelUsed: selectedModel,
        summaryText: resultSummary,
      })
    } catch (err) {
      setError(err.message || 'Summarization failed')
      console.error('Summarization error:', err)
    } finally {
      setLoading(false)
      setUploadProgress(0)
    }
  }

  // ── Clipboard ───────────────────────────────────────────────────
  const handleCopy = async () => {
    await navigator.clipboard.writeText(summary)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // ── File handling ───────────────────────────────────────────────
  const handleFileChange = (e) => {
    const selected = e.target.files?.[0]
    if (selected && selected.type === 'application/pdf') {
      setFile(selected)
      setError(null)
    } else {
      setError('Please select a valid PDF file')
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    const dropped = e.dataTransfer.files?.[0]
    if (dropped && dropped.type === 'application/pdf') {
      setFile(dropped)
      setError(null)
    } else {
      setError('Please drop a valid PDF file')
    }
  }

  const handleReset = () => {
    setText('')
    setFile(null)
    setSummary('')
    setError(null)
    setUploadProgress(0)
  }

  const selectedModelObj = summarizeModels.find((m) => m.id === selectedModel)

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
          transition={{ duration: 0.2 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-2xl max-h-[85vh] bg-[#1a1a1e] border border-white/10 rounded-2xl shadow-2xl shadow-black/50 flex flex-col overflow-hidden"
        >
          {/* ── Header ───────────────────────────────────────────── */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-gradient-to-br from-purple-500/20 to-blue-500/20">
                <Sparkles className="size-5 text-purple-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">Document Summarizer</h2>
                <p className="text-xs text-[#6a6a6f]">Summarize text or PDF documents with AI</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-[#6a6a6f] hover:text-white hover:bg-white/5 transition-colors"
            >
              <X className="size-5" />
            </button>
          </div>

          {/* ── Body ─────────────────────────────────────────────── */}
          <div className="flex-1 overflow-y-auto p-6 space-y-5">

            {/* Model Selector */}
            <div>
              <label className="text-xs font-semibold text-[#8a8a8f] uppercase tracking-wider mb-2 block">
                AI Model
              </label>
              <div className="relative">
                <button
                  onClick={() => setModelDropdownOpen(!modelDropdownOpen)}
                  className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-[#141416] border border-white/[0.08] text-sm text-white hover:border-white/20 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-medium">{selectedModelObj?.name || 'Select model'}</span>
                    {selectedModelObj && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-[#6a6a6f]">
                        {selectedModelObj.provider}
                      </span>
                    )}
                  </div>
                  <ChevronDown
                    className={`size-4 text-[#6a6a6f] transition-transform ${modelDropdownOpen ? 'rotate-180' : ''}`}
                  />
                </button>

                {modelDropdownOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setModelDropdownOpen(false)} />
                    <div className="absolute top-full left-0 right-0 mt-2 z-50 bg-[#141416] border border-white/10 rounded-xl shadow-2xl overflow-hidden">
                      {summarizeModels.map((model) => (
                        <button
                          key={model.id}
                          onClick={() => { setSelectedModel(model.id); setModelDropdownOpen(false) }}
                          className={`w-full flex items-center justify-between px-4 py-3 text-left transition-colors ${
                            selectedModel === model.id
                              ? 'bg-white/10 text-white'
                              : 'text-[#a0a0a5] hover:bg-white/5 hover:text-white'
                          }`}
                        >
                          <div>
                            <span className="text-sm font-medium block">{model.name}</span>
                            <span className="text-[11px] text-[#6a6a6f]">{model.description}</span>
                          </div>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-[#6a6a6f] flex-shrink-0 ml-3">
                            {model.provider}
                          </span>
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Input Method Tabs */}
            <div>
              <label className="text-xs font-semibold text-[#8a8a8f] uppercase tracking-wider mb-2 block">
                Input Method
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => setMode('text')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    mode === 'text'
                      ? 'bg-[#1488fc] text-white'
                      : 'bg-[#141416] text-[#6a6a6f] border border-white/[0.08] hover:text-white'
                  }`}
                >
                  <FileText className="size-4" />
                  Paste Text
                </button>
                <button
                  onClick={() => setMode('pdf')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    mode === 'pdf'
                      ? 'bg-[#1488fc] text-white'
                      : 'bg-[#141416] text-[#6a6a6f] border border-white/[0.08] hover:text-white'
                  }`}
                >
                  <Upload className="size-4" />
                  Upload PDF
                </button>
              </div>
            </div>

            {/* Input Area */}
            {mode === 'text' ? (
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Paste your legal document text here…"
                className="w-full h-40 resize-none bg-[#141416] border border-white/[0.08] rounded-xl p-4 text-sm text-white placeholder-[#5a5a5f] focus:outline-none focus:border-[#1488fc]/50 transition-colors"
              />
            ) : (
              <div
                className="border-2 border-dashed border-white/[0.08] rounded-xl p-8 text-center hover:border-[#1488fc]/30 transition-colors cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf"
                  onChange={handleFileChange}
                  className="hidden"
                />
                {file ? (
                  <div className="flex flex-col items-center gap-2">
                    <FileText className="size-10 text-[#1488fc]" />
                    <p className="text-sm text-white font-medium">{file.name}</p>
                    <p className="text-xs text-[#6a6a6f]">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                    <button
                      onClick={(e) => { e.stopPropagation(); setFile(null) }}
                      className="text-xs text-red-400 hover:text-red-300 mt-1"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <Upload className="size-10 text-[#5a5a5f]" />
                    <p className="text-sm text-[#8a8a8f]">
                      Drop your PDF here or{' '}
                      <span className="text-[#1488fc]">browse</span>
                    </p>
                    <p className="text-xs text-[#5a5a5f]">Maximum file size: 20 MB</p>
                  </div>
                )}

                {/* Upload progress bar */}
                {uploadProgress > 0 && uploadProgress < 100 && (
                  <div className="mt-4 w-full bg-[#0f0f0f] rounded-full h-2 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-[#1488fc] to-[#7c5df0] rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                )}
              </div>
            )}

            {/* Error banner */}
            {error && (
              <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-400">
                {error}
              </div>
            )}

            {/* Generate button */}
            <button
              onClick={handleGenerate}
              disabled={loading || (mode === 'text' ? !text.trim() : !file)}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold bg-gradient-to-r from-[#1488fc] to-[#7c5df0] text-white hover:opacity-90 transition-all disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98]"
            >
              {loading ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  {uploadProgress > 0 && uploadProgress < 100
                    ? `Uploading… ${uploadProgress}%`
                    : 'Generating summary…'}
                </>
              ) : (
                <>
                  <Sparkles className="size-4" />
                  Generate Summary
                </>
              )}
            </button>

            {/* Summary result */}
            {summary && (
              <div className="bg-[#141416] border border-white/[0.08] rounded-xl p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-white">Summary</h3>
                  <button
                    onClick={handleCopy}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-[#6a6a6f] hover:text-white hover:bg-white/5 transition-colors"
                  >
                    {copied ? (
                      <Check className="size-3.5 text-green-400" />
                    ) : (
                      <Copy className="size-3.5" />
                    )}
                    {copied ? 'Copied' : 'Copy'}
                  </button>
                </div>
                <div className="markdown-body text-sm text-[#c0c0c5] leading-relaxed">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {summary}
                  </ReactMarkdown>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
